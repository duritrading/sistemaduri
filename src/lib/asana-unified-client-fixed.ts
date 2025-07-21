// src/lib/asana-unified-client-fixed.ts - Fix com graceful degradation
const ASANA_BASE_URL = 'https://app.asana.com/api/1.0';
const REQUEST_TIMEOUT = 10000;
const MAX_RETRIES = 3;

export class AsanaUnifiedClient {
  private headers: Record<string, string>;
  private token: string;
  private isValid: boolean;

  constructor() {
    this.token = process.env.ASANA_ACCESS_TOKEN || '';
    this.isValid = this.validateToken();
    
    if (this.isValid) {
      this.headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };
    } else {
      this.headers = {};
      console.warn('⚠️ Asana token not configured. Using mock data.');
    }
  }

  private validateToken(): boolean {
    if (!this.token || this.token.trim() === '' || this.token === 'your_asana_token_here') {
      return false;
    }
    return true;
  }

  async getAllTrackingData() {
    console.time('AsanaUnifiedClient.getAllTrackingData');
    
    try {
      // Se token inválido, retornar dados mock
      if (!this.isValid) {
        console.warn('🔄 Token inválido, retornando dados mock...');
        return this.getMockData();
      }

      // Tentar buscar dados reais
      const workspace = await this.getWorkspace();
      const project = await this.getOperationalProject(workspace.gid);
      const tasks = await this.getAllProjectTasks(project.gid);

      console.timeEnd('AsanaUnifiedClient.getAllTrackingData');
      
      return {
        workspace,
        project, 
        tasks,
        fetchedAt: new Date().toISOString(),
        source: 'asana'
      };

    } catch (error) {
      console.timeEnd('AsanaUnifiedClient.getAllTrackingData');
      console.error('❌ AsanaUnifiedClient error, falling back to mock:', error);
      
      // Fallback para dados mock em caso de erro
      return this.getMockData();
    }
  }

  private getMockData() {
    return {
      workspace: { gid: 'mock-workspace', name: 'Mock Workspace' },
      project: { gid: 'mock-project', name: 'Projeto Operacional (Mock)' },
      tasks: [
        {
          gid: 'mock-1',
          name: '661º UNIVAR (PO 4527659420)',
          completed: false,
          notes: 'Mock tracking data',
          custom_fields: [
            { name: 'Exportador', text_value: 'UNIVAR' },
            { name: 'Armador', text_value: 'MSC' },
            { name: 'ETD', text_value: '2024-01-15' },
            { name: 'ETA', text_value: '2024-02-15' }
          ]
        },
        {
          gid: 'mock-2', 
          name: '662º AGRIVALE (BL MSCUNE1234567)',
          completed: false,
          notes: 'Mock tracking data 2',
          custom_fields: [
            { name: 'Exportador', text_value: 'AGRIVALE' },
            { name: 'Armador', text_value: 'MAERSK' },
            { name: 'ETD', text_value: '2024-01-20' },
            { name: 'ETA', text_value: '2024-02-20' }
          ]
        },
        {
          gid: 'mock-3',
          name: '663º WCB (Container MSKU7654321)',
          completed: true,
          notes: 'Mock tracking data 3',
          custom_fields: [
            { name: 'Exportador', text_value: 'WCB' },
            { name: 'Armador', text_value: 'CMA CGM' },
            { name: 'ETD', text_value: '2024-01-10' },
            { name: 'ETA', text_value: '2024-02-10' }
          ]
        }
      ],
      fetchedAt: new Date().toISOString(),
      source: 'mock'
    };
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    if (!this.isValid) {
      throw new Error('Asana token not configured');
    }

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
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          const delay = Math.pow(2, retryCount) * 1000;
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

    do {
      const endpoint = `/tasks?project=${projectGid}&opt_fields=${optFields}&limit=100${
        offset ? `&offset=${offset}` : ''
      }`;

      const response = await this.request<any>(endpoint);
      const tasks = response.data || [];
      
      allTasks.push(...tasks);
      offset = response.next_page?.offset;
      
    } while (offset);

    return allTasks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Método para verificar se está usando dados reais ou mock
  isUsingMockData(): boolean {
    return !this.isValid;
  }

  // Método para obter status da configuração
  getConfigStatus() {
    return {
      tokenConfigured: this.isValid,
      usingMockData: !this.isValid,
      tokenLength: this.token.length,
      message: this.isValid 
        ? 'Conectado ao Asana' 
        : 'Usando dados de demonstração (configure ASANA_ACCESS_TOKEN)'
    };
  }
}