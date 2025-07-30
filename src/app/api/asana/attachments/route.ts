// src/app/api/asana/attachments/route.ts - API CORRIGIDA COMPLETAMENTE
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AsanaAttachment {
  gid: string;
  name: string;
  download_url: string;
  size: number;
  content_type: string;
  created_at: string;
  parent: {
    gid: string;
    name: string;
  };
  fileExtension: string;
  fileType: string;
  formattedSize: string;
  iconName: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const forceRefresh = searchParams.get('refresh') || timestamp;

    console.log(`📎 [Attachments API] Buscando anexos para task ${taskId} - ${timestamp}`);

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'Task ID é obrigatório'
      }, { status: 400 });
    }

    const token = process.env.ASANA_ACCESS_TOKEN;
    if (!token || token.trim() === '' || token === 'your_asana_token_here') {
      console.error('❌ [Attachments API] Token Asana não configurado');
      return NextResponse.json({
        success: false,
        error: 'Token Asana não configurado'
      }, { status: 401 });
    }

    // Buscar anexos da task com campos essenciais
    const optFields = [
      'name',
      'download_url', 
      'size',
      'content_type',
      'created_at',
      'parent.name'
    ].join(',');

    const apiUrl = `https://app.asana.com/api/1.0/attachments?parent=${taskId}&opt_fields=${optFields}&_t=${Date.now()}`;
    console.log(`📡 [Attachments API] Request URL: ${apiUrl}`);

    const attachmentsResponse = await fetch(apiUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store'
    });

    if (!attachmentsResponse.ok) {
      const errorText = await attachmentsResponse.text();
      console.error(`❌ [Attachments API] Erro ${attachmentsResponse.status}: ${errorText}`);
      throw new Error(`Erro ${attachmentsResponse.status}: ${attachmentsResponse.statusText}`);
    }

    const attachmentsData = await attachmentsResponse.json();
    const attachments = attachmentsData.data || [];
    
    console.log(`📊 [Attachments API] Total anexos encontrados: ${attachments.length}`);

    // Processar dados dos anexos
    const processedAttachments: AsanaAttachment[] = attachments.map((attachment: any) => {
      const fileExtension = getFileExtension(attachment.name);
      const fileType = getFileType(attachment.content_type, fileExtension);
      
      return {
        gid: attachment.gid,
        name: attachment.name || 'Arquivo sem nome',
        download_url: attachment.download_url || '',
        size: attachment.size || 0,
        content_type: attachment.content_type || 'application/octet-stream',
        created_at: attachment.created_at,
        parent: {
          gid: attachment.parent?.gid || taskId,
          name: attachment.parent?.name || 'Task'
        },
        fileExtension: fileExtension,
        fileType: fileType,
        formattedSize: formatFileSize(attachment.size || 0),
        iconName: getFileIcon(fileType)
      };
    });

    // Ordenar por data de criação (mais recentes primeiro)
    processedAttachments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log(`✅ [Attachments API] ${processedAttachments.length} anexos processados para task ${taskId}`);
    
    // Log dos anexos para debug
    if (processedAttachments.length > 0) {
      console.log('📎 [Attachments API] Anexos encontrados:');
      processedAttachments.forEach((att, index) => {
        console.log(`   ${index + 1}. "${att.name}" (${att.formattedSize}, ${att.fileType})`);
      });
    }

    return NextResponse.json({
      success: true,
      data: processedAttachments,
      taskId,
      total: processedAttachments.length,
      timestamp,
      processingTime: `${Date.now() - startTime}ms`,
      summary: {
        totalFiles: processedAttachments.length,
        totalSize: processedAttachments.reduce((sum, att) => sum + att.size, 0),
        fileTypes: Array.from(new Set(processedAttachments.map(att => att.fileType)))
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [Attachments API] Erro completo:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar anexos',
      details: errorMsg,
      timestamp,
      processingTime: `${Date.now() - startTime}ms`,
      debugInfo: {
        taskId: new URL(request.url).searchParams.get('taskId'),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    }, { status: 500 });
  }
}

// HELPER FUNCTIONS

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function getFileType(contentType: string, extension: string): string {
  // Mapear por content-type primeiro
  if (contentType) {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.includes('pdf')) return 'pdf';
    if (contentType.includes('word') || contentType.includes('document')) return 'document';
    if (contentType.includes('sheet') || contentType.includes('excel')) return 'spreadsheet';
    if (contentType.includes('presentation') || contentType.includes('powerpoint')) return 'presentation';
    if (contentType.includes('zip') || contentType.includes('archive')) return 'archive';
  }

  // Fallback por extensão
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
  const docExts = ['doc', 'docx', 'txt', 'rtf'];
  const spreadsheetExts = ['xls', 'xlsx', 'csv'];
  const presentationExts = ['ppt', 'pptx'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];

  if (extension === 'pdf') return 'pdf';
  if (imageExts.includes(extension)) return 'image';
  if (docExts.includes(extension)) return 'document';
  if (spreadsheetExts.includes(extension)) return 'spreadsheet';
  if (presentationExts.includes(extension)) return 'presentation';
  if (archiveExts.includes(extension)) return 'archive';

  return 'file';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(fileType: string): string {
  const iconMap = {
    'pdf': 'FileText',
    'image': 'Image',
    'document': 'FileText',
    'spreadsheet': 'Table',
    'presentation': 'Presentation',
    'archive': 'Archive',
    'file': 'File'
  };

  return iconMap[fileType as keyof typeof iconMap] || 'File';
}