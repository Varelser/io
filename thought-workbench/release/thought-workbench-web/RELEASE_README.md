# Release Package

Generated: 2026-03-21T09:00:43.168Z

## Contents

- app/: static web bundle copied from dist/
- README.md: project overview and deployment notes
- INSTALL.md: setup and release checklist
- CHANGELOG.md: milestone summary for this release line
- RELEASE_MANIFEST.json: machine-readable file inventory

## Usage

1. Upload the contents of app/ to your static host.
2. Keep README.md, INSTALL.md, and CHANGELOG.md alongside the release package for operators.
3. Use CHANGELOG.md to review the scope of the packaged milestone before deployment.
4. Do not deploy source files, node_modules, or development docs from the repository root.
