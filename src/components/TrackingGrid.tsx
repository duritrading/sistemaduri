// src/lib/data-fetcher.ts - Updated com melhor error handling
export async function getAllTrackings() {
  try {
    const response = await fetch('/api/asana/trackings', {
      next: { revalidate: 300 }, // Cache 5min
      headers: {
        'Cache-Control': 'max-age=300'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      console.error('API Error:', result.error);
      throw new Error(result.error || 'Falha na API');
    }
    
    console.log('Trackings loaded:', result.meta);
    return result.data || [];
    
  } catch (error) {
    console.error('Error fetching all trackings:', error);
    
    // Fallback data em caso de erro
    return [];
  }
}

export async function getTrackingData(id: string) {
  try {
    const response = await fetch(`/api/asana/trackings/${id}`, {
      next: { revalidate: 60 }, // Cache 1min
      headers: {
        'Cache-Control': 'max-age=60'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Tracking não encontrado
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      console.error('API Error:', result.error);
      return null;
    }
    
    return result.data;
    
  } catch (error) {
    console.error('Error fetching tracking data:', error);
    return null;
  }
}