// src/lib/tracking-service.ts - Service Layer para API Unificada
import { AsanaUnifiedClient } from './asana-unified-client';

// Types consolidados
export interface UnifiedTracking {
  id: string;
  asanaId: string;
  title: string;
  company: string;
  ref: string;
  status: 'Em Progresso' | 'Concluído' | 'A Embarcar';
  
  transport: {
    exporter: string;
    company: string;
    vessel: string;
    blAwb: string;
    containers: string[];
    terminal: string;
    products: string[];
  };
  
  schedule: {
    etd: string;
    eta: string;
    freetime: string;
    responsible: string;
    operationalStatus: string;
  };
  
  regulatory: {
    orgaosAnuentes: string[];
  };
  
  lastUpdate: string;
}

export interface TrackingMetrics {
  totalOperations: number;
  activeOperations: number;
  completedOperations: number;
  effectiveRate: number;
  
  statusDistribution: Record<string, number>;
  exporterDistribution: Record<string, number>;
  armadorDistribution: Record<string, number>;
  productDistribution: Record<string, number>;
  
  uniqueExporters: number;
  uniqueShippingLines: number;
  uniqueTerminals: number;
  totalContainers: number;
  
  allShippingLines: string[];
  allTerminals: string[];
}

export interface TrackingResponse {
  success: boolean;
  data: UnifiedTracking[];
  metrics: TrackingMetrics;
  meta: {
    workspace: string;
    project: string;
    totalTasks: number;
    processedTrackings: number;
    lastSync: string;
    apiVersion: string;
  };
  error?: string;
}

export class TrackingService {
  private client: AsanaUnifiedClient;
  
  constructor() {
    this.client = new AsanaUnifiedClient();
  }

  async getAllTrackings(): Promise<TrackingResponse> {
    try {
      console.log('🚀 TrackingService: Fetching all trackings');
      console.time('TrackingService.getAllTrackings');

      // Get raw data from Asana
      const { workspace, project, tasks } = await this.client.getAllTrackingData();
      
      console.log(`📊 Processing ${tasks.length} raw tasks`);

      // Filter and transform tasks
      const trackings = tasks
        .filter(task => this.isValidTask(task))
        .filter(task => !this.isSubtask(task))
        .map(task => this.transformTask(task))
        .filter(tracking => tracking.company !== 'UNKNOWN');

      console.log(`✅ Transformed ${trackings.length} valid trackings`);

      // Calculate comprehensive metrics
      const metrics = this.calculateMetrics(trackings);

      console.timeEnd('TrackingService.getAllTrackings');

      return {
        success: true,
        data: trackings,
        metrics,
        meta: {
          workspace: workspace.name,
          project: project.name,
          totalTasks: tasks.length,
          processedTrackings: trackings.length,
          lastSync: new Date().toISOString(),
          apiVersion: 'unified-service-v1'
        }
      };

    } catch (error) {
      console.error('❌ TrackingService error:', error);
      
      return {
        success: false,
        data: [],
        metrics: this.getEmptyMetrics(),
        meta: {
          workspace: '',
          project: '',
          totalTasks: 0,
          processedTrackings: 0,
          lastSync: new Date().toISOString(),
          apiVersion: 'unified-service-v1'
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getTrackingById(id: string): Promise<UnifiedTracking | null> {
    try {
      // For individual tracking, we need to search through all trackings
      // This could be optimized with a mapping table in the future
      const response = await this.getAllTrackings();
      
      if (!response.success) return null;
      
      return response.data.find(tracking => tracking.id === id) || null;
      
    } catch (error) {
      console.error('❌ Error getting tracking by ID:', error);
      return null;
    }
  }

  async getTrackingsByCompany(companyName: string): Promise<UnifiedTracking[]> {
    try {
      const response = await this.getAllTrackings();
      
      if (!response.success) return [];
      
      return response.data.filter(tracking => 
        tracking.company.toLowerCase().includes(companyName.toLowerCase())
      );
      
    } catch (error) {
      console.error('❌ Error filtering by company:', error);
      return [];
    }
  }

  private isValidTask(task: any): boolean {
    return task.name && task.name.trim() && task.name.length > 0;
  }

  private isSubtask(task: any): boolean {
    return task.parent && task.parent.resource_type === 'task';
  }

  private transformTask(task: any): UnifiedTracking {
    // Extract company from title
    const { company, ref } = this.extractFromTitle(task.name);
    
    // Extract custom fields
    const fields = this.extractCustomFields(task.custom_fields || []);
    
    // Extract from notes
    const notesData = this.extractFromNotes(task.notes || '');
    
    // Merge all data sources
    const allData = { ...fields, ...notesData };

    return {
      id: this.generateId(task.name),
      asanaId: task.gid,
      title: task.name,
      company,
      ref,
      status: this.determineStatus(task, allData),
      
      transport: {
        exporter: this.getValue(allData, ['exportador', 'exporter', 'shipper']) || 
                  this.extractExporterFromTitle(task.name),
        company: this.getValue(allData, ['armador', 'shipping_company', 'carrier']),
        vessel: this.getValue(allData, ['navio', 'vessel', 'ship']),
        blAwb: this.getValue(allData, ['bl_awb', 'bl', 'bill_of_lading']),
        containers: this.parseArray(this.getValue(allData, ['containers', 'cntr'])),
        terminal: this.getValue(allData, ['terminal', 'port', 'porto']),
        products: this.parseArray(this.getValue(allData, ['produto', 'product', 'produtos']))
      },
      
      schedule: {
        etd: this.formatDate(this.getValue(allData, ['etd', 'departure'])),
        eta: this.formatDate(this.getValue(allData, ['eta', 'arrival', 'chegada'])),
        freetime: this.formatDate(this.getValue(allData, ['freetime', 'fim_freetime'])),
        responsible: task.assignee?.name || this.getValue(allData, ['responsavel']) || 'Não atribuído',
        operationalStatus: this.getValue(allData, ['status', 'situacao']) || 
                          (task.completed ? 'Concluído' : 'Em Progresso')
      },
      
      regulatory: {
        orgaosAnuentes: this.parseArray(this.getValue(allData, ['orgaos_anuentes', 'orgaos']))
      },
      
      lastUpdate: this.formatDate(task.modified_at) || new Date().toLocaleDateString('pt-BR')
    };
  }

  private extractFromTitle(title: string): { company: string, ref: string } {
    if (!title) return { company: 'UNKNOWN', ref: '' };
    
    const patterns = [
      /^(\d+)[º°]\s+([A-Z][A-Z0-9\s&.-]*?)(?:\s*\(.*\))?$/,
      /^(\d+)[º°]\s+([A-Z][A-Z0-9\s&.-]+?)$/
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return { 
          company: match[2].trim(), 
          ref: match[1] 
        };
      }
    }
    
    return { company: 'UNKNOWN', ref: '' };
  }

  private extractCustomFields(customFields: any[]): Record<string, string> {
    const fields: Record<string, string> = {};
    
    customFields.forEach(field => {
      if (field.name) {
        const key = field.name.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_');
        
        fields[key] = field.text_value || 
                     field.number_value?.toString() || 
                     field.enum_value?.name || 
                     '';
      }
    });
    
    return fields;
  }

  private extractFromNotes(notes: string): Record<string, string> {
    if (!notes) return {};
    
    const patterns = [
      { key: 'armador', regex: /(?:armador|carrier|shipping[\s_]?company)[\s:]+([^\n\r]+)/i },
      { key: 'navio', regex: /(?:navio|vessel|ship)[\s:]+([^\n\r]+)/i },
      { key: 'exportador', regex: /(?:exportador|exporter|shipper)[\s:]+([^\n\r]+)/i },
      { key: 'eta', regex: /(?:eta|chegada|arrival)[\s:]+([^\n\r]+)/i },
      { key: 'terminal', regex: /(?:terminal|porto|port)[\s:]+([^\n\r]+)/i }
    ];
    
    const fields: Record<string, string> = {};
    
    patterns.forEach(({ key, regex }) => {
      const match = notes.match(regex);
      if (match) fields[key] = match[1].trim();
    });
    
    return fields;
  }

  private getValue(data: Record<string, string>, keys: string[]): string {
    for (const key of keys) {
      if (data[key]) return data[key];
    }
    return '';
  }

  private parseArray(str: string): string[] {
    if (!str) return [];
    return str.split(/[,\n;]/).map(s => s.trim()).filter(Boolean);
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  }

  private generateId(name: string): string {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[°\s-]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private extractExporterFromTitle(title: string): string {
    const match = title.match(/^\d+[º°]?\s+(.+?)(?:\s*\(|$)/);
    return match ? match[1].trim() : '';
  }

  private determineStatus(task: any, fields: Record<string, string>): 'Em Progresso' | 'Concluído' | 'A Embarcar' {
    if (task.completed) return 'Concluído';
    if (fields.status) return fields.status as any;
    return 'Em Progresso';
  }

  private calculateMetrics(trackings: UnifiedTracking[]): TrackingMetrics {
    const total = trackings.length;
    const completed = trackings.filter(t => t.status === 'Concluído').length;
    const active = total - completed;
    
    const statusDistribution: Record<string, number> = {};
    const exporterDistribution: Record<string, number> = {};
    const armadorDistribution: Record<string, number> = {};
    const productDistribution: Record<string, number> = {};
    const terminals = new Set<string>();
    const shippingLines = new Set<string>();
    
    let totalContainers = 0;
    
    trackings.forEach(tracking => {
      // Status
      statusDistribution[tracking.status] = (statusDistribution[tracking.status] || 0) + 1;
      
      // Exporter
      if (tracking.transport.exporter) {
        exporterDistribution[tracking.transport.exporter] = 
          (exporterDistribution[tracking.transport.exporter] || 0) + 1;
      }
      
      // Shipping company
      if (tracking.transport.company) {
        armadorDistribution[tracking.transport.company] = 
          (armadorDistribution[tracking.transport.company] || 0) + 1;
        shippingLines.add(tracking.transport.company);
      }
      
      // Terminal
      if (tracking.transport.terminal) {
        terminals.add(tracking.transport.terminal);
      }
      
      // Products
      tracking.transport.products.forEach(product => {
        if (product) {
          productDistribution[product] = (productDistribution[product] || 0) + 1;
        }
      });
      
      // Containers
      totalContainers += tracking.transport.containers.length;
    });

    return {
      totalOperations: total,
      activeOperations: active,
      completedOperations: completed,
      effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      
      statusDistribution,
      exporterDistribution,
      armadorDistribution,
      productDistribution,
      
      uniqueExporters: Object.keys(exporterDistribution).length,
      uniqueShippingLines: shippingLines.size,
      uniqueTerminals: terminals.size,
      totalContainers,
      
      allShippingLines: Array.from(shippingLines),
      allTerminals: Array.from(terminals)
    };
  }

  private getEmptyMetrics(): TrackingMetrics {
    return {
      totalOperations: 0,
      activeOperations: 0,
      completedOperations: 0,
      effectiveRate: 0,
      statusDistribution: {},
      exporterDistribution: {},
      armadorDistribution: {},
      productDistribution: {},
      uniqueExporters: 0,
      uniqueShippingLines: 0,
      uniqueTerminals: 0,
      totalContainers: 0,
      allShippingLines: [],
      allTerminals: []
    };
  }

  // Health check
  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }
}