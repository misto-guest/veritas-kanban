# Changelog

All notable changes to Veritas Kanban are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-02-04

### ✨ Highlights

- **Comprehensive SOP Documentation Suite** — 8 new guides covering agent workflows, sprint planning, multi-agent orchestration, code review, best practices, examples, and power user tips
- **Cross-Model Code Review Enforcement** — Claude ↔ GPT review gate now fully documented with RF-002 91% accuracy validation
- **Bulk Archive Error Handling** — Fixed silent failures in Done column archival with per-task error tracking and user feedback toasts
- **Sidebar Metrics Sync** — Fixed stale task counts in board sidebar by invalidating metrics cache on status changes

### Added

#### Documentation (#US-1600)

Complete SOP Sprint with 8 new markdown files in `docs/`:

- **GETTING-STARTED.md** — 5-minute quickstart from zero → agent-ready, includes:
  - Prerequisites, manual setup wizard, UI/CLI task creation
  - Agent pickup checklist with agent-requests folder flow
  - Sanity checks section (API health, UI health, agent pickup verification)
  - Prompt registry guidance (shared resources pattern from BoardKit)
  - Documentation freshness SOP (AGENTS.md, CLAUDE.md, BEST-PRACTICES.md)
  - Multi-repo/multi-agent notes with consistent naming conventions
  - OpenClaw Browser Relay integration notes for auth-required workflows
  - Credited Neal (@nealmummau) for asking the triggering question

- **SOP-agent-task-workflow.md** — Complete lifecycle (claim → work → complete):
  - Roles table (PM, Worker, Human Lead)
  - Lifecycle overview with 6 stages
  - API/CLI examples for each step (start timer, status change, completion)
  - Prompt template for consistent agent instructions
  - Lessons Learned expectations + notification patterns
  - Escalation paths for blocked tasks, tooling failures, reviewer disputes

- **SOP-sprint-planning.md** — Epic → Sprint → Task → Subtask hierarchy:
  - Hierarchy table with real examples (MessageMeld, US-1600)
  - Sprint planner agent prompt template
  - Bulk API payload for creating entire sprints at once
  - Estimation pattern (subtasks × 0.5d = effort)
  - Assignment workflow (leave unassigned for agent pickup)
  - Example sprint (US-1600 docs sprint + RF-002 bug fix sprint)
  - After-planning checklist (recap docs, GitHub milestones, standup scheduling)

- **SOP-multi-agent-orchestration.md** — PM + Worker roles:
  - PM checklist (plan, assign, track, review, report)
  - Worker handoff template with clear acceptance criteria
  - Status reporting cadence (daily updates, standup summaries)
  - Error escalation paths
  - Opus-as-PM / Codex-as-worker walkthrough example

- **SOP-cross-model-code-review.md** — Non-negotiable opposite-model gate:
  - Enforcement rule: If Claude wrote it, GPT reviews; if GPT wrote it, Claude reviews
  - When to trigger reviews (application code required, docs optional, research optional)
  - Review workflow (create task, opposite model audits, findings as subtasks, fixes tracked)
  - Reviewer checklist (Security, Reliability, Performance, Accessibility, Docs)
  - Prompt template for consistent audits
  - Escalation paths for disagreements
  - RF-002 reference (91% accuracy validates the approach)

- **BEST-PRACTICES.md** — Patterns that work + anti-patterns to avoid:
  - 10 "Do This" rules (time tracking, subtasks, acceptance criteria, atomic scope, SOP updates, etc.)
  - 10 "Don't Do This" anti-patterns (no acceptance, skipping timers, grab-bag tasks, etc.)
  - Based on real-world usage with agents

- **EXAMPLES-agent-workflows.md** — 6 copy/pasteable recipes:
  - Feature development (BrainMeld Lessons Learned)
  - Bug fix (GH-86 bulk archive)
  - Documentation update (sanity checks in Getting Started)
  - Security audit (RF-002 style)
  - Content production (podcast clip → LinkedIn post)
  - Research & report (Champions dossiers)
  - Each includes goal, task creation, prompt, workflow steps, and deliverables

- **TIPS-AND-TRICKS.md** — Power user features:
  - CLI shortcuts (vk begin/done/block/unblock/time/summary)
  - Keyboard shortcuts (Cmd+K palette, arrow nav, Esc)
  - Command palette power moves
  - WebSocket awareness and polling fallback
  - MCP server setup for Claude Desktop
  - Git worktree integration patterns
  - Obsidian/Brain mirroring with brain-write.sh
  - Dev helpers (dev:clean, dev:watchdog)

- **README.md** — Added "Documentation Map" section listing all new guides with descriptions

#### Fixes

##### GH-86: Bulk Archive Silent Failure (#86)

**Root Cause:** `BulkActionsBar.handleArchiveSelected()` used `Promise.all()` with no error handling. When any single archive failed, the entire batch would silently reject with zero user feedback.

**Fix:**

- Import `useToast` hook
- Replace `Promise.all()` with per-task error tracking loop
- Show success toast (e.g., "Archived 5 tasks")
- Show error toast on partial/full failure with counts
- Log individual failures to console for debugging
- Clear selection regardless of outcome
- **File:** `web/src/components/board/BulkActionsBar.tsx` (+38 lines)

##### GH-87: Sidebar Task Counts Out of Sync (#87)

**Root Cause:** The sidebar uses `useMetrics('24h')` which polls every 30 seconds with 10-second staleTime. Meanwhile, `useUpdateTask` mutations did NOT invalidate the metrics cache, causing up to 30 seconds of stale data after status changes.

**Fix:**

- Add metrics query invalidation to `useUpdateTask.onSuccess()`
- Only invalidate when task status changes (prevents over-invalidation)
- Preserves timer state handling (no aggressive blanket invalidation)
- **File:** `web/src/hooks/useTasks.ts` (+9 lines)

### Scripts

- **scripts/dev-clean.sh** — Added explicit `pnpm` path resolution for launchd sessions (fixes "command not found" in automated restarts)
- **scripts/dev-watchdog.sh** — Improved restart storm prevention with lock file + PID checking; fixed pnpm path resolution

### Changed

- Version bumped from 1.4.1 → 1.5.0

---

## [1.4.1] - 2026-02-02

### Security

- **SEC-001 Path Traversal Prevention** — added strict path segment validation + base directory enforcement in server utilities; applied to file-based services that join paths from user-controlled ids
- **SEC-007 Admin Authorization** — enforced admin (or admin+agent where appropriate) on mutating settings/config/activity/status-history/notifications endpoints

### Fixed

- **Agent Status Panel** now uses real-time WebSocket updates (`useRealtimeAgentStatus`) and correctly handles `activeAgents` payloads
- Improved proxy/IP trust behavior for rate limiting (`X-Forwarded-For` only trusted when `trust proxy` is configured)

## [1.4.0] - 2026-02-01

### ✨ Highlights

- **CLI Workflow Commands** — Two-command task lifecycle (`vk begin` / `vk done`) plus time tracking, comments, agent status, and project management from the terminal
- Inspired by Boris Cherny's (Claude Code creator) "automate everything you do twice" philosophy

### Added

#### CLI Workflow Commands (#44)

- **Composite workflows** — Complete task lifecycle in single commands:
  - `vk begin <id>` — Sets in-progress + starts timer + updates agent status to working
  - `vk done <id> "summary"` — Stops timer + sets done + adds comment + sets agent idle
  - `vk block <id> "reason"` — Sets blocked + adds comment with reason
  - `vk unblock <id>` — Sets in-progress + restarts timer
- **Time tracking CLI** — Full time management from terminal:
  - `vk time start <id>` — Start time tracker
  - `vk time stop <id>` — Stop time tracker
  - `vk time entry <id> <seconds> "description"` — Add manual time entry
  - `vk time show <id>` — Display time tracking summary (total, running status, entries)
- **Comments CLI** — `vk comment <id> "text"` with optional `--author` flag
- **Agent status CLI** — Manage agent presence:
  - `vk agent status` — Show current agent status
  - `vk agent working <id>` — Set to working (auto-fetches task title)
  - `vk agent idle` — Set to idle
  - `vk agent sub-agent <count>` — Set sub-agent mode with count
- **Project management CLI** — `vk project list` and `vk project create "name"` with `--color` and `--description` flags
- All commands support `--json` for scripting and automation
- 5 new command modules, 18 subcommands, 651 lines added

---

---

## [1.3.0] - 2026-02-01

### ✨ Highlights

- **GitHub Issues Bidirectional Sync** — Import issues with the `kanban` label and push status changes back to GitHub
- **Activity Feed** — Full-page chronological activity feed with filtering, real-time updates, and compact/detailed toggle
- **Daily Standup Summary** — Generate standup reports via API or CLI with completed, in-progress, blocked, and upcoming sections

### Added

#### GitHub Issues Sync (#21)

- `GitHubSyncService` (464 lines) with polling, label-based field mapping, and circuit breaker
- Inbound: import issues with `kanban` label as tasks
- Outbound: push status changes (done → close issue, reopen on todo/in-progress/blocked) and comments
- Label mapping: `priority:high` → priority field, `type:story` → type field
- Config: `.veritas-kanban/integrations.json`, state: `.veritas-kanban/github-sync.json`
- `TaskGitHub` interface in shared types: `{issueNumber, repo, syncedAt?}`
- New API endpoints:
  - `POST /api/github/sync` — trigger manual sync
  - `GET /api/github/sync/status` — last sync info
  - `GET /api/github/sync/config` — get config
  - `PUT /api/github/sync/config` — update config
  - `GET /api/github/sync/mappings` — list issue↔task mappings
- New CLI commands: `vk github sync`, `vk github status`, `vk github config`, `vk github mappings`

#### Activity Feed (#33)

- Full-page chronological activity feed accessible from header nav (ListOrdered icon)
- `agent` field added to Activity interface
- `ActivityFilters` for combinable filtering (agent, type, taskId, since, until)
- `GET /api/activity` enhanced with query params: `?agent=X&type=Y&taskId=Z&since=ISO&until=ISO`
- `GET /api/activity/filters` — distinct agents and types for filter dropdowns
- `ActivityFeed.tsx` component with day grouping, 15 activity type icons, filter bar, compact/detailed toggle
- Infinite scroll via IntersectionObserver
- Real-time WebSocket updates
- `ViewContext` for board ↔ activity navigation

#### Daily Standup Summary (#34)

- `GET /api/summary/standup?date=YYYY-MM-DD&format=json|markdown|text`
- Sections: completed, in-progress, blocked, upcoming, stats
- `generateStandupMarkdown()` and `generateStandupText()` in SummaryService
- CLI: `vk summary standup` with `--yesterday`, `--date YYYY-MM-DD`, `--json`, `--text` flags
- 12 new tests

### Changed

- MAX_ACTIVITIES increased from 1,000 to 5,000

---

## [1.2.0] - 2026-02-01

### ✨ Highlights

- **Standardized API Response Envelope** — All endpoints return a consistent `{success, data, meta}` format with typed error classes
- **Abstract File Storage** — Repository pattern decouples services from the filesystem
- **Blocked Task Status** — Full support for blocked tasks across MCP, CLI, and board

### Added

#### Standardize API Response Envelope (#2)

- 4 new error classes: `UnauthorizedError`, `ForbiddenError`, `BadRequestError`, `InternalError` (in `middleware/error-handler.ts`)
- `sendPaginated(res, items, {page, limit, total})` helper for pagination metadata in envelope
- Response envelope format:
  - Success: `{success: true, data, meta: {timestamp, requestId}}`
  - Error: `{success: false, error: {code, message, details?}, meta}`
  - Pagination: `meta` includes `{page, limit, total, totalPages}` on paginated endpoints

#### Abstract File Storage (#6)

- 5 new repository interfaces: `ActivityRepository`, `TemplateRepository`, `StatusHistoryRepository`, `ManagedListRepository`, `TelemetryRepository`
- `StorageProvider` extended with new repositories
- `fs-helpers.ts` — centralized filesystem access (only file that imports `fs`)

#### Blocked Task Status (#32)

- MCP tools Zod/JSON schema definitions updated for blocked status
- MCP active tasks filter updated to include blocked
- CLI help text updated
- CLI status color: blocked = red

### Changed

- All 11 route files standardized — zero ad-hoc `{error: "..."}` patterns
- Auth middleware errors standardized to use typed error classes
- All 10 services migrated off direct `fs` imports to use `fs-helpers.ts`

---

## [1.1.0] - 2026-01-31

### ✨ Highlights

- **Built-in Chat Interface** — Talk to AI agents directly from the board or any task, with streaming responses and markdown rendering
- **Agent Routing Engine** — Tasks auto-route to the best available agent based on type, project, and capabilities
- **Agent Selection on Task Creation** — Choose which agent handles a task when you create it
- **Hardened Infrastructure** — Rate limiting, circuit breakers, file locking, request timeouts, data integrity checks, and more

### Added

#### Chat Interface (#18)

- Full chat panel accessible from any task or the board header
- Streaming AI responses with real-time WebSocket delivery
- Floating chat bubble with pulse indicator for new messages
- Chat sessions stored as markdown files with YAML frontmatter
- Gateway integration for AI responses via Clawdbot
- Chat export as markdown (download icon in header)
- Clear chat history with confirmation dialog
- Mode toggle: Ask (read-only queries) vs Build (changes, files, commands)
- Keyboard shortcut support
- Auto-focus input after sending messages
- Tool call display with expandable input/output sections

#### Agent Routing Engine (#16)

- Task-aware routing that matches tasks to agents by type, project, and capabilities
- Routing rules configurable per agent in Settings → Agents
- API endpoints for routing queries and rule management
- Full test coverage (17 tests)

#### Agent Selection on Task Creation (#17)

- Agent dropdown in the Create Task dialog
- Auto-routes to best agent based on task type, or allows manual override
- Agent field displayed in task metadata section

#### Agent CRUD Management

- Full Add/Edit/Remove for agents in Settings → Agents
- Add Agent form with name, type slug (auto-generated), command, and args
- Edit/Remove via inline icons (default agent protected from deletion)
- `AgentType` loosened from fixed enum to any string slug — fully custom agents

#### Board Filter: Agent

- Filter board by assigned agent in the FilterBar
- Agent indicator dots on task cards match filter state

#### Infrastructure & Security

- **Rate Limiting** — Per-route tiered thresholds (auth, API reads, writes, uploads)
- **Circuit Breaker** — Automatic failure detection for external service calls with configurable thresholds
- **File Locking** — FIFO queue prevents race conditions on concurrent file writes
- **Request Timeouts** — Middleware kills hung connections before they pile up
- **Data Integrity** — Hash-chain verification + automatic backup on startup with rotation
- **Audit Log** — Immutable hash-chain audit trail for sensitive operations
- **Health Endpoint** — Liveness, readiness, and deep checks (storage, disk, task file)
- **API Envelope** — Standardized `{ success, data, meta }` response format across all endpoints
- **Schema Validation** — Zod schemas on all mutating API routes
- **Metrics** — Prometheus-compatible `/metrics` endpoint for monitoring
- **WebSocket Heartbeat** — Connection keep-alive with automatic reconnection and connection limits
- **Error Boundaries** — React error boundaries with graceful fallback UI
- **Dependency Audit** — Automated vulnerability scanning in CI

#### Storage & Architecture

- Abstract file storage behind repository interface (prep for future database backends)
- Structured logging with pino (replaced all `console.*` calls)

#### First-Run Experience

- Example tasks auto-populate the board on first run (4 sample tasks)
- Manual seed script: `pnpm seed`
- Task data `.gitignore`d — your data stays private

#### Dark/Light Mode

- Settings → General → Appearance toggle (moon/sun icon)
- Persists to localStorage; default is dark mode
- Inline script prevents flash of wrong theme on load

#### UI Theme

- Primary color: purple (`270° 50% 40%`) with white text
- Focus rings, switches, and accents updated to match

#### Documentation

- TROUBLESHOOTING.md with common issues and solutions
- Comprehensive FEATURES.md reference
- Agentic AI Safety best practices guide
- Roadmap section linking to v1.1 milestone
- Competitive comparison table
- OpenClaw (formerly Moltbot/Clawdbot) attribution updated

#### Per-Status Selection (#24)

- Select All checkbox per column header
- Toolbar buttons for bulk operations scoped to selected status
- Column checkboxes for quick multi-select

### Fixed

- **Chat delete not clearing UI** — React Query kept stale cached data after session file was deleted; now uses `removeQueries` to nuke cache
- **Chat send broken after delete** — Server now recreates task-scoped sessions instead of throwing 404
- **Cross-column drag-and-drop** — Tasks reliably move between columns with local state management during drag
- **Dashboard agent comparison** — Fixed broken data fetch (raw `fetch` → `apiFetch` for envelope unwrapping)
- **Dashboard drill-down** — Removed duplicate X button, fixed focus ring clipping, wired up `open-task` event
- **Localhost auth rate limit** (#25) — Exempted localhost from rate limiting
- **Numeric inputs** — Clean inputs without browser spinners (#19)
- **Timer start/stop** — Optimistic UI toggle + cache patch for instant feedback
- **Task cache fragmentation** — All routes now use TaskService singleton
- **Sprint/Agent label alignment** — Fixed form layout in task detail panel
- **Sticky header** — Fixed positioning + matched indicator dot sizes
- **Keyboard test infinite loop** — Resolved render loop in `useKeyboard` + memoized context
- **Agent idle timeout** — Increased from 5 to 15 minutes to reduce false resets
- **File lock ordering** — Added in-process FIFO queue for deterministic write ordering
- **Search filters** — Added task ID to board and archive search

### Changed

- Agent status popover: moved idle description to bottom, added activity history link
- WebSocket indicator: click popover with connection status explanation
- Dashboard layout: Daily Activity (75%) + Recent Status Changes (25%) side-by-side
- Rolling average line: cyan-teal to contrast purple theme
- Bar chart hover: subtle muted fill instead of white flash
- All repo links updated to BradGroux (primary repo)
- All contact emails standardized to contact@digitalmeld.io
- Test suite: 72 files, **1,270 tests** (up from 61 files / 1,143 tests)

---

## [1.0.0] - 2026-01-29

### 🎉 Initial Public Release

Veritas Kanban is an AI-native project management board built for developers and autonomous coding agents.

### Features

#### Core Board

- Kanban board with drag-and-drop between columns (Backlog, To Do, In Progress, Review, Done)
- Task detail panel with full editing (title, description, priority, status, type, project, sprint)
- Subtasks with progress tracking on cards
- Task type system with icons and color-coded borders
- Sprint management with auto-archive
- Bulk operations and keyboard shortcuts

#### Code Workflow

- Git worktree integration for code tasks
- Diff viewer for code review
- Line-level review comments
- Approval workflow with review decisions
- Merge and close integration

#### AI Agent Integration

- Agent orchestration system for autonomous task execution
- Agent status tracking (idle, working, sub-agent mode)
- Time tracking per task with automatic and manual entries
- REST API designed for AI agent consumption
- MCP (Model Context Protocol) server for LLM tool integration
- CLI for headless task management

#### Dashboard & Analytics

- Sprint velocity tracking
- Cost budget tracking with daily digest
- Task-level metrics and telemetry
- Status history timeline

#### Security

- JWT authentication with secret rotation
- Admin key + API key authentication
- CSP headers with Helmet
- Rate limiting with express-rate-limit
- CORS origin validation
- WebSocket origin validation
- Server-side MIME type validation for uploads
- Markdown sanitization (XSS prevention)
- Timing-safe credential comparison
- Credential redaction from task data

#### Performance

- In-memory task caching with file watchers
- Config caching with write invalidation
- Gzip response compression
- Lazy-loaded dashboard with vendor chunk splitting (69% bundle reduction)
- Pagination and summary mode for large datasets
- Reduced polling when WebSocket connected
- Telemetry retention and automatic cleanup

#### Infrastructure

- Production Dockerfile with multi-stage build (runs as non-root)
- GitHub Actions CI pipeline
- Pre-commit hooks with husky + lint-staged
- Structured logging with pino
- Request ID middleware for tracing
- Graceful shutdown with service disposal
- Unhandled rejection and exception handlers

#### Documentation

- OpenAPI/Swagger API documentation
- Deployment guide (Docker, bare metal, nginx, Caddy, systemd)
- Security audit reports
- Contributing guide with conventional commits
- Code of Conduct (Contributor Covenant v2.1)

#### Testing

- 61 test files, 1,143 unit tests (server + frontend) with Vitest
- End-to-end tests with Playwright (19/19 passing)
- Gitleaks pre-commit hook for secret scanning

### Technical Details

- **Frontend:** React 19, Vite 6, TypeScript 5.7, Tailwind CSS 3.4, Shadcn UI
- **Backend:** Express 4.21, TypeScript, file-based storage
- **Testing:** Playwright 1.58, Vitest 4
- **Runtime:** Node.js 22+, pnpm 9+

---

_Built by [Digital Meld](https://digitalmeld.io) — AI-driven enterprise automation._

[unreleased]: https://github.com/BradGroux/veritas-kanban/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/BradGroux/veritas-kanban/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/BradGroux/veritas-kanban/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/BradGroux/veritas-kanban/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/BradGroux/veritas-kanban/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/BradGroux/veritas-kanban/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/BradGroux/veritas-kanban/releases/tag/v1.0.0
