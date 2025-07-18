// src/lib/asana-client.ts - Versão com anti-cache e melhorias
const ASANA_BASE_URL = 'https://app.asana.com/api/1.0';
const ASANA_TOKEN = process.env.ASANA_PERSONAL_ACCESS_TOKEN;

export class AsanaClient {
  private headers: Record<string, string>;

  constructor() {
    this.headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${ASANA_TOKEN}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${ASANA_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: this.headers,
        cache: 'no-store', // Force no cache
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Asana API Error: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Asana API Request Error:', error);
      throw error;
    }
  }

  async getWorkspaces(): Promise<any[]> {
    const response = await this.request<any>('/workspaces');
    return response.data;
  }

  async getProjects(workspaceGid: string): Promise<any[]> {
    const response = await this.request<any>(
      `/projects?workspace=${workspaceGid}&opt_fields=name,notes,created_at&limit=100`
    );
    return response.data;
  }

  async findOperationalProject(workspaceGid: string): Promise<any | null> {
    const projects = await this.getProjects(workspaceGid);
    
    // Busca exata por "Operacional"
    const operationalProject = projects.find(p => 
      p.name.toLowerCase().includes('operacional') ||
      p.name.toLowerCase() === 'operacional'
    );

    if (!operationalProject) {
      console.log('Available projects:', projects.map(p => p.name));
      throw new Error(`Projeto "Operacional" não encontrado. Projetos disponíveis: ${projects.map(p => p.name).join(', ')}`);
    }

    return operationalProject;
  }

  async getProjectTasks(projectGid: string): Promise<any[]> {
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
      'tags.name'
    ].join(',');

    // Adicionar timestamp para evitar cache
    const timestamp = new Date().getTime();
    const response = await this.request<any>(
      `/tasks?project=${projectGid}&opt_fields=${optFields}&limit=100&t=${timestamp}`
    );
    return response.data;
  }

  async getTask(taskGid: string): Promise<any> {
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
      'tags.name'
    ].join(',');

    const timestamp = new Date().getTime();
    const response = await this.request<any>(
      `/tasks/${taskGid}?opt_fields=${optFields}&t=${timestamp}`
    );
    return response.data;
  }

  // Método para testar conexão
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.request<any>('/users/me');
      console.log('Asana connection successful:', response.data.name);
      return true;
    } catch (error) {
      console.error('Asana connection failed:', error);
      return false;
    }
  }

  // Método para buscar tasks com filtros específicos
  async searchTasks(workspaceGid: string, query: string): Promise<any[]> {
    const timestamp = new Date().getTime();
    const response = await this.request<any>(
      `/workspaces/${workspaceGid}/tasks/search?text=${encodeURIComponent(query)}&opt_fields=name,notes,assignee.name&t=${timestamp}`
    );
    return response.data;
  }

  // Método para obter todas as tasks sem limite
  async getAllProjectTasks(projectGid: string): Promise<any[]> {
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
      'tags.name'
    ].join(',');

    let allTasks: any[] = [];
    let offset: string | null = null;
    const timestamp = new Date().getTime();

    do {
      const url = offset 
        ? `/tasks?project=${projectGid}&opt_fields=${optFields}&limit=100&offset=${offset}&t=${timestamp}`
        : `/tasks?project=${projectGid}&opt_fields=${optFields}&limit=100&t=${timestamp}`;
      
      const response = await this.request<any>(url);
      allTasks = allTasks.concat(response.data);
      offset = response.next_page?.offset || null;
    } while (offset);

    return allTasks;
  }
}