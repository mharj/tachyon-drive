---
name: pnpm-monorepo
description: Helps with a specific task. Use when you need to handle package management for a monorepo.
---

# pnpm-monorepo

All pnpm commands are always run from the root of the monorepo.

## When to use this skill

Use this skill when you need to handle package management for a monorepo.

## How to use this skill

Always after package changes run `pnpm i` to update the whole monorepo.
Check that all needed internal dependencies are correct.

## Internal dependencies

- peerDependencies all internal modules other than main module should have peerDependencies to main module.
- devDependencies to main module (or other internal modules) should be specified as `workspace:*`.
- peerDependencies all external modules should be installed and match on root package.json versions.

## Files

- root: `pnpm-workspace.yaml` - workspace configuration (packages)
