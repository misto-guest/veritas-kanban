# Sprint 7: Archive, Organization & Advanced Features

**Goal:** Complete the backlog - archive management, subtasks, dependencies, and quality-of-life features.

**Started:** 2026-01-26
**Status:** In Progress

---

## Stories

| ID | Title | Status | Dependencies | Notes |
|----|-------|--------|--------------|-------|
| US-701 | Archive sidebar | ✅ Done | None | Slide-out viewer with search/filter for archived tasks |
| US-702 | Restore from archive | ✅ Done | US-701 | Unarchive tasks back to board |
| US-703 | Subtasks | ✅ Done | None | Nested tasks with parent completion logic |
| US-704 | Task dependencies | ✅ Done | US-703 | Block tasks until dependencies complete |
| US-705 | Multiple task attempts | ✅ Done | None | Retry with different agent, preserve history |
| US-706 | Auto-archive suggestions | ✅ Done | US-701, US-703 | Suggest archiving when project complete |
| US-707 | GitHub PR creation | ✅ Done | None | Create PR from task detail UI |
| US-708 | Preview mode | ✅ Done | None | Embedded browser for dev server preview |
| US-709 | Merge conflict resolution | ✅ Done | None | Visual conflict resolver UI |
| US-710 | Time tracking | ✅ Done | None | Start/stop timer, manual entry, reports |
| US-711 | Running indicator on cards | ⏳ Todo | None | Spinner/pulse animation when agent running |

---

## Story Details

### US-701: Archive sidebar
- Slide-out panel (like Activity log)
- List all archived tasks
- Search by title/description
- Filter by project, type, date range
- Click to view task details

### US-702: Restore from archive
- "Restore" button in archive sidebar
- Returns task to Done column
- Preserves all task data

### US-703: Subtasks
- Add subtasks to any task
- Subtasks displayed nested under parent
- Checkbox completion
- Parent shows progress (3/5 complete)
- Parent auto-completes when all subtasks done (optional)

### US-704: Task dependencies
- "Blocked by" field in task detail
- Visual indicator for blocked tasks
- Cannot move blocked task to In Progress
- Auto-unblock when dependency completes

### US-705: Multiple task attempts
- "New Attempt" button on completed/failed tasks
- Select different agent for retry
- Previous attempts preserved in history
- View logs from any attempt

### US-706: Auto-archive suggestions
- Detect when all tasks in a project are Done
- Show notification/banner suggesting archive
- One-click archive all completed project tasks

### US-707: GitHub PR creation
- "Create PR" button on tasks with branches
- Pre-fill title/description from task
- Select target branch
- Opens PR in browser on success
- Shows PR link in task detail

### US-708: Preview mode
- Configure dev server command per repo
- Embedded iframe preview panel
- URL detection from dev server output
- Refresh button
- Open in external browser option

### US-709: Merge conflict resolution
- Detect conflicts on rebase/merge
- Show conflicting files with diff
- Side-by-side conflict viewer
- Accept theirs/ours/manual buttons
- Mark resolved and continue merge

### US-710: Time tracking
- Start/stop timer on tasks
- Manual time entry option
- Time displayed on task card
- Time summary per project
- Export time report

### US-711: Running indicator on task cards
- Visual indicator (spinner or pulse) on task card
- Shows when agent is actively running
- Easy to spot active work at a glance from board view

---

## Progress Log

### 2026-01-26

**US-707: GitHub PR creation** ✅
- Created GitHubService for PR operations via `gh` CLI
- Added prUrl and prNumber fields to TaskGit type
- API endpoints: GET /api/github/status, POST /api/github/pr
- Create PR dialog in GitSection with:
  - Pre-filled title from task title
  - Description textarea
  - Draft PR option
  - Error handling
- View PR button when PR exists (links to GitHub)
- Auto-opens PR in browser after creation
- Stores PR link in task for future reference

**US-708: Preview mode** ✅
- Added DevServerConfig to RepoConfig type (command, port, readyPattern)
- PreviewService manages dev server processes:
  - Start/stop servers per task
  - Auto-detect port from output
  - Ready detection patterns
  - Output capture (last 100 lines)
- API endpoints: GET/POST /api/preview/:taskId, output, start, stop
- PreviewPanel component:
  - Slide-out panel (800px wide)
  - Start/stop controls
  - Iframe preview of running server
  - Terminal output toggle
  - URL display bar
  - Refresh and open external buttons
- Preview button added to TaskDetailPanel for code tasks with repos

**US-706: Auto-archive suggestions** ✅
- TaskService methods: getArchiveSuggestions(), archiveProject()
- Server-side detection of completed projects (all tasks done)
- API endpoints: GET /api/tasks/archive/suggestions, POST /api/tasks/archive/project/:project
- ArchiveSuggestionBanner component:
  - Green success banner when project complete
  - Shows task count
  - One-click "Archive All" button
  - Dismiss (X) button to hide suggestion
  - Confirmation dialog before archiving
- Activity logging for project_archived events
- Replaces client-side ProjectArchiveSuggestion with server-side approach

**US-709: Merge conflict resolution** ✅
- ConflictService for detecting and resolving git conflicts:
  - Detect rebase/merge in progress
  - List conflicting files
  - Get file conflict details (ours, theirs, base versions)
  - Parse conflict markers
  - Resolve with ours/theirs/manual content
  - Abort or continue rebase/merge
- API endpoints: GET /api/conflicts/:taskId, file, resolve, abort, continue
- ConflictResolver component:
  - Slide-out panel (90vw, max 1200px)
  - File list sidebar with conflict count
  - Side-by-side comparison view (Ours vs Theirs)
  - Manual edit tab with full content editor
  - Accept Ours / Accept Theirs buttons
  - Abort and Continue actions with confirmation
  - File navigation (prev/next)
- Conflict warning banner in GitSection when conflicts detected
- Auto-polling when conflicts present

**US-710: Time tracking** ✅
- TimeEntry and TimeTracking types added to shared types
- TaskService methods: startTimer, stopTimer, addTimeEntry, deleteTimeEntry, getTimeSummary
- API endpoints: /api/tasks/:id/time/start, stop, entry, /api/tasks/time/summary
- TimeTrackingSection component:
  - Start/Stop timer button with live elapsed time display
  - Manual time entry dialog (supports "1h 30m", "45m", or minutes)
  - Time entries list with descriptions
  - Delete entries (except running)
  - Total time display
- Time indicator on TaskCard:
  - Shows total tracked time
  - Animated timer icon when running
- formatDuration and parseDuration utility functions

(Starting Sprint 7)
