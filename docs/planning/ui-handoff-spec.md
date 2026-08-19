# UI Handoff Spec

This document is the source of truth for styling and extending the project-tracking UI shown in the provided planning screenshots and the two source PDFs in this workspace. It is written to minimize guessing: verified facts are separated from assumptions, and anything not visible in the source material is marked as unknown.

## Purpose

- Use the screenshots as the baseline for the UI structure, layout, and information architecture.
- Give future styling work enough context to stay faithful to the app without inventing unsupported screens, entities, or workflows.
- Capture the visible frontend, backend, data model, and API expectations in one place.

## Source Documents

- Project Tracking Platform - Full Planning Document
- UI design - KapiteinLabs brand color system

## Problem & Goal

The planning document says the company does not have a centralized way to track:

- Project status and Technology Readiness Level, or TRL
- Hours invested per project and per person
- Who is working on what
- Milestones and deadlines
- Task-level progress through Kanban

The stated goal is to build an internal web app that gives employees, managers, and admins a single source of truth for all project activity, with hour logging, TRL tracking, milestone management, a Kanban board, and exportable reports.

## Full Feature List

### Authentication

- User registration with name, email, password, and role
- Secure login with JWT tokens
- Password hashing with bcrypt
- Role-based access control for Employee, Manager, and Admin
- Logout and token expiry handling
- Admin account deactivation and reactivation

### Project Management

- Create, edit, and archive projects
- Project fields include name, description, start date, status, TRL level, and team members
- Search and filter projects by status, TRL, and team
- Assign and unassign team members to projects
- Project detail view with a full overview of related data

### Hour Logging

- Log entry fields include project, date, hours, and optional notes
- Log hours per day per project
- Edit and delete own log entries
- View personal hours by daily, weekly, or monthly ranges
- Managers see all hours for their projects
- Admins see all hours across all projects

### Dashboard

- Overview of all active projects
- Project cards show TRL level, total hours, team size, and status
- Quick stats for total hours this week, active projects, and upcoming milestones
- Overdue milestones are flagged visually
- Recent activity feed

### TRL Tracker

- Display current TRL level per project
- Update TRL with timestamp and justification note
- Keep a full TRL history log per project
- Show a visual progress indicator such as a progress bar or stage badge

### Milestone Tracking

- Add milestones to a project with name, due date, and status
- Milestone statuses are Pending, In Progress, and Completed
- Show visual flags for overdue milestones
- Retain milestone history after completion

### Kanban Board

- Per-project Kanban board with customizable columns
- Cards represent tasks with title, description, assignee, due date, and priority
- Drag and drop cards between columns
- Add, edit, and delete cards
- Filter cards by assignee or priority
- Support custom column creation per project
- Optional global Kanban view across all projects is listed as a future possibility

### Reports

- Hours per person, including total, weekly, and monthly views
- Hours per project breakdown
- Project status overview report
- TRL progression report per project
- Export reports to PDF
- Export reports to Excel

### Team and People

- View all users in the organization
- View a person's assigned projects and logged hours
- Admins can manage user roles and accounts

### Admin Panel

- User management for create, edit, and deactivate flows
- Assign roles
- View system-wide data
- Manage all projects with full access

## MVP vs Future Releases

### MVP Version 1.0

The MVP focuses on the core loop: log in, see projects, log hours, and track TRL.

- Authentication: login, register, and roles
- Project creation and management
- Hour logging per day per project
- Main dashboard for project overview
- TRL level tracking and history
- Milestone tracking at a basic level
- Hours report by person on screen
- Admin user management

### Version 1.5

- Kanban board per project
- PDF and Excel export
- Advanced filters on the dashboard
- Personal profile page

### Version 2.0

- Global Kanban across all projects
- Email notifications for overdue milestones
- Activity feed or audit log
- Mobile responsive improvements
- Budget or cost tracking
- Slack or Google Workspace integration
- Dark mode

## All Pages and Screens

### Public

- Login at `/login`
- Register at `/register`
- Forgot password at `/forgot-password`

### Employee

- Dashboard at `/dashboard`
- My Hours at `/my-hours`
- Log Hours at `/log-hours`
- Projects at `/projects`
- Project Detail at `/projects/:id`
- Kanban Board at `/projects/:id/kanban`
- My Profile at `/profile`

### Project Manager

- Access to all employee pages
- Manage Project at `/projects/:id/edit`
- Project Hours at `/projects/:id/hours`
- Team at `/projects/:id/team`
- Milestones at `/projects/:id/milestones`
- Reports at `/reports`

### Admin

- Access to all manager pages
- Admin Panel at `/admin`
- User Management at `/admin/users`
- All Projects at `/admin/projects`
- All Reports at `/admin/reports`
- Settings at `/admin/settings`

## User Roles and Permissions Matrix

The planning document shows these high-level permissions:

- Employees can view their own work, their project context, and their personal hours.
- Managers can manage projects they oversee, view project hours, manage team assignments, and export reports for their own projects.
- Admins have full access across users, projects, and reports, including the admin panel and settings.
- Kanban column management is available to managers and admins.
- Report export is available to managers for their own projects and to admins globally.
- User management and access to the admin panel are admin-only.

## Verified Product Scope

The screenshots describe a project tracking platform with these major areas:

- Authentication
- Projects
- Time / hours logging
- Milestones
- TRL history
- Kanban task management
- Reports and exports
- Admin / user management

## Verified System Architecture

### Frontend

- React
- Pages map to components
- API calls use `fetch` or `axios`
- State uses React Context or Zustand
- Routing uses React Router v6
- Styling uses Tailwind CSS

### Transport

- HTTP / REST
- JSON payloads
- Authorization uses Bearer JWT

### Backend

- Node.js + Express
- Middleware handles JWT validation, role guards, and error handling

### Persistence

- Prisma ORM
- PostgreSQL database

## Tech Stack Summary

The planning PDF and UI design PDF agree on this implementation stack:

- Frontend: React.js + Tailwind CSS
- Routing: React Router v6
- State: React Context plus Zustand
- Backend: Node.js + Express.js
- ORM: Prisma
- Database: PostgreSQL
- Auth: JWT via jsonwebtoken
- Drag and drop: @dnd-kit/core
- PDF export: Puppeteer or pdfkit
- Excel export: ExcelJS
- Hosting: Railway or Render

## Verified Backend Modules

The screenshots explicitly show these API groupings:

- `/api/auth` - authentication routes
- `/api/projects` - project CRUD
- `/api/hours` - hour logging
- `/api/milestones` - milestone management
- `/api/kanban` - kanban tasks
- `/api/reports` - report generation and exports
- `/api/users` - user management for admin use

## Verified Folder Structure

The screenshots suggest the following project layout:

### `/client`

- `/src/pages` - one file per page or route
- `/src/components` - reusable UI components
- `/src/hooks` - custom React hooks
- `/src/context` - auth context and global state
- `/src/services` - API call functions
- `/src/utils` - helpers and formatters

### `/server`

- `/routes` - route handlers per resource
- `/controllers` - business logic
- `/middleware` - auth guard and role guard
- `/prisma` - schema and migrations
- `/services` - report generation and exports
- `/utils` - helpers

## UI Design System

The separate UI design PDF defines the visual language for the app. It should be treated as the styling baseline.

### Core Palette

- Deep Navy `#0B1220` for page background and sidebar
- Dark Surface `#121E30` for cards, panels, and modals
- Elevated Surface `#1A2B42` for hover states and active rows
- Plasma Teal `#00E5C8` for primary CTAs, links, and active states
- Teal Deep `#00B8A2` for hover and accent borders

### Typography and Borders

- White `#FFFFFF` for primary text and headlines
- Muted Text `#B0BEC5` for body copy, labels, and captions
- Border `#253347` for cards, dividers, and inputs

### Status Colors

- Success `#00C88A` for completed states, reached TRL, and done
- Warning `#F5A623` for in progress and approaching deadlines
- Danger `#E74C4C` for overdue, blocked, and high priority
- Neutral `#6B7A99` for pending, not started, and inactive

### Kanban Priority Chips

- High uses dark red background with danger text
- Medium uses dark amber background with warning text
- Low uses dark green background with success text

### Styling Rules

- Deep Navy is the overall page background and sidebar background
- Dark Surface is used for card containers, panels, and modals
- Elevated Surface is used for row hover states, dropdowns, and active items
- Plasma Teal is reserved for primary buttons, active nav link indicators, TRL progress bars, Kanban active borders, and chart highlights
- White is used for headings and key numbers
- Muted Text is used for body copy, labels, helper text, and captions
- Status colors must only be used for their assigned meaning and should not be mixed with the Plasma Teal accent

### Suggested Tailwind Extend

- The UI design PDF includes a Tailwind color extension with navy, teal, border, text, and status groups

### CSS Variables

- The UI design PDF also defines root-level CSS variables for page background, surfaces, accent, text, borders, and status colors

### UI Pages

- Public: Login, Register, Forgot Password
- Employee: Dashboard, My Hours, Log Hours, Projects List, Project Detail, Kanban Board, My Profile
- Manager: Manage Project, Project Hours, Team Management, Milestones, Reports
- Admin: Admin Panel, User Management, Settings

## Verified Data Models

### User

- `id`
- `name`
- `email`
- `passwordHash`
- `role` with values `EMPLOYEE | MANAGER | ADMIN`
- `createdAt`
- `isActive`

### Project

- `id`
- `name`
- `description`
- `startDate`
- `status` with values `ACTIVE | ARCHIVED | COMPLETED`
- `currentTRL` from `1` to `9`
- `createdBy` referencing `userId`
- `createdAt`
- `updatedAt`

### ProjectMember

- `id`
- `projectId`
- `userId`
- `joinedAt`

### HourLog

- `id`
- `userId`
- `projectId`
- `date`
- `hours`
- `notes`
- `createdAt`

### Milestone

- `id`
- `projectId`
- `name`
- `dueDate`
- `status` with values `PENDING | IN_PROGRESS | COMPLETED`
- `completedAt`
- `notes`

### TRLHistory

- `id`
- `projectId`
- `trlLevel`
- `updatedBy` referencing `userId`
- `justification`
- `recordedAt`

### KanbanColumn

- `id`
- `projectId`
- `title`
- `order`

### KanbanCard

- `id`
- `columnId`
- `projectId`
- `title`
- `description`
- `assigneeId`
- `dueDate`
- `priority` with values `LOW | MEDIUM | HIGH`
- `order`
- `createdAt`

## Kanban Module Details

The planning PDF describes the Kanban module as Monday.com-style.

### How It Works

- Each project has its own Kanban board with customizable columns
- A card represents a task and can be dragged between columns to update status

### Default Columns

- To Do for tasks not yet started
- In Progress for tasks currently being worked on
- In Review for tasks waiting for feedback or approval
- Done for completed tasks

### Card Fields

- Title
- Description
- Assignee
- Due date
- Priority with low, medium, and high values
- Column status

### Key Interactions

- Drag and drop cards between columns using `@dnd-kit/core`
- Click a card to open a detail modal
- Filter by assignee or priority
- Add, rename, and delete columns
- Order cards within a column by priority or due date

## Verified API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Projects

- `GET /api/projects` - list all with filters
- `POST /api/projects` - create
- `GET /api/projects/:id` - get one
- `PUT /api/projects/:id` - update
- `DELETE /api/projects/:id` - archive
- `GET /api/projects/:id/members` - get team
- `POST /api/projects/:id/members` - assign member
- `DELETE /api/projects/:id/members/:userId` - remove member

### Hours

- `GET /api/hours` - my hours with query filters for project and date range
- `POST /api/hours` - log entry
- `PUT /api/hours/:id` - edit entry
- `DELETE /api/hours/:id` - delete entry
- `GET /api/hours/project/:id` - all hours for a project, manager or admin only
- `GET /api/hours/user/:id` - all hours for a user, admin only

### Milestones

- `GET /api/projects/:id/milestones`
- `POST /api/projects/:id/milestones`
- `PUT /api/milestones/:id`
- `DELETE /api/milestones/:id`

### TRL

- `GET /api/projects/:id/trl` - full TRL history
- `POST /api/projects/:id/trl` - update TRL level

### Kanban

- `GET /api/projects/:id/kanban` - columns plus cards
- `POST /api/projects/:id/kanban/columns` - add column
- `PUT /api/kanban/columns/:id` - rename or reorder
- `DELETE /api/kanban/columns/:id`
- `POST /api/projects/:id/kanban/cards` - add card
- `PUT /api/kanban/cards/:id` - edit or move card
- `DELETE /api/kanban/cards/:id`

### Reports

- `GET /api/reports/hours-by-person` - query range
- `GET /api/reports/hours-by-project`
- `GET /api/reports/project-status`
- `GET /api/reports/export/pdf`
- `GET /api/reports/export/excel`

### Admin / Users

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `PATCH /api/users/:id/deactivate`

## Tech Stack Notes From the Source PDF

- React plus Tailwind is the frontend baseline.
- React Context and Zustand are both listed for state, which means the implementation likely uses one for auth and one for more general global state, but that is not explicitly decided in the PDFs.
- The backend assumes Express, Prisma, and PostgreSQL.
- The planning PDF suggests server-side export tooling such as Puppeteer or pdfkit for PDF and ExcelJS for spreadsheets.

## Open Questions

These items are still unresolved in the planning document and should remain treated as unknown until the product owner or implementation confirms them:

- Internal TRL level definitions used by the company
- Whether hour logs require manager approval before becoming final
- Whether Kanban is strictly per project or also needs a global view
- Expected number of users and projects
- Hosting target, whether cloud or internal server
- Whether non-assigned employees can view all projects or only their own
- Whether Kanban cards need file attachments or comments
- Whether email notifications are required for overdue milestones

## Unknowns

These items are not verified by the screenshots or PDFs and should not be treated as facts unless implementation or future mockups confirm them:

- Exact visual design system beyond the color system defined in the UI design PDF
- Exact typography choices beyond the color and contrast guidance
- Exact spacing scale
- Sidebar versus top navigation layout
- Authentication token storage strategy
- Whether reports export is implemented client-side, server-side, or both
- Exact permissions matrix beyond the high-level access rules shown here

## UI Pages To Style

These are the pages implied by the screenshots and endpoint map:

- Login and register
- Project list
- Project detail
- Project members management
- Hours list and hours entry form
- Milestones list and milestone form
- TRL history and TRL update flow
- Kanban board
- Reports dashboard
- Report export actions
- Admin user list and user management

### Pages Implemented (by you)

- Login
- Register
- Dashboard
- Projects List
- Project Detail

These are the pages you indicated are already created in Figma; the next step is to generate page-level styling guidance for these screens so I can match the implementation to the brand PDF.

## Source-Driven Notes

- The planning PDF is draft version 1.0 and is explicitly intended as a planning document.
- The UI design PDF is a brand color system for the internal Project Tracking Platform.
- The screenshots and PDFs agree on the same product: a project tracking platform with auth, projects, hours, milestones, TRL, Kanban, reports, and admin management.
- If a future screen or component is not in this document, it should be treated as an addition rather than assumed existing behavior.

## Component Expectations

The screenshots imply a reusable dashboard-style system rather than one-off pages. The styling pass should expect shared patterns for:

- Page headers
- Section blocks
- Data tables and list rows
- Card grids
- Form fields
- Filter bars
- Status badges
- Empty states
- Confirmation dialogs
- Toasts or inline feedback

## Styling Constraints

- Keep the app clearly React-based and Tailwind-friendly.
- Preserve the information hierarchy visible in the screenshots: strong headings, grouped content, and dense administrative layouts.
- Do not introduce a radically different product direction unless explicitly asked.
- Use the screenshots as the authoritative reference for structure, not as a vague inspiration board.
- Keep the backend assumptions aligned with the shown REST routes and JWT-based auth.

## Responsive Expectations

The screenshots do not show full responsive variants, so these are assumptions rather than verified facts:

- Desktop-first dashboard layout is likely the primary target.
- Smaller screens should collapse the dense tables and code-like blocks into stacked sections.
- Navigation may need a sidebar or top-nav variant, but that is not shown in the screenshots.

## Unknowns

These items are not verified by the screenshots and should not be treated as facts unless the Figma mockups or implementation confirm them:

- Exact visual design system beyond Tailwind usage
- Exact typography choices
- Exact spacing scale
- Sidebar versus top navigation layout
- Authentication token storage strategy
- Whether the app uses React Router or a framework router in the final implementation
- Whether reports export is implemented client-side, server-side, or both
- Exact permissions matrix for managers versus admins versus employees beyond the routes shown

## Handoff Rules

- If a screen, field, or action is not in this document, treat it as unknown.
- If the Figma mockup introduces a new pattern, add it to this spec before styling around it.
- If an implementation choice conflicts with the screenshots, defer to the screenshots unless the user explicitly says otherwise.

## Next Inputs Needed From Figma

When you send the Figma screenshots, the most useful additions will be:

- Home or dashboard landing page
- Login and register pages
- Project detail and editing states
- Any modal, drawer, or sidebar states
- Empty states, loading states, and error states
- Mobile and tablet variants if they exist

## Verification Checklist

- Every screenshot-backed section is represented here.
- Every visible data model entity is listed here.
- Every visible endpoint group is listed here.
- Assumptions are clearly separated from verified facts.
- Nothing in this document invents product behavior that was not shown.