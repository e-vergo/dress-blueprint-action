# dress-blueprint-action

GitHub Action for the Side-by-Side Blueprint documentation toolchain. Automates the complete build pipeline for Lean 4 formalization projects, generating interactive documentation that pairs LaTeX theorem statements with their Lean formalizations.

## Overview

This action executes a 14-step pipeline that builds the entire toolchain and generates:

- Side-by-side displays of LaTeX statements and Lean proofs
- Interactive dependency graphs with pan/zoom and node modals
- Dashboard homepage with statistics, key theorems, and project notes
- Syntax highlighting with hover tooltips for type signatures
- Paper/PDF output with verification badges

The action packages [SubVerso](https://github.com/e-vergo/subverso), [LeanArchitect](https://github.com/e-vergo/LeanArchitect), [Dress](https://github.com/e-vergo/Dress), and [Runway](https://github.com/e-vergo/Runway) into a single composable GitHub Action.

## Prerequisites

Your project requires:

1. **Dress dependency** in `lakefile.toml`:
   ```toml
   [[require]]
   name = "Dress"
   git = "https://github.com/e-vergo/Dress"
   rev = "main"
   ```

2. **`@[blueprint]` attributes** on declarations (import Dress in your Lean files):
   ```lean
   import Dress

   @[blueprint "thm:main"]
   theorem mainTheorem : 2 + 2 = 4 := rfl

   @[blueprint (keyDeclaration := true, message := "Main result")]
   theorem keyResult : ... := ...
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

4. **Blueprint directory** with `blueprint.tex` containing LaTeX document structure

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `project-directory` | `.` | Directory containing `lakefile.toml` and `runway.json` |
| `lean-version` | (auto) | Override Lean version (auto-detected from `lean-toolchain`) |
| `docgen4-mode` | `skip` | DocGen4 documentation mode |
| `deploy-pages` | `true` | Upload artifact for GitHub Pages deployment |

### docgen4-mode Options

| Mode | Behavior | Build Time |
|------|----------|------------|
| `skip` | No DocGen4 documentation | Fastest |
| `docs-static` | Download from `docs-static` branch | Seconds |
| `generate` | Run `lake -R -Kenv=dev build +:docs` | ~1 hour |

## Outputs

| Output | Description |
|--------|-------------|
| `site-path` | Path to generated site directory |
| `paper-pdf-path` | Path to generated paper PDF (if `paperTexPath` configured) |

## Usage

### Minimal Workflow

```yaml
name: Blueprint

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

### With Pre-generated DocGen4

```yaml
- uses: e-vergo/dress-blueprint-action@main
  with:
    docgen4-mode: docs-static
```

### Custom Project Directory

```yaml
- uses: e-vergo/dress-blueprint-action@main
  with:
    project-directory: lean-project
```

## Build Pipeline

The action executes 14 steps:

| Step | Description |
|------|-------------|
| 1 | Free disk space (removes Android SDK, .NET, Haskell) |
| 2 | Checkout toolchain repos (SubVerso, LeanArchitect, Dress, Runway, assets) |
| 3 | Install elan (Lean version manager) |
| 4 | Install Lean toolchain (from `lean-toolchain` or override) |
| 5 | Install LaTeX (texlive-latex-base, fonts, extras, science) |
| 6 | Fetch mathlib cache (`lake exe cache get`) |
| 7 | Build toolchain in dependency order |
| 8 | Build project with Dress artifact generation |
| 9 | Build `:blueprint` Lake facet |
| 10 | Generate dependency graph and manifest |
| 11 | Generate site with Runway |
| 12 | Generate paper (if `paperTexPath` configured) |
| 13 | Handle DocGen4 (based on mode) |
| 14 | Upload Pages artifact |

### Step Details

**Step 7: Toolchain Build Order**
```
SubVerso (syntax highlighting) -> LeanArchitect (@[blueprint] attribute)
    -> Dress (artifact generation) -> Runway (site generator)
```

**Step 8: Artifact Generation**

During the project build, Dress captures each `@[blueprint]` declaration:
- SubVerso extracts syntax highlighting with hover data
- Dress writes artifacts to `.lake/build/dressed/{Module}/{label}/`:
  - `decl.tex` - LaTeX source
  - `decl.html` - Rendered HTML with hovers
  - `decl.json` - Metadata (status, dependencies)
  - `decl.hovers.json` - Hover tooltip data

**Step 10: Graph Generation**

The `extract_blueprint graph` command produces:
- `manifest.json` - Complete project data (nodes, stats, validation)
- `dep-graph.json` - Raw dependency graph
- `dep-graph.svg` - Rendered SVG with Sugiyama layout

**Step 11: Site Generation**

Runway produces:
- `index.html` - Dashboard homepage
- `dep_graph.html` - Interactive dependency graph
- Chapter pages with side-by-side displays
- `assets/` - CSS and JavaScript

**Step 12: Paper Generation**

If `paperTexPath` is configured:
- `paper.html` - HTML version with MathJax
- `paper.pdf` - PDF (uses tectonic > pdflatex > xelatex > lualatex)
- `pdf.html` - PDF viewer page

## Assets

This repository includes CSS and JavaScript assets copied to generated sites.

### CSS Files

| File | Purpose | Size |
|------|---------|------|
| `common.css` | Shared styles: CSS variables, status dots, Lean syntax, Tippy tooltips, modals, dark mode toggle | 993 lines |
| `blueprint.css` | Blueprint pages: plasTeX base, dashboard grid, graph controls, theorem environments | 1769 lines |
| `paper.css` | Paper pages: ar5iv-style academic layout, verification badges, print styles | 272 lines |

### JavaScript Files

| File | Purpose |
|------|---------|
| `verso-code.js` | Token binding highlights, Tippy.js hover initialization, pan/zoom controls, modal handling, sidebar expansion state |
| `plastex.js` | Dark mode toggle, proof expand/collapse, LaTeX proof body animation sync |

### CSS Architecture

**Design System Variables** (`:root` in common.css):
- Grayscale palette (4 colors)
- Semantic mappings (backgrounds, text, borders, links)
- Tooltip themes (warning, error, info)
- Graph and legend colors
- Verification badge colors

**Status Colors** (6-status model):

| Status | Variable | Color |
|--------|----------|-------|
| notReady | `--sbs-status-not-ready` | Mango (#ffd363) |
| ready | `--sbs-status-ready` | Magenta (#ee00ff) |
| sorry | `--sbs-status-sorry` | Bright Red (#d40101) |
| proven | `--sbs-status-proven` | Light Green (#90EE90) |
| fullyProven | `--sbs-status-fully-proven` | Forest Green (#228B22) |
| mathlibReady | `--sbs-status-mathlib-ready` | Royal Blue (#06a6e5) |

**Rainbow Bracket Colors** (`.lean-bracket-1` through `.lean-bracket-6`):
Light mode uses purple/blue palette; dark mode uses Dracula-style brighter colors.

**Dark Mode**:
- Controlled via `html[data-theme="dark"]`
- Toggle persists to localStorage (`sbs-theme`)
- Defaults to light mode

### JavaScript Functionality

**verso-code.js**:

| Function | Purpose |
|----------|---------|
| Token binding | Highlights all occurrences of a variable on hover |
| Tippy.js initialization | Type signatures, docstrings, tactic states |
| Proof sync | Syncs Lean proof body visibility with LaTeX toggle |
| Pan/zoom | Mouse wheel zoom centered on cursor, pointer drag panning |
| `fitToWindow()` | Fits graph to viewport using `getBBox()` |
| `onModalOpen()` | Initializes MathJax and Tippy in modal, positions blueprint link |
| Node click handling | Opens modal when clicking graph nodes |

**plastex.js**:

| Function | Purpose |
|----------|---------|
| `toggleSbsTheme()` | Toggles dark/light mode |
| TOC toggle | Mobile sidebar show/hide |
| Proof toggle | Expands/collapses LaTeX proofs with jQuery animation |

## Paper Generation

To enable paper generation, add to `runway.json`:

```json
{
  "paperTexPath": "blueprint/src/paper.tex"
}
```

Paper metadata (title, authors, abstract) is extracted from standard LaTeX commands in `paper.tex`:
- `\title{...}`
- `\author{...}` (split on `\and`)
- `\begin{abstract}...\end{abstract}`

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

## Troubleshooting

**No dressed artifacts found**
- Verify Dress is imported: `import Dress`
- Check declarations have `@[blueprint "label"]` attributes
- Review build logs for elaboration errors

**manifest.json not found**
- Ensure `runway.json` exists with valid `projectName`
- Verify `:blueprint` facet completed (Step 9)
- Check `extract_blueprint graph` output (Step 10)

**Paper PDF not generated**
- Confirm `paperTexPath` is set in `runway.json`
- Verify LaTeX file exists at specified path
- Check LaTeX compilation errors in logs

**DocGen4 docs-static not found**
- The `docs-static` branch must exist in your repository
- Ensure `githubUrl` in `runway.json` points to the correct repository

## Related Repositories

| Repository | Purpose |
|------------|---------|
| [SubVerso](https://github.com/e-vergo/subverso) | Syntax highlighting extraction with O(1) indexed lookups |
| [LeanArchitect](https://github.com/e-vergo/LeanArchitect) | `@[blueprint]` attribute with 8 metadata + 3 status options |
| [Dress](https://github.com/e-vergo/Dress) | Artifact generation, graph layout, validation |
| [Runway](https://github.com/e-vergo/Runway) | Site generator, dashboard, paper/PDF generation |
| [SBS-Test](https://github.com/e-vergo/SBS-Test) | Minimal test project (16 nodes, all 6 status colors) |
| [General_Crystallographic_Restriction](https://github.com/e-vergo/General_Crystallographic_Restriction) | Production example with paper generation |
| [PrimeNumberTheoremAnd](https://github.com/e-vergo/PrimeNumberTheoremAnd) | Large-scale integration (530 annotations) |

## License

Apache 2.0
