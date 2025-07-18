// src/components/ProjectLayout.tsx
import { motion } from 'framer-motion';

interface ProjectLayoutProps {
  title: string;
  description: string;
  status: string;
  features: string[];
}

export function ProjectLayout({ title, description, status, features }: ProjectLayoutProps) {
  return (
    <div className="page-container py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-xl text-gray-600 mb-6">{description}</p>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
            {status}
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">Visão Geral</h2>
            <p className="text-gray-600">
              Este projeto está sendo desenvolvido com as mais modernas tecnologias
              para garantir performance e escalabilidade.
            </p>
          </div>

          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">Funcionalidades</h2>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-600">
                  <span className="w-2 h-2 bg-primary-500 rounded-full mr-3" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}