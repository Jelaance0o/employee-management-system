# TeamSpace frontend refactor — first pass

This source package reorganizes the frontend without changing the existing API client or authentication/theme providers.

## Structure changes

- `src/App.tsx` now focuses on providers and routes.
- `src/components/layout/WorkspaceLayout.tsx` contains the authenticated app shell and navigation.
- Pages are grouped by feature under `src/features/`.
- Dashboard, Team, and Projects styles live with their feature.
- `src/index.css` now imports Tailwind and the global style foundation only.
- `src/styles/base.css`, `theme.css`, and `components.css` separate browser defaults, theme tokens, and shared component styles.
- Project types, helpers, badges, and dialog are extracted into focused files.
- Project CSS is split into layout, table, dialogs, and responsive files.

## Preserve existing project setup

The uploaded source archive did not include `tsconfig.app.json` or `tsconfig.node.json`, although `tsconfig.json` references them. Keep those existing files from your local project when copying the refactored `src` folder.

## Validation

- Relative import paths checked: no missing local imports found.
- TypeScript/TSX syntax transpilation: no syntax diagnostics.
- CSS brace balance checked for every stylesheet.
- A full `npm run build` could not be run here because dependencies were not present in the uploaded archive and package installation timed out. Run it locally before continuing.
