// src/lib/custom-fields-analyzer.ts - Analisador de Campos Personalizados
export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'enum' | 'date' | 'boolean' | 'multi_enum' | 'currency';
  description?: string;
  possibleValues?: string[]; // Para enums
  totalCount: number;
  filledCount: number;
  fillRate: number; // Percentual de preenchimento
}

export interface CustomFieldValue {
  fieldId: string;
  fieldName: string;
  value: any;
  displayValue: string;
  type: string;
}

export interface CustomFieldsAnalysis {
  totalFields: number;
  fieldDefinitions: CustomFieldDefinition[];
  fieldValues: Record<string, any[]>; // fieldId -> array of values
  insights: CustomFieldInsight[];
  metrics: CustomFieldMetrics;
}

export interface CustomFieldInsight {
  fieldName: string;
  type: 'distribution' | 'trend' | 'completion' | 'correlation';
  title: string;
  description: string;
  data: any;
  chartType: 'bar' | 'pie' | 'line' | 'area' | 'scatter';
}

export interface CustomFieldMetrics {
  averageFillRate: number;
  mostUsedFields: Array<{name: string, usage: number}>;
  leastUsedFields: Array<{name: string, usage: number}>;
  fieldsByType: Record<string, number>;
  totalUniqueValues: number;
}

export class CustomFieldsAnalyzer {
  
  static analyzeCustomFields(trackings: any[]): CustomFieldsAnalysis {
    console.log('🔍 Iniciando análise de custom fields...');
    
    if (!trackings || trackings.length === 0) {
      return this.getEmptyAnalysis();
    }

    // 1. Extrair definições de campos
    const fieldDefinitions = this.extractFieldDefinitions(trackings);
    console.log(`📋 ${fieldDefinitions.length} campos personalizados encontrados`);

    // 2. Extrair valores dos campos
    const fieldValues = this.extractFieldValues(trackings, fieldDefinitions);
    
    // 3. Calcular métricas
    const metrics = this.calculateMetrics(fieldDefinitions, fieldValues);
    
    // 4. Gerar insights automáticos
    const insights = this.generateInsights(fieldDefinitions, fieldValues);
    
    console.log(`✅ Análise completa: ${insights.length} insights gerados`);
    
    return {
      totalFields: fieldDefinitions.length,
      fieldDefinitions,
      fieldValues,
      insights,
      metrics
    };
  }

  private static extractFieldDefinitions(trackings: any[]): CustomFieldDefinition[] {
    const fieldMap = new Map<string, CustomFieldDefinition>();
    const totalTrackings = trackings.length;

    trackings.forEach(tracking => {
      // Extrair dos custom fields se existirem no tracking
      if (tracking.customFields) {
        Object.entries(tracking.customFields).forEach(([fieldName, value]) => {
          const fieldId = this.normalizeFieldId(fieldName);
          
          if (!fieldMap.has(fieldId)) {
            fieldMap.set(fieldId, {
              id: fieldId,
              name: fieldName,
              type: this.detectFieldType(value),
              possibleValues: [],
              totalCount: 0,
              filledCount: 0,
              fillRate: 0
            });
          }
          
          const field = fieldMap.get(fieldId)!;
          field.totalCount++;
          
          if (value !== null && value !== undefined && value !== '') {
            field.filledCount++;
            
            // Coletar valores possíveis para enums
            if (field.type === 'enum' || field.type === 'multi_enum') {
              const stringValue = String(value);
              if (!field.possibleValues!.includes(stringValue)) {
                field.possibleValues!.push(stringValue);
              }
            }
          }
        });
      }

      // Extrair campos dos objetos estruturados (transport, schedule, etc.)
      this.extractFromStructuredData(tracking, fieldMap);
    });

    // Calcular fill rate
    fieldMap.forEach(field => {
      field.fillRate = field.totalCount > 0 ? (field.filledCount / field.totalCount) * 100 : 0;
    });

    return Array.from(fieldMap.values()).sort((a, b) => b.fillRate - a.fillRate);
  }

  private static extractFromStructuredData(tracking: any, fieldMap: Map<string, CustomFieldDefinition>) {
    const structuredFields = [
      { prefix: 'transport', data: tracking.transport || {} },
      { prefix: 'schedule', data: tracking.schedule || {} },
      { prefix: 'regulatory', data: tracking.regulatory || {} },
      { prefix: 'business', data: tracking.business || {} }
    ];

    structuredFields.forEach(({ prefix, data }) => {
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'containers' && key !== 'products' && key !== 'orgaosAnuentes') {
          const fieldName = `${prefix}.${key}`;
          const fieldId = this.normalizeFieldId(fieldName);
          
          if (!fieldMap.has(fieldId)) {
            fieldMap.set(fieldId, {
              id: fieldId,
              name: fieldName,
              type: this.detectFieldType(value),
              possibleValues: [],
              totalCount: 0,
              filledCount: 0,
              fillRate: 0
            });
          }
          
          const field = fieldMap.get(fieldId)!;
          field.totalCount++;
          
          if (value && value !== '') {
            field.filledCount++;
            
            if ((field.type === 'enum' || field.type === 'multi_enum') && typeof value === 'string') {
              if (!field.possibleValues!.includes(value)) {
                field.possibleValues!.push(value);
              }
            }
          }
        }
      });
    });
  }

  private static extractFieldValues(trackings: any[], fieldDefinitions: CustomFieldDefinition[]): Record<string, any[]> {
    const fieldValues: Record<string, any[]> = {};
    
    fieldDefinitions.forEach(field => {
      fieldValues[field.id] = [];
    });

    trackings.forEach(tracking => {
      fieldDefinitions.forEach(field => {
        let value = null;
        
        // Extrair valor baseado no campo
        if (field.name.includes('.')) {
          const [category, key] = field.name.split('.');
          value = tracking[category]?.[key];
        } else if (tracking.customFields) {
          value = tracking.customFields[field.name];
        }
        
        if (value !== null && value !== undefined && value !== '') {
          fieldValues[field.id].push({
            trackingId: tracking.id,
            value: value,
            displayValue: String(value),
            company: tracking.company
          });
        }
      });
    });

    return fieldValues;
  }

  private static calculateMetrics(fieldDefinitions: CustomFieldDefinition[], fieldValues: Record<string, any[]>): CustomFieldMetrics {
    const totalFields = fieldDefinitions.length;
    const averageFillRate = totalFields > 0 
      ? fieldDefinitions.reduce((sum, field) => sum + field.fillRate, 0) / totalFields 
      : 0;

    const mostUsedFields = fieldDefinitions
      .filter(f => f.fillRate > 0)
      .sort((a, b) => b.fillRate - a.fillRate)
      .slice(0, 10)
      .map(f => ({ name: f.name, usage: f.fillRate }));

    const leastUsedFields = fieldDefinitions
      .filter(f => f.fillRate < 100 && f.fillRate > 0)
      .sort((a, b) => a.fillRate - b.fillRate)
      .slice(0, 5)
      .map(f => ({ name: f.name, usage: f.fillRate }));

    const fieldsByType = fieldDefinitions.reduce((acc, field) => {
      acc[field.type] = (acc[field.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalUniqueValues = fieldDefinitions.reduce((sum, field) => {
      return sum + (field.possibleValues?.length || 0);
    }, 0);

    return {
      averageFillRate,
      mostUsedFields,
      leastUsedFields,
      fieldsByType,
      totalUniqueValues
    };
  }

  private static generateInsights(fieldDefinitions: CustomFieldDefinition[], fieldValues: Record<string, any[]>): CustomFieldInsight[] {
    const insights: CustomFieldInsight[] = [];

    // 1. Insights de campos enum (distribuições)
    fieldDefinitions
      .filter(field => field.type === 'enum' && field.possibleValues && field.possibleValues.length > 1)
      .slice(0, 8) // Top 8 campos mais interessantes
      .forEach(field => {
        const values = fieldValues[field.id] || [];
        const distribution = this.calculateDistribution(values.map(v => v.value));
        
        if (Object.keys(distribution).length > 1) {
          insights.push({
            fieldName: field.name,
            type: 'distribution',
            title: `Distribuição: ${field.name}`,
            description: `${Object.keys(distribution).length} valores únicos em ${values.length} registros`,
            data: Object.entries(distribution).map(([name, value]) => ({ name, value })),
            chartType: 'pie'
          });
        }
      });

    // 2. Insights de campos numéricos
    fieldDefinitions
      .filter(field => field.type === 'number')
      .slice(0, 5)
      .forEach(field => {
        const values = fieldValues[field.id]?.map(v => parseFloat(v.value)).filter(v => !isNaN(v)) || [];
        
        if (values.length > 5) {
          const stats = this.calculateNumericStats(values);
          insights.push({
            fieldName: field.name,
            type: 'distribution',
            title: `Análise: ${field.name}`,
            description: `Média: ${stats.mean.toFixed(2)}, Min: ${stats.min}, Max: ${stats.max}`,
            data: this.createHistogram(values),
            chartType: 'bar'
          });
        }
      });

    // 3. Insights de preenchimento
    const incompleteFields = fieldDefinitions.filter(f => f.fillRate < 80 && f.fillRate > 20);
    if (incompleteFields.length > 0) {
      insights.push({
        fieldName: 'completion_analysis',
        type: 'completion',
        title: 'Campos com Baixo Preenchimento',
        description: `${incompleteFields.length} campos com menos de 80% de preenchimento`,
        data: incompleteFields.map(f => ({
          name: f.name.length > 20 ? f.name.substring(0, 20) + '...' : f.name,
          value: f.fillRate
        })),
        chartType: 'bar'
      });
    }

    // 4. Insights por empresa (se disponível)
    const companyInsights = this.generateCompanyInsights(fieldValues);
    insights.push(...companyInsights);

    return insights;
  }

  private static generateCompanyInsights(fieldValues: Record<string, any[]>): CustomFieldInsight[] {
    const insights: CustomFieldInsight[] = [];
    
    // Analisar distribuição por empresa para campos relevantes
    const relevantFields = Object.entries(fieldValues)
      .filter(([_, values]) => values.length > 10 && 
        values.some(v => v.company && v.company !== 'UNKNOWN'))
      .slice(0, 3); // Top 3 campos mais relevantes

    relevantFields.forEach(([fieldId, values]) => {
      const companyDistribution: Record<string, number> = {};
      
      values.forEach(item => {
        if (item.company && item.company !== 'UNKNOWN') {
          companyDistribution[item.company] = (companyDistribution[item.company] || 0) + 1;
        }
      });

      if (Object.keys(companyDistribution).length > 1) {
        const fieldName = values[0]?.fieldName || fieldId;
        insights.push({
          fieldName: fieldId,
          type: 'distribution',
          title: `${fieldName} por Empresa`,
          description: `Distribuição entre ${Object.keys(companyDistribution).length} empresas`,
          data: Object.entries(companyDistribution).map(([name, value]) => ({ name, value })),
          chartType: 'bar'
        });
      }
    });

    return insights;
  }

  private static detectFieldType(value: any): CustomFieldDefinition['type'] {
    if (value === null || value === undefined) return 'text';
    
    const stringValue = String(value);
    
    // Números
    if (!isNaN(Number(stringValue)) && stringValue !== '') {
      return 'number';
    }
    
    // Datas
    if (this.isDate(stringValue)) {
      return 'date';
    }
    
    // Booleanos
    if (stringValue.toLowerCase() === 'true' || stringValue.toLowerCase() === 'false') {
      return 'boolean';
    }
    
    // Valores monetários
    if (stringValue.match(/^\$?\d+([,.]\d{2})?$/)) {
      return 'currency';
    }
    
    // Se tem poucos valores únicos, provavelmente é enum
    return 'text'; // Default, será refinado na análise completa
  }

  private static isDate(value: string): boolean {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$|^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(value) || !isNaN(Date.parse(value));
  }

  private static normalizeFieldId(fieldName: string): string {
    return fieldName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  }

  private static calculateDistribution(values: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    values.forEach(value => {
      const key = String(value);
      distribution[key] = (distribution[key] || 0) + 1;
    });
    return distribution;
  }

  private static calculateNumericStats(values: number[]) {
    const sorted = values.sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)]
    };
  }

  private static createHistogram(values: number[], bins: number = 10) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    
    const histogram: Array<{name: string, value: number}> = [];
    
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binSize;
      const binEnd = min + (i + 1) * binSize;
      const binValues = values.filter(v => v >= binStart && v < binEnd);
      
      histogram.push({
        name: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
        value: binValues.length
      });
    }
    
    return histogram;
  }

  private static getEmptyAnalysis(): CustomFieldsAnalysis {
    return {
      totalFields: 0,
      fieldDefinitions: [],
      fieldValues: {},
      insights: [],
      metrics: {
        averageFillRate: 0,
        mostUsedFields: [],
        leastUsedFields: [],
        fieldsByType: {},
        totalUniqueValues: 0
      }
    };
  }
}