// src/types/asana.ts - TIPOS 100% PRECISOS
export interface AsanaCustomField {
  gid: string;
  name: string;
  display_value?: string;
  text_value?: string;
  number_value?: number;
  enum_value?: {
    name: string;
    color?: string;
  };
  multi_enum_values?: Array<{
    name: string;
    color?: string;
  }>;
  date_value?: string;
  people_value?: Array<{
    name: string;
    gid: string;
  }>;
  resource_subtype?: string;
  type?: string;
}

export interface AsanaTask {
  gid: string;
  name: string;
  completed: boolean;
  created_at: string;
  modified_at: string;
  assignee?: {
    name: string;
    gid: string;
  };
  custom_fields: AsanaCustomField[];
  memberships?: Array<{
    section?: {
      name: string;
      gid: string;
    };
  }>;
}

export interface AsanaSection {
  gid: string;
  name: string;
  created_at: string;
}

export interface AsanaProject {
  gid: string;
  name: string;
  notes?: string;
  created_at: string;
}

export interface AsanaWorkspace {
  gid: string;
  name: string;
}

// ✅ TIPOS EXATOS baseados nos campos reais do Asana
export interface TrackingTransport {
  exporter: string | null;
  company: string | null;
  vessel: string | null;
  blAwb: string | null;
  containers: string[];
  terminal: string | null;
  products: string[];
  transportadora: string | null;
  despachante: string | null;
}

export interface TrackingSchedule {
  etd: string | null;
  eta: string | null;
  fimFreetime: string | null;
  fimArmazenagem: string | null;
  responsible: string | null;
  createdAt: string;
  modifiedAt: string;
}

export interface TrackingBusiness {
  empresa: string | null;
  servicos: string | null;
  beneficioFiscal: string | null;
  canal: string | null;
  prioridade: string | null;
  adiantamento: string | null;
}

export interface TrackingDocumentation {
  invoice: string | null;
  blAwb: string | null;
}

export interface TrackingRegulatory {
  orgaosAnuentes: string[];
}

export interface TrackingStructure {
  section: string;
}

// ✅ TIPO PRINCIPAL do Tracking - 100% preciso
export interface Tracking {
  // Identificação básica
  id: string;
  asanaId: string;
  title: string;
  company: string;
  ref: string;
  status: string;
  
  // Campos organizados por categoria
  transport: TrackingTransport;
  schedule: TrackingSchedule;
  business: TrackingBusiness;
  documentation: TrackingDocumentation;
  regulatory: TrackingRegulatory;
  structure: TrackingStructure;
  
  // Status mapeado para processo marítimo
  maritimeStatus: string;
  
  // Todos os custom fields preservados
  customFields: Record<string, any>;
  
  // Timestamp da última atualização
  lastUpdate: string;
}

// ✅ Tipos para resposta da API
export interface AsanaAPIResponse {
  success: boolean;
  data: Tracking[];
  metrics: {
    totalTasks: number;
    processedTrackings: number;
    companies: string[];
    statusDistribution: Record<string, number>;
    sectionDistribution: Record<string, number>;
  };
  meta: {
    workspace: string;
    project: string;
    totalTasks: number;
    processedTrackings: number;
    sectionsFound: number;
    sectionNames: string[];
    customFieldsExtracted: number;
    lastSync: string;
    extractionLevel: string;
    cached?: boolean;
    cacheAge?: number;
  };
  error?: string;
  details?: string;
  code?: string;
}

// ✅ Tipos para filtros do dashboard
export interface FilterState {
  reference: string;
  status: string;
  exporter: string;
  product: string;
  orgaoAnuente: string;
}

// ✅ Tipos para KPIs
export interface DashboardKPIs {
  total: number;
  ativas: number;
  processosFinalizados: number;
  fechamento: number;
  aberturaProcesso: number;
  preEmbarque: number;
  rasteioCarga: number;
  chegadaCarga: number;
  entrega: number;
  canceladas: number;
}

// ✅ Constantes do processo marítimo
export type MaritimeStage = 
  | 'Abertura do Processo'
  | 'Pré Embarque'
  | 'Rastreio da Carga'
  | 'Chegada da Carga'
  | 'Entrega'
  | 'Fechamento'
  | 'Processos Finalizados';

// ✅ Campos EXATOS do Asana (da imagem)
export const ASANA_CUSTOM_FIELDS = [
  'Prioridade',
  'Status', 
  'Adiantamento',
  'EMPRESA',
  'SERVIÇOS',
  'Benefício Fiscal',
  'PRODUTO',
  'ETD',
  'ETA',
  'CNTR',
  'Nº BL/AWB',
  'INVOICE',
  'Canal',
  'Exportador',
  'CIA DE TRANSPORTE',
  'NAVIO',
  'Terminal',
  'Órgãos Anuentes',
  'Despachante',
  'TRANSPORTADORA',
  'Fim do Freetime',
  'Fim da armazenagem'
] as const;

export type AsanaCustomFieldName = typeof ASANA_CUSTOM_FIELDS[number];

// ✅ Stages do processo marítimo
export const MARITIME_STAGES: MaritimeStage[] = [
  'Abertura do Processo',
  'Pré Embarque',
  'Rastreio da Carga',
  'Chegada da Carga',
  'Entrega',
  'Fechamento',
  'Processos Finalizados'
];

// ✅ Mapeamento de cores para status
export const STATUS_COLORS: Record<MaritimeStage, string> = {
  'Abertura do Processo': 'bg-yellow-100 text-yellow-800',
  'Pré Embarque': 'bg-orange-100 text-orange-800',
  'Rastreio da Carga': 'bg-blue-100 text-blue-800',
  'Chegada da Carga': 'bg-purple-100 text-purple-800',
  'Entrega': 'bg-green-100 text-green-800',
  'Fechamento': 'bg-green-100 text-green-800',
  'Processos Finalizados': 'bg-gray-100 text-gray-800'
};