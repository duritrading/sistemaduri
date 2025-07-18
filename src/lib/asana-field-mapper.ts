// src/lib/asana-field-mapper.ts - Mapeamento exato dos campos do Asana
export interface AsanaCustomField {
  name: string;
  text_value?: string;
  number_value?: number;
  enum_value?: { name: string };
  display_value?: string;
  type?: string;
}

export interface ProcessedTracking {
  id: string;
  asanaId: string;
  title: string;
  company: string; // Extraído do título
  ref: string; // Número de referência
  status: string;
  
  // Campos de transporte
  transport: {
    exporter: string; // Campo "Exportador"
    shippingCompany: string; // Campo "CIA DE TRANSPORTE"
    vessel: string; // Campo "NAVIO"
    terminal: string; // Campo "Terminal"
    blAwb: string; // Campo "Nº BL/AWB"
    containers: string[]; // Campo "CNTR"
    products: string[]; // Campo "PRODUTO"
    invoice: string; // Campo "INVOICE"
    transportadora: string; // Campo "TRANSPORTADORA"
  };
  
  // Campos de cronograma
  schedule: {
    etd: string; // Campo "ETD"
    eta: string; // Campo "ETA"
    freetimeEnd: string; // Campo "Fim do Freetime"
    storageEnd: string; // Campo "Fim da armazenagem"
  };
  
  // Campos regulatórios
  regulatory: {
    orgaosAnuentes: string[]; // Campo "Órgãos Anuentes"
    despachante: string; // Campo "Despachante"
    canal: string; // Campo "Canal"
    beneficioFiscal: string; // Campo "Benefício Fiscal"
  };
  
  // Campos financeiros
  financial: {
    adiantamento: string; // Campo "Adiantamento"
    servicos: string; // Campo "SERVICOS"
  };
  
  // Campos de comunicação
  communication: {
    emailCliente: string; // Campo "E-mail Cliente"
    emailAnalista: string; // Campo "E-mail Analista"
  };
  
  // Meta informações
  meta: {
    prioridade: string; // Campo "Prioridade"
    empresa: string; // Campo "EMPRESA"
    responsible: string; // Assignee do Asana
    lastUpdate: string;
  };
}

export class AsanaFieldMapper {
  // Mapeamento exato dos nomes dos campos como aparecem no Asana
  private static FIELD_MAPPINGS = {
    // Campos principais
    prioridade: ['Prioridade'],
    status: ['Status'],
    adiantamento: ['Adiantamento'],
    empresa: ['EMPRESA'],
    servicos: ['SERVICOS', 'SERVIÇOS'],
    beneficioFiscal: ['Benefício Fiscal'],
    
    // Campos de produto e transporte
    produto: ['PRODUTO'],
    etd: ['ETD'],
    eta: ['ETA'],
    cntr: ['CNTR'],
    blAwb: ['Nº BL/AWB', 'N° BL/AWB'],
    invoice: ['INVOICE'],
    canal: ['Canal'],
    
    // Campos de parceiros
    exportador: ['Exportador'],
    ciaTransporte: ['CIA DE TRANSPORTE'],
    navio: ['NAVIO'],
    terminal: ['Terminal'],
    orgaosAnuentes: ['Órgãos Anuentes'],
    despachante: ['Despachante'],
    transportadora: ['TRANSPORTADORA'],
    
    // Campos de datas
    fimFreetime: ['Fim do Freetime'],
    fimArmazenagem: ['Fim da armazenagem'],
    
    // Campos de comunicação
    emailCliente: ['E-mail Cliente'],
    emailAnalista: ['E-mail Analista']
  };

  static extractFieldValue(field: AsanaCustomField): string {
    return field.text_value || 
           field.number_value?.toString() || 
           field.enum_value?.name || 
           field.display_value || 
           '';
  }

  static findFieldValue(customFields: AsanaCustomField[], fieldKeys: string[]): string {
    for (const field of customFields) {
      if (field.name && fieldKeys.includes(field.name)) {
        const value = this.extractFieldValue(field);
        if (value && value.trim()) {
          return value.trim();
        }
      }
    }
    return '';
  }

  static parseMultiValue(value: string): string[] {
    if (!value || !value.trim()) return [];
    
    return value.split(/[,;\n|\/]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  static extractCompanyFromTitle(title: string): { company: string; ref: string } {
    // Padrões para extrair empresa do título
    const patterns = [
      /^(\d+)º?\s+([^(\-]+?)(?:\s*\(|$)/, // 661º UNIVAR (PO 4527659420)
      /^(\d+)\s*[-–]\s*([^(\-]+)/, // 661 - UNIVAR
      /^(\d+)\s+([A-Z][^(\-\d]*)/ // 661 UNIVAR
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return {
          ref: match[1] || '',
          company: (match[2] || '').trim()
        };
      }
    }
    
    return { company: 'Não identificado', ref: '' };
  }

  static formatDate(dateValue: string): string {
    if (!dateValue || !dateValue.trim()) return '';
    
    // Tentar diferentes formatos de data
    const formats = [
      /^\d{2}\/\d{2}\/\d{4}$/, // dd/MM/yyyy
      /^\d{4}-\d{2}-\d{2}$/, // yyyy-MM-dd
      /^\d{2}-\d{2}-\d{4}$/, // dd-MM-yyyy
    ];
    
    for (const format of formats) {
      if (format.test(dateValue)) {
        return dateValue;
      }
    }
    
    return dateValue;
  }

  static transformAsanaTask(task: any): ProcessedTracking {
    const customFields = task.custom_fields || [];
    const titleInfo = this.extractCompanyFromTitle(task.name);
    
    // Log para debug
    console.log(`Processing: ${task.name}`);
    console.log(`Custom fields count: ${customFields.length}`);
    
    return {
      id: this.generateId(task.name),
      asanaId: task.gid,
      title: task.name,
      company: titleInfo.company,
      ref: titleInfo.ref,
      status: task.completed ? 'Concluído' : 
              this.findFieldValue(customFields, this.FIELD_MAPPINGS.status) || 'Em Progresso',
      
      transport: {
        exporter: this.findFieldValue(customFields, this.FIELD_MAPPINGS.exportador),
        shippingCompany: this.findFieldValue(customFields, this.FIELD_MAPPINGS.ciaTransporte),
        vessel: this.findFieldValue(customFields, this.FIELD_MAPPINGS.navio),
        terminal: this.findFieldValue(customFields, this.FIELD_MAPPINGS.terminal),
        blAwb: this.findFieldValue(customFields, this.FIELD_MAPPINGS.blAwb),
        containers: this.parseMultiValue(this.findFieldValue(customFields, this.FIELD_MAPPINGS.cntr)),
        products: this.parseMultiValue(this.findFieldValue(customFields, this.FIELD_MAPPINGS.produto)),
        invoice: this.findFieldValue(customFields, this.FIELD_MAPPINGS.invoice),
        transportadora: this.findFieldValue(customFields, this.FIELD_MAPPINGS.transportadora),
      },
      
      schedule: {
        etd: this.formatDate(this.findFieldValue(customFields, this.FIELD_MAPPINGS.etd)),
        eta: this.formatDate(this.findFieldValue(customFields, this.FIELD_MAPPINGS.eta)),
        freetimeEnd: this.formatDate(this.findFieldValue(customFields, this.FIELD_MAPPINGS.fimFreetime)),
        storageEnd: this.formatDate(this.findFieldValue(customFields, this.FIELD_MAPPINGS.fimArmazenagem)),
      },
      
      regulatory: {
        orgaosAnuentes: this.parseMultiValue(this.findFieldValue(customFields, this.FIELD_MAPPINGS.orgaosAnuentes)),
        despachante: this.findFieldValue(customFields, this.FIELD_MAPPINGS.despachante),
        canal: this.findFieldValue(customFields, this.FIELD_MAPPINGS.canal),
        beneficioFiscal: this.findFieldValue(customFields, this.FIELD_MAPPINGS.beneficioFiscal),
      },
      
      financial: {
        adiantamento: this.findFieldValue(customFields, this.FIELD_MAPPINGS.adiantamento),
        servicos: this.findFieldValue(customFields, this.FIELD_MAPPINGS.servicos),
      },
      
      communication: {
        emailCliente: this.findFieldValue(customFields, this.FIELD_MAPPINGS.emailCliente),
        emailAnalista: this.findFieldValue(customFields, this.FIELD_MAPPINGS.emailAnalista),
      },
      
      meta: {
        prioridade: this.findFieldValue(customFields, this.FIELD_MAPPINGS.prioridade),
        empresa: this.findFieldValue(customFields, this.FIELD_MAPPINGS.empresa),
        responsible: task.assignee?.name || 'Não atribuído',
        lastUpdate: new Date(task.modified_at || task.created_at).toLocaleDateString('pt-BR'),
      }
    };
  }

  private static generateId(name: string): string {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[°\s\-()]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
}