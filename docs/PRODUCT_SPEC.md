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
- Social features (feed, challenges, mentorship)
- Practice goal setting
- Full education literature library access
- Smart practice feed (suggestions engine)

### Team ($X/mo per seat, or $X/mo flat)
- Everything in Pro
- Ensemble creation and management
- Assignment system with due dates
- Director analytics dashboard with custom reports
- Export capabilities
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
- Zero JavaScript console errors in normal operation. Console warnings must be reviewed and either resolved or explicitly documented as acceptable.
- No unhandled promise rejections.
- Every UI state change must provide visual feedback within 200ms (loading indicators for longer operations).
- Error states must show user-friendly messages — never stack traces, raw error codes, or technical jargon.
- All interactive elements must be keyboard-accessible.
- Every new UI feature must have an associated screenshot in the test suite validating its appearance.

### Performance
- No API endpoint may take longer than 500ms under normal load (single user, <10 grids).
- No frontend render may block the main thread for more than 100ms.
- Database queries must not use N+1 patterns.

---

## Use Cases by Phase

---

## V1: Foundation — User Registration, Infra, Core Practice Grid

### Goal
Solid foundation: real user accounts, modernized infrastructure, and a polished single-practice-grid experience.

### Use Cases

**UC-1.1: User Registration**
- Actor: Musician
- User signs up with email + password
- Email verification required before account activation
- User can set display name and instrument(s)
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
- Actor: Musician
- User logs in with email + password
- Session persists across browser restarts (remember me)
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
- Actor: Musician
- User creates a named practice grid with optional notes
- Grid is owned by the creating user
- Acceptance Criteria:
  - Grid requires a name (1-200 chars)
  - Notes are optional (max 2000 chars)
  - Grid is immediately visible in user's grid list
  - Grid stores created_at timestamp
  - Only the owning user can see/edit the grid
- Rejection Criteria:
  - Grid created without a user_id association
  - Grid visible to any user other than the owner
  - Grid created with empty or whitespace-only name
  - HTML/script tags in name or notes rendered unescaped

**UC-1.4: Add Practice Row to Grid**
- Actor: Musician
- User adds a row specifying piece name, measure range, target tempo (BPM), and number of steps
- System auto-generates practice cells from 40% to 100% of target tempo
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

**UC-1.5: Musician Dashboard**
- Actor: Musician
- After login, the musician lands on a 4-quadrant dashboard that provides at-a-glance status and quick access to all primary actions
- **Core UX principle:** This is the first thing non-technical, skeptical users see. It must be immediately useful, uncluttered, and self-explanatory. No jargon, no empty states without guidance.
- Acceptance Criteria:
  - **Upper-left: Intro & Alerts**
    - Personalized greeting ("Welcome back, [name]")
    - Actionable alerts, prioritized:
      - Resume prompts ("Resume [grid name] — 3 stale cells need attention")
      - Task counts ("You have 5 rows approaching decay")
      - Social notifications ("New comments on your achievements!", "Director posted an assignment") (V5+)
    - Alerts are clickable — each navigates directly to the relevant context
    - Empty state (new user): onboarding prompt ("Create your first practice grid →")
  - **Upper-right: My Grids**
    - List of user's active practice grids with completion % and freshness summary
    - Each grid is clickable — navigates directly into the grid view
    - "New Grid" button prominently visible
    - Grid cards show: name, completion %, last practiced date, freshness indicator (how many cells are stale/decayed)
    - Sort: last modified (default), or alphabetical
    - V1: single grid displayed; V2+: scrollable list with archive toggle
  - **Lower-left: Statistics**
    - V1: basic stats — current streak, total cells completed, grid completion %
    - V2+: expanded with practice time trends, charts, goal progress
    - Always shows something meaningful even for brand-new users ("Complete your first cell to start tracking!")
  - **Lower-right: Achievements & Practice Focus**
    - V1-V2: practice focus suggestions (rows with highest priority + most decay urgency)
    - V3+: achievement showcase with recent unlocks and next-closest achievements
    - Practice focus shows top 3-5 suggested rows to work on, each clickable to jump into that grid/row
    - Empty state: "Start practicing to see personalized suggestions here"
  - **Layout:**
    - Responsive: 4-quadrant on desktop (2x2 grid), stacks vertically on mobile (alerts → grids → stats → achievements)
    - Each quadrant has a clear header and bounded content area
    - No quadrant should require scrolling on initial load (content truncated with "See all →" links)
- Rejection Criteria:
  - Dashboard shows data belonging to another user
  - Alerts link to a grid/row that doesn't exist or belongs to another user
  - Dashboard renders blank or broken for a brand-new user with no data
  - Layout breaks or overlaps on any viewport between 320px and 2560px
  - Any quadrant takes >500ms to load

**UC-1.6: Complete Practice Cell**
- Actor: Musician
- User marks a practice cell as complete
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

**UC-1.6: Uncomplete Practice Cell**
- Actor: Musician
- User removes a completion from a previously completed cell
- Acceptance Criteria:
  - Right-click or long-press on a completed cell removes its PracticeCellCompletion record
  - Cell immediately transitions back to incomplete visual state
  - Grid completion percentage recalculates
  - If the cell had a freshness interval > 1 day (from prior spaced repetition), the interval resets to 1
- Rejection Criteria:
  - Uncomplete leaves orphaned completion records in the database
  - User can uncomplete a cell on a grid they don't own
  - Grid completion percentage does not update after uncomplete

**UC-1.7: Freshness Decay (Spaced Repetition)**
- Actor: System
- Completed cells are not permanently "done" — they decay over time, requiring maintenance practice
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

**UC-1.8: Cascading Fade Order**
- Actor: System
- Within a row, decay begins at the highest completed tempo and works downward
- This models real musicianship: top-end speed is hardest to maintain, foundational tempos persist longer
- Acceptance Criteria:
  - If cells at 40%, 50%, 60% are all completed, 60% begins fading first
  - 50% only begins its fade timer once 60% has fully decayed
  - 40% only begins its fade timer once 50% has fully decayed
  - Visual effect: green erodes from the right edge of a row inward — the grid "drains" over time
  - A cell that is "waiting" (lower tempo, shielded by a higher cell that hasn't decayed yet) displays as Fresh regardless of time elapsed
- Rejection Criteria:
  - Lower-tempo cells begin fading while higher-tempo cells in the same row are still fresh/aging
  - Cascading order breaks when cells are completed out of sequence (e.g., 40% and 60% completed but not 50%)
  - Fade calculations produce different results on page refresh vs initial render

**UC-1.9: Configure Fade Per Grid**
- Actor: Musician
- User can toggle freshness decay on or off for each practice grid
- Acceptance Criteria:
  - Toggle control on the grid settings/header
  - **Fade ON (default):** cells decay per UC-1.7 and UC-1.8 rules
  - **Fade OFF:** completions are permanent — classic checkbox behavior, solid green stays green forever
  - Default for new grids: fade ON (configurable in user preferences)
  - Toggling fade off does NOT delete freshness data — toggling back on restores the decay view with current state
  - Grid completion percentage calculation adjusts: fade ON = only fresh+aging count; fade OFF = all completions count
- Rejection Criteria:
  - Toggling fade off deletes or corrupts freshness interval data
  - Grid completion percentage doesn't recalculate when fade is toggled
  - Fade setting changes on one device don't sync to another device/session

**UC-1.10: Set Row Priority**
- Actor: Musician
- User assigns a priority level to each practice row indicating its importance
- Acceptance Criteria:
  - Priority levels: Critical / High / Medium / Low (default: Medium)
  - Priority displayed visually on the row (color accent or icon)
  - Priority affects practice feed ordering (V2)
  - Priority persists and is editable at any time
- Rejection Criteria:
  - Priority value falls outside the defined enum (Critical/High/Medium/Low)
  - Priority change not persisted after page refresh

**UC-1.11: View Practice Grid**
- Actor: Musician
- User views their practice grid with all rows, cells, completion state, and freshness
- Grid shows overall completion percentage (accounting for decay when fade is enabled)
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

**UC-1.12: Delete Practice Grid**
- Actor: Musician
- User can delete a grid they own
- Acceptance Criteria:
  - Confirmation dialog before deletion
  - Cascading delete removes all rows, cells, and completions
  - Grid disappears from list immediately
  - Deletion is permanent (no soft delete in V1)
- Rejection Criteria:
  - Orphaned rows, cells, or completions remain in database after grid deletion
  - User can delete a grid they don't own by manipulating the request
  - Grid reappears after deletion (stale cache)
  - Deletion proceeds without user confirmation

**UC-1.13: Edit Practice Row**
- Actor: Musician
- User can edit measure range, target tempo, and step count on existing rows
- Acceptance Criteria:
  - Changing step count regenerates cells (existing completions are lost — user warned with confirmation dialog)
  - Changing target tempo updates cell display values without losing completions
  - Changing measures updates display only
- Rejection Criteria:
  - Step count change silently destroys completions without user confirmation
  - Cell regeneration produces different tempo percentages than initial generation for the same step count
  - Edit allows setting target tempo to zero or negative
  - Edit applies to a row on a grid the user doesn't own

**UC-1.14: Edit Row Priority**
- Actor: Musician
- User can change the priority level of an existing row
- Acceptance Criteria:
  - Priority change takes effect immediately in display
  - Updates future practice feed weighting (V2)
  - No impact on existing completion data
- Rejection Criteria:
  - Priority change affects completion data or freshness intervals

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

**UC-2.2: Practice Time Tracking**
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
- Actor: System
- System maps subscription tiers to specific feature grants and usage limits
- Acceptance Criteria:
  - Grant types and their tier values:
    - `max_active_grids`: Free=1, Pro=unlimited, Team=unlimited
    - `analytics_access`: Free=basic (streak only), Pro=full, Team=full
    - `achievements_access`: Free=limited set, Pro=full, Team=full
    - `social_access`: Free=none, Pro=full, Team=full
    - `ensemble_access`: Free=none, Pro=none, Team=full
    - `assignment_access`: Free=none, Pro=none, Team=full
    - `export_access`: Free=none, Pro=none, Team=full
    - `library_access`: Free=subset (curated free-tier templates), Pro=full, Team=full
  - Tier-to-grant mapping is defined in configuration (not hardcoded per-user)
  - When a user's subscription tier changes, their grants update immediately
- Rejection Criteria:
  - A tier change leaves grants in an inconsistent state (partially updated)
  - Grant values are hardcoded per-user instead of derived from tier configuration
  - Adding a new grant type requires code changes to individual user records

**UC-3.5: Grant Enforcement at API Level**
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
- Actor: Musician
- User downgrades from a higher tier to a lower tier
- Acceptance Criteria:
  - Downgrade takes effect at end of current billing period (user keeps current tier until then)
  - User warned about data implications before confirming:
    - Extra grids beyond new tier limit become read-only (not deleted)
    - Access to gated features (analytics, social, library) will be restricted
  - Confirmation shows exactly what will change and when
- Rejection Criteria:
  - Downgrade takes effect immediately (must wait until end of billing period)
  - User data deleted on downgrade (grids become read-only, never deleted)
  - Downgrade proceeds without user seeing the impact summary

**UC-4.5: Cancel Subscription**
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
- Actor: Director
- Director creates a practice assignment for the ensemble or specific sections
- Acceptance Criteria:
  - Assignment contains: practice grid template, due date, target completion %, assigned to (ensemble/section/individuals)
  - Grid template is cloned to each assigned musician's account
  - Assignment appears in musician's dashboard with due date
  - Director can set assignment as required or optional
- Rejection Criteria:
  - Cloned grid maintains a live link to the template (must be independent copy)
  - Assignment visible to musicians outside the assigned scope (wrong section, wrong ensemble)
  - Assignment created with a past due date accepted without warning

**UC-6.2: Assignment Progress Tracking**
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

## Long-Term Vision: Intelligent Practice Partner

The following features represent the evolution of Tessitura from a practice tracker into an intelligent practice companion. Each phase builds on the previous, creating a progressively deeper understanding of the musician's playing and the music they're working on.

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

### Phase A: Built-In Practice Tools
*All features in this phase use signal processing or audio synthesis — no AI, no credits.*

### Use Cases

**UC-A.1: Activate Metronome**
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

### Phase B: Score Analysis & Auto-Grid Generation
*Mixed approach: OMR requires AI (credits), analysis uses heuristics first.*

### Use Cases

**UC-B.1: Upload Sheet Music**
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

### Phase C: Audio-Linked Practice Verification
*Primarily signal processing + DTW alignment. JI is pure math.*

### Use Cases

**UC-C.1: Import External Tuner Data**
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

### Phase D: Ear Training & Tone Analysis
*Ear training is synthesis + comparison (no AI). Tone analysis requires ML (credits).*

### Use Cases

**UC-D.1: Pitch Identification Drill**
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

### Phase Dependencies (Vision Features)

```
Phase A (Tools) ─── standalone, no dependencies
     │
Phase B (Score) ─── requires OMR/ML pipeline
     │
Phase C (Verify) ── requires Phase B (note data) + Phase A (tuner/recording)
     │
Phase D (Ear/Tone) ─ Ear Training: standalone
                     Tone Analysis: requires ML model training, large dataset
                     JI Evaluation: requires Phase B + Phase C
```

### Vision Limits & Principles
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

### 5. State Machines Everywhere
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

### 12. ACID & 12-Factor
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

### 13. Extensible
- This list of principles will grow as the project evolves.
- New principles require discussion and mutual agreement.
- Principles are never silently violated — if a principle can't be followed, it's discussed and either the approach changes or the principle is updated.

---

## Development Strategy

### Branching: Trunk-Based
- All work on `main` branch
- Small, atomic commits (one logical change per commit)
- Commits should be buildable — no broken intermediate states
- Review checkpoints: ad hoc, at Willow's request

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

### Review Process
- Trunk-based: commits go to main
- Willow requests review checkpoints ad hoc
- Code review focuses on: architecture alignment, security, UX quality
- No PR process (trunk-based), but tagged releases for each version milestone

### Release Strategy
- Semantic versioning: V1.0, V2.0, etc. for major phases
- Minor versions (V1.1, V1.2) for bug fixes and polish within a phase
- Tagged releases in git
- DigitalOcean deployment from tagged releases

---

## Data Model (V1-V6 Complete)

```
User
├── id, email, password_hash, display_name
├── instruments[] (text array)
├── email_verified (boolean)
├── created_at, updated_at
├── stripe_customer_id (nullable, V4)
├── subscription_tier (enum: free/pro/team)
├── xp (integer, V3)
├── level (integer, V3)
├── current_streak (integer, V2)
├── longest_streak (integer, V2)
└── timezone (string)

PracticeGrid
├── id, user_id (FK→User), name, notes
├── grid_type (enum: repertoire, technique) (V2)
├── fade_enabled (boolean, default: true)
├── created_at, updated_at
├── archived (boolean, V2)
├── source_template_id (FK→LibraryTemplate, nullable, V2)
└── assignment_id (FK→Assignment, nullable, V6)

PracticeRow
├── id, practice_grid_id (FK→PracticeGrid)
├── song_title, composer, part (nullable)
├── study_reference (nullable, for technique grids — e.g., "Clarke #3 in Eb")
├── start_measure, end_measure
├── target_tempo (integer BPM)
├── steps (integer)
├── priority (enum: critical, high, medium, low — default: medium)
└── created_at, updated_at

PracticeCell
├── id, practice_row_id (FK→PracticeRow)
├── target_tempo_percentage (float, 0.4-1.0)
├── freshness_interval_days (integer, default: 1 — current spaced repetition interval)
└── created_at, updated_at

PracticeCellCompletion
├── id, practice_cell_id (FK→PracticeCell)
├── completion_date (date)
└── created_at

LibraryTemplate (V2)
├── id, title, author (e.g., "Clarke", "Arban")
├── collection (e.g., "Technical Studies for the Cornet")
├── description
├── instrument_tags (text array, e.g., ["trumpet", "cornet", "brass"])
├── tier_required (enum: free, pro — which templates are available on free tier)
├── grid_data (JSON — serialized grid structure: rows, tempos, steps)
├── community_user_count (integer, cached)
├── community_avg_completion (float, cached)
└── created_at, updated_at

PracticeSession (V2)
├── id, user_id (FK→User)
├── date, duration_minutes, notes
└── created_at

PracticeGoal (V2)
├── id, user_id (FK→User)
├── goal_type (enum: daily_minutes, weekly_minutes, weekly_sessions, monthly_grids)
├── target_value (integer)
├── active (boolean)
└── created_at, updated_at

Achievement (V3)
├── id, key (unique string), name, description
├── category (enum: streak, completion, time, exploration)
├── icon (string)
├── xp_reward (integer)
└── criteria (JSON — machine-readable unlock condition)

UserAchievement (V3)
├── id, user_id (FK→User), achievement_id (FK→Achievement)
└── unlocked_at (timestamp)

Grant (V3)
├── id, user_id (FK→User)
├── grant_type (string, e.g., "max_active_grids")
├── grant_value (string/integer)
├── source (enum: subscription, admin_override)
└── created_at, updated_at

Ensemble (V5)
├── id, name, description
├── created_by (FK→User)
├── invite_code (unique string)
├── visibility (enum: public, private)
├── social_feed_mode (enum: full, achievements_only, off)
└── created_at, updated_at

EnsembleMembership (V5)
├── id, ensemble_id (FK→Ensemble), user_id (FK→User)
├── role (enum: admin, section_leader, member)
├── section (nullable string, e.g., "Cornets")
├── joined_at
└── status (enum: active, pending, removed)

FeedItem (V5)
├── id, ensemble_id (FK→Ensemble), user_id (FK→User)
├── event_type (enum: grid_complete, achievement, streak_milestone, challenge_win)
├── event_data (JSON)
├── created_at
└── reactions (JSON array)

Assignment (V6)
├── id, ensemble_id (FK→Ensemble)
├── created_by (FK→User)
├── grid_template_id (FK→PracticeGrid — the source grid to clone)
├── title, description
├── due_date
├── target_completion_percentage (integer, 0-100)
├── assigned_to (enum: ensemble, section, individuals)
├── assigned_sections (text array, nullable)
├── assigned_user_ids (integer array, nullable)
├── required (boolean)
└── created_at, updated_at

Challenge (V6)
├── id, ensemble_id (FK→Ensemble)
├── created_by (FK→User)
├── challenge_type (enum: most_minutes, first_complete, longest_streak)
├── start_date, end_date
├── title, description
└── created_at

Feedback (V6)
├── id, grid_id (FK→PracticeGrid)
├── author_id (FK→User)
├── content (text)
├── created_at
└── parent_id (FK→Feedback, nullable — for threading)
```

---

## Verification Strategy

### Per-Phase Verification

**V1:** `npm run test && npm run build && npm run e2e` — all pass. Manual: register, create grid, add rows, complete cells, view progress, logout/login persistence.

**V2:** Above + analytics render correctly with sample data. Manual: create multiple grids, log practice time, verify charts render, set and track goals.

**V3:** Above + grant enforcement verified (downgrade user, confirm feature gating). Manual: trigger each achievement, verify XP/level calculations, test upgrade prompts.

**V4:** Above + Stripe test mode end-to-end (subscribe, upgrade, downgrade, cancel, webhook processing). Manual: full billing lifecycle in Stripe test mode.

**V5:** Above + ensemble creation, member management, feed items. Manual: create ensemble, invite member, verify director dashboard, test feed visibility settings.

**V6:** Above + assignment creation and progress tracking. Manual: create assignment, verify clone to members, track completion, export report.
