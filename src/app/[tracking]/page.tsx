// src/app/[tracking]/page.tsx - Página dinâmica para qualquer tracking
import { getTrackingData } from '@/lib/data-fetcher';
import { TrackingDashboard } from '@/components/TrackingDashboard';
import { notFound } from 'next/navigation';

interface Props {
  params: { tracking: string };
}

export default async function TrackingPage({ params }: Props) {
  const trackingData = await getTrackingData(params.tracking);
  
  if (!trackingData) {
    notFound();
  }

  return <TrackingDashboard data={trackingData} />;
}