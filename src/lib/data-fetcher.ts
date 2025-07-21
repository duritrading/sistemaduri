// src/lib/data-fetcher.ts - ATUALIZAR (não remover)
import { TrackingService } from './tracking-service';

export async function getAllTrackings() {
  const service = new TrackingService();
  return service.getAllTrackings();
}

export async function getTrackingData(id: string) {
  const service = new TrackingService(); 
  return service.getTrackingById(id);
}