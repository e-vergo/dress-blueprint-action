# Dress Blueprint Action

A GitHub Action for building Lean 4 projects with [Dress](https://github.com/e-vergo/Dress) syntax highlighting and [leanblueprint](https://github.com/e-vergo/leanblueprint) documentation.

## Features

- **Syntax-highlighted Lean code** in blueprint HTML output
- **Hover tooltips** showing type information
- **Side-by-side display** of LaTeX theorems and Lean proofs
- **Synchronized proof toggles** for LaTeX and Lean proofs
- **PDF and web** blueprint generation
- **GitHub Pages deployment** ready

## Quick Start

Add this workflow to `.github/workflows/blueprint.yml`:

```yaml
name: Blueprint

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install elan
        run: |
          curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh -s -- -y
          echo "$HOME/.elan/bin" >> $GITHUB_PATH

      - uses: e-vergo/dress-blueprint-action@v1

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
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
   ```

3. **Blueprint directory** with `web.tex` and `print.tex`

4. **Library index input** in `blueprint/src/blueprint.tex`:
   ```latex
   \input{../../.lake/build/dressed/library/YourLibName.tex}
   ```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `build-dressed` | `true` | Build with Dress artifact generation |
| `blueprint-facet` | `true` | Run `lake build :blueprint` for library index |
| `build-pdf` | `true` | Generate PDF blueprint |
| `build-web` | `true` | Generate web blueprint |
| `check-decls` | `true` | Verify declarations in lean_decls |
| `lake-package-directory` | `.` | Lake package location |
| `blueprint-directory` | `blueprint` | Blueprint source location |
| `deploy-pages` | `true` | Upload GitHub Pages artifact |
| `output-directory` | `_site` | Assembled site output directory |
| `use-mathlib-cache` | `true` | Fetch Mathlib cache |
| `clean-dressed` | `false` | Remove dressed artifacts before build |
| `leanblueprint-version` | `git+...` | leanblueprint pip spec |

## Outputs

| Output | Description |
|--------|-------------|
| `blueprint-pdf-path` | Path to generated PDF |
| `blueprint-web-path` | Path to generated web directory |

## Build Process

The action performs these steps:

1. **Fetch Mathlib cache** (optional) - Downloads pre-built oleans
2. **Create `.dress` marker** - Enables Dress artifact generation
3. **Build project** - `lake build` generates Lean + Dress artifacts
4. **Remove marker** - Clean up after build
5. **Generate library index** - `lake build :blueprint`
6. **Build blueprint** - `leanblueprint pdf` and `leanblueprint web`
7. **Check declarations** - Verify lean_decls against project
8. **Assemble site** - Combine web + PDF for Pages
9. **Upload artifact** - Ready for `deploy-pages` action

## Examples

See the [examples/](examples/) directory for:
- [basic-workflow.yml](examples/basic-workflow.yml) - Minimal setup
- [full-workflow.yml](examples/full-workflow.yml) - All options with caching

## Migration from docgen-action

If you're using `leanprover-community/docgen-action` for blueprints:

1. Add Dress dependency to lakefile.toml
2. Update Lean imports from `LeanArchitect` to `Dress`
3. Add library index input to blueprint.tex
4. Replace workflow step with this action

See [MIGRATION.md](MIGRATION.md) for detailed instructions.

## License

Apache 2.0
