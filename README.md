# bernalac.github.io
Personal site built with [Astro](https://astro.build) and deployed to GitHub Pages via GitHub Actions.

## Stack

- **Framework** — Astro 6
- **Runtime** — Bun
- **Deployment** — GitHub Pages (GitHub Actions)
- **Language** — TypeScript (strict)

## Getting started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Node >= 22.12.0

### Install dependencies

```bash
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
```

## License

MIT