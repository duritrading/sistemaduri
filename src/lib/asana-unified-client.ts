// src/lib/asana-unified-client.ts - Client Otimizado para API Unificada
const ASANA_BASE_URL = 'https://app.asana.com/api/1.0';
const REQUEST_TIMEOUT = 10000; // 10s timeout
const MAX_RETRIES = 3;

export class AsanaUnifiedClient {
  private headers: Record<string, string>;
  private token: string;

  constructor() {
    this.token = process.env.ASANA_ACCESS_TOKEN || '';
    if (!this.token) {
      throw new Error('ASANA_ACCESS_TOKEN environment variable not set');
    }

    this.headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
  }

  async getAllTrackingData() {
    console.time('AsanaUnifiedClient.getAllTrackingData');
    
    try {
      // Step 1: Get workspace (cached lookup)
      const workspace = await this.getWorkspace();
      console.log(`📍 Using workspace: ${workspace.name}`);

      // Step 2: Find operational project (cached lookup)  
      const project = await this.getOperationalProject(workspace.gid);
      console.log(`📂 Using project: ${project.name}`);

      // Step 3: Get all tasks with optimized pagination
      const tasks = await this.getAllProjectTasks(project.gid);
      console.log(`📋 Retrieved ${tasks.length} tasks`);

      console.timeEnd('AsanaUnifiedClient.getAllTrackingData');
      
      return {
        workspace,
        project, 
        tasks,
        fetchedAt: new Date().toISOString()
      };

    } catch (error) {
      console.timeEnd('AsanaUnifiedClient.getAllTrackingData');
      console.error('❌ AsanaUnifiedClient error:', error);
      throw error;
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${ASANA_BASE_URL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        headers: this.headers,
        cache: 'no-store',
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle rate limiting with exponential backoff
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`⏱️ Rate limited. Retrying in ${delay}ms...`);
          await this.sleep(delay);
          return this.request<T>(endpoint, options, retryCount + 1);
        }

        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Asana API Error: ${response.status} - ${errorText}`);
      }

      return response.json();

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Retry on network errors
      if (retryCount < MAX_RETRIES && 
          (error instanceof TypeError || error.name === 'AbortError')) {
        console.log(`🔄 Network error. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await this.sleep(1000 * (retryCount + 1));
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  private async getWorkspace() {
    const response = await this.request<any>('/workspaces');
    const workspace = response.data?.[0];
    
    if (!workspace) {
      throw new Error('No workspaces found for this token');
    }
    
    return workspace;
  }

  private async getOperationalProject(workspaceGid: string) {
    const response = await this.request<any>(
      `/projects?workspace=${workspaceGid}&limit=100&opt_fields=name,notes,created_at`
    );
    
    const projects = response.data || [];
    const operationalProject = projects.find((p: any) => 
      p.name && p.name.toLowerCase().includes('operacional')
    );

    if (!operationalProject) {
      const availableProjects = projects.map((p: any) => p.name).join(', ');
      throw new Error(
        `Operational project not found. Available projects: ${availableProjects}`
      );
    }

    return operationalProject;
  }

  private async getAllProjectTasks(projectGid: string) {
    const optFields = [
      'name',
      'notes', 
      'completed',
      'assignee.name',
      'custom_fields.name',
      'custom_fields.text_value',
      'custom_fields.number_value',
      'custom_fields.enum_value.name',
      'due_date',
      'created_at',
      'modified_at',
      'parent'
    ].join(',');

    let allTasks: any[] = [];
    let offset: string | undefined;
    let requestCount = 0;
    const maxRequests = 20; // Safety limit

    do {
      requestCount++;
      if (requestCount > maxRequests) {
        console.warn('⚠️ Max pagination requests reached');
        break;
      }

      const endpoint = `/tasks?project=${projectGid}&opt_fields=${optFields}&limit=100${
        offset ? `&offset=${offset}` : ''
      }`;

      console.log(`📥 Fetching batch ${requestCount} (${allTasks.length} tasks so far)`);
      
      const response = await this.request<any>(endpoint);
      const tasks = response.data || [];
      
      allTasks = allTasks.concat(tasks);
      offset = response.next_page?.offset;

    } while (offset && requestCount < maxRequests);

    console.log(`✅ Fetched ${allTasks.length} total tasks in ${requestCount} requests`);
    
    return allTasks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check method
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.request<any>('/users/me');
      console.log(`✅ Asana connection successful: ${response.data.name}`);
      return true;
    } catch (error) {
      console.error('❌ Asana connection failed:', error);
      return false;
    }
  }

  // Method to get single task by ID (for individual tracking pages)
  async getTask(taskGid: string) {
    const optFields = [
      'name',
      'notes',
      'completed', 
      'assignee.name',
      'custom_fields.name',
      'custom_fields.text_value',
      'custom_fields.number_value',
      'custom_fields.enum_value.name',
      'due_date',
      'created_at',
      'modified_at',
      'parent'
    ].join(',');

    const response = await this.request<any>(
      `/tasks/${taskGid}?opt_fields=${optFields}`
    );
    
    return response.data;
  }

  // Batch method for getting multiple specific tasks
  async getTasks(taskGids: string[]) {
    const promises = taskGids.map(gid => this.getTask(gid));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled')
      .map(result => result.value);
  }
}