# bernalac.github.io
Personal site built with [Astro](https://astro.build) and deployed to GitHub Pages via GitHub Actions.

<div align="center">

![Astro](https://img.shields.io/badge/Astro-6-FF5D01?logo=astro&logoColor=white&style=flat)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white&style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white&style=flat)
![Bun](https://img.shields.io/badge/Bun-Runtime-000000?logo=bun&logoColor=white&style=flat)

</div>

## About

Personal website focused on software development.

The site is used to share articles about problems, technical decisions and lessons learned while developing software, with a particular interest in web development, Java, Spring Boot and software architecture.

## Stack

- **Framework** — Astro 6
- **Styling** — Tailwind CSS 4
- **Language** — TypeScript
- **Runtime / Package manager** — Bun
- **Content** — Astro Content Collections
- **Deployment** — GitHub Pages
- **CI/CD** — GitHub Actions

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) 1.x
- Node.js 22.12.0 or newer

### Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/bernalac/bernalac.github.io.git
cd bernalac.github.io
bun install
```

### Local development

```bash
bun run dev
```

Opens a local server at `http://localhost:4321` with hot reload.

### Build

```bash
bun run build
```

Output is generated in `dist/`. Preview the build locally with:

```bash
bun run preview
```

## Deployment

Every push to `main` triggers the GitHub Actions workflow, which:

1. Installs dependencies with Bun
2. Builds the project (`bun run build`)
3. Uploads the `dist/` folder as a GitHub Pages artifact
4. Deploys to `https://user.github.io`

No manual steps required. Check the [Actions tab](../../actions) to follow the pipeline in real time.

## Project structure

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD pipeline
├── public/                 # Static assets
├── src/
│   ├── components/         # Astro components
│   ├── data/               # Data
│   ├── layouts/            # Page layouts
│   ├── pages/              # File-based routing
│   └── styles/             # Styles
├── astro.config.mjs
├── bun.lock
└── tsconfig.json

.
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   └── ...
├── src/
│   ├── components/
│   │   ├── blog/
│   │   └── ui/
│   ├── content/
│   │   └── blog/
│   ├── layouts/
|   |   ├── Header.astro/
|   |   ├── Footer.astro/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── blog/
│   │   ├── contact.astro
│   │   ├── 404.astro
│   │   └── index.astro
│   └── styles/
│       └── global.css
├── astro.config.mjs
├── package.json
├── bun.lock
└── tsconfig.json
```

## License

MIT