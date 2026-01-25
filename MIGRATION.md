# Migration from docgen-action

This guide covers migrating from `leanprover-community/docgen-action` to `dress-blueprint-action`.

## Why Migrate

- **Side-by-side display** of LaTeX theorems and Lean proofs
- **Syntax highlighting** for Lean code in blueprint HTML
- **Hover tooltips** showing type information on Lean identifiers

## Step 1: Update lakefile.toml

Remove any existing `LeanArchitect` dependency and add Dress:

```toml
[[require]]
name = "Dress"
git = "https://github.com/e-vergo/Dress"
rev = "main"
```

## Step 2: Update Lean Imports

In files using `@[blueprint]` attributes, change:

```lean
import Architect        -- or import LeanArchitect
```

To:

```lean
import Dress
```

The `@[blueprint "label"]` attribute syntax is unchanged.

## Step 3: Update blueprint.tex

Change the library index input path from:

```latex
\input{../../.lake/build/blueprint/library/YourProject}
```

To:

```latex
\input{../../.lake/build/dressed/library/YourProject.tex}
```

Note the `dressed` directory and explicit `.tex` extension.

## Step 4: Update Workflow YAML

**Before** (docgen-action):

```yaml
- name: Build blueprint
  uses: leanprover-community/docgen-action@main
  with:
    # docgen-action configuration
```

**After** (dress-blueprint-action):

```yaml
- name: Install elan
  run: |
    curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh -s -- -y
    echo "$HOME/.elan/bin" >> $GITHUB_PATH

- name: Build blueprint
  uses: e-vergo/dress-blueprint-action@v1
```

Full workflow example:

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

## Step 5: Fetch Dependencies

```bash
lake update Dress
```

Commit the updated `lake-manifest.json`.
