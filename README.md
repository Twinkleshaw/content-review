# ContentFlow — Content Review & Approval System

A full-stack application implementing a 2-stage content review and approval workflow with sub-content support. Built with React, Node.js, Express, and MongoDB.

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally on `mongodb://localhost:27017`

### Backend

```bash
cd backend
npm install
npm run seed        # creates 3 users + 1 sample draft
npm run dev         # starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev         # starts on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) and use the role switcher dropdown in the top-right header to switch between users.

---

## Test Users (seeded)

| Name        | Role       | Permissions                                                     |
| ----------- | ---------- | --------------------------------------------------------------- |
| Alice Chen  | `creator`  | Create, edit, delete drafts; add sub-content; submit for review |
| Bob Smith   | `editor`   | Approve or reject at Stage 1 (both content and sub-content)     |
| Carol Davis | `approver` | Approve or reject at Stage 2 (both content and sub-content)     |

---

## Architecture Overview

```
content-review/
├── backend/
│   ├── controller/
│   │   ├── content.controller.js    # Business logic for content CRUD operations
│   │   └── workflow.controller.js   # Business logic for all workflow state transitions
│   ├── middleware/
│   │   └── auth.js                  # Validates X-User-Id header, enforces role guards
│   ├── models/
│   │   ├── Content.js               # Content schema — status, version, lock, rejection info
│   │   ├── ReviewAction.js          # Immutable audit log — every approve/reject ever taken
│   │   ├── SubContent.js            # Sub-content schema — same workflow as Content, linked to parent
│   │   └── User.js                  # User schema — name, email, role
│   ├── routes/
│   │   ├── content.routes.js        # Maps content endpoints to controller methods
│   │   ├── subcontent.routes.js     # Sub-content CRUD + workflow, nested under /contents/:id
│   │   └── workflow.routes.js       # Maps workflow endpoints to controller methods
│   ├── .env                         # Environment variables (PORT, MONGO_URI)
│   ├── seed.js                      # Seeds 3 users + 1 sample draft content
│   └── server.js                    # Express entry point, MongoDB connection
│
├── frontend/
│   └── src/
│       ├── api/
│       │   └── index.js             # Axios instance — auto-injects X-User-Id on every request
│       ├── components/
│       │   ├── Header.jsx           # Top nav with role switcher dropdown
│       │   ├── StatusBadge.jsx      # Coloured status pill (draft / in_review / etc.)
│       │   └── SubContentSection.jsx # Full sub-content UI — cards, form, panels, history
│       ├── context/
│       │   └── UserContext.jsx      # Role switcher state — loads users, persists selection
│       ├── pages/
│       │   ├── ContentDetail.jsx    # Content view, workflow stepper, action panel, history
│       │   ├── CreateContent.jsx    # Create and edit form for draft content
│       │   └── Dashboard.jsx        # Content list, filters, role-aware notification banner
│       ├── services/
│       │   ├── content.service.js   # API calls for content CRUD
│       │   ├── subcontent.service.js # API calls for sub-content operations
│       │   └── user.service.js      # API calls for user/role data
│       ├── App.jsx                  # Route definitions
│       ├── index.css                # Global design system styles
│       └── main.jsx                 # React entry point
│
└── README.md
```

---

## Workflow Design

### Parent Content State Machine

```
draft ──[submit]──► in_review ──[approve]──► in_approval ──[approve]──► published
                        │                         │
                     [reject]                  [reject]
                        └─────────────────────────┘
                                    ▼
                          draft (version increments)
```

### Sub-content State Machine

Sub-content follows the exact same flow, independently of its parent:

```
draft ──[submit]──► in_review ──[approve]──► in_approval ──[approve]──► published
                        │                         │
                     [reject]                  [reject]
                        └─────────────────────────┘
                                    ▼
                          draft (version increments)
```

### Stage 1 — Editor Review (`in_review`)

The editor checks content for quality, accuracy, and completeness. A comment is mandatory when rejecting. Approving moves the item to Stage 2.

### Stage 2 — Final Approval (`in_approval`)

The senior approver gives the final sign-off before publication. Rejection at this stage returns the item all the way back to `draft` — the author must revise and restart from Stage 1.

This is intentional: if content changes after a Stage 2 rejection, the editor should re-review the updated version. Allowing re-submission to skip Stage 1 would undermine the workflow.

### Version Tracking

Every rejection increments `version` on the content or sub-content document. All `ReviewAction` records are tagged with the version they belong to, so the history clearly shows: v1 rejected by editor → v2 rejected by approver → v3 published.

---

## Sub-content

Content items can optionally have child items — sections, notes, attachments, or references — each with their own independent review lifecycle.

### Dependency Rule

A parent content item **cannot be submitted** for review until all its sub-content items are `published`. If any sub-content is still in `draft`, `in_review`, `in_approval`, or `rejected`, the submit is blocked with a clear error listing the exact blockers by name.

This enforces content integrity at the moment that matters (submission) while giving reviewers full flexibility to review sub-content independently before that point.

### Why rejection does not cascade

Rejecting a sub-content item never affects the parent's status. The parent is only checked at submit time. A creator can fix and re-submit a rejected sub-content item freely — the parent simply cannot proceed until all children are ready.

### Notifications for Reviewers

The dashboard banner counts pending items across both parent content and sub-content. If a reviewer has sub-content waiting but no parent content in the matching status, the "View →" button clears the status filter (rather than filtering to a status no parent matches) so all parent rows are visible — each showing a "N sub-content pending" badge indicating which parent to open.

---

## Key Design Decisions

### Controller / Route Separation

Routes handle HTTP concerns (path matching, middleware chaining). Controllers handle business logic (validation, DB queries, response shaping). This separation keeps each file focused and makes the logic testable independently of Express.

### Service Layer on the Frontend

API calls are grouped into `content.service.js`, `subcontent.service.js`, and `user.service.js` rather than being scattered across components. Pages and components call service functions — they never call Axios directly. This means the API base URL or auth header strategy can be changed in one place.

### Authentication: Mock Role Switcher

The frontend sends the selected user's `_id` in an `X-User-Id` header on every request. The backend middleware validates it and attaches `req.currentUser`. This was chosen over JWT because:

- The assignment explicitly lists mock role switching as a valid approach
- It keeps focus entirely on workflow logic rather than auth boilerplate
- Replacing it with real JWT auth requires changing only `middleware/auth.js` — nothing else in the codebase changes

### Immutable Audit Log

`ReviewAction` documents are never updated or deleted. Every approve/reject action is a permanent record tagged with `content`, `stage`, `version`, and `isSubContent`. The complete history of who did what, at which stage, on which version, is always queryable even after multiple rejection cycles.

### Edit Lock at Two Levels

Published items have `isLocked: true`. This is enforced both in the controller (returns 403 before any DB write) and in a Mongoose `pre-save` hook on the model itself — so even a direct ORM call cannot silently overwrite published content.

### Self-Approval Prevention

The backend verifies that the reviewer is not the content creator before allowing any stage action. This is a server-side check in the controller, not just a UI restriction.

### Rejection Always Requires a Comment

A reject action without a comment returns a 400 error. Creators are always told exactly why their content was sent back — a comment is never optional on rejection.

### Sub-content Nested Routes

All sub-content endpoints are nested under `/api/contents/:contentId/subcontent`. This makes the parent-child relationship explicit in the API and avoids orphaned sub-content by always requiring a valid parent context.

---

## API Reference

### Content

| Method | Endpoint            | Role    | Description                                   |
| ------ | ------------------- | ------- | --------------------------------------------- |
| GET    | `/api/contents`     | any     | List all content (optional `?status=` filter) |
| GET    | `/api/contents/:id` | any     | Get single content with full review history   |
| POST   | `/api/contents`     | creator | Create new draft                              |
| PUT    | `/api/contents/:id` | creator | Edit draft (draft status only)                |
| DELETE | `/api/contents/:id` | creator | Delete draft (draft status only)              |

### Workflow

| Method | Endpoint                    | Role     | Description                                 |
| ------ | --------------------------- | -------- | ------------------------------------------- |
| POST   | `/api/workflow/submit/:id`  | creator  | Submit draft → `in_review`                  |
| POST   | `/api/workflow/review/:id`  | editor   | Approve → `in_approval` or reject → `draft` |
| POST   | `/api/workflow/approve/:id` | approver | Approve → `published` or reject → `draft`   |
| GET    | `/api/workflow/users`       | any      | List all users (for role switcher)          |

### Sub-content

| Method | Endpoint                                    | Role     | Description                       |
| ------ | ------------------------------------------- | -------- | --------------------------------- |
| GET    | `/api/contents/:id/subcontent`              | any      | List all sub-content for a parent |
| POST   | `/api/contents/:id/subcontent`              | creator  | Add sub-content to a parent       |
| PUT    | `/api/contents/:id/subcontent/:sid`         | creator  | Edit sub-content (draft only)     |
| DELETE | `/api/contents/:id/subcontent/:sid`         | creator  | Delete sub-content (draft only)   |
| POST   | `/api/contents/:id/subcontent/:sid/submit`  | creator  | Submit sub-content → `in_review`  |
| POST   | `/api/contents/:id/subcontent/:sid/review`  | editor   | Stage 1 approve/reject            |
| POST   | `/api/contents/:id/subcontent/:sid/approve` | approver | Stage 2 approve/reject            |

All endpoints require the `X-User-Id` header.

---

## Database Schema

### `users`

```
_id
name        String
email       String (unique)
role        Enum: creator | editor | approver
avatar      String (initials)
timestamps
```

### `contents`

```
_id
title                 String
body                  String
tags                  String[]
status                Enum: draft | in_review | in_approval | published
createdBy             ref → User
version               Number (increments on each rejection cycle)
isLocked              Boolean (true once published)
lastRejectionComment  String
lastRejectedAt        Date
lastRejectedBy        ref → User
submittedAt           Date
publishedAt           Date
timestamps
```

### `subcontents`

```
_id
parent                ref → Content
title                 String
body                  String
type                  Enum: section | attachment | note | reference
status                Enum: draft | in_review | in_approval | published
createdBy             ref → User
version               Number (increments on each rejection cycle)
isLocked              Boolean (true once published)
lastRejectionComment  String
lastRejectedAt        Date
lastRejectedBy        ref → User
submittedAt           Date
publishedAt           Date
timestamps
```

### `reviewactions`

```
_id
content       ref → Content or SubContent
stage         Enum: stage1 | stage2
action        Enum: approve | reject
reviewer      ref → User
comment       String
version       Number
isSubContent  Boolean
actedAt       Date
```

---

## ER Diagram

```
┌─────────────┐         ┌──────────────────┐         ┌───────────────┐
│    users    │         │     contents     │         │  subcontents  │
│─────────────│         │──────────────────│         │───────────────│
│ _id         │◄────────│ createdBy        │◄────────│ parent        │
│ name        │         │ lastRejectedBy   │         │ createdBy ────┼──► users
│ email       │         │                  │         │ lastRejectedBy┼──► users
│ role        │         │ _id              │         │               │
│ avatar      │         │ title            │         │ _id           │
└─────────────┘         │ body             │         │ title         │
                        │ tags[]           │         │ body          │
                        │ status           │         │ type          │
                        │ version          │         │ status        │
                        │ isLocked         │         │ version       │
                        └──────────────────┘         │ isLocked      │
                                │                    └───────────────┘
                                │                           │
                        ┌───────▼───────────────────────────▼──────┐
                        │               reviewactions               │
                        │───────────────────────────────────────────│
                        │ content      (ref → Content or SubContent)│
                        │ reviewer     (ref → User)                 │
                        │ stage        stage1 | stage2              │
                        │ action       approve | reject             │
                        │ comment                                   │
                        │ version                                   │
                        │ isSubContent                              │
                        │ actedAt                                   │
                        └───────────────────────────────────────────┘
```

---

## Edge Cases Handled

| Scenario                                          | Behaviour                                               |
| ------------------------------------------------- | ------------------------------------------------------- |
| Submit content that is not a draft                | 400 — cannot submit non-draft                           |
| Submit parent with unpublished sub-content        | 400 — lists each blocking sub-content by name           |
| Approve or reject your own content                | 403 — self-approval blocked in controller               |
| Skip Stage 1 and jump directly to Stage 2         | 400 — wrong status, transition rejected                 |
| Edit content that is in review or published       | 403 — status check in controller                        |
| Edit published content directly via ORM           | 403 — pre-save hook on model catches it                 |
| Reject without providing a comment                | 400 — comment is mandatory on rejection                 |
| Creator attempts to review their content          | 403 — role guard in middleware                          |
| Delete content that is not a draft                | 403 — only drafts can be deleted                        |
| Add sub-content to a published parent             | 403 — locked parent cannot receive children             |
| Reviewer dashboard shows only sub-content pending | Banner View button shows all items with per-row badges  |
| Missing or invalid X-User-Id header               | 401 — rejected at middleware before reaching controller |

---

## Assumptions & Tradeoffs

- **First reviewer wins** — the workflow does not require consensus. Any one editor can act at Stage 1; any one approver at Stage 2. A quorum model is a natural extension.
- **No email or push notifications** — the `ReviewAction` model has all the data needed (who, what, when, which content) to trigger them; the transport layer is out of scope.
- **Roles are flat on the user document** — in a larger system, permissions would live in a dedicated RBAC layer rather than a single `role` string.
- **No pagination** — the content list fetches all items. Adding `?page=` and `?limit=` to the list endpoint is straightforward and would not break existing clients.
- **Sub-content types are a fixed enum** — the four types (`section`, `attachment`, `note`, `reference`) cover common cases. In production these could be user-defined per workspace.

---

## Future Scope

- **Parallel approval** — require sign-off from multiple editors or approvers before a stage advances (quorum-based workflow)
- **Conditional workflows** — route content through different approval chains based on tags or content type (e.g. legal content requires an extra legal review stage)
- **Email / Slack notifications** — notify reviewers when items are waiting, notify creators on rejection with the comment in the message
- **Versioned content snapshots** — store a full body copy at each submission, not just the version number, enabling a proper diff view between cycles
- **Audit log UI** — a dedicated history page showing every action across all content, filterable by user, date, and action type
- **JWT authentication** — replace the mock role switcher with real login sessions; only `middleware/auth.js` needs to change
- **Pagination and full-text search** — essential at scale; the API structure already supports these as query params
- **Parent–child publish linking** — optionally auto-submit sub-content when the parent is submitted, for tightly coupled content structures

---

## AI Usage

ChatGPT and Claude were used for initial scaffolding and guidance.
