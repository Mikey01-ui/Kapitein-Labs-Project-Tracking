# Miltomy Client Portal: Feature Inventory & Refactor Map

This document catalogues all features from the original dashboard codebase and maps out what is kept, adapted, parked, or added for the **Miltomy Agency Client Portal**.

---

## 1. Feature Inventory & Action Map

| Module / Feature | Original Implementation | Status in Miltomy Portal | Planned Action |
| :--- | :--- | :--- | :--- |
| **Authentication & Users** | Self-signup + Admin approval | 🔄 **Refactor** | Shift to **Invitation-only onboarding** (Owner invites PM $\rightarrow$ PM invites Team). |
| **User Roles** | `ADMIN`, `MANAGER`, `EMPLOYEE` | 🔄 **Refactor** | Map to `OWNER`, `PROJECT_MANAGER`, `TEAM_MEMBER`. Enforce strict PM scoping (PMs only access their assigned projects). |
| **Projects & Clients** | Projects with internal codes & TRL levels | 🔄 **Refactor** | Add `clientName`, `deadline`, calculate progress %, streamline project summary cards. |
| **Kanban Task Board** | Drag-and-drop columns, checklists, comments, assignees | ✅ **Keep & Refine** | Standardize columns to: `Backlog`, `To Do`, `In Progress`, `Review`, `Completed`. |
| **Milestone Tracking** | Milestone statuses (`PENDING`, `IN_PROGRESS`, `COMPLETED`) | ✅ **Keep** | Retain milestone view & progress tracking per project. |
| **Activity Timeline** | Activity logs table | ✅ **Keep & Enhance** | Build a dedicated project-level chronological activity feed. |
| **File Management** | Attachment uploads (receipts, docs, images) | ✅ **Keep & Enhance** | Centralized project file repository (PDFs, images, documents, design assets). |
| **Notifications** | In-app notification inbox | ✅ **Keep & Enhance** | In-app dropdown + email notification triggers for task assignments, invites, and milestones. |
| **Hour / Time Logging** | Daily hour logger + werkpakket + timesheets | 📦 **Parked / Optional** | Retain underlying models for analytics; streamline employee interface to focus on task completion. |
| **TRL Level System** | Technology Readiness Level (1-9) reviews & signoffs | 📦 **Parked** | Hide from main UI (preserved in codebase for deep R&D projects if ever needed). |
| **Receipt / Expense OCR** | Camera/receipt upload + OCR parse | 📦 **Parked** | Preserve in codebase; hide from standard agency client portal views. |
| **Admin Panel & Analytics**| User approvals & role management | 🔄 **Refactor** | Owner-only hub: User management, Project management, Pending invitations, and Key Agency Metrics. |
| **Branding & Visuals** | Kapitein Labs branding (Dark teal / Cyan) | 🎨 **Rebrand** | Rebrand to **Miltomy Identity** (Deep dark `#080808`, Signature Lime `#c8ff00`, `Syne` + `DM Sans`). |

---

## 2. Miltomy Brand Identity Specs

* **Background**: `#080808` / Surface `#111111`
* **Signature Accent**: `#c8ff00` (Neon Lime) / RGB: `(200, 255, 0)`
* **Text / Foreground**: `#f0ede6` (Off-white) / Muted `#444444` & `#888888`
* **Borders**: `#222222`
* **Typography**:
  * **Headings / Display**: `'Syne', sans-serif`
  * **Body / UI**: `'DM Sans', sans-serif`

---

## 3. Implementation Phases

1. **Phase 1 — Workspace Isolation & Inventory** *(Completed)*
   - Code duplicated into `Miltomy Project Tracking/`
   - Initialized separate configuration and mapped features.
2. **Phase 2 — Feature Selection & Role Scoping**
   - Confirm which parked features to hide or streamline.
   - Adjust Prisma schema (`UserRole`, `Invitation`, `clientName`).
3. **Phase 3 — Invitation Flow & Onboarding**
   - Owner $\rightarrow$ PM invite token generation & email dispatch.
   - PM $\rightarrow$ Team Member invite & onboarding flow.
4. **Phase 4 — Agency Views & Navigation**
   - Dashboard, Projects, Kanban Tasks (`Backlog`, `To Do`, `In Progress`, `Review`, `Completed`), Milestones, Team, Files, Activity.
5. **Phase 5 — Complete Miltomy Rebranding**
   - Apply Tailwind palette (`#080808`, `#c8ff00`), Syne/DM Sans fonts, custom logo, agency favicon, and bespoke portal styling.
