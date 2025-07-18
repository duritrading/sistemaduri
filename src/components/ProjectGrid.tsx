// src/components/ProjectGrid.tsx
import Link from 'next/link';

const projects = [
  {
    name: '15 Porcelanosa',
    href: '/15porcelanosa',
    description: 'Projeto em desenvolvimento',
    status: 'Em Progresso',
  },
  {
    name: '645 Univar',
    href: '/645univar', 
    description: 'Projeto em planejamento',
    status: 'Planejamento',
  },
];

export function ProjectGrid() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Projetos
        </h2>
        <div className="grid gap-8 md:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.name}
              href={project.href}
              className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {project.name}
              </h3>
              <p className="text-gray-600 mb-4">{project.description}</p>
              <span className="inline-flex px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                {project.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}