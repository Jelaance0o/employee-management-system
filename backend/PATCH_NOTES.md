# TeamSpace targeted changes

This patch contains only the source files changed for the requested updates. Extract it at the root of the existing repository (for example, `D:\teamManagment`) and allow it to overwrite matching files. It does not include dependencies, environment files, database credentials, build output, or a rebuilt application.

## Changes
- Dashboard project rows lazily fetch and display the top three tasks using a backend priority/deadline ordering endpoint.
- Invitation form values reset only after a successful invitation response.
- Task assignee selector uses a project-scoped eligible-assignees API; only active employee members are returned and backend task assignment validates the same rule.
- Theme options/configuration are reduced to GitHub Light, GitHub Dark, and Dark while retaining `teamspace-theme` localStorage persistence. Legacy `light` maps to GitHub Light.
- Project API responses include only `project_manager_name` in addition to existing fields, and project UI uses that name instead of showing numeric IDs.
- Added backend tests for ordering, eligible assignees, role exclusion, and manager-name serialization.

## Verification
- Python source compilation passed.
- All 41 backend tests passed using a temporary test-only stand-in for the missing `pwdlib` package in this isolated environment. The stand-in is not included in the patch and does not change project dependencies.
- TypeScript/TSX syntax parsing passed for all 41 frontend source files. A full frontend build/type-check was not run.
