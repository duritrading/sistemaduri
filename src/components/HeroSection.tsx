// src/components/HeroSection.tsx
export function HeroSection() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-6xl">
          Portfolio
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-3xl mx-auto">
          Projetos desenvolvidos com tecnologias modernas e foco em performance.
        </p>
      </div>
    </section>
  );
}