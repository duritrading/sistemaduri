// src/lib/data-fetcher.ts - Updated with error handling
export async function getTrackingData(id: string) {
  try {
    const response = await fetch(`/api/asana/trackings/${id}`, {
      next: { revalidate: 60 }
    });
    
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

export async function getAllTrackings() {
  try {
    const response = await fetch('/api/asana/trackings', {
      next: { revalidate: 300 }
    });
    
    const result = await response.json();
    
    if (!result.success) {
      console.error('API Error:', result.error);
      return [];
    }
    
    return result.data;
    
  } catch (error) {
    console.error('Error fetching all trackings:', error);
    return [];
  }
}