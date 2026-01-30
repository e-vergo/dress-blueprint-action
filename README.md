# dress-blueprint-action

![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue)
![License](https://img.shields.io/badge/License-Apache%202.0-green)

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

## Example Workflows

### Basic (Blueprint Only)

```yaml
- uses: e-vergo/dress-blueprint-action@main
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
    docgen4-mode: docs-static
```

### Full Featured Workflow

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

---

## Build Pipeline Internals

The action executes a 14-step pipeline that builds the entire toolchain and generates documentation. Understanding these steps helps with debugging and customization.

### Pipeline Overview

```
Step 1:  Free disk space
Step 2:  Checkout toolchain repos (SubVerso, LeanArchitect, Dress, Runway)
Step 3:  Install elan (Lean version manager)
Step 4:  Install Lean toolchain
Step 5:  Install LaTeX
Step 6:  Fetch mathlib cache from server
Step 7:  Build toolchain (in dependency order)
Step 8:  Build project with Dress artifact generation
Step 9:  Build :blueprint Lake facet
Step 10: Generate dependency graph and manifest
Step 11: Generate site with Runway
Step 12: Generate paper (if configured)
Step 13: Handle DocGen4 (based on mode)
Step 14: Upload Pages artifact
```

### Step-by-Step Details

#### Step 1: Free Disk Space

Removes unused software (Android SDK, .NET, Haskell) to provide ~6GB additional space for large mathlib builds. Uses `jlumbroso/free-disk-space@v1.3.0`.

#### Step 2: Checkout Toolchain Repos

Clones all four toolchain repositories into `_sbs_toolchain/`:

```
_sbs_toolchain/
├── subverso/        # Syntax highlighting extraction
├── LeanArchitect/   # @[blueprint] attribute
├── Dress/           # Artifact generation
├── Runway/          # Site generator
└── dress-blueprint-action/  # CSS/JS assets
```

#### Step 3: Install elan

Downloads and installs elan (Lean version manager) from GitHub:

```bash
curl -sSfL https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y --default-toolchain none
```

#### Step 4: Install Lean Toolchain

Reads `lean-toolchain` from your project to determine the Lean version. If `lean-version` input is provided, uses that instead.

#### Step 5: Install LaTeX

Installs TeX Live packages for PDF generation:

```bash
sudo apt-get install -y texlive-latex-base texlive-fonts-recommended texlive-latex-extra texlive-science
```

#### Step 6: Fetch Mathlib Cache

Downloads pre-built `.olean` files from the mathlib cache server instead of compiling mathlib from source (~1 hour savings):

```bash
lake exe cache get
```

Falls back to source compilation if the cache is unavailable.

#### Step 7: Build Toolchain

Builds all four toolchain components in dependency order:

```
SubVerso    (syntax highlighting, no dependencies)
     ↓
LeanArchitect    (depends on SubVerso)
     ↓
Dress       (depends on LeanArchitect)
     ↓
Runway      (depends on Dress)
```

Each is built with `lake build` in its directory.

#### Step 8: Build Project with Dress

Builds your project with Dress artifact generation enabled:

```bash
mkdir -p .lake/build
echo "1" > .lake/build/.dress    # Enable artifact capture
lake build
rm -f .lake/build/.dress
```

**What happens during this step:**
- Every `@[blueprint]` annotated declaration triggers Dress capture
- SubVerso extracts syntax highlighting with hover data (93-99% of build time)
- Dress writes artifacts to `.lake/build/dressed/{Module}/{label}/`:
  - `decl.tex` - LaTeX source
  - `decl.html` - Rendered HTML with hovers
  - `decl.json` - Metadata (status, dependencies, etc.)
  - `decl.hovers.json` - Hover tooltip data

#### Step 9: Build Blueprint Facet

Runs the Lake `:blueprint` facet which aggregates all artifacts:

```bash
lake build :blueprint
```

This step does not generate the manifest yet; it prepares the build environment.

#### Step 10: Generate Dependency Graph

Extracts project name from `runway.json` and runs the Dress graph generator:

```bash
lake env extract_blueprint graph --build .lake/build ProjectName
```

**What this produces:**
- `manifest.json` - Complete project data including:
  - All nodes with status, title, dependencies
  - Precomputed stats (StatusCounts)
  - Validation results (connectivity, cycles)
  - Project metadata (key theorems, messages, notes)
- `dep-graph.json` - Raw dependency graph data
- `dep-graph.svg` - Rendered SVG with Sugiyama layout

**Key algorithms:**
- `Node.inferUses` traces actual Lean code dependencies (replaces manual `\uses{}`)
- Two-pass edge processing: PASS 1 registers labels, PASS 2 adds edges
- `computeFullyProven` upgrades `proven` nodes via graph traversal (O(V+E))
- `findComponents` detects disconnected subgraphs
- `detectCycles` finds circular dependencies

#### Step 11: Generate Site with Runway

Creates a CI-compatible config with absolute paths and runs Runway:

```bash
lake exe runway --build-dir .lake/build --output .lake/build/runway build runway-ci.json
```

**What this produces:**
- `index.html` - Dashboard homepage
- `dep_graph.html` - Interactive dependency graph
- Chapter pages with side-by-side displays
- `assets/` - CSS and JavaScript copied from dress-blueprint-action

**Key processing:**
- Parses `blueprint.tex` for document structure
- Loads artifacts from `.lake/build/dressed/`
- Loads `manifest.json` (no stat recomputation for soundness)
- Expands `\inputleanmodule{}` placeholders with module content
- Renders side-by-side displays with proof toggles

#### Step 12: Generate Paper (if configured)

If `paperTexPath` is set in `runway.json`:

```bash
lake exe runway --build-dir .lake/build --output .lake/build/runway paper runway-ci.json
```

**What this produces:**
- `paper.html` - HTML version with MathJax
- `paper.pdf` - PDF compiled with available LaTeX engine (tectonic > pdflatex > xelatex > lualatex)
- `pdf.html` - PDF viewer page

**Paper hooks:**
- `\paperstatement{label}` - Insert LaTeX statement with Lean link
- `\paperfull{label}` - Insert full side-by-side display

Paper metadata (title, authors, abstract) is extracted from the TeX file using standard LaTeX commands.

#### Step 13: Handle DocGen4

Depends on `docgen4-mode` input:

| Mode | Action |
|------|--------|
| `skip` | Do nothing |
| `docs-static` | `git fetch` from `docs-static` branch, copy to `runway/docs/` |
| `generate` | Run `lake -R -Kenv=dev build +:docs`, copy to `runway/docs/` |

#### Step 14: Upload Pages Artifact

Verifies site structure and uploads for GitHub Pages:

```bash
# Verifies presence of:
# - index.html, dep_graph.html
# - assets/ directory
# - Optional: paper.html, paper.pdf, docs/
```

Uses `actions/upload-pages-artifact@v3` for the `deploy-pages` action.

---

## Assets Inventory

This repository includes CSS and JavaScript assets used by generated sites:

| File | Size | Purpose |
|------|------|---------|
| `assets/common.css` | Base | Theme toggle (dark/light mode), status dot styles, typography |
| `assets/blueprint.css` | Full | Modal styles, graph styles, dashboard grid, sidebar, proof toggles |
| `assets/paper.css` | Paper | Paper-specific layout and verification badges |
| `assets/verso-code.js` | Main | Hover tooltips (Tippy.js), pan/zoom (D3-style), modal MathJax init, fit algorithm |
| `assets/plastex.js` | Paper | LaTeX proof toggle (expand/collapse via CSS checkboxes) |

### Key JavaScript Functions

**verso-code.js:**
- `onModalOpen()` - Initializes MathJax and Tippy.js when modal opens
- Pan/zoom behavior using D3-style wheel/drag events
- Fit button with `getBBox()` for proper content centering
- Token binding for syntax highlighting hovers

**plastex.js:**
- Proof toggle using CSS checkbox pattern (no JS state needed)

### CSS Architecture

**Status colors (6-status model):**
| Status | Color | Hex |
|--------|-------|-----|
| notReady | Sandy Brown | `#F4A460` |
| ready | Light Sea Green | `#20B2AA` |
| sorry | Dark Red | `#8B0000` |
| proven | Light Green | `#90EE90` |
| fullyProven | Forest Green | `#228B22` |
| mathlibReady | Light Blue | `#87CEEB` |

Assets are automatically copied to the generated site during Step 11.

---

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

---

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

---

## Troubleshooting

### No dressed artifacts found

Check that:
- Dress is imported in your Lean files (`import Dress`)
- Declarations have `@[blueprint "label"]` attributes
- The build completed without errors

### manifest.json not found

Ensure:
- `runway.json` exists with valid `projectName`
- Step 9 (:blueprint facet) completed successfully
- Step 10 (extract_blueprint graph) ran without errors

### Paper PDF not generated

Verify:
- `paperTexPath` is set in `runway.json`
- LaTeX file exists at specified path
- No LaTeX compilation errors in logs

### DocGen4 docs-static not found

The `docs-static` branch must exist in your repository. Create it following the pattern above.

---

## Related Repositories

| Repository | Purpose |
|------------|---------|
| [Runway](https://github.com/e-vergo/Runway) | Site generator, dashboard, paper/PDF generation |
| [Dress](https://github.com/e-vergo/Dress) | Artifact generation, stats, validation, dependency graph |
| [LeanArchitect](https://github.com/e-vergo/LeanArchitect) | `@[blueprint]` attribute with metadata/status options |
| [subverso](https://github.com/e-vergo/subverso) | Syntax highlighting extraction (fork with optimizations) |
| [SBS-Test](https://github.com/e-vergo/SBS-Test) | Minimal test project (16 nodes, all 6 status colors) |
| [General_Crystallographic_Restriction](https://github.com/e-vergo/General_Crystallographic_Restriction) | Production example with paper generation |
| [PrimeNumberTheoremAnd](https://github.com/e-vergo/PrimeNumberTheoremAnd) | Large-scale integration (530 annotations) |

---

## License

Apache 2.0
