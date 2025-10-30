# Design System

## Typography

### Heading Sizes
Define heading hierarchy (h1, h2, h3, etc.) with relative sizing in rem or using Tailwind classes. Keep sizes consistent across all pages. If we change a heading size, it applies everywhere.

Example format:
- **h1:** `text-4xl` or `2.25rem`
- **h2:** `text-3xl` or `1.875rem`
- **h3:** `text-2xl` or `1.5rem`

## Colors

- **Rebel Green:** #24a455
- **Rebel Yellow:** #ffc107
- **Rebel Dark Gray:** #202020

## Layout & Containers

- All containers are **transparent**
- Background colors and textures are applied via the `<Section>` component
- Components inherit `--text-color`, `--accent-color`, and other CSS variables from Section

## Shadows

Default shadow style (unless explicitly overridden):
- Define a standard shadow (e.g., Tailwind's `shadow-md` or custom)
- Apply consistently across all components that use shadows

## Spacing & Defaults

Add any other consistent spacing rules, padding defaults, or layout patterns here.