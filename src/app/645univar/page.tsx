// src/app/645univar/page.tsx
import type { Metadata } from 'next';
import { ProjectLayout } from '@/components/ProjectLayout';

export const metadata: Metadata = {
  title: '645 Univar',
  description: 'Projeto 645 Univar - Detalhes e especificações',
};

export default function UnivarPage() {
  return (
    <ProjectLayout
      title="645 Univar"
      description="Projeto em desenvolvimento"
      status="Planejamento"
      features={[
        'Feature A',
        'Feature B', 
        'Feature C',
      ]}
    />
  );
}