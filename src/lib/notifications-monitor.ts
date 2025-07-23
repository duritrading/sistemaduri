// src/lib/notifications-monitor.ts - SISTEMA DE MONITORAMENTO PARA NOTIFICAÇÕES
interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastError: string | null;
  lastSuccess: string | null;
  errorHistory: Array<{
    timestamp: string;
    error: string;
    userId: string;
  }>;
}

class NotificationsMonitor {
  private metrics: APIMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastError: null,
    lastSuccess: null,
    errorHistory: []
  };

  private responseTimes: number[] = [];

  recordRequest(success: boolean, responseTime: number, error?: string, userId?: string) {
    this.metrics.totalRequests++;
    this.responseTimes.push(responseTime);

    // Manter apenas os últimos 100 tempos de resposta
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    // Calcular média
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.lastSuccess = new Date().toISOString();
    } else {
      this.metrics.failedRequests++;
      this.metrics.lastError = error || 'Erro desconhecido';
      
      // Adicionar ao histórico de erros
      this.metrics.errorHistory.push({
        timestamp: new Date().toISOString(),
        error: error || 'Erro desconhecido',
        userId: userId || 'unknown'
      });

      // Manter apenas os últimos 50 erros
      if (this.metrics.errorHistory.length > 50) {
        this.metrics.errorHistory.shift();
      }
    }
  }

  getMetrics(): APIMetrics {
    return { ...this.metrics };
  }

  getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const successRate = this.metrics.successfulRequests / this.metrics.totalRequests;
    
    if (this.metrics.totalRequests === 0) return 'healthy';
    if (successRate >= 0.9) return 'healthy';
    if (successRate >= 0.7) return 'degraded';
    return 'unhealthy';
  }

  generateReport(): string {
    const metrics = this.getMetrics();
    const health = this.getHealthStatus();
    const successRate = metrics.totalRequests > 0 
      ? (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(1)
      : '0';

    return `
🔔 RELATÓRIO DE NOTIFICAÇÕES
═══════════════════════════

📊 ESTATÍSTICAS GERAIS:
   • Total de requisições: ${metrics.totalRequests}
   • Sucessos: ${metrics.successfulRequests}
   • Falhas: ${metrics.failedRequests}
   • Taxa de sucesso: ${successRate}%
   • Tempo médio: ${metrics.averageResponseTime.toFixed(0)}ms

🚦 STATUS: ${health.toUpperCase()}

⏰ ÚLTIMA ATIVIDADE:
   • Último sucesso: ${metrics.lastSuccess || 'Nunca'}
   • Último erro: ${metrics.lastError || 'Nenhum'}

❌ ÚLTIMOS ERROS (${metrics.errorHistory.length}):
${metrics.errorHistory.slice(-5).map(e => 
  `   • ${e.timestamp}: ${e.error} (user: ${e.userId})`
).join('\n')}

💡 DIAGNÓSTICO:
${this.generateDiagnosis()}
    `.trim();
  }

  private generateDiagnosis(): string {
    const metrics = this.getMetrics();
    const health = this.getHealthStatus();
    
    if (health === 'healthy') {
      return '   ✅ Sistema funcionando normalmente';
    }

    const commonErrors = this.getCommonErrors();
    let diagnosis = [];

    if (metrics.averageResponseTime > 5000) {
      diagnosis.push('   ⚠️  Tempo de resposta alto - possível problema de rede ou API');
    }

    if (commonErrors.includes('Token Asana')) {
      diagnosis.push('   🔑 Problema com token do Asana - verificar configuração');
    }

    if (commonErrors.includes('API unificada')) {
      diagnosis.push('   🔌 API unificada com problemas - verificar dependências');
    }

    if (commonErrors.includes('500')) {
      diagnosis.push('   💥 Erros de servidor - verificar logs do backend');
    }

    if (diagnosis.length === 0) {
      diagnosis.push('   🤔 Falhas intermitentes - monitorar por mais tempo');
    }

    return diagnosis.join('\n');
  }

  private getCommonErrors(): string {
    return this.metrics.errorHistory
      .map(e => e.error)
      .join(' ');
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastError: null,
      lastSuccess: null,
      errorHistory: []
    };
    this.responseTimes = [];
  }
}

// Instância global do monitor
export const notificationsMonitor = new NotificationsMonitor();

// Função helper para console
export function logNotificationsReport() {
  console.log(notificationsMonitor.generateReport());
}

// Função para auto-diagnóstico
export function runNotificationsDiagnostic() {
  const report = notificationsMonitor.generateReport();
  const health = notificationsMonitor.getHealthStatus();
  
  console.log(report);
  
  if (health !== 'healthy') {
    console.log('\n🛠️  AÇÕES RECOMENDADAS:');
    console.log('1. Execute: node debug-notifications.js');
    console.log('2. Verifique logs do servidor');
    console.log('3. Teste a API manualmente: /api/notifications?userId=test');
    console.log('4. Verifique variáveis de ambiente do Asana');
  }

  return { health, report };
}