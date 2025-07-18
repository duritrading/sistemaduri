// src/components/ProjectLayout.tsx
interface ProjectLayoutProps {
  title: string;
  description: string;
  status: string;
  features: string[];
}

export function ProjectLayout({ title, description, status, features }: ProjectLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-xl text-gray-600 mb-6">{description}</p>
          <span className="inline-flex px-4 py-2 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
            {status}
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">Visão Geral</h2>
            <p className="text-gray-600">
              Este projeto está sendo desenvolvido com tecnologias modernas
              para garantir performance e escalabilidade máxima.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">Funcionalidades</h2>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Tecnologias</h2>
          <div className="flex flex-wrap gap-2">
            {['Next.js', 'TypeScript', 'Tailwind CSS', 'Vercel'].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}