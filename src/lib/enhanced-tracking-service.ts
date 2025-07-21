// src/lib/enhanced-tracking-service.ts - Service com Custom Fields
import { AsanaUnifiedClient } from './asana-unified-client';

export interface EnhancedTracking {
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
  
  // ✅ NOVA SEÇÃO: Custom Fields do Asana
  customFields: Record<string, any>;
  
  // ✅ NOVA SEÇÃO: Campos estruturados adicionais
  business?: {
    empresa: string;
    servicos: string;
    beneficioFiscal: string;
    canal: string;
  };
  
  documentation?: {
    bl: string;
    invoice: string;
    po: string;
    certificate: string;
  };
  
  financial?: {
    valor: number;
    moeda: string;
    formaPagamento: string;
    incoterm: string;
  };
  
  lastUpdate: string;
}

export interface EnhancedTrackingResponse {
  success: boolean;
  data: EnhancedTracking[];
  customFieldsAnalysis: any;
  metrics: any;
  meta: {
    workspace: string;
    project: string;
    totalTasks: number;
    processedTrackings: number;
    customFieldsFound: number;
    lastSync: string;
    apiVersion: string;
  };
  error?: string;
}

export class EnhancedTrackingService {
  private client: AsanaUnifiedClient;
  
  constructor() {
    this.client = new AsanaUnifiedClient();
  }

  async getAllTrackingsWithCustomFields(): Promise<EnhancedTrackingResponse> {
    try {
      console.log('🚀 Enhanced TrackingService: Fetching with custom fields...');
      console.time('EnhancedTrackingService.getAllTrackings');

      // Get raw data from Asana with ALL custom fields
      const { workspace, project, tasks } = await this.client.getAllTrackingData();
      
      console.log(`📊 Processing ${tasks.length} raw tasks with custom fields extraction...`);

      // Transform tasks with enhanced custom fields extraction
      const trackings = tasks
        .filter(task => this.isValidTask(task))
        .filter(task => !this.isSubtask(task))
        .map(task => this.enhancedTransformTask(task))
        .filter(tracking => tracking.company !== 'UNKNOWN');

      console.log(`✅ Enhanced transformation complete: ${trackings.length} trackings`);

      // Calculate enhanced metrics including custom fields
      const metrics = this.calculateEnhancedMetrics(trackings);
      
      // Analyze custom fields
      const customFieldsAnalysis = this.analyzeAllCustomFields(trackings);
      
      console.log(`📊 Custom fields analysis: ${customFieldsAnalysis.totalFields} fields found`);

      console.timeEnd('EnhancedTrackingService.getAllTrackings');

      return {
        success: true,
        data: trackings,
        customFieldsAnalysis,
        metrics,
        meta: {
          workspace: workspace.name,
          project: project.name,
          totalTasks: tasks.length,
          processedTrackings: trackings.length,
          customFieldsFound: customFieldsAnalysis.totalFields,
          lastSync: new Date().toISOString(),
          apiVersion: 'enhanced-service-v1'
        }
      };

    } catch (error) {
      console.error('❌ Enhanced TrackingService error:', error);
      
      return {
        success: false,
        data: [],
        customFieldsAnalysis: this.getEmptyCustomFieldsAnalysis(),
        metrics: this.getEmptyMetrics(),
        meta: {
          workspace: '',
          project: '',
          totalTasks: 0,
          processedTrackings: 0,
          customFieldsFound: 0,
          lastSync: new Date().toISOString(),
          apiVersion: 'enhanced-service-v1'
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private enhancedTransformTask(task: any): EnhancedTracking {
    // Base transformation (existing logic)
    const { company, ref } = this.extractFromTitle(task.name);
    
    // ✅ ENHANCED: Extract ALL custom fields
    const customFields = this.extractAllCustomFields(task.custom_fields || []);
    
    // Enhanced field extraction from notes
    const notesData = this.extractFromNotes(task.notes || '');
    
    // Merge all data sources
    const allData = { ...customFields, ...notesData };

    // ✅ ENHANCED: Extract structured business data
    const businessData = this.extractBusinessData(customFields, allData);
    const documentationData = this.extractDocumentationData(customFields, allData);
    const financialData = this.extractFinancialData(customFields, allData);

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
        company: this.getValue(allData, ['armador', 'shipping_company', 'carrier', 'linha_maritima']),
        vessel: this.getValue(allData, ['navio', 'vessel', 'ship', 'embarcacao']),
        blAwb: this.getValue(allData, ['bl_awb', 'bl', 'bill_of_lading', 'awb']),
        containers: this.parseArray(this.getValue(allData, ['containers', 'cntr', 'conteineres'])),
        terminal: this.getValue(allData, ['terminal', 'port', 'porto', 'terminal_porto']),
        products: this.parseArray(this.getValue(allData, ['produto', 'product', 'produtos', 'mercadoria']))
      },
      
      schedule: {
        etd: this.formatDate(this.getValue(allData, ['etd', 'departure', 'embarque', 'saida'])),
        eta: this.formatDate(this.getValue(allData, ['eta', 'arrival', 'chegada', 'previsao_chegada'])),
        freetime: this.formatDate(this.getValue(allData, ['freetime', 'fim_freetime', 'prazo_livre'])),
        responsible: task.assignee?.name || this.getValue(allData, ['responsavel', 'responsible']) || 'Não atribuído',
        operationalStatus: this.getValue(allData, ['status', 'situacao', 'status_operacional']) || 
                          (task.completed ? 'Concluído' : 'Em Progresso')
      },
      
      regulatory: {
        orgaosAnuentes: this.parseArray(this.getValue(allData, ['orgaos_anuentes', 'orgaos', 'regulatory_agencies']))
      },
      
      // ✅ CUSTOM FIELDS: All custom fields from Asana
      customFields,
      
      // ✅ ENHANCED STRUCTURED DATA
      business: businessData,
      documentation: documentationData,
      financial: financialData,
      
      lastUpdate: this.formatDate(task.modified_at) || new Date().toLocaleDateString('pt-BR')
    };
  }

  private extractAllCustomFields(customFields: any[]): Record<string, any> {
    const fields: Record<string, any> = {};
    
    if (!customFields || !Array.isArray(customFields)) {
      return fields;
    }

    customFields.forEach(field => {
      if (field && field.name) {
        const fieldName = field.name;
        let fieldValue = null;

        // Extract value based on field type
        if (field.text_value !== undefined && field.text_value !== null) {
          fieldValue = field.text_value;
        } else if (field.number_value !== undefined && field.number_value !== null) {
          fieldValue = field.number_value;
        } else if (field.enum_value && field.enum_value.name) {
          fieldValue = field.enum_value.name;
        } else if (field.multi_enum_values && field.multi_enum_values.length > 0) {
          fieldValue = field.multi_enum_values.map((v: any) => v.name).join(', ');
        } else if (field.date_value) {
          fieldValue = field.date_value;
        } else if (field.resource_subtype === 'boolean') {
          fieldValue = field.bool_value || false;
        }

        // Store both normalized key and original field name
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
          const normalizedKey = this.normalizeFieldName(fieldName);
          fields[normalizedKey] = fieldValue;
          fields[`_original_${normalizedKey}`] = fieldName; // Keep original name for reference
          
          console.log(`📋 Custom field extracted: ${fieldName} = ${fieldValue}`);
        }
      }
    });

    return fields;
  }

  private extractBusinessData(customFields: Record<string, any>, allData: Record<string, any>) {
    return {
      empresa: this.getValue(allData, ['empresa', 'company', 'cliente', 'client']),
      servicos: this.getValue(allData, ['servicos', 'services', 'tipo_servico']),
      beneficioFiscal: this.getValue(allData, ['beneficio_fiscal', 'tax_benefit', 'fiscal_benefit']),
      canal: this.getValue(allData, ['canal', 'channel', 'sales_channel'])
    };
  }

  private extractDocumentationData(customFields: Record<string, any>, allData: Record<string, any>) {
    return {
      bl: this.getValue(allData, ['bl', 'bill_of_lading', 'conhecimento']),
      invoice: this.getValue(allData, ['invoice', 'nota_fiscal', 'fatura']),
      po: this.getValue(allData, ['po', 'purchase_order', 'pedido_compra']),
      certificate: this.getValue(allData, ['certificate', 'certificado', 'cert'])
    };
  }

  private extractFinancialData(customFields: Record<string, any>, allData: Record<string, any>) {
    const valor = this.getValue(allData, ['valor', 'value', 'amount', 'price']);
    return {
      valor: valor ? parseFloat(String(valor).replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
      moeda: this.getValue(allData, ['moeda', 'currency', 'coin']),
      formaPagamento: this.getValue(allData, ['forma_pagamento', 'payment_method', 'payment']),
      incoterm: this.getValue(allData, ['incoterm', 'incoterms', 'termo_comercial'])
    };
  }

  private analyzeAllCustomFields(trackings: EnhancedTracking[]) {
    // Collect all unique custom fields
    const allFields = new Set<string>();
    const fieldValues: Record<string, any[]> = {};
    const fieldTypes: Record<string, string> = {};

    trackings.forEach(tracking => {
      Object.entries(tracking.customFields).forEach(([key, value]) => {
        if (!key.startsWith('_original_')) {
          allFields.add(key);
          
          if (!fieldValues[key]) {
            fieldValues[key] = [];
            fieldTypes[key] = this.detectFieldType(value);
          }
          
          fieldValues[key].push({
            value,
            trackingId: tracking.id,
            company: tracking.company
          });
        }
      });
    });

    return {
      totalFields: allFields.size,
      fieldNames: Array.from(allFields),
      fieldValues,
      fieldTypes,
      summary: {
        mostPopularFields: this.getMostPopularFields(fieldValues, 10),
        fieldTypeDistribution: this.getFieldTypeDistribution(fieldTypes),
        companiesWithMostFields: this.getCompaniesWithMostFields(trackings)
      }
    };
  }

  private getMostPopularFields(fieldValues: Record<string, any[]>, limit: number) {
    return Object.entries(fieldValues)
      .map(([name, values]) => ({ name, count: values.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private getFieldTypeDistribution(fieldTypes: Record<string, string>) {
    const distribution: Record<string, number> = {};
    Object.values(fieldTypes).forEach(type => {
      distribution[type] = (distribution[type] || 0) + 1;
    });
    return distribution;
  }

  private getCompaniesWithMostFields(trackings: EnhancedTracking[]) {
    const companyFieldCounts: Record<string, number> = {};
    
    trackings.forEach(tracking => {
      const fieldCount = Object.keys(tracking.customFields).filter(k => !k.startsWith('_original_')).length;
      companyFieldCounts[tracking.company] = Math.max(companyFieldCounts[tracking.company] || 0, fieldCount);
    });

    return Object.entries(companyFieldCounts)
      .map(([company, maxFields]) => ({ company, maxFields }))
      .sort((a, b) => b.maxFields - a.maxFields)
      .slice(0, 5);
  }

  // Utility methods (reusing from base service)
  private isValidTask(task: any): boolean {
    return task.name && task.name.trim() && task.name.length > 0;
  }

  private isSubtask(task: any): boolean {
    return task.parent && task.parent.resource_type === 'task';
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

  private detectFieldType(value: any): string {
    if (value === null || value === undefined) return 'unknown';
    
    const stringValue = String(value);
    
    if (!isNaN(Number(stringValue)) && stringValue !== '') return 'number';
    if (/^\d{2}\/\d{2}\/\d{4}$|^\d{4}-\d{2}-\d{2}$/.test(stringValue)) return 'date';
    if (stringValue.toLowerCase() === 'true' || stringValue.toLowerCase() === 'false') return 'boolean';
    if (stringValue.match(/^\$?\d+([,.]\d{2})?$/)) return 'currency';
    
    return 'text';
  }

  private normalizeFieldName(name: string): string {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  }

  private calculateEnhancedMetrics(trackings: EnhancedTracking[]) {
    // Base metrics + custom fields insights
    const total = trackings.length;
    const completed = trackings.filter(t => t.status === 'Concluído').length;
    const active = total - completed;
    
    return {
      totalOperations: total,
      activeOperations: active,
      completedOperations: completed,
      effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      customFieldsAverage: total > 0 ? trackings.reduce((sum, t) => sum + Object.keys(t.customFields).filter(k => !k.startsWith('_original_')).length, 0) / total : 0
    };
  }

  private getEmptyCustomFieldsAnalysis() {
    return {
      totalFields: 0,
      fieldNames: [],
      fieldValues: {},
      fieldTypes: {},
      summary: {
        mostPopularFields: [],
        fieldTypeDistribution: {},
        companiesWithMostFields: []
      }
    };
  }

  private getEmptyMetrics() {
    return {
      totalOperations: 0,
      activeOperations: 0,
      completedOperations: 0,
      effectiveRate: 0,
      customFieldsAverage: 0
    };
  }

  // Health check
  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }
}