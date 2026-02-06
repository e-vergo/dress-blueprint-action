# dress-blueprint-action

![Lean](https://img.shields.io/badge/Lean-v4.27.0-blue)
![License](https://img.shields.io/badge/License-Apache%202.0-green)

> **Prototype Status**: Alpha software with known bugs and incomplete features. Not yet production-ready.

GitHub Action and frontend assets for the [Side-by-Side Blueprint](https://github.com/e-vergo/SLS-Strange-Loop-Station) toolchain. Builds Lean 4 formalization projects into interactive documentation with side-by-side LaTeX statements and Lean proofs.

## Table of Contents

- [Overview](#overview)
- [Motivation](#motivation)
- [Live Examples](#live-examples)
- [GitHub Action](#github-action)
  - [Quick Start](#quick-start)
  - [Design Philosophy](#design-philosophy)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
  - [Build Pipeline](#build-pipeline-14-steps)
  - [DocGen4 Options](#docgen4-mode-options)
- [CSS Architecture](#css-architecture)
  - [File Organization](#file-organization)
  - [CSS Variables](#css-variables)
  - [6-Status Color Model](#6-status-color-model)
  - [Dark Mode](#dark-mode)
  - [Rainbow Brackets](#rainbow-bracket-colors)
  - [Status Dots](#status-dot-classes)
- [JavaScript](#javascript)
  - [verso-code.js](#verso-codejs-490-lines)
  - [plastex.js](#plastexjs-119-lines)
- [Integration](#integration)
  - [Project Requirements](#project-requirements)
  - [Asset Integration](#asset-integration)
  - [Paper Generation](#paper-generation)
  - [docs-static Pattern](#docs-static-branch-pattern)
- [Generated Site Structure](#generated-site-structure)
- [Related Repositories](#related-repositories)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

This repository provides two things:

| Component | Files | Lines | Purpose |
|-----------|-------|-------|---------|
| **GitHub Action** | `action.yml` | 432 | 14-step composite action: builds entire toolchain, generates site |
| **CSS** | 4 files | 3,332 | Design system, blueprint layout, paper styling, dependency graph |
| **JavaScript** | 2 files | 620 | Tooltips, pan/zoom, dark mode, proof synchronization, chapter toggle |

**Total frontend assets: 3,952 lines** across 6 files.

The action handles the complete build pipeline: checking out toolchain repos, building SubVerso -> LeanArchitect -> Dress -> Runway, generating artifacts, and deploying to GitHub Pages.

The CSS/JS assets provide the frontend for generated blueprint sites, including interactive dependency graphs, syntax-highlighted Lean code with hover tooltips, and dark/light theme support.

## Motivation

This toolchain exists because **a proof that typechecks is not necessarily the proof you intended**.

**Terence Tao, January 2026** (PNT+ Zulip):
> "When reviewing the blueprint graph I noticed an oddity in the Erdos 392 project: the final theorems were mysteriously disconnected from the rest of the lemmas; and the (AI-provided) proofs were suspiciously short. After some inspection I realized the problem: I had asked to prove the (trivial) statements that n! can be factored into **at least** n factors... when in fact the Erdos problem asks for **at most** n factors."
>
> "Another cautionary tale not to blindly trust AI auto-formalization, even when it typechecks..."

**The core insight**: Side-by-side display and dependency visualization make mismatches between intent and formalization visible. A disconnected subgraph in the dependency graph indicates that "proven" theorems may not follow from foundational lemmas.

This action automates the generation of this documentation, providing soundness guarantees beyond "compiles":
- Connectivity checks detect disconnected subgraphs
- Cycle detection finds circular dependencies
- `fullyProven` status verification ensures complete proof chains
- Side-by-side display enables human verification of statement correspondence

## Live Examples

| Project | Description |
|---------|-------------|
| [SBS-Test](https://e-vergo.github.io/SBS-Test/) | Minimal demonstration (33 nodes, all 6 status colors) |
| [General Crystallographic Restriction](https://e-vergo.github.io/General_Crystallographic_Restriction/) | Production example with paper generation (57 nodes) |
| [PrimeNumberTheoremAnd](https://e-vergo.github.io/PrimeNumberTheoremAnd/) | Large-scale integration (591 nodes, Tao's PNT project) |

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
- **No GitHub Actions mathlib cache** - Relies on mathlib server (`lake exe cache get`) which is faster and more reliable

### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `project-directory` | `.` | Directory containing `lakefile.toml` and `runway.json` |
| `lean-version` | (auto) | Override Lean version (auto-detected from `lean-toolchain`) |
| `docgen4-mode` | `skip` | DocGen4 mode: `skip`, `docs-static`, or `generate` |
| `deploy-pages` | `true` | Upload artifact for GitHub Pages deployment |

### Outputs

| Output | Description |
|--------|-------------|
| `site-path` | Path to generated site directory |
| `paper-pdf-path` | Path to generated paper PDF (if `paperTexPath` configured) |

### Build Pipeline (14 Steps)

| Step | Description | Time |
|------|-------------|------|
| 1 | Free disk space (removes Android SDK, .NET, Haskell) | ~1 min |
| 2 | Checkout toolchain repos (SubVerso, LeanArchitect, Dress, Runway, assets) | ~30s |
| 3 | Install elan | ~10s |
| 4 | Install Lean toolchain | ~30s |
| 5 | Install LaTeX (texlive packages) | ~2 min |
| 6 | Fetch mathlib cache from server | ~2-5 min |
| 7 | Build toolchain in dependency order: SubVerso -> LeanArchitect -> Dress -> Runway | ~5-10 min |
| 8 | Build project with Dress artifact generation | ~2-20 min |
| 9 | Build `:blueprint` Lake facet | ~30s |
| 10 | Generate dependency graph and manifest | ~1-15s |
| 11 | Generate site with Runway | ~30s |
| 12 | Generate paper/PDF (if `paperTexPath` configured) | ~30s |
| 13 | Handle DocGen4 (based on mode) | varies |
| 14 | Upload Pages artifact | ~30s |

Total time varies by project size: ~15 min for SBS-Test (33 nodes), ~25 min for GCR (57 nodes), ~35 min for PNT (591 nodes).

### DocGen4 Mode Options

| Mode | Behavior | Time Impact |
|------|----------|-------------|
| `skip` | No DocGen4 documentation (fastest, default) | None |
| `docs-static` | Download pre-generated docs from `docs-static` branch | ~seconds |
| `generate` | Run `lake -R -Kenv=dev build +:docs` (slow) | ~1 hour for mathlib projects |

### With Pre-generated DocGen4

```yaml
- uses: e-vergo/dress-blueprint-action@main
  with:
    docgen4-mode: docs-static
```

The `docs-static` pattern avoids regenerating DocGen4 documentation on each build. Generate docs locally, push to an orphan `docs-static` branch, and the action downloads them.

## CSS Architecture

### File Organization

Four files in `assets/` organize styles by concern. All files depend on `common.css` being loaded first.

| File | Lines | Purpose |
|------|-------|---------|
| `common.css` | 1,135 | Design system: CSS variables, status dots, Lean syntax highlighting, Tippy tooltips, modals, dark mode toggle, rainbow brackets |
| `blueprint.css` | 1,388 | Blueprint pages: plasTeX base styles, sidebar with collapsible chapter list, dashboard grid, side-by-side displays, zebra striping |
| `paper.css` | 271 | Paper pages: ar5iv-style academic layout, verification badges, print styles |
| `dep_graph.css` | 538 | Dependency graph: pan/zoom viewport, toolbar, legend, SVG node styling |

**Total CSS: 3,196 lines.**

### CSS Variables

`common.css` defines the design system in `:root`. Key variable groups:

**Core Palette**

| Variable | Light | Dark | Purpose |
|----------|-------|------|---------|
| `--sbs-bg-page` | #ebebeb | #252525 | Page background |
| `--sbs-bg-surface` | #ffffff | #1a1a1a | Card/panel background |
| `--sbs-text` | #000000 | #ffffff | Primary text |
| `--sbs-text-muted` | #333333 | #cccccc | Secondary text |
| `--sbs-border` | #333333 | #cccccc | Borders |
| `--sbs-link` | #0066cc | #60a5fa | Links |
| `--sbs-accent` | #396282 | #4a7a9e | Accent color |

**Zebra Striping**

| Mode | Row 1 | Row 2 |
|------|-------|-------|
| Light | #ffffff | #ebebeb |
| Dark | #1a1a1a | #252525 |

### 6-Status Color Model

These colors match the canonical definitions in `Dress/Graph/Svg.lean`:

| Variable | Status | Color Name | Hex |
|----------|--------|------------|-----|
| `--sbs-status-not-ready` | notReady | Sandy Brown | #F4A460 |
| `--sbs-status-ready` | ready | Light Sea Green | #20B2AA |
| `--sbs-status-sorry` | sorry | Dark Red | #8B0000 |
| `--sbs-status-proven` | proven | Light Green | #90EE90 |
| `--sbs-status-fully-proven` | fullyProven | Forest Green | #228B22 |
| `--sbs-status-mathlib-ready` | mathlibReady | Light Blue | #87CEEB |

**Priority order** (manual flags always win):
1. `mathlibReady` (manual) - highest
2. `ready` (manual)
3. `notReady` (manual, if explicitly set)
4. `fullyProven` (auto-computed from graph traversal)
5. `sorry` (auto-detected via sorryAx)
6. `proven` (auto-detected, has Lean code without sorry)
7. `notReady` (default, no Lean code)

**Color source of truth**: The Lean code in `Dress/Graph/Svg.lean` defines canonical hex values. CSS variables must match exactly.

### Dark Mode

Controlled via `html[data-theme="dark"]`. Theme selection persists to `localStorage` under `sbs-theme`. Defaults to light mode.

The toggle switch is rendered in the sidebar. Clicking calls `window.toggleSbsTheme()`.

### Rainbow Bracket Colors

Classes `.lean-bracket-1` through `.lean-bracket-6` cycle through bracket nesting depths. Brackets inside string literals and doc comments are not colored.

| Class | Light Mode | Dark Mode |
|-------|------------|-----------|
| `lean-bracket-1` | #d000ff | #e040ff |
| `lean-bracket-2` | #5126ff | #7156ff |
| `lean-bracket-3` | #0184BC | #01a4dc |
| `lean-bracket-4` | #4078F2 | #5098ff |
| `lean-bracket-5` | #50A14F | #70c16f |
| `lean-bracket-6` | #E45649 | #f47669 |

Rainbow brackets are generated by Verso's `toHtmlRainbow` function, which wraps brackets with depth-colored spans using a single global depth counter shared across all bracket types (`()`, `[]`, `{}`).

### Status Dot Classes

| Class | Size | Use Case |
|-------|------|----------|
| `.status-dot` | 8px | Base style |
| `.header-status-dot` | 10px | Blueprint theorem headers |
| `.paper-status-dot` | 10px | Paper theorem headers |
| `.modal-status-dot` | 12px | Dependency graph modals |

**Tooltip Themes**

| Theme | Background Variable | Border Variable |
|-------|---------------------|-----------------|
| warning | `--sbs-tooltip-warning-bg` | `--sbs-tooltip-warning-border` |
| error | `--sbs-tooltip-error-bg` | `--sbs-tooltip-error-border` |
| info | `--sbs-tooltip-info-bg` | `--sbs-tooltip-info-border` |

## JavaScript

Two files in `assets/` provide client-side interactivity.

| File | Lines | Purpose |
|------|-------|---------|
| `verso-code.js` | 490 | Token binding, Tippy.js tooltips, proof sync, pan/zoom, modal handling |
| `plastex.js` | 130 | Theme toggle, TOC toggle, LaTeX proof expand/collapse, chapter list toggle |

**Total JavaScript: 609 lines.**

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
- `lean` - Standard token hovers (type signatures, docstrings)
- `warning` - Warning messages
- `error` - Error messages
- `info` - Information messages
- `tactic` - Tactic state display

**Pan/Zoom Implementation**

The dependency graph uses pointer events for reliable cross-browser panning:
- `pointerdown` initiates drag (captures pointer for reliable tracking even if cursor leaves element)
- `pointermove` updates translation
- `pointerup`/`pointercancel` ends drag
- Mouse wheel zoom applies delta centered on cursor position
- Scale clamped to 0.1-5x range

The `fitToWindow()` function calculates content bounds using `getBBox()` and adjusts the transform to center the graph. This requires the SVG viewBox origin to be (0,0), which is ensured by coordinate normalization in the Sugiyama layout algorithm.

### plastex.js (130 lines)

UI controls and theme management. Depends on jQuery.

| Feature | Description |
|---------|-------------|
| `toggleSbsTheme()` | Toggles dark/light mode, persists to localStorage |
| Theme toggle click | Attached to `.theme-toggle` element |
| TOC toggle | Mobile sidebar show/hide via `#toc-toggle` |
| Proof toggle | Expands/collapses LaTeX proofs with jQuery animation, syncs Lean proof visibility |
| Chapter list toggle | Collapsible chapter list in sidebar; auto-expands on blueprint pages via `data-blueprint-page` body attribute |

The proof toggle synchronization ensures that when a LaTeX proof section is expanded/collapsed, the corresponding Lean proof body follows suit, maintaining visual correspondence in side-by-side displays.

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

   @[blueprint "thm:key" (keyDeclaration := true, message := "Central result")]
   theorem keyTheorem : P := by
     sorry
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

**During CI**: The action automatically rewrites this to the checked-out action repository (`_sbs_toolchain/dress-blueprint-action/assets`) when generating `runway-ci.json`.

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

Paper metadata is automatically extracted from standard LaTeX commands in `paper.tex`:
- `\title{...}` - Paper title
- `\author{...}` (split on `\and`) - Authors
- `\begin{abstract}...\end{abstract}` - Abstract

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
| `paper_tex.html` | Paper (if `paperTexPath` configured) |
| `paper.pdf` | PDF (if `paperTexPath` configured) |
| `pdf_tex.html` | Embedded PDF viewer |
| `manifest.json` | Node index and validation results |
| `assets/` | CSS and JavaScript files |
| `docs/` | DocGen4 documentation (if enabled) |

### Dashboard (index.html)

A 2x2 grid displaying:
- **Stats**: Progress counts for each status (notReady, ready, sorry, proven, fullyProven, mathlibReady)
- **Key Theorems**: Declarations marked with `(keyDeclaration := true)`
- **Messages**: User notes from `(message := "...")` attributes
- **Project Notes**: blocked, potentialIssue, technicalDebt, and misc notes

### Dependency Graph (dep_graph.html)

- Sugiyama hierarchical layout (~1500 lines in `Dress/Graph/Layout.lean`)
- Node shapes: rectangles for definitions, ellipses for theorems
- Edge styles: solid for proof dependencies, dashed for statement dependencies
- Pan/zoom with mouse wheel and drag
- Click nodes to open modals with full details
- Validation warnings for disconnected components or cycles

### Chapter Pages (chapter_*.html)

- Side-by-side LaTeX statements and Lean code
- Collapsible proof sections that sync between LaTeX and Lean
- Hover tooltips with type signatures
- Rainbow bracket highlighting for nested expressions
- Status dots indicating formalization progress

## Related Repositories

| Category | Repository | Purpose |
|----------|------------|---------|
| **Toolchain** | [SubVerso](https://github.com/e-vergo/subverso) | Syntax highlighting with O(1) indexed lookups via InfoTable |
| **Toolchain** | [LeanArchitect](https://github.com/e-vergo/LeanArchitect) | `@[blueprint]` attribute (8 metadata + 3 status options) |
| **Toolchain** | [Dress](https://github.com/e-vergo/Dress) | Artifact generation, graph layout, validation |
| **Toolchain** | [Runway](https://github.com/e-vergo/Runway) | Site generator, dashboard, paper/PDF |
| **Toolchain** | [Verso](https://github.com/e-vergo/verso) | Document framework (SBSBlueprint, VersoPaper genres) |
| **Example** | [SBS-Test](https://github.com/e-vergo/SBS-Test) | Minimal test (33 nodes, all 6 status colors) |
| **Example** | [General_Crystallographic_Restriction](https://github.com/e-vergo/General_Crystallographic_Restriction) | Production example with paper (57 nodes) |
| **Example** | [PrimeNumberTheoremAnd](https://github.com/e-vergo/PrimeNumberTheoremAnd) | Large-scale integration (591 nodes, Tao's PNT) |

### Dependency Chain

```
SubVerso -> LeanArchitect -> Dress -> Runway
              |
              +-> Verso (genres use SubVerso for highlighting)
```

The action builds these in dependency order, ensuring each component is available before its dependents are built.

## Tooling

For build commands, screenshot capture, compliance validation, archive management, and custom rubrics, see the [Archive & Tooling Hub](../../dev/storage/README.md).

## Troubleshooting

### No dressed artifacts found
- Verify `import Dress` in your Lean files
- Check declarations have `@[blueprint "label"]` attributes
- Review build logs for elaboration errors
- Ensure the build ran with artifact generation enabled (Step 8)

### manifest.json not found
- Ensure `runway.json` exists with valid `projectName`
- Verify `:blueprint` facet completed (Step 9)
- Check `extract_blueprint graph` output (Step 10)
- The `projectName` must match the name in your `lakefile.toml`

### Paper PDF not generated
- Confirm `paperTexPath` is set in `runway.json`
- Verify LaTeX file exists at specified path
- Check LaTeX compilation errors in logs (Step 12)
- Ensure texlive packages were installed (Step 5)

### DocGen4 docs-static not found
- The `docs-static` branch must exist in your repository
- Ensure `githubUrl` in `runway.json` points to the correct repository
- The branch must contain the docs at the root level, not in a subdirectory

### Build takes too long
- Use `docgen4-mode: skip` (default) to skip DocGen4
- Use `docgen4-mode: docs-static` instead of `generate` for pre-built docs
- Check if mathlib cache is being fetched successfully (Step 6)
- Large projects (>100 nodes) may take 15+ minutes for SubVerso highlighting

### Graph appears off-center
- This is usually a viewBox normalization issue
- The SVG viewBox should start at `0 0 ...`
- Check that `fitToWindow()` is being called after the graph loads
- Inspect `.lake/build/runway/dep_graph.html` for SVG structure

### Status colors don't match
- CSS variables in `common.css` must match Lean definitions in `Dress/Graph/Svg.lean`
- The Lean code is the source of truth for hex values
- Clear browser cache if colors were recently updated

## License

Apache 2.0
