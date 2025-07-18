// src/app/15porcelanosa/page.tsx
import type { Metadata } from 'next';
import { ProjectLayout } from '@/components/ProjectLayout';

export const metadata: Metadata = {
  title: '15 Porcelanosa',
  description: 'Projeto 15 Porcelanosa - Detalhes e especificações',
};

export default function PorcelanosaPage() {
  return (
    <ProjectLayout
      title="15 Porcelanosa"
      description="Projeto em desenvolvimento"
      status="Em Progresso"
      features={[
        'Funcionalidade 1',
        'Funcionalidade 2',
        'Funcionalidade 3',
      ]}
    />
  );
}