# Tessitura Product Spec & Development Plan

## Product Vision

Tessitura is a subscription-based practice management platform for musicians. It provides structured practice tracking with tempo progression, gamification, social features, and ensemble management tools. Originally built for British brass band test piece preparation, it's designed to be instrument- and genre-agnostic.

**Domain:** practicegrids.com
**Current deployment:** DigitalOcean (159.223.198.58)

---

## Actors

### 1. Musician (Individual Performer)
The primary user. Practices their instrument and wants structured tools to track progress, stay motivated, and improve.

- Creates and works through practice grids
- Tracks practice time and completion
- Earns achievements and maintains streaks
- Sets practice goals and views analytics
- Connects with other musicians socially
- Belongs to zero or more ensembles

### 2. Director (Teacher / Conductor / Section Leader)
Manages a group of musicians. Needs visibility into group practice habits and the ability to assign work.

- Creates and manages ensembles
- Invites/removes musicians from ensembles
- Assigns practice grids with due dates
- Views individual and aggregate practice analytics
- Exports reports on ensemble progress
- Configures social visibility settings for their ensemble

### 3. Admin (Platform Operator)
Willow and any future platform operators.

- Manages subscription tiers and feature grants
- Views platform-wide analytics
- Handles user support escalations
- Manages billing and Stripe configuration

### 4. System (Automated)
Background processes and integrations.

- Sends streak reminders and notifications
- Processes subscription billing via Stripe
- Calculates and awards achievements
- Generates analytics aggregations

---

## Subscription Tiers

### Free
- 1 active practice grid
- Basic grid completion tracking
- Daily streak tracking
- Limited achievement set
- Curated subset of education literature library (5-10 studies per author)

### Pro ($X/mo)
- Unlimited practice grids
- Full analytics dashboard (time trends, piece-level, goal tracking)
- Complete achievement system
- Individual social features (user profiles, community library stats, practice feed suggestions)
- Practice goal setting
- Full education literature library access
- Smart practice feed (suggestions engine)

### Team ($X/mo per seat, or $X/mo flat)
- Everything in Pro
- Ensemble creation and management
- Assignment system with due dates
- Director analytics dashboard with custom reports
- Export capabilities
- Ensemble social features (activity feed, practice challenges, mentorship/feedback)
- Configurable social visibility controls

---

## Global Rejection Criteria

The following rejection criteria apply to EVERY use case in this spec. A feature is NOT accepted if any of these are violated, regardless of whether its acceptance criteria are met.

### Data Integrity
- No data loss on unexpected disconnection, browser crash, or server restart. If a user completes a cell and the page crashes 1 second later, that completion must be persisted.
- All write operations must be atomic — no partial state (e.g., a row created without its cells, a completion recorded without updating the interval).
- Database constraints must enforce referential integrity — no orphaned records.
- All timestamps must be stored in UTC with timezone-aware fields.
- Concurrent operations by the same user (e.g., two tabs) must not produce corrupt state — last-write-wins at minimum, optimistic locking preferred.

### Testing
- No new unit test failures.
- No new skipped tests.
- Minimum 95% code coverage on ALL code (not just "business logic" — everything).
- **No ghost tests.** Tests must be valid — no `assert(true)`, no `expect(1).toBe(1)`, no deleting a test because it got complex. If a test is hard to write, that's a signal the code needs refactoring, not the test needs removing.
- Every UI feature must have an associated Playwright e2e test with screenshot verification.
- Every API endpoint must have integration tests covering success, validation failure, and authorization failure cases.

### Security
- All user input must be sanitized — no raw user input rendered in HTML, SQL, or shell contexts.
- Authentication required on all non-public endpoints.
- Authorization checked on every request — users must not be able to access, modify, or delete other users' data by manipulating IDs or parameters.
- No secrets, tokens, or credentials in client-side code or git history.
- HTTPS enforced in production. HTTP requests redirected.
- Rate limiting on authentication endpoints and any endpoint that sends emails.
- CSRF protection on all state-changing operations.
- SQL injection prevention via parameterized queries (ORM-enforced).
- XSS prevention via framework-level output escaping.

### UX
- **The UI must NEVER be technical.** Users must never see internal IDs, database field names, enum values, timestamps in ISO format, or any implementation detail. All data displayed must be human-readable presentation data. URLs may contain IDs for routing purposes, but IDs must never appear in visible UI text, labels, or messages.
- Zero JavaScript console errors in normal operation. Console warnings must be reviewed and either resolved or explicitly documented as acceptable.
- No unhandled promise rejections.
- Every UI state change must provide visual feedback within 200ms (loading indicators for longer operations).
- Error states must show user-friendly messages — never stack traces, raw error codes, or technical jargon.
- All interactive elements must be keyboard-accessible.
- Every new UI feature must have an associated screenshot in the test suite validating its appearance.

### Performance
- Database queries must not use N+1 patterns.
- Performance targets will be established per-phase as the system matures — not prematurely constrained.

---

## Use Cases by Phase

---

## V1: Foundation — User Registration, Infra, Core Practice Grid

### Goal
Solid foundation: real user accounts, modernized infrastructure, and a polished single-practice-grid experience.

### Use Cases

**UC-1.1: User Registration**
- As a musician, I want to create an account with my email and password so that I can save my practice data and access it from any device.
- Actor: Musician
- User signs up with email + password, sets display name and instrument(s)
- Email verification required before account activation
- Acceptance Criteria:
  - Registration form validates email uniqueness, password strength (8+ chars, 1 uppercase, 1 number)
  - Verification email sent within 30 seconds
  - Unverified accounts cannot access practice features
  - User can resend verification email (rate limited: 1 per 60s)
- Rejection Criteria:
  - Password stored in plaintext or reversible encryption
  - Registration succeeds with an already-registered email
  - Unverified user can access any authenticated endpoint
  - Verification token is guessable or does not expire

**UC-1.2: User Login / Logout**
- As a musician, I want to log in with my email and password so that I can access my practice grids, and log out when I'm done.
- Actor: Musician
- Acceptance Criteria:
  - Login returns JWT or session token
  - Failed login after 5 attempts locks account for 15 minutes
  - "Forgot password" flow sends reset email
  - Logout invalidates session
- Rejection Criteria:
  - Login response reveals whether an email is registered (use generic "invalid credentials" message)
  - Session token persists after logout (token must be invalidated server-side)
  - Password reset token is reusable after use
  - Account lockout is bypassable by switching IP/client

**UC-1.3: Create Practice Grid**
- As a musician, I want to create a new practice grid by giving it a name and optional notes so that I can organize my practice for a piece of music.
- Actor: Musician
- Acceptance Criteria:
  - Grid requires a name (1-200 chars)
  - Notes are optional (expandable text field, no character limit — stored as unbounded text)
  - Grid is immediately visible in user's grid list
  - Grid stores created_at timestamp
  - Only the owning user can see/edit the grid
- Rejection Criteria:
  - Grid created without a user_id association
  - Grid visible to any user other than the owner
  - Grid created with empty or whitespace-only name
  - HTML/script tags in name or notes rendered unescaped

**UC-1.4: Add Practice Row to Grid**
- As a musician, I want to add a row to my grid by specifying a passage (piece name, measures), target tempo, and number of steps so that the system generates graduated tempo cells for me to practice through.
- Actor: Musician
- Acceptance Criteria:
  - Target tempo: any positive integer BPM (no artificial bounds)
  - Steps: user-defined positive integer, no fixed cap — UI adapts layout to step count (wrapping, scrolling, or condensed cells as needed)
  - Start/end measures: required, free-text (supports "1-8", "A", "Intro", etc.)
  - Cells generated with evenly distributed tempo percentages
  - Row appears immediately in grid view
- Rejection Criteria:
  - Row created with zero or negative steps
  - Row created with zero or negative target tempo
  - Cells generated with incorrect tempo percentages (must be mathematically exact: 0.4 + (0.6 * step/total_steps))
  - Row created without parent grid association
  - Row visible on a grid the user does not own

**UC-1.5: Dashboard Layout**
- As a musician, I want to see a clear, organized dashboard when I log in so that I can immediately understand my practice status and decide what to do next.
- Actor: Musician
- **Core UX principle:** This is the first thing non-technical, skeptical users see. It must be immediately useful, uncluttered, and self-explanatory. No jargon, no empty states without guidance.
- Acceptance Criteria:
  - 4-quadrant layout: upper-left (Alerts), upper-right (My Grids), lower-left (Statistics), lower-right (Practice Focus)
  - Responsive: 2x2 grid on desktop, stacks vertically on mobile (alerts → grids → stats → focus)
  - Each quadrant has a clear header and bounded content area
  - No quadrant requires scrolling on initial load (content truncated with "See all →" links)
  - Dashboard loads as a single page — no tab switching required for core info
- Rejection Criteria:
  - Dashboard shows data belonging to another user
  - Layout breaks or overlaps on any viewport between 320px and 2560px
  - Dashboard renders blank or broken for a brand-new user with no data

**UC-1.5a: Dashboard — Alerts Pane**
- As a musician, I want to see personalized alerts and prompts so that I know what needs my attention right now.
- Actor: Musician
- Acceptance Criteria:
  - Personalized greeting ("Welcome back, [name]")
  - Actionable alerts, prioritized:
    - Resume prompts ("Resume [grid name] — 3 stale cells need attention")
    - Decay warnings ("You have 5 rows approaching decay")
    - Social notifications ("New comments on your achievements!", "Director posted an assignment") (V5+)
  - Alerts are clickable — each navigates directly to the relevant context
  - Empty state (new user): onboarding prompt ("Create your first practice grid →")
  - Maximum 5 alerts shown, with "See all →" link
- Rejection Criteria:
  - Alerts link to a grid/row that doesn't exist or belongs to another user
  - Alert text exposes internal IDs or technical data
  - New user sees an empty pane with no guidance

**UC-1.5b: Dashboard — My Grids Pane**
- As a musician, I want to see all my practice grids at a glance so that I can quickly jump into practicing.
- Actor: Musician
- Acceptance Criteria:
  - List of user's active practice grids
  - Each grid card shows: name, completion %, last practiced date, freshness indicator (stale/decayed cell count)
  - Each grid is clickable — navigates directly into the grid view
  - "New Grid" button prominently visible
  - Sort: last modified (default)
  - V1: single grid displayed; V2+: scrollable list with archive toggle
- Rejection Criteria:
  - Grid cards show internal IDs or database fields
  - Grids from other users appear in the list
  - "New Grid" button hidden or hard to find

**UC-1.5c: Dashboard — Statistics Pane**
- As a musician, I want to see my practice statistics so that I can track my progress over time.
- Actor: Musician
- Acceptance Criteria:
  - V1: basic stats — current streak, total cells completed, grid completion %
  - V2+: expanded with practice time trends, charts, goal progress
  - Always shows something meaningful even for brand-new users ("Complete your first cell to start tracking!")
  - Stats update in real-time as user completes cells
- Rejection Criteria:
  - Statistics show stale data from a previous session
  - Pane shows nothing for a new user (must have empty state with guidance)
  - Stats include data from soft-deleted grids

**UC-1.5d: Dashboard — Practice Focus Pane**
- As a musician, I want personalized suggestions for what to practice so that I can make the most of my practice time.
- Actor: Musician
- Acceptance Criteria:
  - V1-V2: practice focus suggestions (rows with highest priority + most decay urgency)
  - V3+: also shows achievement showcase with recent unlocks and next-closest achievements
  - Shows top 3-5 suggested rows to work on
  - Each suggestion is clickable — jumps directly into that grid/row
  - Empty state: "Start practicing to see personalized suggestions here"
- Rejection Criteria:
  - Suggestions reference grids the user doesn't own
  - Suggestions show internal priority enum values instead of human-readable labels
  - Same suggestions shown after user acts on them (must refresh)

**UC-1.6: Complete Practice Cell**
- As a musician, I want to click on a practice cell to mark it as complete so that my progress is recorded and I can see the grid fill with green.
- Actor: Musician
- Acceptance Criteria:
  - Click/tap on an incomplete cell creates a PracticeCellCompletion with today's date
  - Cell immediately transitions to "completed" visual state (solid green)
  - Grid completion percentage recalculates and updates in real-time
  - Completion state persists across sessions and page reloads
- Rejection Criteria:
  - Completion lost if browser crashes immediately after click (must be persisted server-side before UI confirms)
  - User can complete a cell on a grid they don't own
  - Double-click creates duplicate completion records for the same cell on the same date
  - Completion percentage exceeds 100% or goes negative

**UC-1.7: Uncomplete Practice Cell**
- As a musician, I want to right-click or long-press a completed cell to undo the completion so that I can correct mistakes.
- Actor: Musician
- Acceptance Criteria:
  - Right-click or long-press on a completed cell removes its PracticeCellCompletion record
  - Cell immediately transitions back to incomplete visual state
  - Grid completion percentage recalculates
  - If the cell had a freshness interval > 1 day (from prior spaced repetition), the interval resets to 1
- Rejection Criteria:
  - Uncomplete leaves orphaned completion records in the database
  - User can uncomplete a cell on a grid they don't own
  - Grid completion percentage does not update after uncomplete

**UC-1.8: Freshness Decay (Spaced Repetition)**
- As a musician, I expect my completed cells to gradually fade over time so that I'm reminded to maintain my skills, not just check boxes once and forget.
- Actor: System
- Acceptance Criteria:
  - Each cell tracks a freshness interval (initial: 1 day after first completion)
  - Re-practicing a cell before it goes stale doubles the interval (1→2→4→8→16→... days, capped at 30)
  - Missing the interval resets it (configurable per user: full reset to 1, or halve)
  - Cell visual states based on time since last completion relative to interval:
    - **Fresh** (green): within the first 50% of the interval
    - **Aging** (yellow/fading green): 50%-100% through the interval
    - **Stale** (orange/red): past the interval but within 2x
    - **Decayed** (grey): more than 2x past the interval
  - Decayed cells no longer count toward grid completion percentage
  - Freshness is calculated on read (derived from last completion date + current interval), not stored as separate state
- Rejection Criteria:
  - Freshness interval stored incorrectly after re-practice (must exactly double, not approximate)
  - Interval exceeds the 30-day cap
  - Freshness state calculated using server time instead of user's timezone
  - A cell displays as "Fresh" when it should be "Stale" or vice versa (off-by-one in interval math)

**UC-1.9: Cascading Fade Order**
- As a musician, I expect my highest-tempo completions to fade first, because top-end speed is the hardest to maintain, while foundational tempos persist longer.
- Actor: System
- Acceptance Criteria:
  - If cells at 40%, 50%, 60% are all completed, 60% begins fading first
  - 50% only begins its fade timer once 60% has fully decayed
  - 40% only begins its fade timer once 50% has fully decayed
  - Visual effect: green erodes from the right edge of a row inward — the grid "drains" over time
  - A cell that is "waiting" (lower tempo, shielded by a higher cell that hasn't decayed yet) displays as Fresh regardless of time elapsed
  - Shielded cells count as 'fresh' for grid completion percentage — they are effectively maintained by the higher-tempo cell above them
- Rejection Criteria:
  - Lower-tempo cells begin fading while higher-tempo cells in the same row are still fresh/aging
  - Cascading order breaks when cells are completed out of sequence (e.g., 40% and 60% completed but not 50%)
  - Fade calculations produce different results on page refresh vs initial render

**UC-1.10: Configure Fade Per Grid**
- As a musician, I want to toggle freshness decay on or off for each grid so that I can choose between maintenance mode and classic checkbox mode.
- Actor: Musician
- Acceptance Criteria:
  - Toggle control on the grid settings/header
  - **Fade ON (default):** cells decay per UC-1.8 (Freshness Decay) and UC-1.9 (Cascading Fade) rules
  - **Fade OFF:** completions are permanent — classic checkbox behavior, solid green stays green forever
  - Default for new grids: fade ON (configurable in user preferences)
  - Toggling fade off does NOT delete freshness data — toggling back on restores the decay view with current state
  - Grid completion percentage calculation adjusts: fade ON = only fresh+aging count; fade OFF = all completions count
- Rejection Criteria:
  - Toggling fade off deletes or corrupts freshness interval data
  - Grid completion percentage doesn't recalculate when fade is toggled
  - Fade setting changes on one device don't sync to another device/session

**UC-1.11: Set Row Priority**
- As a musician, I want to assign a priority level (Critical/High/Medium/Low) to each row so that important passages get more attention in practice suggestions.
- Actor: Musician
- Acceptance Criteria:
  - Priority levels: Critical / High / Medium / Low (default: Medium)
  - Priority displayed visually on the row (color accent or icon)
  - Priority affects practice feed ordering (V2)
  - Priority persists and is editable at any time
- Rejection Criteria:
  - Priority value falls outside the defined enum (Critical/High/Medium/Low)
  - Priority change not persisted after page refresh

**UC-1.12: View Practice Grid**
- As a musician, I want to view my practice grid with all rows, cells, and their freshness state so that I can see my progress as a visual wall of green and know what needs maintenance.
- Actor: Musician
- **Core UX principle:** The visual grid filling with green is a primary motivator. The grid layout and color feedback must feel satisfying and rewarding. Design decisions should preserve and enhance the "wall of green" experience.
- Acceptance Criteria:
  - Each cell displays its target tempo (BPM, calculated from percentage * row target)
  - **Color states (when fade enabled):** Fresh = solid green, Aging = fading green/yellow, Stale = orange/red, Decayed = grey. Transitions should feel organic, not abrupt.
  - **Color states (when fade disabled):** Completed = solid green, Incomplete = empty. Classic satisfying checkbox behavior.
  - Grid completion percentage shown as progress bar
  - With fade on, the grid visually "drains" from right to left within each row (highest tempos fade first), creating urgency to maintain mastery
  - Rows show priority indicator (color accent or badge)
  - Responsive layout works on mobile viewports (320px+)
  - Grid must render smoothly with large step counts (50+ cells per row)
- Rejection Criteria:
  - Grid displays stale data from a previous session (must reflect current DB state)
  - Color states don't match the freshness model (e.g., a cell shows green when it should be yellow)
  - Completion percentage calculation disagrees between grid view and dashboard
  - Grid layout breaks with 1 row, 50 rows, 1 step, or 100 steps
  - Tempo display shows floating-point artifacts (e.g., "79.99999 BPM" instead of "80 BPM")

**UC-1.13: Delete Practice Grid**
- As a musician, I want to delete a practice grid I no longer need so that it doesn't clutter my dashboard.
- Actor: Musician
- Acceptance Criteria:
  - Confirmation dialog before deletion
  - Soft delete: sets deleted_at on grid AND cascades to all child rows, cells, and completions
  - Grid disappears from user's list immediately
  - Soft-deleted grid excluded from all queries and dashboard stats
- Rejection Criteria:
  - Hard delete (row physically removed from database)
  - User can delete a grid they don't own by manipulating the request
  - Soft-deleted grid still appears in list or affects completion stats
  - Deletion proceeds without user confirmation

**UC-1.14: Edit Practice Row**
- As a musician, I want to edit a row's measure range, target tempo, or step count so that I can adjust my practice plan as I learn more about the piece.
- Actor: Musician
- Acceptance Criteria:
  - Changing step count regenerates cells (existing completions are lost — user warned with confirmation dialog)
  - Changing target tempo updates cell display values without losing completions
  - Changing measures updates display only
- Rejection Criteria:
  - Step count change silently destroys completions without user confirmation
  - Cell regeneration produces different tempo percentages than initial generation for the same step count
  - Edit allows setting target tempo to zero or negative
  - Edit applies to a row on a grid the user doesn't own

**UC-1.15: Edit Row Priority**
- As a musician, I want to change a row's priority level so that I can reprioritize as my practice needs evolve.
- Actor: Musician
- Acceptance Criteria:
  - Priority change takes effect immediately in display
  - Updates future practice feed weighting (V2)
  - No impact on existing completion data
- Rejection Criteria:
  - Priority change affects completion data or freshness intervals

**UC-1.16: Delete Practice Row**
- As a musician, I want to remove a row from my grid so that I can clean up passages I no longer need to practice.
- Actor: Musician
- Acceptance Criteria:
  - Delete button on each row (with confirmation)
  - Soft delete: sets deleted_at on row AND cascades to all child cells and completions
  - Grid completion percentage recalculates after deletion
  - Row disappears immediately from grid view
- Rejection Criteria:
  - Hard delete (row physically removed)
  - User can delete a row on a grid they don't own
  - Soft-deleted row's cells still count toward grid completion
  - Deletion proceeds without user confirmation

**UC-1.17: Delete User Account**
- As a musician, I want to delete my account so that my personal data is removed from the platform if I choose to leave.
- Actor: Musician
- Acceptance Criteria:
  - Delete account option in user settings
  - Requires password confirmation before proceeding
  - Soft delete: sets deleted_at on user, cascades to all owned entities
  - If user has an active Stripe subscription, cancel it via Stripe API
  - User's email and display name are anonymized (e.g., "deleted-user-[hash]") to prevent PII retention
  - Confirmation dialog explaining the action
  - Account immediately inaccessible — login fails
  - User's data excluded from all community stats, feeds, and ensemble views
- Rejection Criteria:
  - Soft-deleted user's data still visible to other users (ensemble feeds, community stats)
  - Active subscription continues billing after account deletion
  - Account deletion accessible without password confirmation
  - Anonymization fails to remove all PII

### V1 Limits
- 1 practice grid per user (enforced at creation)
- No social features
- No achievements
- No ensemble features
- No billing (all users are effectively "free")

### V1 Acceptance Criteria (System-Level)
- User data is isolated — users cannot see other users' grids
- All API endpoints require authentication
- Application loads in <2s on 3G connection
- Works on Chrome, Firefox, Safari, Edge (latest 2 versions)
- Responsive down to 320px viewport width

---

## V2: Multiple Grids & Statistics

### Goal
Expand practice capability and give musicians insight into their practice habits.

### Use Cases

**UC-2.1: Multiple Practice Grids**
- As a musician, I want to create and manage multiple practice grids so that I can organize my practice across different pieces and projects simultaneously.
- Actor: Musician
- User can create and manage multiple practice grids
- Acceptance Criteria:
  - No limit on number of grids (will be governed by grants in V3)
  - Grid list shows all grids sorted by last modified
  - Each grid shows completion percentage in list view
  - User can archive grids (hidden from main list, viewable in archive)
- Rejection Criteria:
  - Archived grids lose their completion or freshness data
  - User sees another user's grids in their list
  - Grid sort order is inconsistent between page loads

**UC-2.1a: Archive Practice Grid**
- As a musician, I want to archive a completed or inactive grid so that it's hidden from my main list but preserved for reference.
- Actor: Musician
- Acceptance Criteria:
  - Archive button on each grid (toggleable)
  - Archived grids hidden from main grid list and dashboard
  - Archived grids viewable in a separate "Archive" section
  - Archiving preserves all data (completions, freshness, rows, cells)
  - Archived grids do not appear in practice feed suggestions
  - User can unarchive a grid to restore it to the main list
- Rejection Criteria:
  - Archiving deletes or modifies any grid data
  - Archived grids still appear in dashboard stats or practice feed
  - Unarchive fails to fully restore the grid to active state

**UC-2.2: Practice Time Tracking**
- As a musician, I want to log my practice sessions and have the system track when I complete cells so that I can see how much time I'm investing in my practice.
- Actor: Musician
- User can log practice sessions with duration
- System tracks when cells are completed for passive time inference
- Acceptance Criteria:
  - Manual practice log: date, duration (minutes), optional notes
  - Automatic tracking: timestamp on cell completions
  - Practice time visible on grid detail view
  - Daily/weekly/monthly practice time summaries
- Rejection Criteria:
  - Practice time logged for a future date
  - Duplicate manual log entries for the same date/time not prevented
  - Automatic timestamps drift from actual completion time by more than 1 second

**UC-2.3: Practice Time Trend Analytics**
- As a musician, I want to view charts showing my practice frequency and duration over time so that I can identify patterns and stay motivated by seeing my consistency.
- Actor: Musician
- User views charts showing practice frequency and duration over time
- Acceptance Criteria:
  - Line/bar chart: practice minutes per day (last 30 days)
  - Weekly summary: total minutes, sessions count, days practiced
  - Monthly comparison: this month vs last month
  - Streak counter: consecutive days with at least 1 practice session
- Rejection Criteria:
  - Charts display data from other users
  - Time aggregations are off due to timezone handling (all calculations must use user's configured timezone)
  - Charts crash or show errors when user has no practice data

**UC-2.4: Piece-Level Analytics**
- As a musician, I want to view per-piece progress showing which measures are mastered and my tempo progression so that I can focus my practice on the weakest passages.
- Actor: Musician
- User views per-piece progress showing which measures are mastered and tempo progress curves
- Acceptance Criteria:
  - Per-row: percentage of cells completed
  - Per-row: current max completed tempo percentage
  - Visual tempo progress curve (cells completed over time)
  - Heat map or color coding showing mastery level per row
- Rejection Criteria:
  - Analytics show completed cells that have decayed as "completed" (must respect freshness state)
  - Max completed tempo percentage doesn't account for decay
  - Progress curve data points are out of chronological order

**UC-2.5: Practice Goal Setting**
- As a musician, I want to set practice goals for daily minutes, weekly sessions, or grid completions so that I have clear targets to work toward and can measure my discipline.
- Actor: Musician
- User sets practice goals and tracks progress against them
- Acceptance Criteria:
  - Goal types: minutes per day, minutes per week, sessions per week, grids completed per month
  - Visual progress indicator (ring/bar showing % to goal)
  - Notification when goal is achieved
  - Historical goal completion tracking
- Rejection Criteria:
  - Goal progress exceeds 100% or shows negative
  - Goal notification fires more than once for the same achievement
  - User can create goals with zero or negative target values

**UC-2.6: Practice Feed (Smart Suggestions)**
- As a musician, I want the system to generate a prioritized daily practice feed so that I know exactly what to work on based on what's most urgent and important.
- Actor: Musician, System
- System generates a prioritized daily practice feed suggesting what to work on
- Feed is driven by freshness decay state + row priority + time since last practice
- Acceptance Criteria:
  - Feed algorithm weighs: (1) priority level, (2) freshness urgency (stale/decayed cells first), (3) time since last practiced
  - Critical priority rows with decaying cells appear at top
  - Feed shows: row name, measures, current freshness state, suggested tempo to practice at
  - Suggested tempo = highest completed tempo that is still fresh (or last stale tempo to re-establish)
  - Feed updates daily or on-demand refresh
  - User can dismiss/snooze individual suggestions
  - Feed is per-grid or aggregated across all grids (user toggle)
- Rejection Criteria:
  - Feed suggests rows from grids the user doesn't own
  - Suggested tempo is higher than a tempo the user has ever completed
  - Feed shows items from archived grids without user opting in
  - Feed algorithm produces different results on repeated loads with same data (must be deterministic)

**UC-2.7: Technique Grid Support**
- As a musician, I want to create grids for technical studies with appropriate labels so that I can track my fundamentals work separately from my repertoire practice.
- Actor: Musician
- Users can create grids for technical studies (not just repertoire)
- Grid type field distinguishes repertoire grids from technique grids
- Acceptance Criteria:
  - Grid has a `type` field: "repertoire" (default) or "technique"
  - Technique grids work identically to repertoire grids mechanically
  - Technique rows can reference a study (e.g., "Clarke Technical Study #3 in Eb") instead of measure ranges
  - UI labels adapt: "Study" instead of "Piece", "Exercise" instead of "Measures" (where contextual)
  - Technique grids appear in their own section or with a filter toggle in the grid list
- Rejection Criteria:
  - Technique grid type changes behavior of cell completion, freshness, or fade mechanics
  - Grid type cannot be set at creation time
  - Repertoire-specific UI labels appear on technique grids or vice versa

**UC-2.8: Browse Education Literature Library**
- As a musician, I want to browse a curated library of technique grid templates from public-domain music education literature so that I can discover proven practice material without building grids from scratch.
- Actor: Musician
- User browses a curated library of technique grid templates from public-domain music education literature
- Acceptance Criteria:
  - Library organized by author/collection:
    - Arban — Complete Conservatory Method
    - Clarke — Technical Studies for the Cornet
    - Schlossberg — Daily Drills and Technical Studies
    - Additional authors added over time by Admin
  - Each entry shows: title, author, collection, description, instrument tags
  - Searchable and filterable by author, instrument, difficulty
  - Entries gated by tier are visible but marked with a Pro badge
  - **Free tier:** curated subset available (e.g., 5-10 foundational studies per author)
  - **Pro/Team tier:** full library access
- Rejection Criteria:
  - Free-tier user can access Pro-tier templates by manipulating request parameters
  - Library shows copyrighted (non-public-domain) content
  - Search returns results from other users' private grids

**UC-2.9: Clone Library Template to My Grids**
- As a musician, I want to add a library template to my own grids as an independent copy so that I can practice a curated study with full tracking and the freedom to customize it.
- Actor: Musician
- User adds a library template to their own grids as an independent copy
- Acceptance Criteria:
  - "Add to My Grids" button on each library entry
  - Clones the template's grid structure (rows, tempos, steps) into a new PracticeGrid owned by the user
  - User's copy is fully independent — editable, deletable, tracks its own completions
  - Source template ID stored on the cloned grid (for community stats tracking)
  - If user already cloned this template, show a warning ("You already have this grid — clone again?")
- Rejection Criteria:
  - Cloned grid retains a live link to the template (changes to template alter user's grid)
  - Clone operation fails silently — must either succeed fully or show error
  - Cloned grid is missing any rows, cells, or configuration from the source template

**UC-2.10: Library Community Stats**
- As a musician, I want to see how many other musicians are practicing each library template so that I can discover popular studies and feel connected to a community of learners.
- Actor: Musician, System
- Library entries display aggregate community practice data
- Acceptance Criteria:
  - Each entry shows: number of users currently practicing this template, average completion %
  - Stats are cached and refreshed periodically (not real-time)
  - Stats are anonymous — no individual user data exposed
  - Provides social proof: "1,247 musicians are working on this study"
- Rejection Criteria:
  - Stats reveal individual user identities or practice details
  - Stats include data from deleted or deactivated user accounts
  - Cached stats are more than 24 hours stale

**UC-2.11: Admin Manage Library Templates**
- As an admin, I want to create, edit, and manage library template content so that musicians have access to high-quality, curated practice material.
- Actor: Admin
- Admin creates, edits, and manages library template content
- Acceptance Criteria:
  - Admin CRUD interface for library templates
  - Each template defines: title, author, collection, description, instrument tags, tier (free/pro), grid structure (rows with tempos and steps)
  - Templates constructed from public-domain works only
  - Changes to a template do not affect already-cloned user grids
  - Admin can deactivate a template (hides from library, does not affect cloned grids)
- Rejection Criteria:
  - Non-admin user can access the template management interface or API
  - Editing a template alters existing cloned user grids
  - Template with invalid grid structure (e.g., 0 steps, missing tempos) can be published

### V2 Limits
- No limits on grid count yet (V3 adds grants)
- Analytics are individual only (no ensemble/comparative)
- No export of analytics data
- Goals are self-set only (no assigned goals)
- Practice feed is algorithmic only (no AI/ML recommendations)
- Library is brass-focused initially, expanded to other instruments over time

---

## V3: Achievements & Grant System

### Goal
Add gamification to drive engagement and build the access control layer that will govern free/pro/team feature boundaries.

### Use Cases

**UC-3.1: Achievement System**
- As a musician, I want to earn achievements for reaching practice milestones so that I feel rewarded for my dedication and can showcase my progress.
- Actor: Musician, System
- System awards achievements based on practice milestones
- Acceptance Criteria:
  - Achievement categories: Streaks, Completion, Time, Exploration
  - Example achievements:
    - "First Steps" — Complete your first practice cell
    - "Grid Master" — Complete 100% of a practice grid
    - "Week Warrior" — Practice every day for 7 consecutive days
    - "Century" — Log 100 hours of practice
    - "Tempo Climber" — Complete a cell at 100% tempo
    - "Marathon" — Practice for 60+ minutes in a single session
  - Achievements show unlock date
  - Achievement showcase on user profile
  - Toast/notification on unlock
- Rejection Criteria:
  - Achievement awarded without meeting its criteria
  - Same achievement awarded twice to the same user
  - Achievement unlock notification fires but achievement is not persisted in database
  - Achievement system evaluates against stale data (must use current state)

**UC-3.2: Streak System**
- As a musician, I want the system to track my daily practice streaks so that I'm motivated to practice consistently and can see my longest runs of dedication.
- Actor: Musician, System
- System tracks daily practice streaks
- Acceptance Criteria:
  - Streak increments when user logs any practice activity in a calendar day (user's timezone)
  - Streak resets to 0 after a day with no activity
  - Current streak and longest streak displayed on dashboard
  - Streak milestones (7, 30, 100, 365 days) trigger achievements
  - "Streak freeze" not in V3 (potential future feature)
- Rejection Criteria:
  - Streak increments more than once per calendar day
  - Streak uses server timezone instead of user's configured timezone
  - Streak resets during a day that has practice activity (race condition between midnight rollover and late-night practice)
  - Streak count disagrees between dashboard display and database value

**UC-3.3: XP & Leveling**
- As a musician, I want to earn XP for practice activities and level up so that I have a tangible sense of long-term progression beyond individual grids.
- Actor: Musician, System
- Musicians earn XP for practice activities and level up
- Acceptance Criteria:
  - XP sources: cell completion (10 XP), row completion (50 XP), grid completion (200 XP), daily practice (25 XP), streak milestone (varies)
  - Level thresholds: quadratic scaling (level N requires N^2 * 100 XP)
  - Level displayed on profile and in social contexts
  - Level-up triggers notification/animation
- Rejection Criteria:
  - XP awarded for an action that didn't actually occur (e.g., completing a cell that was already complete)
  - XP goes negative or level decreases
  - Level threshold calculation uses floating-point arithmetic (must be exact integer math)
  - XP from a single action is awarded multiple times (idempotency required)

**UC-3.4: Grant Tier Mapping**
- As a musician, I expect the system to map my subscription tier to the correct feature grants so that I have access to exactly the features my plan includes.
- Actor: System
- System maps subscription tiers to specific feature grants and usage limits
- Acceptance Criteria:
  - Grant types and their tier values:
    - `max_active_grids`: Free=1, Pro=unlimited, Team=unlimited
    - `analytics_access`: Free=basic (streak only), Pro=full, Team=full
    - `achievements_access`: Free=limited set, Pro=full, Team=full
    - `social_access`: Free=none, Pro=individual (profiles, library stats, practice feed), Team=full (ensemble feed, challenges, mentorship)
    - `ensemble_access`: Free=none, Pro=none, Team=full
    - `assignment_access`: Free=none, Pro=none, Team=full
    - `export_access`: Free=none, Pro=none, Team=full
    - `library_access`: Free=subset (curated free-tier templates), Pro=full, Team=full
    - `goals_access`: Free=none, Pro=full, Team=full
    - `practice_feed_access`: Free=none, Pro=full, Team=full
    - `director_analytics_access`: Free=none, Pro=none, Team=full
  - Tier-to-grant mapping is defined in configuration (not hardcoded per-user)
  - When a user's subscription tier changes, their grants update immediately
  - **Future (Vision phases):** Grant system will be extended to support credit-based grants for AI features (e.g., `ai_credits_monthly`: Free=0, Pro=10, Team=50). Credit grants are consumed per-use and reset each billing period. This does not need to be built in V3 but the grant architecture must be extensible enough to support it.
- Rejection Criteria:
  - A tier change leaves grants in an inconsistent state (partially updated)
  - Grant values are hardcoded per-user instead of derived from tier configuration
  - Adding a new grant type requires code changes to individual user records

**UC-3.5: Grant Enforcement at API Level**
- As a musician, I expect the system to enforce feature access at the API level so that gated features cannot be accessed by manipulating the client.
- Actor: System
- Every API endpoint checks the user's grants before allowing access to gated features
- Acceptance Criteria:
  - Grant checks happen at the API layer, not just UI hiding
  - Attempting a gated action returns a structured error with: which grant was insufficient, which tier unlocks it
  - Hitting a usage limit (e.g., max grids) does not error — it returns a grant-limit response that the UI renders as an upgrade prompt
  - Users cannot bypass grant restrictions by calling the API directly
  - Grant evaluation is fast (cached per-request, invalidated on tier change)
- Rejection Criteria:
  - Any gated feature accessible without a valid grant (even if UI hides it)
  - Grant check occurs only on the frontend (must be server-enforced)
  - API returns a generic 403 instead of a structured grant-limit response with upgrade path

**UC-3.6: Admin Grant Override**
- As an admin, I want to override grants for individual users independent of their subscription tier so that I can provide complimentary access or handle special cases.
- Actor: Admin
- Admin can override grants for individual users independent of their subscription tier
- Acceptance Criteria:
  - Admin can set any grant type to any value for a specific user
  - Override takes precedence over tier-based grants
  - Override has an optional expiry date
  - Override source tracked (distinguishes subscription-based vs admin-override grants)
  - Admin can remove an override, reverting the user to their tier-based grants
- Rejection Criteria:
  - Non-admin user can set or modify grant overrides
  - Override without expiry accidentally becomes permanent when it shouldn't
  - Removing an override leaves the user with no grants (must fall back to tier-based)

**UC-3.7: Upgrade Prompts**
- As a musician, I want to see a helpful upgrade prompt when I hit a feature boundary so that I understand what I'm missing and how to unlock it.
- Actor: Musician
- When a user hits a grant boundary, they see a contextual upgrade prompt
- Acceptance Criteria:
  - Prompt explains what feature they're trying to use
  - Shows which tier unlocks it
  - Links to upgrade flow (billing page in V4)
  - Does not block the user from using features they already have access to
  - Non-intrusive: appears inline, not as a modal/popup (except on first encounter)
- Rejection Criteria:
  - Upgrade prompt blocks the user from using features they already have access to
  - Prompt appears repeatedly after being dismissed (session-scoped cooldown required)
  - Prompt contains incorrect tier information or pricing

### V3 Limits
- No actual billing — grant tier is manually set or defaults to Free
- Leaderboards not yet implemented (V5+)
- No ensemble-level achievements

---

## V4: Stripe Integration & Production Deploy

### Goal
Monetize. Users can subscribe, manage billing, and the product is live for real customers.

### Use Cases

**UC-4.1: Subscribe to Plan**
- As a musician, I want to select a subscription tier and pay via Stripe so that I can unlock Pro or Team features.
- Actor: Musician
- User selects a subscription tier and completes payment via Stripe Checkout
- Acceptance Criteria:
  - Stripe Checkout session for payment collection
  - Successful payment updates user's grant tier immediately
  - Failed payment leaves user on current tier
  - Supports credit/debit cards at minimum
  - Subscription confirmation email sent
- Rejection Criteria:
  - Grants updated before payment is confirmed by Stripe
  - User charged without grants being applied (payment succeeds but tier doesn't change)
  - Checkout session can be replayed or reused
  - Subscription created without valid Stripe customer ID

**UC-4.2: View Current Subscription**
- As a musician, I want to view my current subscription plan and billing status so that I know what I'm paying for and when my next charge is.
- Actor: Musician
- User views their current subscription plan and billing status
- Acceptance Criteria:
  - Shows: current tier (Free/Pro/Team), billing period, next payment date, payment method
  - Free users see a comparison of tiers with upgrade CTA
  - Link to Stripe Customer Portal for payment method management
  - Shows grant summary: what features are available at current tier
- Rejection Criteria:
  - Billing page reveals another user's subscription or payment details
  - Stale billing data shown (must reflect current Stripe state)
  - Free user sees payment method fields or billing period information

**UC-4.3: Upgrade Subscription**
- As a musician, I want to upgrade my subscription to a higher tier so that I can immediately access additional features.
- Actor: Musician
- User upgrades from a lower tier to a higher tier
- Acceptance Criteria:
  - Upgrade takes effect immediately
  - Billing is prorated (pay the difference for the remainder of the current period)
  - Grants update immediately upon successful payment
  - Confirmation page shows what new features are now available
- Rejection Criteria:
  - User charged full price instead of prorated amount
  - Grants not updated immediately after successful upgrade
  - Upgrade creates a duplicate Stripe subscription instead of modifying the existing one

**UC-4.4: Downgrade Subscription**
- As a musician, I want to downgrade my subscription to a lower tier so that I can reduce my costs while keeping my data intact.
- Actor: Musician
- User downgrades from a higher tier to a lower tier
- Acceptance Criteria:
  - Downgrade takes effect at end of current billing period (user keeps current tier until then)
  - User warned about data implications before confirming:
    - Extra grids beyond new tier limit become read-only (not deleted)
    - Access to gated features (analytics, social, library) will be restricted
  - Confirmation shows exactly what will change and when
  - Pending downgrade state is managed by Stripe — the application queries Stripe for scheduled subscription changes rather than storing a local pending_tier field
- Rejection Criteria:
  - Downgrade takes effect immediately (must wait until end of billing period)
  - User data deleted on downgrade (grids become read-only, never deleted)
  - Downgrade proceeds without user seeing the impact summary

**UC-4.5: Cancel Subscription**
- As a musician, I want to cancel my paid subscription so that I stop being charged while retaining access until the end of my billing period.
- Actor: Musician
- User cancels their paid subscription
- Acceptance Criteria:
  - Access continues until end of current billing period
  - After period ends, account reverts to Free tier grants
  - User data is preserved (grids, completions, achievements) — not deleted
  - Extra grids become read-only
  - User can re-subscribe at any time to restore access
- Rejection Criteria:
  - User data deleted upon cancellation
  - Access revoked before billing period ends
  - Cancelled user cannot re-subscribe (must always be possible)

**UC-4.6: Team Subscription Management**
- As a director, I want to subscribe to the Team plan and manage seats so that my ensemble members receive Team-tier access under one billing account.
- Actor: Director
- Director subscribes to Team plan and manages seats
- Acceptance Criteria:
  - Director pays for N seats at Team rate
  - Can add/remove members (seat count adjusts billing)
  - All team members receive Team-tier grants
  - Removing a member reverts them to their individual tier
  - Billing visible to director only
- Rejection Criteria:
  - Team members can see billing details or modify the subscription
  - Removing a member deletes their personal data (only reverts tier)
  - Adding a member beyond seat count succeeds without billing adjustment

**UC-4.7: Webhook Processing**
- As a musician, I expect the system to process Stripe webhooks reliably so that my subscription status and feature access stay in sync with my payment state.
- Actor: System
- System processes Stripe webhooks for subscription lifecycle events
- Acceptance Criteria:
  - Handles: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted
  - Webhook signature verification
  - Idempotent processing (duplicate webhooks don't cause issues)
  - Failed webhook processing retried with backoff
  - Grant tier updated within 60 seconds of Stripe event
- Rejection Criteria:
  - Webhooks accepted without signature verification
  - Duplicate webhook processing changes state (must be idempotent)
  - Failed webhook silently ignored (must be logged and retried)
  - Webhook processing creates inconsistency between Stripe state and local state

**UC-4.8: Production Deployment**
- As an admin, I want the application deployed to production with HTTPS, backups, and monitoring so that real customers can use the platform reliably.
- Actor: Admin
- Application deployed to production on DigitalOcean
- Acceptance Criteria:
  - HTTPS with valid SSL certificate
  - Custom domain: practicegrids.com
  - Database backups: daily automated
  - Application monitoring and error tracking
  - Zero-downtime deployments
  - Environment-based configuration (no secrets in code)
  - Rate limiting on auth endpoints
  - CORS locked to production domain(s)
- Rejection Criteria:
  - Application accessible over HTTP (non-HTTPS) in production
  - Secrets visible in environment variables, logs, or client-side code
  - Database has no backup or backup has never been tested for restore
  - Deployment causes downtime

### V4 Limits
- Web only (React Native in later phase)
- No App Store / Play Store billing
- Team plan is web-managed only
- No invoice/receipt customization

---

## V5: Directors & Ensemble Management

### Goal
Enable the teacher-student / director-performer relationship with ensemble tools.

### Use Cases

**UC-5.1: Create Ensemble**
- As a director, I want to create an ensemble with a name, description, and invite link so that I can organize my musicians into a managed group.
- Actor: Director
- Director creates an ensemble with name, description, and instrument focus
- Acceptance Criteria:
  - Requires Team subscription
  - Ensemble has: name (required), description, instrument tags
  - Creator becomes ensemble admin
  - Ensemble gets a unique invite code/link
  - Director can set ensemble as public (discoverable) or private (invite-only)
- Rejection Criteria:
  - Non-Team subscriber can create an ensemble
  - Invite code is predictable or sequential (must be cryptographically random)
  - Ensemble created without the creator being assigned as admin

**UC-5.2: Join Ensemble**
- As a musician, I want to join an ensemble via an invite link or code so that I can connect with my director and fellow musicians.
- Actor: Musician
- Musician joins an ensemble via invite link or code
- Acceptance Criteria:
  - Invite link/code grants membership immediately (or pending approval, if director configured)
  - Musician can belong to multiple ensembles
  - Musician can leave an ensemble at any time
  - Joining is free for musicians (director's Team seat covers it)
- Rejection Criteria:
  - User joins a private ensemble without a valid invite code
  - Leaving an ensemble deletes the musician's practice data
  - Expired or revoked invite codes still work

**UC-5.3: Director Dashboard**
- As a director, I want to view aggregate and individual practice data for my ensemble members so that I can monitor engagement and identify who needs support.
- Actor: Director
- Director views aggregate and individual practice data for ensemble members
- Acceptance Criteria:
  - Overview: total practice time across ensemble, active members count, average streak
  - Per-member drill-down: practice time, grid completions, streak, last active date
  - Sortable/filterable member list
  - Date range selector for all metrics
  - Highlight: members with broken streaks or low activity
- Rejection Criteria:
  - Director can see practice data of musicians not in their ensemble
  - Section Leader sees data from sections other than their own
  - Dashboard shows data for removed/inactive members without clear labeling

**UC-5.4: Practice Activity Feed**
- As a musician, I want to see a social feed of practice activity within my ensemble so that I feel connected to my peers and motivated by their progress.
- Actor: Musician, Director
- Members see a social feed of practice activity within their ensemble
- Acceptance Criteria:
  - Feed shows: grid completions, achievements unlocked, streak milestones
  - Configurable by director: feed visibility can be full, achievements-only, or off
  - Musicians can react to feed items (emoji reactions)
  - Feed is chronological, paginated
  - Musicians can opt out of appearing in feed (privacy setting)
- Rejection Criteria:
  - Feed shows activity from musicians who opted out of feed visibility
  - Feed items from one ensemble visible in another ensemble's feed
  - Feed visibility setting change doesn't take effect immediately

**UC-5.5: Ensemble Roles**
- As a director, I want to assign roles like Section Leader to trusted members so that they can help monitor their section's progress.
- Actor: Director
- Director assigns roles within the ensemble
- Acceptance Criteria:
  - Roles: Admin (full control), Section Leader (view section members), Member (basic)
  - Section Leaders can view analytics for their section only
  - Members can be organized into sections (e.g., "Cornets", "Trombones", "Percussion")
  - Role changes take effect immediately
- Rejection Criteria:
  - Member can assign themselves a higher role
  - Role change doesn't immediately restrict/expand data access
  - Removing the last admin leaves the ensemble with no admin

**UC-5.6: Delete Ensemble**
- As a director, I want to delete an ensemble I no longer need so that it's removed from everyone's view without affecting members' personal practice data.
- Actor: Director (Admin role)
- Director deletes an ensemble (soft delete)
- Acceptance Criteria:
  - Only the ensemble admin can delete the ensemble
  - Confirmation dialog with ensemble name and member count
  - Soft delete: sets deleted_at on ensemble, cascades to memberships, feed items
  - Does NOT soft-delete members' personal data (grids, completions, achievements)
  - Members are notified of ensemble dissolution
- Rejection Criteria:
  - Non-admin member can delete the ensemble
  - Member personal practice data soft-deleted alongside ensemble
  - Active assignments within the ensemble continue after deletion
  - Hard delete of any ensemble data

**UC-5.7: Remove Feed Reaction**
- As a musician, I want to remove my own emoji reaction from a feed item so that I can correct an accidental reaction.
- Actor: Musician
- User removes their own emoji reaction from a feed item
- Acceptance Criteria:
  - Click/tap on own reaction removes it
  - Reaction disappears immediately
  - Cannot remove other users' reactions
- Rejection Criteria:
  - User can remove another user's reaction
  - Removed reaction still appears on refresh

### V5 Limits
- No assignments yet (V6)
- No cross-ensemble social features yet
- No ensemble-level achievements
- Reports are view-only (export in V6)

---

## V6: Assignments & Group Progress Tracking

### Goal
Directors can assign specific practice work and track group progress against goals.

### Use Cases

**UC-6.1: Create Assignment**
- As a director, I want to create a practice assignment with a grid template and due date so that my ensemble members have clear, trackable practice work.
- Actor: Director
- Director creates a practice assignment for the ensemble or specific sections
- Acceptance Criteria:
  - Assignment contains: source grid (director's own grid OR library template), due date, target completion %, assigned to (ensemble/section/individuals)
  - Director can select from their own practice grids or from education library templates as the source
  - Source grid is snapshotted at assignment creation — subsequent changes to the source do not affect assigned copies
  - Grid template is cloned to each assigned musician's account
  - Assignment appears in musician's dashboard with due date
  - Director can set assignment as required or optional
- Rejection Criteria:
  - Cloned grid maintains a live link to the template (must be independent copy)
  - Assignment visible to musicians outside the assigned scope (wrong section, wrong ensemble)
  - Assignment created with a past due date accepted without warning

**UC-6.2: Assignment Progress Tracking**
- As a director, I want to view real-time progress on assignments so that I can see who is on track and who needs encouragement before the due date.
- Actor: Director
- Director views real-time progress on assignments
- Acceptance Criteria:
  - Progress view shows: each musician's completion %, last practice date, time spent
  - Aggregate: average completion %, on-track vs behind count
  - Visual indicator for musicians who haven't started
  - Sortable by name, completion %, last active
- Rejection Criteria:
  - Director sees progress data from musicians not assigned to this assignment
  - Completion percentage calculation differs between director view and musician view
  - Progress data is delayed by more than 5 minutes from actual practice

**UC-6.3: Practice Challenges**
- As a musician, I want to participate in practice challenges within my ensemble so that friendly competition motivates me to practice more.
- Actor: Musician, Director
- Musicians or directors create practice challenges within an ensemble
- Acceptance Criteria:
  - Challenge types: "Most practice minutes this week", "First to complete grid", "Longest streak"
  - Duration: start and end date
  - Leaderboard visible to all participants
  - Winner announcement in feed
  - Director can create challenges; musicians can create informal challenges (configurable)
- Rejection Criteria:
  - Leaderboard reveals practice data of members who opted out of feed visibility
  - Challenge results are manipulable (e.g., backdating practice entries)
  - Challenge with end date in the past can be created

**UC-6.4: Export Reports**
- As a director, I want to export ensemble analytics as PDF or CSV so that I can share progress reports with parents, administrators, or committee members.
- Actor: Director
- Director exports ensemble analytics as PDF or CSV
- Acceptance Criteria:
  - Report types: attendance/practice summary, assignment progress, individual student report
  - CSV export for raw data
  - PDF export for formatted reports
  - Date range selector
  - Exportable per-student or ensemble-wide
- Rejection Criteria:
  - Export includes data from musicians outside the director's ensemble
  - CSV export contains unescaped special characters that break spreadsheet import
  - PDF export truncates data or has broken formatting
  - Non-director user can access export functionality

**UC-6.5: Mentorship / Feedback**
- As a musician, I want to share my grid progress and receive feedback from my director or peers so that I can get guidance on what to improve.
- Actor: Musician, Director
- Musicians can share progress and receive feedback from directors or peers
- Acceptance Criteria:
  - Musicians can share a grid snapshot (read-only link) with notes
  - Directors/peers can leave text comments on shared grids
  - Notification when feedback is received
  - Feedback thread visible only to participants
  - Section Leaders can provide feedback to their section members
- Rejection Criteria:
  - Shared grid link exposes data beyond what was explicitly shared
  - Feedback thread visible to users not in the thread
  - Feedback allows HTML/script injection in comment content
  - Notification sent for feedback on a grid the user no longer has access to

**UC-6.6: Cancel Challenge**
- As a director, I want to cancel an active or upcoming challenge so that I can remove it if circumstances change.
- Actor: Director
- Director cancels an active or upcoming challenge
- Acceptance Criteria:
  - Only the challenge creator or ensemble admin can cancel
  - Cancelled challenge removed from leaderboard view
  - Participants notified of cancellation
  - No winner declared for cancelled challenges
- Rejection Criteria:
  - Regular member can cancel a challenge they didn't create
  - Completed challenge can be cancelled (only active/upcoming)

**UC-6.7: Delete Feedback Comment**
- As a musician, I want to delete my own feedback comment so that I can remove something I posted by mistake.
- Actor: Musician, Director
- Author deletes their own comment on a shared grid
- Acceptance Criteria:
  - Delete button visible only on own comments
  - Threaded replies to deleted comment are preserved (parent shows "[deleted]")
  - Deletion is immediate
- Rejection Criteria:
  - User can delete another user's comment (except ensemble admin for moderation)
  - Deleting a parent comment cascades to delete all replies

### V6 Limits
- No audio/recording sharing (future feature)
- No AI-generated practice recommendations
- Cross-ensemble social not yet implemented

---

## V7+: Future Roadmap

### V7: Social Expansion & Mobile
- Cross-ensemble musician connections (configurable by directors)
- Global practice leaderboards (opt-in)
- Musician profiles with achievement showcase
- Follow other musicians
- React Native app (iOS + Android)
- Offline practice logging with sync
- Push notifications (streak reminders, achievement unlocks, assignment due dates)
- RevenueCat integration for App Store/Play Store billing

---

## V8+: Performer Enhancement & Practice Intelligence

The following features continue the product evolution from practice tracker to intelligent practice companion. These are full milestones with use cases, integrated into the same delivery pipeline as V1-V7. They are organized into sub-phases for planning purposes but will be implemented as milestones within the continuous deployment flow — each merged PR deploys, same as everything else.

### Implementation Approach: Signal Processing First, AI Only When Necessary

Many features that seem to require AI can be accomplished with well-understood signal processing techniques (FFT, autocorrelation, spectral analysis) and rule-based heuristics. AI/ML is introduced only when:
1. The problem is proven too complex for heuristic approaches
2. Sufficient training data exists
3. The accuracy improvement justifies the computational cost

**This matters for cost:** Signal processing runs locally or cheaply on the server. AI/ML operations (OMR, tone modeling) incur significant compute costs and must carry usage-based charges.

### AI Feature Pricing Model
- AI-powered operations (sheet music scanning, tone quality analysis) consume **credits**
- Credits are purchased per-use (e.g., 1 credit per sheet music scan, 1 credit per tone analysis session)
- Pro/Team tiers may include a monthly credit allowance, with overage charged per-credit
- Non-AI features (tuner, metronome, ear training, recording) are included in the base subscription — no per-use charges
- Credit pricing must cover compute costs with margin — no subsidizing AI features from subscription revenue

### Feature Classification

| Feature | Approach | Rationale |
|---------|----------|-----------|
| Chromatic tuner | Signal processing | FFT/autocorrelation — well-solved problem |
| In-tune % tracking | Signal processing | Compare detected pitch to target frequency |
| Metronome | Audio synthesis | Pure tone generation, no analysis |
| Recording & playback | Web Audio API | Standard browser APIs |
| Note detection & duration | Signal processing | Pitch tracking over time via autocorrelation |
| JI target calculation | Pure math | Frequency ratios are deterministic |
| Ear training | Audio synthesis + comparison | Generate tones, compare user input |
| Difficulty scoring | Heuristics first | Rule-based: interval size, tempo, range, rhythm complexity |
| Score structure analysis | Heuristics first | Rehearsal marks, key/time changes, dynamics, phrase boundaries |
| Voicing/melody detection | Heuristics first | Part range analysis, note density, rhythmic patterns |
| Sheet music OCR/OMR | AI/ML (credits) | Image recognition — requires trained model |
| Tone quality analysis | AI/ML (credits) | Spectral comparison requires learned reference models |
| Note-to-score mapping | Hybrid | DTW (Dynamic Time Warping) for alignment — signal processing, but may need ML for robust real-world audio |

### V8: Built-In Practice Tools
*All features in this phase use signal processing or audio synthesis — no AI, no credits.*

### Use Cases

**UC-A.1: Activate Metronome**
- As a musician, I want to use a built-in metronome that auto-sets to my practice cell's tempo so that I can stay in time without needing a separate app.
- Actor: Musician
- User enables the built-in metronome during practice
- Implementation: audio synthesis
- Acceptance Criteria:
  - Metronome accessible from the practice grid view (toggle button)
  - When a practice cell is selected/active, metronome auto-sets to that cell's target BPM
  - Manual BPM override available (does not change cell data)
  - Subdivision options: quarter, eighth, triplet, sixteenth
  - Accent pattern: configurable (e.g., accent beat 1 of 4)
  - Count-in: 1 or 2 bars before starting
  - Visual beat indicator (flashing dot or bar) for silent practice
  - Audio click works with headphones
  - Metronome does not interfere with tuner or recording (can run simultaneously)
- Rejection Criteria:
  - Metronome tempo drifts over time (must be sample-accurate using Web Audio API scheduling)
  - Click bleeds into recording audio
  - Metronome auto-set changes the cell's stored target tempo
  - Audible latency or lag between visual and audio beat

**UC-A.2: Use Chromatic Tuner**
- As a musician, I want to use a built-in chromatic tuner with real-time pitch feedback so that I can monitor my intonation while practicing.
- Actor: Musician
- User activates the built-in tuner for real-time pitch feedback during practice
- Implementation: signal processing (FFT/autocorrelation)
- Acceptance Criteria:
  - Tuner uses device microphone (permission requested on first use)
  - Displays: detected note name, cent deviation from nearest pitch (±50 cents), frequency in Hz
  - Visual needle/gauge showing sharp/flat deviation
  - Reference pitch configurable (default A4 = 440Hz, adjustable 430-450Hz)
  - Transposition support: display in concert pitch or transposed (Bb, Eb, F instruments)
  - Detection range: at minimum C2 (65Hz) to C7 (2093Hz)
  - Update rate: ≥15 updates per second for smooth visual feedback
- Rejection Criteria:
  - Tuner fails to detect pitch in a quiet room at normal playing volume
  - Detected pitch is wrong by more than ±5 cents on a stable tone
  - Tuner crashes or hangs when ambient noise is present
  - Microphone permission denied leaves UI in broken state (must show clear message)

**UC-A.3: Track In-Tune Percentage**
- As a musician, I want the system to track what percentage of time I'm playing in tune so that I can measure my intonation improvement over time.
- Actor: Musician, System
- System records what percentage of time the musician is in tune during a practice session
- Implementation: signal processing
- Acceptance Criteria:
  - In-tune threshold: configurable, default ±10 cents from target pitch
  - Tracking starts when tuner is active and a practice cell is selected
  - Records: total time, in-tune time, in-tune percentage per cell/row/session
  - In-tune data stored alongside practice session time tracking
  - Historical trend: in-tune % over time per piece, per session
  - Dashboard widget showing in-tune trend
- Rejection Criteria:
  - In-tune tracking runs when no sound is detected (silence should not count as "out of tune" or "in tune")
  - Percentage calculation uses integer division (must be precise)
  - In-tune data attributed to wrong cell or session
  - Tracking continues after user stops the tuner

**UC-A.4: Record Practice Session Audio**
- As a musician, I want to record audio during practice so that I can listen back and evaluate my own playing.
- Actor: Musician
- User records audio during practice for self-review
- Implementation: Web Audio API
- Acceptance Criteria:
  - One-click record button in practice interface
  - Recording linked to the active practice cell/row/grid
  - Compressed audio format (e.g., WebM/Opus or AAC) to minimize storage
  - Playback with timeline scrubbing
  - A/B loop: set start and end points for repeated listening
  - User can delete recordings to manage storage
  - Recordings persist across sessions
- Rejection Criteria:
  - Recording starts without clear visual indicator (user must always know when recording)
  - Recording persists after user explicitly deletes it
  - Audio quality is so compressed it's not useful for self-review
  - Recording fails silently (must show error if microphone unavailable)

**UC-A.5: Playback and Compare Recordings**
- As a musician, I want to listen to past recordings and compare them across sessions so that I can hear my improvement over time.
- Actor: Musician
- User listens to past recordings and compares across sessions
- Acceptance Criteria:
  - Recording list per cell/row showing date and duration
  - Side-by-side playback: play two recordings sequentially for comparison
  - Recordings sorted chronologically with newest first
  - Delete individual recordings
  - Storage usage visible to user (e.g., "Using 45MB of 200MB")
- Rejection Criteria:
  - User can access recordings from another user's practice sessions
  - Deleted recording is still playable (must be actually removed)
  - Playback fails on recordings older than 30 days (no expiry on recordings)

---

### V9: Score Analysis & Auto-Grid Generation
*Mixed approach: OMR requires AI (credits), analysis uses heuristics first.*

### Use Cases

**UC-B.1: Upload Sheet Music**
- As a musician, I want to upload a PDF or image of my sheet music so that the system can extract the notes and structure for automated grid generation.
- Actor: Musician
- User uploads a PDF or image of their instrumental part
- Implementation: file upload + AI/ML for OCR/OMR (costs credits)
- Acceptance Criteria:
  - Accepts PDF, PNG, JPG, TIFF formats
  - Maximum file size: 50MB
  - Upload shows processing progress indicator
  - Extracted data: note pitches, rhythms, time signatures, key signatures, dynamics, articulations, tempo markings, rehearsal marks
  - Output stored as structured music data (MusicXML-like internal format)
  - User can review and correct OCR results before accepting
  - **Credit cost:** 1 credit per page scanned
  - Failed OCR refunds the credit
- Rejection Criteria:
  - Upload accepts non-music files (must validate file contains music notation)
  - Credit charged before processing completes successfully
  - Extracted data is not reviewable/editable by user before import
  - User's uploaded files are accessible to other users
  - File stored indefinitely after processing (should offer cleanup)

**UC-B.2: Analyze Part Difficulty**
- As a musician, I expect the system to analyze the difficulty of each segment in my music so that I can see which passages need the most practice attention.
- Actor: System
- System analyzes extracted music data to score difficulty of each segment
- Implementation: heuristics first (ML only if insufficient)
- Acceptance Criteria:
  - Difficulty factors evaluated:
    - Interval sizes (large leaps = harder)
    - Tempo relative to note density (fast passages = harder)
    - Range (extreme high/low = harder)
    - Rhythm complexity (syncopation, odd meters = harder)
    - Dynamic changes (pp to ff = harder)
    - Articulation density (fast tonguing = harder)
  - Each measure or phrase scored on a difficulty scale (1-10)
  - Difficulty scores used to auto-suggest priority levels for generated grid rows
  - User can override difficulty scores
- Rejection Criteria:
  - Difficulty scoring runs without extracted music data (depends on UC-B.1)
  - Scoring algorithm is opaque — user must be able to see WHY a section scored high
  - Algorithm produces different scores for identical input (must be deterministic)

**UC-B.3: Identify Score Structure**
- As a musician, I expect the system to identify structural segments, solos, and exposed passages in my music so that the generated practice grid reflects the musical context.
- Actor: System
- System identifies structural segments, voicing context, and exposed passages
- Implementation: heuristics first
- Acceptance Criteria:
  - Identifies: phrases, sections, rehearsal letter boundaries, key changes, time signature changes
  - If full score uploaded alongside part: identifies melody vs harmony vs bass, solo vs tutti, exposed vs covered
  - Auto-suggests segment boundaries for grid row creation
  - Segments labeled with contextual tags (e.g., "Solo", "Tutti", "Exposed", "Melody")
  - User can adjust segment boundaries before accepting
- Rejection Criteria:
  - Segment identification requires full score (must work on part alone, with reduced context)
  - Generated segments overlap or leave gaps in the music
  - Voicing analysis asserts confidence it doesn't have (must indicate when context is insufficient)

**UC-B.4: Auto-Generate Practice Grid from Score**
- As a musician, I want the system to auto-generate a complete practice grid from my analyzed score so that I get a structured practice plan without manually creating every row.
- Actor: Musician
- System generates a complete practice grid from analyzed score data
- Implementation: deterministic mapping
- Acceptance Criteria:
  - Each identified segment becomes a practice row
  - Row target tempo: derived from tempo markings in score (or user-set default if none)
  - Row step count: suggested based on segment difficulty (harder = more steps)
  - Row priority: suggested based on structure analysis (solo/exposed = Critical, tutti = Low)
  - Row measure range: auto-populated from segment boundaries
  - Generated grid presented to user for review — user can add, remove, or edit rows before accepting
  - Accepting creates a standard PracticeGrid that works identically to manually created grids
  - User can regenerate with different parameters without losing previous grid
- Rejection Criteria:
  - Grid auto-accepted without user review
  - Generated grid has different behavior than manually created grids
  - Row count exceeds a reasonable limit without user confirmation (e.g., 100+ rows)
  - Generated grid references score data that no longer exists (must be self-contained after creation)

---

### V10: Audio-Linked Practice Verification
*Primarily signal processing + DTW alignment. JI is pure math.*

### Use Cases

**UC-C.1: Import External Tuner Data**
- As a musician, I want to import tuning data from external apps like Tonal Energy so that I can consolidate my intonation tracking in one place.
- Actor: Musician
- User imports tuning data from Tonal Energy Tuner or similar external apps
- Implementation: data import/API
- Acceptance Criteria:
  - Import via file upload (CSV/JSON export from Tonal Energy) or API integration
  - Imported data linked to a specific practice session and cell/row
  - Data includes: timestamps, detected frequencies, note names, cent deviations
  - User maps imported data to the correct practice cell(s)
  - Import is additive — does not overwrite existing practice data
- Rejection Criteria:
  - Imported data corrupts existing practice session data
  - Import accepts malformed data without validation
  - Data from one user importable to another user's session
  - Import creates duplicate records for the same time period

**UC-C.2: Map Played Notes to Written Music**
- As a musician, I expect the system to align what I played against the written score so that I can see exactly which notes I got right and which I missed.
- Actor: System
- System aligns detected audio (played notes) against the written score (from Phase B)
- Implementation: signal processing (DTW), hybrid with ML if needed for noisy environments
- Acceptance Criteria:
  - Input: stream of detected pitches + durations (from tuner or recording) + written note sequence (from score analysis)
  - Alignment algorithm: Dynamic Time Warping (DTW) to match played sequence to written sequence
  - Output: per-note match results — each written note mapped to played note(s) or marked as missed
  - Handles: repeated notes, held notes, grace notes, trills
  - Tolerance for tempo variation (player may not be exactly at metronome tempo)
  - Alignment runs in <5 seconds for a 30-second passage
- Rejection Criteria:
  - Alignment crashes on passages with rests or silence
  - Algorithm requires exact tempo adherence (must tolerate rubato)
  - Alignment produces false positives (marking wrong notes as correct)
  - Processing time scales exponentially with passage length

**UC-C.3: Score Practice Attempt**
- As a musician, I want the system to score my practice attempts on pitch, rhythm, and note coverage so that I get objective feedback on my accuracy.
- Actor: Musician, System
- System scores a practice attempt based on note-to-score mapping
- Acceptance Criteria:
  - Scores: pitch accuracy % (correct notes / total notes), rhythm accuracy % (notes within timing tolerance), note coverage % (notes attempted / total notes)
  - Per-note feedback: correct (green), wrong pitch (red), wrong rhythm (yellow), missed (grey)
  - Overall attempt score displayed after playing
  - Historical attempt scores stored per cell for progress tracking
  - **Auto-suggest completion:** "You played this at 92% accuracy at 80 BPM — mark as complete?" (user confirms or declines)
- Rejection Criteria:
  - Cell auto-completed without user confirmation
  - Scoring algorithm penalizes musical interpretation (e.g., slight tempo rubato shouldn't count as "wrong rhythm")
  - Attempt data attributed to wrong cell or user
  - Attempt scores are not reproducible (same audio input should produce same score)

**UC-C.4: Just Intonation Tuning Targets**
- As a musician, I want the system to calculate just intonation targets for each note based on its harmonic context so that I can practice tuning to pure intervals rather than equal temperament.
- Actor: Musician, System
- System calculates just intonation targets for each note based on harmonic context
- Implementation: pure math (frequency ratios) + heuristic chord analysis
- Acceptance Criteria:
  - With score analysis data (Phase B), determine each note's harmonic function:
    - Root, third, fifth, seventh of the prevailing chord
    - Passing tone, suspension, neighbor tone
  - Calculate JI frequency adjustment in cents:
    - Major third: -14 cents from ET
    - Minor third: +16 cents from ET
    - Perfect fifth: +2 cents from ET
    - Minor seventh: -31 cents from ET (7th harmonic)
  - Tuner overlay mode: shows JI target alongside ET target
  - In-tune % can be evaluated against JI targets instead of ET (user toggle)
  - Requires: chord analysis from score data, or director-annotated harmonic analysis
- Rejection Criteria:
  - JI adjustments applied without score/harmonic context (must have chord data)
  - Frequency calculations use floating-point approximations where exact ratios exist
  - JI mode enabled when no harmonic analysis is available (must fall back to ET)
  - JI adjustments contradict standard music theory (e.g., flattening a root)

---

### V11: Ear Training & Tone Analysis
*Ear training is synthesis + comparison (no AI). Tone analysis requires ML (credits).*

### Use Cases

**UC-D.1: Pitch Identification Drill**
- As a musician, I want to practice identifying pitches by ear so that I can develop my aural skills and recognize notes more quickly.
- Actor: Musician
- System plays a random tone and the user identifies the pitch
- Implementation: audio synthesis + comparison
- Acceptance Criteria:
  - Modes:
    - Concert pitch identification (C, C#, D, ...)
    - Transposed pitch identification (for Bb/Eb/F instruments — user selects transposition)
  - Difficulty levels:
    - Beginner: single octave (C4-B4), natural notes only
    - Intermediate: two octaves, all chromatic notes
    - Advanced: full range, accidentals, enharmonic spelling
  - Tone plays for 2 seconds (configurable)
  - User selects answer from note grid
  - Immediate feedback: correct/incorrect with the correct answer shown
  - Session stats: accuracy %, streak of correct answers
  - Spaced repetition on missed notes (notes the user gets wrong appear more frequently)
- Rejection Criteria:
  - Generated tone frequency is inaccurate (must be within ±1 cent of target)
  - Same note plays repeatedly without sufficient variety
  - Difficulty level doesn't actually restrict the note pool
  - Spaced repetition data lost between sessions

**UC-D.2: Interval Identification Drill**
- As a musician, I want to practice identifying intervals by ear so that I can improve my ability to hear and sing melodic and harmonic distances.
- Actor: Musician
- System plays two notes and the user identifies the interval
- Acceptance Criteria:
  - Plays two notes sequentially (melodic interval) or simultaneously (harmonic interval) — user selects mode
  - Intervals: unison through octave (13 intervals), with compound intervals in advanced mode
  - Ascending and descending intervals
  - User selects interval name from list
  - Immediate feedback with interval name and both note names
  - Session accuracy tracking and spaced repetition on weak intervals
- Rejection Criteria:
  - Harmonic intervals use tones that are indistinguishable (must use distinct timbres or panning)
  - Interval pool doesn't match selected difficulty level
  - Audio plays over itself if user clicks too quickly (must queue or debounce)

**UC-D.3: Chord Quality Identification**
- As a musician, I want to practice identifying chord qualities by ear so that I can better understand harmonic context when playing in an ensemble.
- Actor: Musician
- System plays a chord and the user identifies its quality
- Acceptance Criteria:
  - Chord types: major, minor, diminished, augmented (basic), add dominant 7th, major 7th, minor 7th, half-diminished, fully-diminished (advanced)
  - Chords played as arpeggiated or blocked (user selects)
  - Root position and inversions (advanced mode)
  - User selects chord quality from options
  - Immediate feedback
  - Session tracking and spaced repetition
- Rejection Criteria:
  - Chord voicing is physically impossible on the user's instrument (informational only — this is ear training, not performance)
  - Chords generated with notes outside audible range

**UC-D.4: Ear Training Progress Analytics**
- As a musician, I want to view my ear training accuracy trends over time so that I can see which skills are improving and which need more work.
- Actor: Musician
- User views their ear training accuracy trends over time
- Acceptance Criteria:
  - Per-exercise type: accuracy % over time (last 30 sessions)
  - Weak spots identified: "You struggle with minor 6ths and tritones"
  - Total drills completed, overall accuracy, current accuracy streak
  - Feeds into achievement system (e.g., "Perfect Ear — 100% on an interval drill")
- Rejection Criteria:
  - Analytics include data from other users
  - Accuracy calculation counts skipped questions as incorrect
  - Historical data lost when user changes difficulty level

**UC-D.5: Record Reference Tone**
- As a musician, I want to record my best tone as a personal reference so that I can compare future playing against my own standard.
- Actor: Musician
- User records their own "best tone" as a personal reference for tone quality comparison
- Implementation: Web Audio API + signal processing
- Acceptance Criteria:
  - User plays a sustained note while recording (minimum 3 seconds)
  - System captures spectral profile: fundamental frequency, overtone amplitudes, noise floor
  - User labels the reference (e.g., "Concert Bb, mezzo-forte, best tone")
  - Multiple references can be stored (different notes, dynamics, contexts)
  - Reference serves as personal benchmark for UC-D.6
- Rejection Criteria:
  - Recording too short to extract reliable spectral data (<3 seconds)
  - Spectral analysis produces different results on repeated analysis of same audio
  - User's reference recordings accessible to other users

**UC-D.6: Analyze Tone Quality**
- As a musician, I want the system to analyze my tone quality and compare it against reference models so that I get objective feedback on my sound.
- Actor: Musician
- System analyzes the musician's tone and compares against reference models
- Implementation: AI/ML (costs credits)
- Acceptance Criteria:
  - User plays a sustained note (minimum 3 seconds)
  - System analyzes: fundamental strength, overtone series distribution, noise-to-signal ratio, attack characteristics, sustain stability
  - Comparison against:
    - User's own reference recordings (UC-D.5)
    - Community reference model (built from contributed recordings of accomplished players, anonymized)
  - Feedback: spectral comparison visualization, natural language summary (e.g., "Your tone has strong fundamental but weak 2nd overtone compared to your reference — try more open oral cavity")
  - Tone quality score: 0-100 relative to reference
  - Historical tone quality trend per note, per dynamic
  - **Credit cost:** 1 credit per analysis session
- Rejection Criteria:
  - Analysis runs without sufficient audio data (<3 seconds of sustained tone)
  - Credit charged for a failed analysis
  - Tone quality score is not reproducible (same audio should produce same score ±2 points)
  - Feedback contains incorrect music pedagogy advice
  - Community reference model includes identifiable individual recordings

### Version Dependencies

```
V8 (Tools) ─── standalone, no dependencies on V9+
     │
V9 (Score) ─── requires OMR/ML pipeline
     │
V10 (Verify) ── requires V9 (note data) + V8 (tuner/recording)
     │
V11 (Ear/Tone) ─ Ear Training: standalone
                  Tone Analysis: requires ML model training, large dataset
                  JI Evaluation: requires V9 + V10
```

### V8-V11 Limits & Principles
- No LLM/ML integration in V1-V6 — these features are explicitly post-foundation
- Signal processing and heuristics are the default approach. AI/ML is introduced only when heuristics are proven insufficient, sufficient training data exists, and the accuracy improvement justifies the cost.
- **AI features cost credits.** Signal processing features are included in subscriptions. This boundary is clear and must be communicated to users.
- Each vision phase should be viable as a standalone premium feature
- Privacy: audio recordings and tuning data are user-owned, not shared without consent
- Accuracy before automation: never auto-complete a cell without user confirmation
- Instrument-agnostic where possible, but brass-optimized initially (JI, tone analysis)
- Heuristic features that graduate to ML retain their heuristic fallback — AI failures degrade gracefully to rule-based behavior

---

## Tech Stack Recommendation

### Recommended: Next.js (Full-Stack) + PostgreSQL

**Rationale:**
- **Next.js** provides SSR, API routes, and React frontend in one codebase — reduces deployment complexity
- **React Native** for mobile shares component logic and state management patterns with Next.js React code
- The existing Django backend is small enough (4 models, basic CRUD) that migration cost is low
- Next.js has first-class Stripe integration, Vercel deployment (or self-hosted on DigitalOcean), and strong TypeScript support
- TypeScript across the stack eliminates the Python/JS context-switching tax

**Stack details:**
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (keep existing, migrate schema)
- **ORM:** Prisma (type-safe, migration support, great DX)
- **Auth:** NextAuth.js (email/password, future OAuth)
- **Styling:** Tailwind CSS (utility-first, responsive, consistent)
- **State management:** React Query (TanStack Query) for server state
- **Billing:** Stripe SDK + webhooks
- **Mobile:** React Native (V7+)
- **Deployment:** DigitalOcean App Platform or Droplet with Docker
- **Testing:** Vitest (unit) + Playwright (e2e)
- **CI/CD:** GitHub Actions

### Alternative Considered: Keep Django + Modernize Frontend
- Pro: No migration effort
- Con: Python/JS split, Django's React integration is awkward, harder to share code with React Native, Django 3.1 is EOL

**Recommendation: Start fresh with Next.js in V1.** The existing codebase is small enough that the data model can be ported to Prisma in a few hours. The practice grid logic (tempo calculations, cell generation) ports directly to TypeScript.

---

## Development Principles

These are non-negotiable. They govern all implementation work across all phases.

### 1. Test-Driven Development (TDD)
- **Red → Green → Refactor**, always, no exceptions.
- Write a failing test first. Write the minimum code to pass it. Refactor the code. Refactor the test. Only then move to the next item.
- No production code exists without a test that preceded it.
- TDD applies to backend, frontend, and infrastructure code equally.

### 2. Domain Model First
- Every feature starts with the domain model question: "How does this change the domain?"
- Before writing any code, answer:
  - Do we introduce new concepts, actions, or transformations?
  - Are we duplicating data? What is the single source of truth for each field?
  - What is the provenance of every field — who owns it, who creates it, who updates it, who reads it?
- Domain model changes are reviewed and approved before implementation begins.
- The domain model is the authoritative reference — if code disagrees with the model, the code is wrong.

### 3. Code Quality & Language Leverage
- Leverage polymorphism, generics, and language features to minimize duplication.
- Normalize data to reduce ambiguity — every fact stored once, derived values computed.
- Follow framework best practices and idiomatic patterns for the chosen stack.
- DRY is a principle, not a religion — 3 similar lines are better than a premature abstraction, but genuine duplication must be eliminated.

### 4. Clear Architecture Divisions
- **Backend:** Model-Controller-View (MCV) pattern
  - **Model:** Domain entities, business logic, data access
  - **Controller:** Request handling, validation, orchestration
  - **View:** Response serialization, API response formatting
- **Frontend:** Director pattern
  - Clear separation between presentation components (dumb), director/container components (smart), and state management
- Layers do not leak — a controller never touches the database directly, a view never contains business logic.

### 5. State Machines Where They Make Sense
- Wherever an entity has a lifecycle (subscriptions, assignments, ensemble membership, achievements), model it as an explicit state machine.
- Each state machine has:
  - Enumerated states (no implicit states)
  - Defined transition criteria (what triggers the transition)
  - Defined transition behavior (what happens during the transition)
  - Invalid transitions that explicitly reject with meaningful errors
- State machines combined with polymorphism yield predictable, testable systems.

### 6. Environment Separation
- **Three environments:** test, dev, prod. Clearly delineated, never mixed.
- Test environment uses isolated databases — no test data lingers after suite completion.
- Dev environment mirrors prod configuration but with safe defaults.
- Prod environment has strict access controls, no debug mode, no test data.
- Environment-specific configuration via environment variables (12-factor).
- Test databases are created fresh per suite run and torn down after.

### 7. Automated Documentation
- Documentation is generated from code, not manually maintained.
  - API docs: auto-generated from route definitions and types (e.g., OpenAPI/Swagger)
  - Domain model docs: generated from schema definitions
  - Component docs: generated from TypeScript types and JSDoc
- Documentation is part of the build — if docs don't generate, the build fails.
- CLAUDE.md files built incrementally as patterns emerge — these are living documents that enforce conventions for both human and AI developers.

### 8. Agentic Documentation (CLAUDE.md)
- Build CLAUDE.md files as we go, not all upfront.
- CLAUDE.md captures: project conventions, architecture decisions, file organization, testing patterns, deployment procedures.
- CLAUDE.md is authoritative — if an AI agent doesn't follow CLAUDE.md, the agent is wrong.
- Update CLAUDE.md whenever a new pattern is established or a decision is made.

### 9. Zero-Downtime Deployments
- Users may be actively using the app during deployment.
- Database migrations must be backwards-compatible (additive first, then remove old in a subsequent deploy).
- No data loss during deployment — ever.
- Rolling deploys or blue-green deployment strategy.

### 10. Single API Version
- There is ONE version of the API. No /v1/, /v2/ parallel paths.
- API evolution is intentionally backwards-compatible by default.
- Breaking changes require explicit approval from Willow — no exceptions.
- Data migrations handle schema evolution. Old data is migrated forward, not left behind.
- Dead code and superfluous paths are removed immediately — no accumulation.

### 11. Completeness
- Nothing is "done" until every detail is finished.
- No TODO comments left in merged code.
- No placeholder implementations.
- No "we'll fix this later" — if it's not ready, it's not merged.
- Every action has consequences — own them all.

### 12. No Hard Deletes (Soft Delete Pattern)
- All "delete" operations set a `deleted_at` timestamp — they do NOT remove rows from the database.
- Soft-deleted records are excluded from all queries by default (application-level filter or database view).
- Soft-deleted data can be restored if needed (admin operation).
- Data migration jobs can permanently purge soft-deleted records after a retention period (e.g., 90 days), but this is a deliberate administrative action, never automatic.
- This applies to ALL entities: grids, rows, cells, completions, users, ensembles, memberships, feedback — everything.
- Cascading "deletes" set deleted_at on the parent AND all children (e.g., deleting a grid soft-deletes its rows, cells, and completions).
- Exceptions: none. If we think we need a hard delete, we discuss it first.

### 13. ACID & 12-Factor
- All data-modifying operations use ACID transactions.
- No partial writes — operations succeed completely or roll back completely.
- Application follows [12-factor app](https://12factor.net/) methodology:
  - Codebase tracked in git, one codebase many deploys
  - Dependencies explicitly declared
  - Config in environment variables
  - Backing services as attached resources
  - Strict separation of build, release, run
  - Stateless processes
  - Port binding
  - Concurrency via process model
  - Disposability (fast startup, graceful shutdown)
  - Dev/prod parity
  - Logs as event streams
  - Admin processes as one-off tasks

### 14. Database Migrations
- All schema changes go through the migration system (Prisma Migrate or equivalent). No manual DDL.
- Every migration is version-controlled in git alongside the code that uses it.
- Migrations must be backwards-compatible for zero-downtime deploys (additive first, remove old in subsequent deploy).
- Every migration must be reversible (down migration defined).
- Migration files are never edited after they've been applied to any environment — new migrations only.
- Migration naming convention: timestamp-prefixed with descriptive name (e.g., `20260315_add_practice_session_table`).
- Test environment gets fresh migrations on every suite run (migrate up from scratch).

### 15. RESTful API Design
- The API follows REST principles: resources are nouns, HTTP methods are verbs, responses represent resource state.
- Standard HTTP methods: GET (read), POST (create), PUT/PATCH (update), DELETE (soft delete).
- Resources map to domain entities: `/api/grids`, `/api/grids/:id/rows`, `/api/grids/:id/rows/:id/cells`.
- Nested resources reflect ownership: a cell is always accessed through its row, which is accessed through its grid.
- Consistent response format: JSON, with appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 409, 422, 500).
- Pagination on all list endpoints (cursor-based preferred over offset-based).
- HATEOAS not required, but resource responses should include `id` and related resource IDs for client navigation.
- API is the single interface — frontend and any future mobile app consume the same API.

### 16. Extensible
- This list of principles will grow as the project evolves.
- New principles require discussion and mutual agreement.
- Principles are never silently violated — if a principle can't be followed, it's discussed and either the approach changes or the principle is updated.

---

## Development Strategy

### Branching: GitHub Flow (Trunk-Based with PRs)
- `main` is the single long-lived branch — always deployable
- Each task gets a short-lived feature branch (branched from main, merged back via PR)
- Feature branches are small and short-lived (hours to 1-2 days max, not weeks)
- Small, atomic commits within feature branches (one logical change per commit)
- All commits should be buildable — no broken intermediate states
- PRs require Willow's approval before merge to main

### Commit Convention
```
<type>: <short description>

<optional body>
```
Types: `feat`, `fix`, `refactor`, `test`, `infra`, `docs`, `style`

### Testing Strategy
- **Unit tests** for ALL code — 95% minimum coverage, no exceptions
- **Integration tests** for every API endpoint (success, validation error, auth error cases)
- **E2E tests** (Playwright) for every UI feature — each test captures a screenshot for visual verification
- **Playwright manual testing** performed by the developer for every feature before marking done
- Tests must pass before commit — no skipped tests allowed
- Coverage enforced in CI — build fails below 95%

### Definition of Done (per feature)
1. Code implements all acceptance criteria for the use case
2. Code does not violate any Global Rejection Criteria (see above)
3. Unit tests pass with ≥95% coverage on all new/modified code
4. Integration tests pass for all new/modified API endpoints
5. Playwright e2e tests pass with screenshot verification for all UI features
6. No TypeScript errors, no console errors, no unhandled rejections
7. Manual Playwright-driven testing performed on desktop + mobile viewport
8. No new skipped tests
9. Security review: input sanitization, auth/authz checks, no leaked secrets
10. No accessibility regressions (semantic HTML, keyboard navigation, screen reader compatible)

### Persistent Task List
- A persistent task list is maintained and kept up-to-date at all times.
- Task states: `todo` → `in-progress` → `ready-for-review` → `completed`
- **Work pattern:**
  1. Pull the next task, mark it `in-progress`
  2. Work on it following all Development Principles
  3. When done, issue PR, mark task `ready-for-review`
  4. When review approved and PR merged, mark task `completed`
  5. Verify deploy succeeds, then move to next task
- The task record is the source of truth for work status — always keep it current in case of connectivity loss or session interruption.
- Tasks map to milestone tasks defined in the Engineering Milestones section.

### Task & PR Workflow
1. **Pick up a task** from the persistent task list, mark it `in-progress`
2. **Complete task** following all Development Principles (TDD, domain model first, etc.)
3. **Issue PR** with the following required sections in the description:
   - **Acceptance Criteria Checklist:** For every acceptance criterion in the relevant UC(s), explicitly state how this PR addresses it, with evidence (test names, code references)
   - **Rejection Criteria Checklist:** For every rejection criterion, explicitly state that it is NOT violated, with evidence
   - **Screenshots:** Required for ALL UI changes. Before/after where applicable.
   - If any criterion cannot be satisfactorily addressed, the PR is not ready — fix it before requesting review
4. **Request review from Willow** — review is required before merge
5. **Respond to review comments** — expect back-and-forth. Address every comment.
6. **Willow approves** → merge to main. Move to next task.

### Review Process
- Every task produces a PR (even on trunk-based flow — short-lived feature branches)
- Willow reviews and approves all PRs — no self-merge
- Code review focuses on: architecture alignment, security, UX quality, acceptance/rejection criteria coverage
- Tagged releases for each version milestone

### Release Strategy: Continuous Deployment
- **Every merged PR deploys to production.** No manual releases, no release branches, no version tags for deploys.
- CI/CD pipeline: PR merged → tests pass → build → deploy to DigitalOcean (automated)
- Phase milestones (V1, V2, etc.) are conceptual markers, not release events. The product is always the latest `main`.
- If a deploy breaks production, the fix is a new PR — not a rollback (unless critical, then rollback + hotfix PR).
- Feature flags used when a feature spans multiple PRs and shouldn't be visible to users until complete.
- Database migrations run automatically as part of the deploy pipeline.

---

## Domain Model

This model is designed to support both the product AND long-term research into practice patterns, pedagogy effectiveness, and musician motivation/retention. Every field has defined provenance (who creates it, who updates it, when, and why). Derived values are explicitly marked and never stored redundantly.

### Design Principles
- **Single source of truth:** Every fact is stored exactly once. Derived values are computed, not cached (except explicit caches with refresh policies).
- **Calculate once, store the result.** Derived values are calculated at creation time and stored. They are NOT recalculated on every read. Recalculation only happens when a data model change explicitly requires it. This protects historical data from retroactive changes to calculation formulas.
- **Temporal completeness:** Every state change is timestamped. The system can reconstruct the state at any point in time.
- **Soft delete everywhere:** All entities include a `deleted_at` (timestamptz, nullable) field. All queries filter `WHERE deleted_at IS NULL` by default. No hard deletes. Administrative purge of soft-deleted records is a separate, deliberate process.
- **Research-ready:** The data model supports answering questions about practice patterns, skill acquisition curves, pedagogy effectiveness, gamification impact, and retention without schema changes.
- **Normalization:** 3NF minimum. Denormalization only for explicit performance caches, always with documented refresh policy.

### Legacy Data Migration
- Existing PostgreSQL data on DigitalOcean from the Django-era schema must be migrated to the new schema.
- Django models (PracticeGrid, PracticeRow, PracticeCell, PracticeCellCompletion, Song, User, Ensemble, Library, Music) have existing data.
- Migration strategy: write a one-time migration script that maps old schema to new, run it before V1 launch.
- Old data is preserved — migration is additive (new columns, new tables), not destructive.
- Existing User model will need mapping to new auth model (no existing passwords — users will need to register fresh or go through a reset flow).

### Entity Relationship Overview

```
User ─┬─< PracticeGrid ─< PracticeRow ─< PracticeCell ─< PracticeCellCompletion
      │         │
      │         └── source_template_id ──> LibraryTemplate
      │
      ├─< PracticeSession
      ├─< PracticeGoal
      ├─< UserAchievement >── Achievement
      ├─< Grant
      ├─< EnsembleMembership >── Ensemble
      │                              │
      │                              ├─< FeedItem
      │                              ├─< Assignment ─< AssignmentRecipient
      │                              └─< Challenge ─< ChallengeParticipant
      ├─< Feedback (as author)
      ├─< Recording (V8)
      ├─< InTuneSession (V8)
      ├─< TunerDataImport (V10)
      ├─< EarTrainingSession (V11)
      ├─< ReferenceRecording (V11)
      └─< ToneAnalysisResult (V11)

UploadedScore (V9) ─< ScoreSegment
PracticeCell ─< PracticeAttempt (V10)

Cardinality: ─< means one-to-many, >── means many-to-one
```

### Entities

---

#### User
The central identity. Every piece of data in the system is owned by or attributed to a User.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated on registration | Immutable PK |
| email | string, unique | User-provided at registration | Updatable by user. Uniqueness enforced at DB level |
| password_hash | string | System-generated from user password | bcrypt/argon2. Never readable. Updated on password change |
| display_name | string | User-provided at registration | Updatable by user |
| instruments | text[] | User-provided at registration | Updatable by user. Free-text array (e.g., ["cornet", "trumpet"]) |
| email_verified | boolean | System-set on verification | Default false. Set true when verification token consumed |
| timezone | string | User-provided or detected | IANA timezone (e.g., "America/Chicago"). Used for streak/freshness calculations |
| default_fade_enabled | boolean | User preference | Default true. Applied to new grids |
| freshness_reset_strategy | enum(full, halve) | User preference | Default: full. When a cell's freshness interval expires: 'full' resets to 1 day, 'halve' cuts interval in half |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated on any field change |
| stripe_customer_id | string, nullable | System-set on first Stripe interaction (V4) | Immutable once set |
| subscription_tier | enum(free,pro,team) | System-set via grant system (V3) or Stripe webhook (V4) | Derived from active Stripe subscription state. Pending downgrades tracked by Stripe, not locally. |
| subscription_status | enum(none,active,past_due,cancelled,expired) | System-set via Stripe webhook (V4) | State machine — see Subscription States below |
| subscription_period_end | timestamptz, nullable | System-set via Stripe webhook (V4) | Queried from Stripe when needed. Cached locally for display but Stripe is source of truth. |
| xp | integer | System-calculated (V3) | Sum of all XP awards. Monotonically increasing (never decreases) |
| level | integer | System-calculated (V3) | Calculated from xp using quadratic formula (N^2 * 100). Stored on write. Updated when XP changes |
| current_streak | integer | System-calculated (V2) | Days of consecutive practice. Reset on miss. Stored because recalculation is expensive |
| longest_streak | integer | System-calculated (V2) | Max of all historical current_streak values. Monotonically increasing |
| last_practice_date | date, nullable | System-set on any practice activity (V2) | User's timezone-local date. Used for streak calculation |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**State Machine: Subscription**
```
none → active (checkout.completed)
active → past_due (invoice.payment_failed)
active → cancelled (user cancels — access until period_end)
past_due → active (invoice.paid)
past_due → expired (payment failed + grace period exhausted)
cancelled → expired (period_end reached)
expired → active (user re-subscribes)
cancelled → active (user re-subscribes before period_end)
```

**Research value:** User table enables cohort analysis by registration date, instrument, subscription tier. Streak and XP data enable motivation/retention studies.

---

#### PracticeGrid
A structured practice plan for a piece of music or collection of technical studies.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set at creation | Immutable. The owner. Used for all access control |
| name | string (1-200) | User-provided | Required. Updatable by owner |
| notes | text, nullable | User-provided | Optional. Updatable by owner |
| grid_type | enum(repertoire,technique) | User-set at creation (V2) | Default: repertoire. Affects UI labels, not behavior |
| fade_enabled | boolean | User-set, defaults from User.default_fade_enabled | Controls whether freshness decay is active |
| archived | boolean | User-set (V2) | Default false. Archived grids hidden from main list |
| source_template_id | FK→LibraryTemplate, nullable | System-set when cloned from library (V2) | Null for user-created grids. Immutable. Used for community stats |
| assignment_id | FK→Assignment, nullable | System-set when created from assignment (V6) | Null for user-created grids. Immutable |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Derived values (never stored):**
- `completion_percentage`: count of fresh+aging cells / total cells (fade on) OR completed cells / total cells (fade off)
- `total_cells`: sum of all cells across all rows
- `stale_cell_count`: count of cells in stale or decayed state
- `last_practiced_at`: max(completion_date) across all cells in this grid

**Research value:** Grid metadata (type, source template, assignment link) enables analysis of what musicians practice, how they structure practice, and which library resources are most effective.

---

#### PracticeRow
A segment of music within a grid — a specific passage, measure range, or technical exercise to be practiced at graduated tempos.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| practice_grid_id | FK→PracticeGrid | System-set at creation | Immutable. Cascading delete |
| sort_order | integer | System-set, user-adjustable | Position within the grid. Allows reordering |
| song_title | string, nullable | User-provided | For repertoire grids |
| composer | string, nullable | User-provided | For repertoire grids |
| part | string, nullable | User-provided | e.g., "1st Cornet", "2nd Trombone" |
| study_reference | string, nullable | User-provided or from template | For technique grids (e.g., "Clarke #3 in Eb") |
| start_measure | string | User-provided | Free-text (supports "1", "A", "Intro") |
| end_measure | string | User-provided | Free-text |
| target_tempo | integer | User-provided | BPM. Any positive integer |
| steps | integer | User-provided | Positive integer. Determines number of cells generated |
| priority | enum(critical,high,medium,low) | User-set | Default: medium. Affects practice feed ordering |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Derived values:**
- `completion_percentage`: computed from child cells' freshness state
- `max_fresh_tempo_percentage`: highest target_tempo_percentage among fresh/aging cells
- `freshness_summary`: { fresh: N, aging: N, stale: N, decayed: N }

**Research value:** Row-level data enables per-passage analysis: which measure ranges are hardest (most re-practices), how tempo progression correlates with mastery, priority vs actual practice frequency.

---

#### PracticeCell
A single tempo step within a row. Represents "practice this passage at this percentage of target tempo."

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| practice_row_id | FK→PracticeRow | System-set at creation | Immutable. Cascading delete |
| step_number | integer | System-set at creation | 0-indexed position. Used for tempo calculation |
| target_tempo_percentage | float | System-calculated at creation | Formula: 0.4 + (0.6 * step_number / (total_steps - 1)). Calculated at cell creation. Stored. Only recalculated if steps change (which regenerates all cells) |
| freshness_interval_days | integer | System-managed | Default: 1. Doubles on re-practice (cap 30). Resets on uncomplete |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated (interval changes) |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Derived values (never stored):**
- `target_tempo_bpm`: target_tempo_percentage * parent_row.target_tempo (rounded to integer)
- `freshness_state`: computed from last completion date + freshness_interval_days + cascading fade rules. One of: fresh, aging, stale, decayed, incomplete
- `last_completion_date`: max(completion_date) from child completions
- `is_shielded`: whether a higher-tempo cell in the same row prevents this cell from starting its fade timer. Shielded cells count as 'fresh' for completion percentage calculation.

**Research value:** Cell-level data with spaced repetition intervals enables analysis of skill acquisition curves — how quickly intervals grow (learning speed), how often cells decay (retention patterns).

---

#### PracticeCellCompletion
An immutable record that a musician practiced a cell on a specific date. The fundamental unit of practice evidence.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| practice_cell_id | FK→PracticeCell | System-set at creation | Immutable. Cascading delete |
| completion_date | date | System-set (user's timezone-local date) | The date the cell was practiced |
| created_at | timestamptz | System-generated | Immutable. Actual moment of completion (includes time) |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Constraint:** Unique on (practice_cell_id, completion_date) — at most one completion per cell per day.

**Research value:** This is the richest research table. Completion patterns (time of day, day of week, frequency, gaps) directly measure practice behavior. Combined with cell tempo data, enables learning curve analysis.

---

#### PracticeSession (V2)
A manually logged or system-inferred practice session with duration.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable |
| practice_grid_id | FK→PracticeGrid, nullable | User-associated or system-inferred | Which grid was practiced. Nullable for general practice |
| session_date | date | User-provided or system-set | User's timezone-local date |
| duration_minutes | integer | User-provided or system-calculated | Positive integer |
| notes | text, nullable | User-provided | Optional session notes |
| source | enum(manual, inferred) | System-set | Manual = user logged it. Inferred = system calculated from completion timestamps |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Research value:** Practice session duration data combined with completion data enables "time-to-mastery" analysis — how many hours does it take to complete a grid at different difficulty levels?

---

#### PracticeGoal (V2)
A user-set practice target that tracks progress.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable |
| goal_type | enum(daily_minutes, weekly_minutes, weekly_sessions, monthly_grids) | User-set | Immutable after creation |
| target_value | integer | User-set | Positive integer. Updatable |
| active | boolean | User-set | Default true. User can deactivate without deleting |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Derived values:** `current_progress` and `percentage_complete` computed from PracticeSession and PracticeCellCompletion data for the relevant time period.

**Research value:** Goal-setting behavior correlates with practice consistency and retention.

---

#### LibraryTemplate (V2)
An admin-curated practice grid template from public-domain music education literature.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| title | string | Admin-provided | e.g., "Technical Study #3 in Eb" |
| author | string | Admin-provided | e.g., "Herbert L. Clarke" |
| collection | string | Admin-provided | e.g., "Technical Studies for the Cornet" |
| description | text, nullable | Admin-provided | |
| instrument_tags | text[] | Admin-provided | e.g., ["trumpet", "cornet", "brass"] |
| tier_required | enum(free, pro) | Admin-set | Which subscription tier can access this template |
| grid_data | JSON | Admin-provided | Serialized grid structure: { rows: [{ title, start_measure, end_measure, target_tempo, steps }] } |
| active | boolean | Admin-set | Default true. Deactivated templates hidden from library |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Derived values (cached with daily refresh):**
- `community_user_count`: count of PracticeGrids with source_template_id = this.id
- `community_avg_completion`: average completion_percentage across those grids

**Research value:** Template usage and completion rates measure pedagogy effectiveness — which studies produce the best outcomes?

---

#### Achievement (V3)
A system-defined milestone that musicians can unlock.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| key | string, unique | Admin-defined | Machine identifier (e.g., "first_cell_complete") |
| name | string | Admin-defined | Display name (e.g., "First Steps") |
| description | string | Admin-defined | What the user did to earn it |
| category | enum(streak, completion, time, exploration) | Admin-defined | For grouping in UI |
| icon | string | Admin-defined | Icon identifier or URL |
| xp_reward | integer | Admin-defined | XP granted on unlock |
| criteria | JSON | Admin-defined | Machine-readable condition (e.g., { "type": "streak_days", "value": 7 }) |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Immutable after creation.** Changes require a new achievement (old one grandfathered).

---

#### UserAchievement (V3)
Join table: records when a user unlocked an achievement. Immutable once created.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable |
| achievement_id | FK→Achievement | System-set | Immutable |
| unlocked_at | timestamptz | System-set | Immutable. Moment of unlock |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Constraint:** Unique on (user_id, achievement_id) — cannot unlock the same achievement twice.

**Research value:** Achievement unlock timing correlates with engagement — do achievements drive continued practice or are they just a consequence of it?

---

#### Grant (V3)
A specific feature permission or usage limit for a user, derived from their subscription tier or admin override.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable |
| grant_type | string | System-set from tier mapping or admin | e.g., "max_active_grids", "analytics_access" |
| grant_value | string | System-set | e.g., "unlimited", "full", "3", "subset" |
| source | enum(subscription, admin_override) | System-set | Distinguishes origin |
| expires_at | timestamptz, nullable | Admin-set (for overrides) | Null = no expiry |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Constraint:** Unique on (user_id, grant_type) — one grant per type per user. Admin override replaces subscription-based grant.

---

#### Ensemble (V5)
A group of musicians managed by a director.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| name | string | Director-provided | Required. Updatable by admin role |
| description | text, nullable | Director-provided | Updatable |
| instrument_tags | text[] | Director-provided | e.g., ["brass", "wind"] |
| created_by | FK→User | System-set | Immutable. The founding director |
| invite_code | string, unique | System-generated | Cryptographically random. Regenerable by admin |
| visibility | enum(public, private) | Director-set | Default: private |
| social_feed_mode | enum(full, achievements_only, off) | Director-set | Default: full |
| join_approval_required | boolean | Director-set | Default: false. If true, joins go to pending state |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

---

#### EnsembleMembership (V5)
Join table with role and section assignment. Has a state machine.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| ensemble_id | FK→Ensemble | System-set | Immutable |
| user_id | FK→User | System-set | Immutable |
| role | enum(admin, section_leader, member) | Director-set | Default: member. Updatable by admin |
| section | string, nullable | Director-set | e.g., "Cornets", "Percussion". Updatable |
| status | enum(pending, active, removed) | System-managed | State machine |
| joined_at | timestamptz, nullable | System-set when status→active | |
| removed_at | timestamptz, nullable | System-set when status→removed | |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**State Machine: Membership**
```
(join request) → pending (if join_approval_required) → active (admin approves)
(join request) → active (if no approval required)
active → removed (admin removes or user leaves)
removed → (terminal — rejoin creates new membership)
```

**Constraint:** Unique on (ensemble_id, user_id, status) where status != 'removed' — a user can only have one active/pending membership per ensemble.

---

#### FeedItem (V5)
A social activity event within an ensemble.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| ensemble_id | FK→Ensemble | System-set | Immutable |
| user_id | FK→User | System-set | The musician who triggered the event |
| event_type | enum(grid_complete, row_complete, achievement, streak_milestone, challenge_win, assignment_complete) | System-set | |
| event_data | JSON | System-set | Structured event payload (grid name, achievement name, streak count, etc.) |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**FeedItem is immutable.** No edits, no deletes (except by admin for moderation).

---

#### FeedReaction (V5)
Emoji reactions on feed items. Separate table to avoid JSON array mutation.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| feed_item_id | FK→FeedItem | System-set | Immutable |
| user_id | FK→User | System-set | The reactor |
| emoji | string | User-provided | Single emoji character. Constrained to allowed set |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Constraint:** Unique on (feed_item_id, user_id, emoji) — one reaction per emoji per user per item.

---

#### Assignment (V6)
A director-created practice assignment for ensemble members.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| ensemble_id | FK→Ensemble | System-set | Immutable |
| created_by | FK→User | System-set | The director who created it |
| grid_template_id | FK→PracticeGrid | Director-selected | Source grid to clone. Can be a director's own PracticeGrid or a LibraryTemplate. Immutable after creation. |
| grid_source_type | enum(user_grid, library_template) | Director-selected | Determines whether grid_template_id references a PracticeGrid or LibraryTemplate |
| title | string | Director-provided | |
| description | text, nullable | Director-provided | |
| due_date | date | Director-provided | Updatable |
| target_completion_percentage | integer (0-100) | Director-provided | Default: 100 |
| required | boolean | Director-set | Default: true |
| status | enum(draft, active, completed, cancelled) | System-managed | State machine |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**State Machine: Assignment**
```
draft → active (director publishes)
active → completed (due_date passed or director closes)
active → cancelled (director cancels)
draft → cancelled (director cancels before publishing)
```

---

#### AssignmentRecipient (V6)
Who receives the assignment and their individual grid clone.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| assignment_id | FK→Assignment | System-set | Immutable |
| user_id | FK→User | System-set | Immutable |
| practice_grid_id | FK→PracticeGrid | System-set | The cloned grid for this recipient. Immutable |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Constraint:** Unique on (assignment_id, user_id).

---

#### Challenge (V6)
A competitive practice challenge within an ensemble.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| ensemble_id | FK→Ensemble | System-set | Immutable |
| created_by | FK→User | System-set | Director or member (if allowed) |
| challenge_type | enum(most_minutes, first_complete, longest_streak) | Creator-set | Immutable after creation |
| title | string | Creator-provided | |
| description | text, nullable | Creator-provided | |
| start_date | date | Creator-provided | Must be future or today |
| end_date | date | Creator-provided | Must be after start_date |
| status | enum(upcoming, active, completed) | System-managed | Based on current date vs start/end |
| winner_user_id | FK→User, nullable | System-set | Set when challenge completes |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

---

#### ChallengeParticipant (V6)
Tracks who is participating in a challenge.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| challenge_id | FK→Challenge | System-set | Immutable |
| user_id | FK→User | System-set | Immutable |
| joined_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

**Derived values:** Leaderboard position computed from PracticeSession/PracticeCellCompletion data within the challenge date range.

---

#### Feedback (V6)
Comments on shared grid snapshots. Supports threading.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| grid_id | FK→PracticeGrid | System-set | The shared grid being commented on |
| author_id | FK→User | System-set | Immutable |
| parent_id | FK→Feedback, nullable | System-set | For threading. Null = top-level comment |
| content | text | Author-provided | Sanitized. Max 5000 chars |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Updated if author edits |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active. Non-null = soft-deleted |

---

#### V8-V11 Entities (Performer Enhancement & Practice Intelligence)

---

#### Recording (V8)
An audio recording of a practice session linked to a specific cell, row, or grid.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable. Owner |
| practice_cell_id | FK→PracticeCell, nullable | User-associated | Which cell was being practiced |
| practice_row_id | FK→PracticeRow, nullable | User-associated | Which row (if not cell-specific) |
| practice_grid_id | FK→PracticeGrid | User-associated | Which grid |
| duration_seconds | integer | System-measured | Length of recording |
| file_path | string | System-generated | Path to compressed audio file (WebM/Opus or AAC) |
| file_size_bytes | integer | System-measured | For storage tracking |
| label | string, nullable | User-provided | Optional user label |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active |

---

#### InTuneSession (V8)
Tracks in-tune percentage data for a practice session.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable |
| practice_cell_id | FK→PracticeCell, nullable | System-associated | Which cell was active |
| practice_session_id | FK→PracticeSession, nullable | System-associated | Linked practice session |
| total_time_ms | integer | System-measured | Total time tuner was active (milliseconds) |
| in_tune_time_ms | integer | System-measured | Time within threshold (milliseconds) |
| threshold_cents | integer | User-configured | e.g., 10 for ±10 cents |
| reference_frequency | float | User-configured | e.g., 440.0 Hz |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active |

**Derived:** in_tune_percentage = in_tune_time_ms / total_time_ms * 100. Calculated on creation, stored.

---

#### UploadedScore (V9)
A piece of sheet music uploaded by a user, with extracted music data.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable. Owner |
| original_filename | string | User-provided | Original uploaded filename |
| file_format | enum(pdf, png, jpg, tiff) | System-detected | |
| page_count | integer | System-detected | Number of pages processed |
| credits_consumed | integer | System-calculated | Credits charged for this scan |
| processing_status | enum(pending, processing, completed, failed) | System-managed | State machine |
| music_data | JSON | System-generated (OMR) | Extracted structured music data (MusicXML-like format) |
| user_corrections | JSON, nullable | User-provided | User's manual corrections to OCR output |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active |

---

#### ScoreSegment (V9)
An identified segment within an uploaded score, representing a passage for practice.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| uploaded_score_id | FK→UploadedScore | System-set | Immutable |
| start_measure | integer | System-identified or user-adjusted | First measure of segment |
| end_measure | integer | System-identified or user-adjusted | Last measure of segment |
| difficulty_score | integer (1-10) | System-calculated (heuristics) | Stored on creation. User-overridable |
| difficulty_factors | JSON | System-generated | Breakdown: { intervals: N, tempo: N, range: N, rhythm: N, dynamics: N } |
| segment_type | enum(phrase, section, technical_passage, rehearsal_mark) | System-identified | |
| context_tags | text[] | System-generated or user-set | e.g., ["Solo", "Exposed", "Melody", "Tutti"] |
| suggested_priority | enum(critical, high, medium, low) | System-derived from context | Based on solo/exposed/tutti analysis |
| tempo_marking | integer, nullable | System-extracted from score | BPM from tempo marking, if present |
| created_at | timestamptz | System-generated | Immutable |
| updated_at | timestamptz | System-generated | Auto-updated |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active |

---

#### PracticeAttempt (V10)
A recorded attempt at playing a passage, with scoring data from note-to-score alignment.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable |
| practice_cell_id | FK→PracticeCell | System-associated | Which cell was being attempted |
| recording_id | FK→Recording, nullable | System-linked | The audio recording of this attempt |
| uploaded_score_id | FK→UploadedScore | System-linked | Source score data for alignment |
| pitch_accuracy_pct | float | System-calculated | % of notes with correct pitch |
| rhythm_accuracy_pct | float | System-calculated | % of notes within timing tolerance |
| note_coverage_pct | float | System-calculated | % of written notes that were attempted |
| overall_score | float | System-calculated | Weighted composite score |
| note_results | JSON | System-generated | Per-note results: { note_index, written_pitch, played_pitch, status: correct/wrong/missed, timing_offset_ms } |
| tempo_bpm | integer | System-detected | Detected tempo of the attempt |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active |

---

#### TunerDataImport (V10)
Imported tuning data from an external app (e.g., Tonal Energy).

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable |
| practice_session_id | FK→PracticeSession, nullable | User-mapped | Linked practice session |
| source_app | string | User-provided or auto-detected | e.g., "Tonal Energy", "iStroboSoft" |
| import_format | enum(csv, json) | System-detected | Format of imported file |
| data_points | JSON | System-parsed from import | Array of { timestamp, frequency_hz, note_name, cent_deviation } |
| data_point_count | integer | System-calculated | Number of data points imported |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active |

---

#### EarTrainingSession (V11)
A session of ear training drills with results.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable |
| drill_type | enum(pitch_id, interval_id, chord_quality) | User-selected | Type of drill |
| difficulty_level | enum(beginner, intermediate, advanced) | User-selected | |
| total_questions | integer | System-counted | Questions presented |
| correct_answers | integer | System-counted | Correct responses |
| accuracy_pct | float | System-calculated | Stored on session completion |
| duration_seconds | integer | System-measured | Total session length |
| question_results | JSON | System-generated | Per-question: { question_index, presented, answered, correct: bool, response_time_ms } |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active |

**Research value:** Ear training data enables study of aural skill development, correlation between ear training accuracy and practice quality, and spaced repetition effectiveness for musical intervals.

---

#### ReferenceRecording (V11)
A user's self-identified "best tone" recording used as a personal benchmark.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable. Owner |
| label | string | User-provided | e.g., "Concert Bb, mezzo-forte, best tone" |
| note_name | string | User-provided or auto-detected | e.g., "Bb4" |
| dynamic | string, nullable | User-provided | e.g., "mf", "ff" |
| file_path | string | System-generated | Path to audio file |
| duration_seconds | float | System-measured | Must be ≥3 seconds |
| spectral_profile | JSON | System-analyzed | { fundamental_hz, overtone_amplitudes: [float], noise_floor_db } |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active |

---

#### ToneAnalysisResult (V11)
Result of an AI-powered tone quality analysis session.

| Field | Type | Provenance | Notes |
|-------|------|-----------|-------|
| id | UUID | System-generated | Immutable PK |
| user_id | FK→User | System-set | Immutable |
| reference_recording_id | FK→ReferenceRecording, nullable | User-selected | Personal reference used for comparison |
| recording_id | FK→Recording | System-linked | The audio being analyzed |
| credits_consumed | integer | System-calculated | Credits charged for this analysis |
| tone_quality_score | integer (0-100) | System-calculated (ML) | Relative to reference. Stored. Reproducible ±2 |
| spectral_comparison | JSON | System-generated | { user_profile: {...}, reference_profile: {...}, differences: [...] } |
| feedback_summary | text | System-generated | Natural language feedback on tone quality |
| note_name | string | System-detected | Which note was analyzed |
| dynamic | string, nullable | System-detected | Detected dynamic level |
| created_at | timestamptz | System-generated | Immutable |
| deleted_at | timestamptz, nullable | System-set on soft delete | Null = active |

**Research value:** Tone analysis data, combined with practice time and recording history, enables longitudinal study of tone development and the effectiveness of different practice approaches on sound quality.

---

### Indexes (Performance-Critical)

```
PracticeCellCompletion: (practice_cell_id, completion_date) UNIQUE
PracticeCellCompletion: (completion_date) — for streak and time-range queries
PracticeGrid: (user_id, archived) — for grid list queries
PracticeGrid: (source_template_id) — for community stats aggregation
PracticeRow: (practice_grid_id, sort_order) — for ordered row display
Grant: (user_id, grant_type) UNIQUE
EnsembleMembership: (ensemble_id, user_id) — for membership lookups
FeedItem: (ensemble_id, created_at DESC) — for feed pagination
UserAchievement: (user_id, achievement_id) UNIQUE
```

### Research Dimensions

The domain model supports the following research questions without schema changes:

**Practice Patterns:**
- How does practice frequency correlate with grid completion speed?
- What time of day do musicians practice most? (PracticeCellCompletion.created_at)
- How does freshness interval growth rate indicate skill retention?
- What is the average time-to-mastery per grid type, difficulty level, instrument?

**Pedagogy Effectiveness:**
- Which LibraryTemplates produce the highest completion rates?
- Do assigned grids (via Assignment) get completed more than self-created grids?
- How does practice feed usage (suggestion acceptance) correlate with improvement?
- Which row priorities get the most actual practice?

**Motivation & Retention:**
- Does streak length predict continued engagement? At what streak length do users "stick"?
- Which achievements are most commonly the last one before a user churns?
- Does social feed participation (FeedReaction) correlate with practice frequency?
- How does challenge participation affect practice minutes?
- Does gamification (XP, levels) independently drive practice, or just correlate?

---

## Engineering Milestones & Tasks

Each phase is broken into milestones. Each milestone contains tasks that map to specific UC acceptance criteria. Milestones follow a consistent pattern: **domain model first**, then API/business logic, then UI, then integration/polish.

A milestone is complete when all its tasks pass their mapped acceptance criteria AND none of the rejection criteria are triggered.

---

### V1 Milestones

**M1.1: Project Bootstrap**
- Task: Initialize Next.js project with TypeScript, App Router
- Task: Configure PostgreSQL + Prisma ORM with dev/test/prod environments
- Task: Set up Vitest (unit) + Playwright (e2e) test frameworks
- Task: Configure GitHub Actions CI (lint, type-check, test, build)
- Task: Create initial CLAUDE.md with project conventions
- Task: Configure environment separation (test DB created/torn down per suite)
- Completion: `npm run build && npm run test` passes with empty project scaffold

**M1.2: Domain Model — Grid, Row, Cell, Completion**
- Task: Design Prisma schema for User, PracticeGrid, PracticeRow, PracticeCell, PracticeCellCompletion
- Task: Define field provenance: who owns, who creates, who updates each field
- Task: Define freshness_interval_days on PracticeCell, fade_enabled on PracticeGrid, priority on PracticeRow
- Task: Write and run database migrations
- Task: Write unit tests for domain model constraints (required fields, enums, FK integrity)
- Task: Document domain model in auto-generated schema docs
- Maps to: UC-1.3, UC-1.4 (data layer), UC-1.7, UC-1.8, UC-1.9, UC-1.10

**M1.3: Grid CRUD API**
- Task: Create grid endpoint (POST) — validates name, sets user_id, defaults
- Task: Delete grid endpoint (DELETE) — cascading delete, ownership check
- Task: List grids endpoint (GET) — user-scoped, sorted by last modified
- Task: Get grid detail endpoint (GET) — includes rows, cells, completion state
- Task: Write integration tests for each endpoint (success, validation error, auth error)
- Maps to: UC-1.3, UC-1.12, UC-1.13

**M1.4: Row & Cell Operations API**
- Task: Add row endpoint (POST) — auto-generates cells with tempo percentages
- Task: Write unit tests for cell generation math (tempo percentage = 0.4 + 0.6 * step/total)
- Task: Edit row endpoint (PUT) — handles step count change (regenerate cells with warning)
- Task: Set/edit priority endpoint (PUT) — validates enum
- Task: Integration tests for all row operations
- Maps to: UC-1.4, UC-1.11, UC-1.14, UC-1.15, UC-1.16

**M1.5: Cell Completion & Freshness API**
- Task: Complete cell endpoint (POST) — creates PracticeCellCompletion, updates freshness interval
- Task: Uncomplete cell endpoint (DELETE) — removes completion, resets interval
- Task: Write freshness calculation logic (pure function: last_completion_date + interval → state)
- Task: Write cascading fade logic (pure function: within a row, highest tempo fades first)
- Task: Configure fade toggle endpoint (PUT on PracticeGrid.fade_enabled)
- Task: Write grid completion percentage calculation (respects fade on/off)
- Task: Unit tests for: interval doubling, interval cap (30 days), cascade ordering, completion % with/without fade
- Task: Integration tests for completion lifecycle
- Maps to: UC-1.6, UC-1.7, UC-1.8, UC-1.9, UC-1.10

**M1.6: Grid View UI**
- Task: Build grid view component — rows, cells, tempo display
- Task: Implement cell color states (fresh/aging/stale/decayed/completed/empty)
- Task: Implement click-to-complete and right-click-to-uncomplete interactions
- Task: Implement cascading fade visual (green drains right to left)
- Task: Implement fade toggle control on grid
- Task: Implement priority badges on rows
- Task: Progress bar showing grid completion %
- Task: Responsive layout (320px+ viewports, adapts to large step counts)
- Task: Playwright e2e tests with screenshots for each visual state
- Maps to: UC-1.6, UC-1.7, UC-1.11, UC-1.12

**M1.7: Dashboard UI**
- Task: Build 4-quadrant dashboard layout (responsive: 2x2 desktop, stacked mobile)
- Task: Upper-left: greeting + alerts (stale cells, resume prompts)
- Task: Upper-right: grid list with completion %, freshness summary, "New Grid" CTA
- Task: Lower-left: basic stats (streak placeholder, cells completed, grid %)
- Task: Lower-right: practice focus suggestions (top priority + most decayed rows)
- Task: Empty states for new users in each quadrant
- Task: Playwright e2e tests with screenshots
- Maps to: UC-1.5

**M1.8: Authentication**
- Task: Prisma schema for auth fields (email, password_hash, email_verified, etc.)
- Task: Registration endpoint with email/password validation
- Task: Email verification flow (token generation, verification endpoint)
- Task: Login endpoint with JWT/session token
- Task: Logout endpoint with session invalidation
- Task: Forgot password flow
- Task: Account lockout after 5 failed attempts
- Task: Auth middleware — protect all API endpoints
- Task: Retrofit existing grid/row/cell endpoints to require auth and scope to user
- Task: Integration tests for all auth flows (including negative: wrong password, expired token, locked account)
- Maps to: UC-1.1, UC-1.2

**M1.9: V1 Polish & System Verification**
- Task: Cross-browser testing (Chrome, Firefox, Safari, Edge — latest 2 versions)
- Task: Mobile viewport testing (320px, 375px, 768px, 1024px, 1440px)
- Task: Performance audit (<2s load on 3G, no API >500ms, no main thread blocks >100ms)
- Task: Security audit (CORS, CSRF, input sanitization, no data leaks between users)
- Task: Accessibility audit (keyboard navigation, semantic HTML, screen reader test)
- Task: Code coverage verification (≥95% on all code)
- Task: Final CLAUDE.md update with V1 patterns and conventions
- Maps to: V1 system-level acceptance criteria

---

### V2 Milestones

**M2.1: Domain Model — Sessions, Goals, Library Templates**
- Task: Extend Prisma schema: PracticeSession, PracticeGoal, LibraryTemplate
- Task: Add grid_type (repertoire/technique) and archived fields to PracticeGrid
- Task: Add source_template_id to PracticeGrid
- Task: Define field provenance for all new entities
- Task: Migrations + unit tests for schema constraints
- Maps to: UC-2.1, UC-2.2, UC-2.5, UC-2.7, UC-2.8

**M2.2: Multiple Grids & Archive**
- Task: Remove single-grid limit from API
- Task: Archive grid endpoint (PUT)
- Task: Grid list: filter by active/archived, sort by last modified
- Task: Integration tests
- Maps to: UC-2.1

**M2.3: Practice Time Tracking**
- Task: Manual practice log endpoint (POST) — date, duration, notes
- Task: Automatic timestamp on cell completions (extend completion model)
- Task: Practice time aggregation queries (daily/weekly/monthly)
- Task: Integration tests
- Maps to: UC-2.2

**M2.4: Analytics API & UI**
- Task: Practice time trend API (last 30 days, weekly summary, monthly comparison)
- Task: Piece-level analytics API (per-row completion %, max completed tempo, progress curve)
- Task: Streak calculation logic and API
- Task: Build analytics dashboard UI (charts: line/bar for time trends, heat map for piece-level)
- Task: Playwright e2e tests with screenshots for chart rendering
- Maps to: UC-2.3, UC-2.4

**M2.5: Practice Goals**
- Task: Goal CRUD endpoints (create, read, update, deactivate)
- Task: Goal progress calculation logic
- Task: Goal achievement notification
- Task: Goals UI in dashboard lower-left quadrant
- Task: Integration and e2e tests
- Maps to: UC-2.5

**M2.6: Practice Feed (Smart Suggestions)**
- Task: Feed algorithm: weight by (1) priority, (2) freshness urgency, (3) time since last practiced
- Task: Feed API endpoint (GET) — per-grid or aggregated, paginated
- Task: Dismiss/snooze suggestions endpoint
- Task: Feed UI in dashboard lower-right quadrant
- Task: Unit tests for feed algorithm determinism
- Maps to: UC-2.6

**M2.7: Technique Grids**
- Task: Grid type field in creation flow
- Task: UI label adaptation (Study vs Piece, Exercise vs Measures)
- Task: Filter toggle in grid list
- Task: Integration tests
- Maps to: UC-2.7

**M2.8: Education Literature Library**
- Task: LibraryTemplate CRUD (admin endpoints)
- Task: Browse library endpoint (public, filtered by tier)
- Task: Clone template endpoint (creates user's own grid from template)
- Task: Community stats aggregation (user count, avg completion — cached, refreshed daily)
- Task: Library browse UI with search/filter
- Task: Clone flow UI with "already cloned" warning
- Task: Seed initial library data (Arban, Clarke, Schlossberg selections)
- Task: Playwright e2e tests
- Maps to: UC-2.8, UC-2.9, UC-2.10, UC-2.11

**M2.9: V2 Polish & Verification**
- Task: Analytics render with sample data + empty data
- Task: Library content review (public domain verification)
- Task: Performance audit with multiple grids (10, 50, 100)
- Task: Coverage verification (≥95%)
- Task: CLAUDE.md update with V2 patterns

---

### V3 Milestones

**M3.1: Domain Model — Achievements, XP, Grants**
- Task: Extend schema: Achievement, UserAchievement, Grant
- Task: Add xp, level, current_streak, longest_streak to User
- Task: Define achievement criteria format (JSON machine-readable conditions)
- Task: Define grant type registry and tier mapping configuration
- Task: Migrations + unit tests
- Maps to: UC-3.1, UC-3.2, UC-3.3, UC-3.4

**M3.2: Achievement Engine**
- Task: Achievement evaluation engine (checks criteria against user state)
- Task: Idempotent award logic (never double-award)
- Task: Achievement notification system (toast/push)
- Task: Seed initial achievement set (First Steps, Grid Master, Week Warrior, Century, Tempo Climber, Marathon, etc.)
- Task: Unit tests for each achievement trigger condition
- Maps to: UC-3.1

**M3.3: Streak System**
- Task: Streak increment logic (timezone-aware, once per calendar day)
- Task: Streak reset logic (midnight rollover handling, race condition prevention)
- Task: Streak milestone detection (7, 30, 100, 365 → trigger achievements)
- Task: Unit tests for timezone edge cases
- Maps to: UC-3.2

**M3.4: XP & Leveling**
- Task: XP award logic per action (idempotent, integer math only)
- Task: Level threshold calculation (quadratic: N^2 * 100)
- Task: Level-up detection and notification
- Task: Unit tests for XP accumulation and level boundaries
- Maps to: UC-3.3

**M3.5: Grant System**
- Task: Grant tier mapping configuration (not hardcoded per-user)
- Task: Grant enforcement middleware (API-level checks)
- Task: Grant-limit response format (structured: which grant, which tier unlocks)
- Task: Admin grant override endpoints
- Task: Integration tests: grant check on every gated endpoint
- Maps to: UC-3.4, UC-3.5, UC-3.6

**M3.6: Upgrade Prompts & Gamification UI**
- Task: Upgrade prompt component (inline, contextual, with cooldown)
- Task: Achievement showcase UI (profile page, recent unlocks)
- Task: XP/level display in dashboard and profile
- Task: Streak display in dashboard
- Task: Playwright e2e tests for grant boundaries and upgrade flow
- Maps to: UC-3.7

**M3.7: V3 Polish & Verification**
- Task: Test grant enforcement by downgrading a user mid-session
- Task: Verify each achievement triggers correctly
- Task: Coverage verification
- Task: CLAUDE.md update

---

### V4 Milestones

**M4.1: Domain Model — Billing**
- Task: Add stripe_customer_id, subscription fields to User
- Task: Define subscription state machine (states: none, active, past_due, cancelled, expired)
- Task: Migrations + unit tests for state transitions
- Maps to: UC-4.1, UC-4.2

**M4.2: Stripe Integration**
- Task: Stripe SDK setup + test mode configuration
- Task: Checkout session creation endpoint
- Task: Webhook endpoint with signature verification
- Task: Webhook handlers for all lifecycle events (checkout.completed, invoice.paid, invoice.failed, subscription.updated, subscription.deleted)
- Task: Idempotent webhook processing
- Task: Grant tier update on subscription change
- Task: Integration tests against Stripe test mode
- Maps to: UC-4.1, UC-4.7

**M4.3: Subscription Management UI**
- Task: View current plan page
- Task: Upgrade flow (Stripe Checkout redirect)
- Task: Downgrade flow (confirmation with impact summary, effective at period end)
- Task: Cancel flow (confirmation, access until period end)
- Task: Team subscription management (add/remove seats)
- Task: Playwright e2e for full billing lifecycle
- Maps to: UC-4.2, UC-4.3, UC-4.4, UC-4.5, UC-4.6

**M4.4: Production Deployment**
- Task: DigitalOcean setup (Droplet or App Platform with Docker)
- Task: PostgreSQL production database with automated daily backups
- Task: SSL certificate setup for practicegrids.com
- Task: Environment configuration (secrets management, no secrets in code)
- Task: CI/CD pipeline: GitHub Actions → build → test → deploy
- Task: Zero-downtime deployment strategy (rolling or blue-green)
- Task: Monitoring and error tracking setup
- Task: Rate limiting on auth + webhook endpoints
- Task: CORS locked to production domain
- Task: Backup restore test (verify backup actually works)
- Maps to: UC-4.8

**M4.5: V4 Polish & Verification**
- Task: Full billing lifecycle test in Stripe test mode (subscribe, upgrade, downgrade, cancel, webhook)
- Task: Penetration testing on auth and billing endpoints
- Task: Load testing (simulate 100 concurrent users)
- Task: Coverage verification
- Task: CLAUDE.md update

---

### V5 Milestones

**M5.1: Domain Model — Ensembles, Membership, Feed**
- Task: Extend schema: Ensemble, EnsembleMembership, FeedItem
- Task: Define membership state machine (pending → active → removed)
- Task: Define role hierarchy and permissions matrix
- Task: Define ensemble visibility and feed mode settings
- Task: Migrations + unit tests
- Maps to: UC-5.1, UC-5.2, UC-5.4, UC-5.5

**M5.2: Ensemble CRUD & Membership**
- Task: Create ensemble endpoint (Team tier required)
- Task: Generate cryptographically random invite codes
- Task: Join ensemble endpoint (invite code validation)
- Task: Leave ensemble endpoint
- Task: Role management endpoints (assign roles, organize sections)
- Task: Guard: last admin cannot be removed
- Task: Integration tests for all membership flows
- Maps to: UC-5.1, UC-5.2, UC-5.5

**M5.3: Director Dashboard**
- Task: Ensemble overview API (total practice time, active members, avg streak)
- Task: Per-member drill-down API (practice time, grid completions, streak, last active)
- Task: Sortable/filterable member list
- Task: Date range selector for all metrics
- Task: Director dashboard UI
- Task: Section Leader scoped views
- Task: Playwright e2e tests
- Maps to: UC-5.3

**M5.4: Activity Feed**
- Task: Feed item creation on events (grid complete, achievement, streak milestone)
- Task: Feed API with pagination, filtered by ensemble
- Task: Feed visibility enforcement (respect director setting and musician opt-out)
- Task: Emoji reactions on feed items
- Task: Feed UI component
- Task: Integration tests for visibility rules
- Maps to: UC-5.4, UC-5.7

**M5.5: V5 Polish & Verification**
- Task: Test cross-ensemble data isolation
- Task: Test role permission boundaries
- Task: Coverage verification
- Task: CLAUDE.md update

---

### V6 Milestones

**M6.1: Domain Model — Assignments, Challenges, Feedback**
- Task: Extend schema: Assignment, Challenge, Feedback
- Task: Define assignment state machine (draft → active → past_due → completed)
- Task: Define challenge state machine (upcoming → active → completed)
- Task: Migrations + unit tests
- Maps to: UC-6.1, UC-6.3, UC-6.5, UC-6.6, UC-6.7

**M6.2: Assignment System**
- Task: Create assignment endpoint (clone grid template to assigned musicians)
- Task: Assignment scoping (ensemble/section/individuals)
- Task: Assignment progress API (per-musician completion %, aggregate stats)
- Task: Assignment progress UI for directors
- Task: Assignment display in musician dashboard
- Task: Integration tests
- Maps to: UC-6.1, UC-6.2

**M6.3: Practice Challenges**
- Task: Challenge CRUD endpoints
- Task: Challenge leaderboard calculation
- Task: Challenge winner detection and feed announcement
- Task: Challenge UI (create, join, leaderboard)
- Task: Privacy enforcement (respect feed visibility opt-outs)
- Task: Integration tests
- Maps to: UC-6.3, UC-6.6

**M6.4: Export & Feedback**
- Task: CSV export endpoint (practice summary, assignment progress, student reports)
- Task: PDF export endpoint (formatted reports)
- Task: Grid snapshot sharing (read-only link generation)
- Task: Feedback/comment CRUD on shared grids
- Task: Notification on new feedback
- Task: Export and feedback UI
- Task: Integration tests (including CSV escaping, PDF formatting)
- Maps to: UC-6.4, UC-6.5, UC-6.7

**M6.5: V6 Polish & Verification**
- Task: Test assignment clone independence
- Task: Test export data isolation
- Task: Coverage verification
- Task: CLAUDE.md update

---

### V8 Milestones (Sketch)

**M8.1: Domain Model — Recording, InTuneSession**
- Maps to: UC-A.1, UC-A.2, UC-A.3, UC-A.4, UC-A.5

**M8.2: Metronome**
- Maps to: UC-A.1

**M8.3: Chromatic Tuner & In-Tune Tracking**
- Maps to: UC-A.2, UC-A.3

**M8.4: Recording & Playback**
- Maps to: UC-A.4, UC-A.5

**M8.5: V8 Polish & Verification**

---

### V9 Milestones (Sketch)

**M9.1: Domain Model — UploadedScore, ScoreSegment**
- Maps to: UC-B.1, UC-B.2, UC-B.3, UC-B.4

**M9.2: Sheet Music Upload & OMR**
- Maps to: UC-B.1

**M9.3: Difficulty Analysis & Structure Identification**
- Maps to: UC-B.2, UC-B.3

**M9.4: Auto-Grid Generation**
- Maps to: UC-B.4

**M9.5: V9 Polish & Verification**

---

### V10 Milestones (Sketch)

**M10.1: Domain Model — PracticeAttempt, TunerDataImport**
- Maps to: UC-C.1, UC-C.2, UC-C.3, UC-C.4

**M10.2: External Tuner Data Import**
- Maps to: UC-C.1

**M10.3: Note-to-Score Mapping (DTW)**
- Maps to: UC-C.2

**M10.4: Practice Attempt Scoring**
- Maps to: UC-C.3

**M10.5: Just Intonation Targets**
- Maps to: UC-C.4

**M10.6: V10 Polish & Verification**

---

### V11 Milestones (Sketch)

**M11.1: Domain Model — EarTrainingSession, ReferenceRecording, ToneAnalysisResult**
- Maps to: UC-D.1, UC-D.2, UC-D.3, UC-D.4, UC-D.5, UC-D.6

**M11.2: Pitch Identification Drill**
- Maps to: UC-D.1

**M11.3: Interval & Chord Drills**
- Maps to: UC-D.2, UC-D.3

**M11.4: Ear Training Analytics**
- Maps to: UC-D.4

**M11.5: Reference Tone Recording**
- Maps to: UC-D.5

**M11.6: Tone Quality Analysis (ML)**
- Maps to: UC-D.6

**M11.7: V11 Polish & Verification**

---

## Verification Strategy

Verification happens at three levels: automated (CI), manual (Playwright-driven), and phase-gate (milestone completion). Each level has specific tools and criteria.

### Level 1: Automated Verification (every commit)

Runs in CI (GitHub Actions) on every push. Build fails if any check fails.

| Check | Tool | Criteria |
|-------|------|----------|
| Type safety | TypeScript compiler | Zero errors, strict mode |
| Unit tests | Vitest | All pass, ≥95% coverage |
| Integration tests | Vitest + test DB | All pass, all API endpoints covered |
| E2E tests | Playwright | All pass, screenshots captured |
| Lint | ESLint | Zero errors, zero warnings |
| Build | Next.js build | Successful production build |
| Security | npm audit | No high/critical vulnerabilities |

**Command:** `npm run verify` (runs all of the above in sequence)

### Level 2: Manual Verification (every PR)

Performed by the developer before requesting review. Uses Playwright to drive the browser.

| What | How |
|------|-----|
| Visual correctness | Playwright screenshots compared against golden files for each UI state |
| Responsive layout | Playwright tests at 320px, 375px, 768px, 1024px, 1440px viewports |
| Console errors | Playwright captures browser console — must be empty |
| Keyboard accessibility | Tab through all interactive elements, verify focus visible |
| Cross-browser | Playwright runs on Chromium, Firefox, WebKit |
| Data integrity | Complete a cell, kill the browser, reload — completion persists |
| Auth isolation | Log in as User A, attempt to access User B's data via URL manipulation — must fail |

Results included in PR description with screenshots.

### Level 3: Phase Gate Verification (milestone completion)

At the end of each milestone's final task, verify the milestone as a whole:

**V1 Phase Gate:**
- Fresh install test: clone repo, `npm install`, configure DB, `npm run verify` — everything passes
- Complete user journey: register → verify email → create grid → add rows → complete cells → view freshness → dashboard
- Security: attempt IDOR (direct object reference) attacks on all endpoints
- Performance: Lighthouse score ≥90 on performance, accessibility, best practices
- Mobile: complete full journey on 320px viewport

**V2 Phase Gate:**
- All V1 gates, plus:
- Create 50 grids, verify list performance (<500ms load)
- Analytics render with 90 days of sample data
- Practice feed determinism: same data produces same suggestions on 10 repeated loads
- Library: clone template, verify independence from source

**V3 Phase Gate:**
- All previous gates, plus:
- Grant enforcement: set user to Free tier, verify all Pro features are blocked at API level (not just UI)
- Achievement triggers: automated test that triggers every achievement condition
- XP math: verify level calculation matches quadratic formula for edge cases (level boundaries)
- Streak timezone test: simulate practice at 11:55 PM and 12:05 AM in user's timezone

**V4 Phase Gate:**
- All previous gates, plus:
- Stripe lifecycle: subscribe → use → upgrade → use → downgrade → wait for period end → verify grant change → cancel → verify access until period end → verify revert to Free
- Webhook replay: send each webhook type twice, verify idempotent handling
- Backup/restore: take backup, add data, restore backup, verify data matches backup state
- SSL: verify HTTPS enforced, HTTP redirected, HSTS header present
- Penetration test: OWASP top 10 checklist against production deployment

**V5 Phase Gate:**
- All previous gates, plus:
- Ensemble isolation: User A in Ensemble 1 cannot see Ensemble 2 data
- Role enforcement: Section Leader sees only their section's data
- Feed visibility: opted-out musician's activity does not appear in feed
- Invite code security: brute-force 1000 random codes, verify none match valid codes

**V6 Phase Gate:**
- All previous gates, plus:
- Assignment independence: edit assigned grid, verify source template unchanged
- Export integrity: CSV opens correctly in Excel and Google Sheets
- PDF export: renders correctly with Unicode characters, long names, empty data
- Challenge manipulation: attempt to backdate practice entries during active challenge
