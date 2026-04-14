# Shared Packages

This directory is reserved for cross-product packages that are genuinely shared across multiple Omnia Creata products.

Product-local packages may remain inside a product root until they are mature enough to be promoted here.

## Promotion rule

Move a package into root `packages/` only when all of the following are true:

- at least two products need the same surface
- the boundary is stable enough to name clearly
- the package can be described without product-specific language
- extracting it reduces duplication instead of spreading confusion

## Keep local by default

These usually stay inside the product that owns them:

- product UI components
- product design tokens
- product-specific contracts
- product-specific i18n catalogs
- feature utilities tied to one app

## Good root-package candidates

- shared TypeScript config
- shared Tailwind or tooling presets
- shared validation primitives
- shared ecosystem contracts used by multiple products

## Current extraction map

### First-wave review candidates

- Prompt Vault `packages/config`
- Omnia Watch `packages/config`
- repeated `types` and `validation` families where the surface is no longer product-specific

### Not ready for promotion yet

- Omnia Watch `packages/ui`
- Omnia Watch `packages/design-tokens`
- Omnia Watch `packages/api-contracts`
- Control Center `packages/contracts`
- OmniaPixels `packages/shared` until it owns a real boundary or gets deleted

## Anti-patterns

- creating a new product-local `shared` bucket without a documented boundary
- promoting unstable package code just because names match
- leaving root `packages/` empty while cloned local package families keep multiplying
