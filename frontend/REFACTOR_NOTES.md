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

## Second pass — Projects component extraction

- `ProjectsPage.tsx` now coordinates data loading, filtering state, mutations, and permissions instead of owning all project-page markup.
- Extracted `ProjectStats`, `ProjectFilters`, `ProjectTable`, `ProjectFormDialog`, and `ProjectDetailsDialog` into separate components.
- Kept shared project badges/dialog, types, and utility functions in their focused files.
- Kept project styles split by layout, table, dialogs, and responsive behavior.
- API paths and payload behavior are unchanged from the previous page implementation.

## Validation after second pass

- TypeScript transpilation syntax check passed for all 21 TS/TSX files.
- Local import-path check is performed when packaging.
- Full type-check and Vite build still need to be run in the local project with its installed dependencies.

## Third pass — Team page component extraction

- Reduced `features/team/TeamPage.tsx` to data loading, state, API mutations, and composition of the UI.
- Extracted team stats, search/role filters, member table, invitation flow, role-change dialog, deactivation dialog, feedback, badges, and dialog shell into focused components.
- Moved team-specific types into `team.types.ts` and date/error helpers into `team.utils.ts`.
- Split Team CSS into `team.css`, `styles/team-table.css`, and `styles/team-dialogs.css`.
- Kept existing API routes, request payloads, pagination size, role labels, and administrator-only page access.

### Validation after third pass

- TypeScript syntax transpilation passed for all 32 TS/TSX files.
- All relative local imports resolved.
- Full type-check and Vite production build still need to be run locally with the frontend's installed dependencies.
