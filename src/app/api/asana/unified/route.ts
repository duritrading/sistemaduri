// src/app/api/asana/unified/route.ts - API Enhanced com Custom Fields
import { NextResponse } from 'next/server';
import { EnhancedTrackingService } from '@/lib/enhanced-tracking-service';
import { CustomFieldsAnalyzer } from '@/lib/custom-fields-analyzer';

export async function GET() {
  try {
    console.log('🚀 UNIFIED API ENHANCED - Starting with custom fields analysis');
    
    const enhancedService = new EnhancedTrackingService();
    const response = await enhancedService.getAllTrackingsWithCustomFields();

    if (!response.success) {
      return NextResponse.json(response, { status: 500 });
    }

    // ✅ ENHANCED: Analyze custom fields using the analyzer
    console.log('🔍 Running advanced custom fields analysis...');
    const advancedCustomFieldsAnalysis = CustomFieldsAnalyzer.analyzeCustomFields(response.data);
    
    // Enhanced response with custom fields insights
    const enhancedResponse = {
      ...response,
      customFieldsAnalysis: advancedCustomFieldsAnalysis, // Override with advanced analysis
      meta: {
        ...response.meta,
        customFieldInsights: advancedCustomFieldsAnalysis.insights.length,
        averageFieldsPerTracking: advancedCustomFieldsAnalysis.totalFields > 0 
          ? (response.data.reduce((sum, t) => sum + Object.keys(t.customFields).filter(k => !k.startsWith('_original_')).length, 0) / response.data.length).toFixed(1)
          : '0'
      }
    };

    console.log(`✅ API Enhanced: ${response.data.length} trackings with ${advancedCustomFieldsAnalysis.totalFields} custom fields analyzed`);
    console.log(`📊 Generated ${advancedCustomFieldsAnalysis.insights.length} automatic insights`);

    return NextResponse.json(enhancedResponse);

  } catch (error) {
    console.error('❌ Unified Enhanced API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch enhanced tracking data',
      details: error instanceof Error ? error.message : 'Unknown error',
      data: [],
      customFieldsAnalysis: {
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
      },
      metrics: {
        totalOperations: 0,
        activeOperations: 0,
        completedOperations: 0,
        effectiveRate: 0
      },
      meta: {
        workspace: '',
        project: '',
        totalTasks: 0,
        processedTrackings: 0,
        customFieldsFound: 0,
        customFieldInsights: 0,
        averageFieldsPerTracking: '0',
        lastSync: new Date().toISOString(),
        apiVersion: 'unified-enhanced-v1'
      }
    }, { status: 500 });
  }
}

// Individual tracking endpoint with custom fields
export async function POST(request: Request) {
  try {
    const { id, company, includeCustomFields = true } = await request.json();
    
    const enhancedService = new EnhancedTrackingService();
    
    if (id) {
      // Get specific tracking by ID with custom fields
      const response = await enhancedService.getAllTrackingsWithCustomFields();
      
      if (!response.success) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch tracking data'
        }, { status: 500 });
      }
      
      const tracking = response.data.find(t => t.id === id);
      
      if (!tracking) {
        return NextResponse.json({
          success: false,
          error: 'Tracking not found'
        }, { status: 404 });
      }
      
      // Enhanced response with custom fields analysis for single tracking
      const singleTrackingAnalysis = includeCustomFields 
        ? CustomFieldsAnalyzer.analyzeCustomFields([tracking])
        : null;
      
      return NextResponse.json({
        success: true,
        data: tracking,
        customFieldsAnalysis: singleTrackingAnalysis,
        meta: {
          customFieldsCount: Object.keys(tracking.customFields).filter(k => !k.startsWith('_original_')).length,
          hasBusinessData: !!tracking.business,
          hasDocumentationData: !!tracking.documentation,
          hasFinancialData: !!tracking.financial
        }
      });
    }
    
    if (company) {
      // Get trackings by company with custom fields
      const response = await enhancedService.getAllTrackingsWithCustomFields();
      
      if (!response.success) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch tracking data'
        }, { status: 500 });
      }
      
      const companyTrackings = response.data.filter(tracking => 
        tracking.company && tracking.company.toLowerCase().includes(company.toLowerCase())
      );
      
      // Enhanced response with company-specific custom fields analysis
      const companyAnalysis = includeCustomFields 
        ? CustomFieldsAnalyzer.analyzeCustomFields(companyTrackings)
        : null;
      
      return NextResponse.json({
        success: true,
        data: companyTrackings,
        count: companyTrackings.length,
        customFieldsAnalysis: companyAnalysis,
        meta: {
          company: company,
          totalCustomFields: companyAnalysis?.totalFields || 0,
          averageFieldsPerTracking: companyTrackings.length > 0 
            ? (companyTrackings.reduce((sum, t) => sum + Object.keys(t.customFields).filter(k => !k.startsWith('_original_')).length, 0) / companyTrackings.length).toFixed(1)
            : '0'
        }
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Missing id or company parameter'
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Unified Enhanced API POST Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process enhanced request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Health check endpoint with custom fields validation
export async function OPTIONS() {
  try {
    const enhancedService = new EnhancedTrackingService();
    const connectionOk = await enhancedService.testConnection();
    
    return NextResponse.json({
      status: connectionOk ? 'healthy' : 'unhealthy',
      apiVersion: 'unified-enhanced-v1',
      features: {
        customFields: true,
        advancedAnalytics: true,
        dynamicInsights: true,
        businessData: true,
        documentationTracking: true,
        financialData: true
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}