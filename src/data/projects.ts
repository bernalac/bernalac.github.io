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
    stack: ["Astro", "Tailwind CSS", "GitHub Pages"],
    highlight: "100/100 en Lighthouse",
    url: "https://bernalac.github.io",
    repo: "https://github.com/bernalac/bernalac.github.io",
  },
];