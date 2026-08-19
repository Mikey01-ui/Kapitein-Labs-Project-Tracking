# KapeteinLabs Project Tracking Platform

Internal web app for tracking projects, assigned teams, hours, milestones, TRL progress, reports, and admin/user management.

## Current Build Phase

The project is being scaffolded UI-first. Pages should use realistic mock data now, then later swap to API-backed data after the PostgreSQL/Prisma schema, authentication, and user accounts are implemented.

## Product Decisions Captured

- Employees can only see projects they are assigned to.
- Hour logs do not require manager approval.
- TRL definitions are not finalized yet.
- Initial hosting target is a homelab.
- UI will be built page by page from Figma mockups.

## Structure

- `client` - React, React Router, Tailwind-ready frontend.
- `server` - Express API, middleware, route/controller structure, Prisma schema.
- `docs` - local implementation notes and decisions.

## Planned Workflow

1. Build and refine UI pages from Figma using mock data.
2. Finalize the data model based on the completed UI.
3. Add PostgreSQL storage through Prisma.
4. Add auth, roles, and account creation.
5. Replace mock data with real API calls page by page.
