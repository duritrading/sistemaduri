// src/app/page.tsx
import type { Metadata } from 'next';
import { HeroSection } from '@/components/HeroSection';
import { ProjectGrid } from '@/components/ProjectGrid';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Portfolio de projetos profissionais',
};

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      <HeroSection />
      <ProjectGrid />
    </div>
  );
}