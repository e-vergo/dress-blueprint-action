# dress-blueprint-action

GitHub Action for Side-by-Side Blueprint CI/CD. Automates the complete build pipeline for Lean 4 projects with interactive documentation using Dress and Runway.

## Features

- **Side-by-side display** of LaTeX theorem statements and Lean proofs
- **Interactive dependency graphs** with pan/zoom and rich modals
- **Dashboard homepage** with stats, key theorems, messages, and project notes
- **Syntax highlighting** with hover tooltips for type information
- **Paper/PDF generation** with `\paperstatement{}` and `\paperfull{}` hooks
- **DocGen4 integration** via pre-generated docs or on-demand generation
- **GitHub Pages deployment** ready

## Quick Start

Add this workflow to `.github/workflows/blueprint.yml`:

```yaml
name: Full Blueprint Build and Deploy

on:
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: e-vergo/dress-blueprint-action@main

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

## Prerequisites

Your project needs:

1. **Dress dependency** in `lakefile.toml`:
   ```toml
   [[require]]
   name = "Dress"
   git = "https://github.com/e-vergo/Dress"
   rev = "main"
   ```

2. **Import Dress** in Lean files with `@[blueprint]` attributes:
   ```lean
   import Dress

   @[blueprint "thm:my-theorem"]
   theorem myTheorem : 2 + 2 = 4 := rfl

   @[blueprint (keyDeclaration := true, message := "Main result")]
   theorem mainResult : ... := ...
   ```

3. **runway.json** configuration file:
   ```json
   {
     "title": "Project Title",
     "projectName": "ProjectName",
     "githubUrl": "https://github.com/user/repo",
     "baseUrl": "/",
     "blueprintTexPath": "blueprint/src/blueprint.tex",
     "assetsDir": "../dress-blueprint-action/assets"
   }
   ```

4. **Blueprint directory** with `blueprint.tex` containing LaTeX structure

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `project-directory` | `.` | Directory containing `lakefile.toml` and `runway.json` |
| `lean-version` | (auto) | Override Lean version (auto-detected from `lean-toolchain`) |
| `docgen4-mode` | `skip` | DocGen4 mode: `skip`, `docs-static`, or `generate` |
| `deploy-pages` | `true` | Upload artifact for GitHub Pages deployment |

### DocGen4 Modes

| Mode | Behavior |
|------|----------|
| `skip` | No DocGen4 documentation (fastest, default) |
| `docs-static` | Download from `docs-static` branch (seconds vs hours) |
| `generate` | Run `lake -R -Kenv=dev build +:docs` (slow, ~1 hour) |

## Outputs

| Output | Description |
|--------|-------------|
| `site-path` | Path to generated site directory |
| `paper-pdf-path` | Path to generated paper PDF (if `paperTexPath` configured) |

## Build Pipeline

The action performs these steps:

1. **Free disk space** - Remove unused software for large builds
2. **Checkout toolchain** - SubVerso, LeanArchitect, Dress, Runway
3. **Install elan** - Lean version manager
4. **Install Lean** - From `lean-toolchain` or specified version
5. **Install LaTeX** - For PDF generation
6. **Fetch mathlib cache** - Download pre-built oleans from server
7. **Build toolchain** - SubVerso -> LeanArchitect -> Dress -> Runway
8. **Build project** - With Dress artifact generation enabled
9. **Build blueprint facet** - Generate manifest and dependency data
10. **Generate dependency graph** - Extract and compute layout
11. **Generate site** - Run Runway site generator
12. **Generate paper** - If `paperTexPath` configured
13. **Handle DocGen4** - Based on `docgen4-mode` setting
14. **Upload artifact** - Ready for `deploy-pages` action

## Paper Generation

To enable paper generation, add to `runway.json`:

```json
{
  "paperTexPath": "blueprint/src/paper.tex"
}
```

Paper metadata (title, authors, abstract) is automatically extracted from `paper.tex` using standard LaTeX commands (`\title{}`, `\author{}`, `\begin{abstract}...\end{abstract}`).

Use these hooks in `paper.tex`:
- `\paperstatement{label}` - Insert LaTeX statement with link to Lean
- `\paperfull{label}` - Insert full side-by-side display

## docs-static Branch Pattern

For projects with pre-generated DocGen4 documentation (avoids ~1 hour build):

1. Generate docs locally:
   ```bash
   lake -R -Kenv=dev build Module:docs
   ```

2. Create orphan branch and push:
   ```bash
   git checkout --orphan docs-static
   git rm -rf .
   cp -r .lake/build/doc/* .
   git add .
   git commit -m "DocGen4 documentation"
   git push origin docs-static
   ```

3. Use in workflow:
   ```yaml
   - uses: e-vergo/dress-blueprint-action@main
     with:
       docgen4-mode: docs-static
   ```

## Assets

This repository includes CSS and JavaScript assets used by generated sites:

| File | Purpose |
|------|---------|
| `assets/blueprint.css` | Full stylesheet including modal, graph, and dashboard styles |
| `assets/common.css` | Shared base styles |
| `assets/paper.css` | Paper-specific styles |
| `assets/verso-code.js` | Hover tooltips, pan/zoom, modal MathJax/Tippy initialization |
| `assets/plastex.js` | LaTeX proof toggle (expand/collapse) |

Assets are automatically copied to the generated site during the build.

## Full Workflow Example

```yaml
name: Full Blueprint Build and Deploy

on:
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: e-vergo/dress-blueprint-action@main
        with:
          docgen4-mode: docs-static

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

## Related Repositories

| Repository | Purpose |
|------------|---------|
| [Runway](https://github.com/e-vergo/Runway) | Site generator, dashboard, paper/PDF generation |
| [Dress](https://github.com/e-vergo/Dress) | Artifact generation, stats, validation, dependency graph |
| [LeanArchitect](https://github.com/e-vergo/LeanArchitect) | `@[blueprint]` attribute with metadata/status options |
| [subverso](https://github.com/e-vergo/subverso) | Syntax highlighting extraction (fork with optimizations) |
| [SBS-Test](https://github.com/e-vergo/SBS-Test) | Minimal test project |
| [General_Crystallographic_Restriction](https://github.com/e-vergo/General_Crystallographic_Restriction) | Production example with paper |

## License

Apache 2.0
