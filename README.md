# dress-blueprint-action

![Lean](https://img.shields.io/badge/Lean-v4.27.0-blue)
![License](https://img.shields.io/badge/License-Apache%202.0-green)

> **Prototype Status**: Alpha software with known bugs and incomplete features. Not yet production-ready.

GitHub Action and frontend assets for the [Side-by-Side Blueprint](https://github.com/e-vergo/Side-By-Side-Blueprint) toolchain. Builds Lean 4 formalization projects into interactive documentation with side-by-side LaTeX statements and Lean proofs.

## Contents

| Component | Files | Lines | Purpose |
|-----------|-------|-------|---------|
| **GitHub Action** | `action.yml` | 432 | 14-step composite action: builds toolchain, generates site |
| **CSS** | 4 files | 3,145 | Design system, blueprint layout, paper styling, dependency graph |
| **JavaScript** | 2 files | 599 | Tooltips, pan/zoom, dark mode, proof synchronization |

## Live Examples

| Project | Description |
|---------|-------------|
| [SBS-Test](https://e-vergo.github.io/SBS-Test/) | Minimal demonstration (33 nodes, all 6 status colors) |
| [General Crystallographic Restriction](https://e-vergo.github.io/General_Crystallographic_Restriction/) | Production example with paper generation (57 nodes) |

## GitHub Action

### Quick Start

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

This minimal workflow (~30 lines) is all you need. The action handles the entire build pipeline.

### Design Philosophy

- **Manual triggers only** - Uses `workflow_dispatch` so users control deployments
- **Simplified per-project workflows** - ~30 lines per project
- **Centralized complexity** - All 14 build steps live in this action
- **No GitHub Actions mathlib cache** - Relies on mathlib server (`lake exe cache get`)

### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `project-directory` | `.` | Directory containing `lakefile.toml` and `runway.json` |
| `lean-version` | (auto) | Override Lean version (auto-detected from `lean-toolchain`) |
| `docgen4-mode` | `skip` | DocGen4 mode: `skip`, `docs-static`, or `generate` |
| `deploy-pages` | `true` | Upload artifact for GitHub Pages deployment |

### DocGen4 Mode Options

| Mode | Behavior |
|------|----------|
| `skip` | No DocGen4 documentation (fastest, default) |
| `docs-static` | Download pre-generated docs from `docs-static` branch (~seconds) |
| `generate` | Run `lake -R -Kenv=dev build +:docs` (slow, ~1 hour for mathlib projects) |

### Outputs

| Output | Description |
|--------|-------------|
| `site-path` | Path to generated site directory |
| `paper-pdf-path` | Path to generated paper PDF (if `paperTexPath` configured) |

### Build Pipeline (14 Steps)

| Step | Description |
|------|-------------|
| 1 | Free disk space (removes Android SDK, .NET, Haskell) |
| 2 | Checkout toolchain repos (SubVerso, LeanArchitect, Dress, Runway, assets) |
| 3 | Install elan |
| 4 | Install Lean toolchain |
| 5 | Install LaTeX (texlive packages) |
| 6 | Fetch mathlib cache from server |
| 7 | Build toolchain in dependency order: SubVerso -> LeanArchitect -> Dress -> Runway |
| 8 | Build project with Dress artifact generation (`BLUEPRINT_DRESS=1`) |
| 9 | Build `:blueprint` Lake facet |
| 10 | Generate dependency graph and manifest |
| 11 | Generate site with Runway |
| 12 | Generate paper/PDF (if `paperTexPath` configured) |
| 13 | Handle DocGen4 (based on mode) |
| 14 | Upload Pages artifact |

### With Pre-generated DocGen4

```yaml
- uses: e-vergo/dress-blueprint-action@main
  with:
    docgen4-mode: docs-static
```

The `docs-static` pattern avoids regenerating DocGen4 documentation on each build. Generate docs locally, push to an orphan `docs-static` branch, and the action downloads them.

## CSS Architecture

Four files in `assets/` organize styles by concern (3,145 lines total). All files depend on `common.css` being loaded first.

| File | Lines | Purpose |
|------|-------|---------|
| `common.css` | 1,053 | Design system: CSS variables, status dots, Lean syntax, Tippy tooltips, modals, dark mode, rainbow brackets |
| `blueprint.css` | 1,283 | Blueprint pages: plasTeX base, sidebar, chapter layout, dashboard grid, side-by-side displays, zebra striping |
| `paper.css` | 271 | Paper pages: ar5iv-style academic layout, verification badges, print styles |
| `dep_graph.css` | 538 | Dependency graph: pan/zoom viewport, toolbar, legend, SVG node styling |

### CSS Variables

`common.css` defines the design system in `:root`. Key variable groups:

**Core Palette**

| Variable | Light | Dark |
|----------|-------|------|
| `--sbs-bg-page` | #ebebeb | #252525 |
| `--sbs-bg-surface` | #ffffff | #1a1a1a |
| `--sbs-text` | #000000 | #ffffff |
| `--sbs-text-muted` | #333333 | #cccccc |
| `--sbs-border` | #333333 | #cccccc |
| `--sbs-link` | #0066cc | #60a5fa |
| `--sbs-accent` | #396282 | #4a7a9e |

**Status Colors (6-status model)**

These colors match the Lean definitions in `Dress/Graph/Svg.lean`:

| Variable | Status | Color Name | Hex |
|----------|--------|------------|-----|
| `--sbs-status-not-ready` | notReady | Sandy Brown | #F4A460 |
| `--sbs-status-ready` | ready | Light Sea Green | #20B2AA |
| `--sbs-status-sorry` | sorry | Dark Red | #8B0000 |
| `--sbs-status-proven` | proven | Light Green | #90EE90 |
| `--sbs-status-fully-proven` | fullyProven | Forest Green | #228B22 |
| `--sbs-status-mathlib-ready` | mathlibReady | Light Blue | #87CEEB |

**Tooltip Themes**

| Theme | Background Variable | Border Variable |
|-------|---------------------|-----------------|
| warning | `--sbs-tooltip-warning-bg` | `--sbs-tooltip-warning-border` |
| error | `--sbs-tooltip-error-bg` | `--sbs-tooltip-error-border` |
| info | `--sbs-tooltip-info-bg` | `--sbs-tooltip-info-border` |

**Rainbow Bracket Colors**

Classes `.lean-bracket-1` through `.lean-bracket-6` cycle through bracket nesting depths. Light mode uses a purple/blue palette; dark mode uses Dracula-style brighter colors.

### Dark Mode

Controlled via `html[data-theme="dark"]`. Theme selection persists to `localStorage` under `sbs-theme`. Defaults to light mode.

The toggle switch is rendered in the sidebar. Clicking calls `window.toggleSbsTheme()`.

### Status Dot Classes

| Class | Size | Use Case |
|-------|------|----------|
| `.status-dot` | 8px | Base style |
| `.header-status-dot` | 10px | Blueprint theorem headers |
| `.paper-status-dot` | 10px | Paper theorem headers |
| `.modal-status-dot` | 12px | Dependency graph modals |

## JavaScript

Two files in `assets/` provide client-side interactivity (599 lines total).

### verso-code.js (490 lines)

Lean code interactivity. Depends on Tippy.js and optionally marked.js.

| Feature | Description |
|---------|-------------|
| Token binding highlights | Hovering a variable highlights all occurrences with the same binding |
| Tippy.js tooltips | Type signatures, docstrings, and tactic states shown on hover |
| Tactic state display | Proof goals shown via checkbox toggle or tooltip |
| Error/warning popups | Compiler messages displayed with themed tooltips |
| Proof sync | Lean proof body visibility syncs with LaTeX proof toggle |
| Pan/zoom controls | Mouse wheel zoom (centered on cursor), pointer drag panning |
| `fitToWindow()` | Fits graph to viewport using SVG `getBBox()` |
| `onModalOpen()` | Initializes MathJax and Tippy in modals, positions blueprint link |
| Node click handling | Clicking graph nodes opens corresponding modal |

**Tippy Themes**

Elements are tagged with `data-tippy-theme`:
- `lean` - Standard token hovers
- `warning` - Warning messages
- `error` - Error messages
- `info` - Information messages
- `tactic` - Tactic state display

**Pan/Zoom Implementation**

The dependency graph uses pointer events for panning:
- `pointerdown` initiates drag (captures pointer for reliable tracking)
- `pointermove` updates translation
- `pointerup`/`pointercancel` ends drag
- Mouse wheel zoom applies delta centered on cursor position
- Scale clamped to 0.1-5x range

### plastex.js (109 lines)

UI controls. Depends on jQuery.

| Feature | Description |
|---------|-------------|
| `toggleSbsTheme()` | Toggles dark/light mode, persists to localStorage |
| Theme toggle click | Attached to `.theme-toggle` element |
| TOC toggle | Mobile sidebar show/hide via `#toc-toggle` |
| Proof toggle | Expands/collapses LaTeX proofs with jQuery animation, syncs Lean proof visibility |

## Integration

### Project Requirements

1. **Dress dependency** in `lakefile.toml`:
   ```toml
   [[require]]
   name = "Dress"
   git = "https://github.com/e-vergo/Dress"
   rev = "main"
   ```

2. **`@[blueprint]` attributes** on declarations:
   ```lean
   import Dress

   @[blueprint "thm:main"]
   theorem mainTheorem : 2 + 2 = 4 := rfl
   ```

3. **runway.json** configuration:
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

### Asset Integration

The `assetsDir` field in `runway.json` points to where CSS/JS files are located.

**During CI**: The action automatically sets this to the checked-out action repository (`_sbs_toolchain/dress-blueprint-action/assets`).

**For local development**: Set it to a relative path to your local clone:
```json
{
  "assetsDir": "../dress-blueprint-action/assets"
}
```

### Paper Generation

To enable paper/PDF generation, add to `runway.json`:

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

### docs-static Branch Pattern

For mathlib-dependent projects where DocGen4 generation takes ~1 hour:

1. Generate docs locally:
   ```bash
   lake -R -Kenv=dev build Module:docs
   ```

2. Push to orphan branch:
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

## Generated Site Structure

The action generates:

| Path | Content |
|------|---------|
| `index.html` | Dashboard with stats, key theorems, messages, project notes |
| `dep_graph.html` | Interactive dependency graph with pan/zoom and node modals |
| `chapter_*.html` | Chapter pages with side-by-side theorem/proof displays |
| `paper.html` | Paper (if `paperTexPath` configured) |
| `paper.pdf` | PDF (if `paperTexPath` configured) |
| `pdf.html` | Embedded PDF viewer |
| `assets/` | CSS and JavaScript files |
| `docs/` | DocGen4 documentation (if enabled) |

## Related Repositories

| Category | Repository | Purpose |
|----------|------------|---------|
| Toolchain | [SubVerso](https://github.com/e-vergo/subverso) | Syntax highlighting with O(1) indexed lookups |
| Toolchain | [LeanArchitect](https://github.com/e-vergo/LeanArchitect) | `@[blueprint]` attribute (8 metadata + 3 status options) |
| Toolchain | [Dress](https://github.com/e-vergo/Dress) | Artifact generation, graph layout, validation |
| Toolchain | [Runway](https://github.com/e-vergo/Runway) | Site generator, dashboard, paper/PDF |
| Example | [SBS-Test](https://github.com/e-vergo/SBS-Test) | Minimal test (33 nodes, all 6 status colors) |
| Example | [General_Crystallographic_Restriction](https://github.com/e-vergo/General_Crystallographic_Restriction) | Production example with paper (57 nodes) |
| Example | [PrimeNumberTheoremAnd](https://github.com/e-vergo/PrimeNumberTheoremAnd) | Large-scale integration (591 nodes, Tao's PNT) |

## Troubleshooting

### No dressed artifacts found
- Verify `import Dress` in your Lean files
- Check declarations have `@[blueprint "label"]` attributes
- Review build logs for elaboration errors

### manifest.json not found
- Ensure `runway.json` exists with valid `projectName`
- Verify `:blueprint` facet completed (Step 9)
- Check `extract_blueprint graph` output (Step 10)

### Paper PDF not generated
- Confirm `paperTexPath` is set in `runway.json`
- Verify LaTeX file exists at specified path
- Check LaTeX compilation errors in logs

### DocGen4 docs-static not found
- The `docs-static` branch must exist in your repository
- Ensure `githubUrl` in `runway.json` points to the correct repository

### Build takes too long
- Use `docgen4-mode: skip` (default) to skip DocGen4
- Use `docgen4-mode: docs-static` instead of `generate` for pre-built docs
- Check if mathlib cache is being fetched successfully (Step 6)

## License

Apache 2.0
