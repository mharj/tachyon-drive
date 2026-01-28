---
name: typescript-monorepo
description: Helps with a specific task. Use when you need to handle typescript monorepo tasks.
---

# typescript-monorepo

This helps on maintain typescript monorepo. It can handle tasks like building, validating, running tests.

## Files

### root: `tsconfig.workspace.json`

- typescript workspace configuration (compilerOptions paths to packages)
- ensure that all packages are included in `compilerOptions.paths` structure.

### root: `tsconfig.json`

- root typescript configuration (references to packages)
- ensure that all packages are included in `references.path` structure.

### root: `tsconfig.base.json`

- root typescript base configuration (compilerOptions)

### packages/\*: `tsconfig.json`

- package typescript configuration (extends root tsconfig.base.json, references to dependencies)

### packages/\*: `tsconfig.build.json`

- package typescript build configuration (extends module tsconfig, no references to dependencies and excludes test files)
