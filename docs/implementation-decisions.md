# Implementation Decisions

These decisions extend the handoff spec and should guide implementation.

## Access Rules

- Employees can only see projects they are assigned to.
- Managers can manage and report on projects they oversee.
- Admins have full access.

## Hour Logging

- Hour logs do not require approval.
- Users can edit and delete their own hour entries.
- Managers and admins can view wider hour reports according to role.

## TRL

- TRL is stored as a numeric value from 1 to 9.
- Company-specific TRL definitions are unknown for now.
- The UI should show placeholder labels until definitions are supplied.

## Hosting

- Production target is Docker Compose (PostgreSQL + API + nginx).
- Keep environment configuration in `.env` files. Never commit secrets.

## Build Order

1. Frontend structure and shared layout.
2. Page-by-page UI from Figma mockups.
3. Mock data shaped like final entities.
4. Prisma/PostgreSQL schema.
5. Express API implementation.
6. Auth and account management.
7. Replace mock data with real data.
