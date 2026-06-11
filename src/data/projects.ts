export interface Project {
  name: string;
  description: string;
  stack: string[];
  highlight?: string;
  url?: string;
  repo?: string;
}

export const projects: Project[] = [
  {
    name: "Portfolio / Blog",
    description:
      "Este mismo sitio, construido con Astro. Optimizado para rendimiento y SEO, con blog técnico integrado.",
    stack: ["Astro", "Tailwind CSS", "GitHub Pages", "GitHub Actions"],
    highlight: "100/100 en Lighthouse",
    url: "https://bernalac.github.io",
    repo: "https://github.com/bernalac/bernalac.github.io",
  },
  {
    name: "Dockerización de aplicación Astro",
    description:
      "Entorno de desarrollo para proyectos Astro usando Docker, que permite trabajar sin instalar Node.js localmente. Incluye hot reload, docker-compose y configuración lista para usar.",
    stack: ["Astro", "Docker", "docker-compose"],
    highlight: "Entorno reproducible en cualquier máquina con un solo comando",
    repo: "https://github.com/bernalac/astro-docker-app",
  },
  {
    name: "Blog técnico — Información es la palabra",
    description:
      "Blog técnico sobre desarrollo web y sistemas. Artículos sobre Spring Boot, Docker, JPA, React y redes, con más de 10 entradas publicadas desde 2019.",
    stack: ["WordPress", "Desarrollo web", "Sistemas"],
    highlight: "Artículo propio sobre el repo de Docker referenciado en este portfolio",
    url: "https://bernalac.wordpress.com",
  },
];