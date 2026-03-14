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

**UC-1.2: User Login / Logout**
- Actor: Musician
- User logs in with email + password
- Session persists across browser restarts (remember me)
- Acceptance Criteria:
  - Login returns JWT or session token
  - Failed login after 5 attempts locks account for 15 minutes
  - "Forgot password" flow sends reset email
  - Logout invalidates session

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

**UC-1.5: Complete / Uncomplete Practice Cell**
- Actor: Musician
- User marks a cell as complete (records completion date)
- User can uncomplete a cell (removes completion record)
- Completions decay over time using spaced repetition — a cell is not "done forever"
- Acceptance Criteria:
  - Completion creates a PracticeCellCompletion with today's date
  - Uncomplete removes the completion record
  - Grid completion percentage updates in real-time
  - Completion state persists across sessions
  - **Freshness model (spaced repetition):**
    - Each cell tracks a freshness interval (initial: 1 day)
    - Re-practicing a cell before it goes stale doubles the interval (1→2→4→8→16→... days, capped at 30)
    - Missing the interval resets it (configurable: full reset to 1, or halve)
    - Cell visual state: Fresh (green) → Aging (yellow, >50% through interval) → Stale (red, past interval) → Decayed (grey, 2x past interval)
    - Decayed cells no longer count toward grid completion percentage
    - Freshness is calculated on read, not stored as state (derived from last completion date + interval)
  - **Cascading fade (highest tempo first):**
    - Within a row, decay begins at the highest completed tempo and works downward
    - Example: if cells at 40%, 50%, 60% are completed, 60% fades first; 50% only begins fading once 60% is fully decayed; 40% only once 50% is fully decayed
    - This models real musicianship: top-end tempo is hardest to maintain, foundational work persists longer
    - Visual effect: green fills erode from the right edge of a row inward — the grid "drains" over time
  - **Fade is configurable:**
    - User can toggle fade on/off per grid (setting on PracticeGrid)
    - When fade is off, completions are permanent (classic checkbox behavior)
    - Default: fade ON for new grids (can be changed in user preferences)
    - Toggling fade off does not delete freshness data — toggling back on restores the decay view

**UC-1.6: Set Row Priority**
- Actor: Musician
- User assigns a priority level to each practice row indicating its importance
- Acceptance Criteria:
  - Priority levels: Critical / High / Medium / Low (default: Medium)
  - Priority displayed visually on the row (color accent or icon)
  - Priority affects practice feed ordering (V2)
  - Priority persists and is editable at any time

**UC-1.7: View Practice Grid**
- Actor: Musician
- User views their practice grid with all rows, cells, completion state, and freshness
- Grid shows overall completion percentage (accounting for decay)
- **Core UX principle:** The visual grid filling with green is a primary motivator. The grid layout and color feedback must feel satisfying and rewarding. Design decisions should preserve and enhance the "wall of green" experience.
- Acceptance Criteria:
  - Each cell displays its target tempo (BPM, calculated from percentage * row target)
  - **Color states (when fade enabled):** Fresh = solid green, Aging = fading green/yellow, Stale = orange/red, Decayed = grey. Transitions should feel organic, not abrupt.
  - **Color states (when fade disabled):** Completed = solid green, Incomplete = empty. Classic satisfying checkbox behavior.
  - Grid completion percentage shown as progress bar (when fade on: only fresh+aging cells count)
  - With fade on, the grid visually "drains" from right to left within each row (highest tempos fade first), creating urgency to maintain mastery
  - Rows show priority indicator (color accent or badge)
  - Responsive layout works on mobile viewports (320px+)
  - Grid must render smoothly with large step counts (50+ cells per row)

**UC-1.8: Delete Practice Grid**
- Actor: Musician
- User can delete a grid they own
- Acceptance Criteria:
  - Confirmation dialog before deletion
  - Cascading delete removes all rows, cells, and completions
  - Grid disappears from list immediately
  - Deletion is permanent (no soft delete in V1)

**UC-1.9: Edit Practice Row**
- Actor: Musician
- User can edit measure range, target tempo, step count, and priority on existing rows
- Acceptance Criteria:
  - Changing step count regenerates cells (existing completions are lost — user warned)
  - Changing target tempo updates cell display values without losing completions
  - Changing measures updates display only
  - Changing priority updates display and future feed weighting

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

**UC-2.2: Practice Time Tracking**
- Actor: Musician
- User can log practice sessions with duration
- System tracks when cells are completed for passive time inference
- Acceptance Criteria:
  - Manual practice log: date, duration (minutes), optional notes
  - Automatic tracking: timestamp on cell completions
  - Practice time visible on grid detail view
  - Daily/weekly/monthly practice time summaries

**UC-2.3: Practice Time Trend Analytics**
- Actor: Musician
- User views charts showing practice frequency and duration over time
- Acceptance Criteria:
  - Line/bar chart: practice minutes per day (last 30 days)
  - Weekly summary: total minutes, sessions count, days practiced
  - Monthly comparison: this month vs last month
  - Streak counter: consecutive days with at least 1 practice session

**UC-2.4: Piece-Level Analytics**
- Actor: Musician
- User views per-piece progress showing which measures are mastered and tempo progress curves
- Acceptance Criteria:
  - Per-row: percentage of cells completed
  - Per-row: current max completed tempo percentage
  - Visual tempo progress curve (cells completed over time)
  - Heat map or color coding showing mastery level per row

**UC-2.5: Practice Goal Setting**
- Actor: Musician
- User sets practice goals and tracks progress against them
- Acceptance Criteria:
  - Goal types: minutes per day, minutes per week, sessions per week, grids completed per month
  - Visual progress indicator (ring/bar showing % to goal)
  - Notification when goal is achieved
  - Historical goal completion tracking

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

**UC-2.8: Education Literature Library**
- Actor: Musician, Admin
- System provides a curated library of pre-built technique grid templates from public-domain brass/music education literature
- Users can browse and clone templates to their own account
- Acceptance Criteria:
  - Library organized by author/collection:
    - Arban — Complete Conservatory Method
    - Clarke — Technical Studies for the Cornet
    - Schlossberg — Daily Drills and Technical Studies
    - Additional authors added over time by Admin
  - Each library entry is a grid template with pre-configured rows (studies, tempos, steps)
  - User clicks "Add to My Grids" → clones template as their own grid with independent progress tracking
  - Library entries show community stats: number of users practicing, average completion
  - **Free tier:** curated subset of library available (e.g., 5-10 foundational studies per author)
  - **Pro/Team tier:** full library access
  - Library content is admin-managed (CRUD for templates)
  - Templates constructed from public-domain works only

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

**UC-3.2: Streak System**
- Actor: Musician, System
- System tracks daily practice streaks
- Acceptance Criteria:
  - Streak increments when user logs any practice activity in a calendar day (user's timezone)
  - Streak resets to 0 after a day with no activity
  - Current streak and longest streak displayed on dashboard
  - Streak milestones (7, 30, 100, 365 days) trigger achievements
  - "Streak freeze" not in V3 (potential future feature)

**UC-3.3: XP & Leveling**
- Actor: Musician, System
- Musicians earn XP for practice activities and level up
- Acceptance Criteria:
  - XP sources: cell completion (10 XP), row completion (50 XP), grid completion (200 XP), daily practice (25 XP), streak milestone (varies)
  - Level thresholds: quadratic scaling (level N requires N^2 * 100 XP)
  - Level displayed on profile and in social contexts
  - Level-up triggers notification/animation

**UC-3.4: Grant System (Feature Gating)**
- Actor: System, Admin
- Grants control access to features and usage limits based on subscription tier
- Acceptance Criteria:
  - Grant types:
    - `max_active_grids`: Free=1, Pro=unlimited, Team=unlimited
    - `analytics_access`: Free=basic (streak only), Pro=full, Team=full
    - `achievements_access`: Free=limited set, Pro=full, Team=full
    - `social_access`: Free=none, Pro=full, Team=full
    - `ensemble_access`: Free=none, Pro=none, Team=full
    - `assignment_access`: Free=none, Pro=none, Team=full
    - `export_access`: Free=none, Pro=none, Team=full
    - `library_access`: Free=subset (curated free-tier templates), Pro=full, Team=full
  - Grants checked at API level (not just UI hiding)
  - Graceful degradation: hitting a limit shows upgrade prompt, not an error
  - Grant changes take effect immediately (no cache staleness)
  - Admin can override grants for individual users

**UC-3.5: Upgrade Prompts**
- Actor: Musician
- When a user hits a grant boundary, they see a contextual upgrade prompt
- Acceptance Criteria:
  - Prompt explains what feature they're trying to use
  - Shows which tier unlocks it
  - Links to upgrade flow (billing page in V4)
  - Does not block the user from using features they already have access to
  - Non-intrusive: appears inline, not as a modal/popup (except on first encounter)

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

**UC-4.2: Manage Subscription**
- Actor: Musician
- User can view current plan, upgrade, downgrade, or cancel
- Acceptance Criteria:
  - Stripe Customer Portal for self-service billing management
  - Upgrade takes effect immediately (prorated billing)
  - Downgrade takes effect at end of current billing period
  - Cancel: access continues until end of billing period, then reverts to Free grants
  - User warned about data implications of downgrade (e.g., extra grids become read-only, not deleted)

**UC-4.3: Team Subscription Management**
- Actor: Director
- Director subscribes to Team plan and manages seats
- Acceptance Criteria:
  - Director pays for N seats at Team rate
  - Can add/remove members (seat count adjusts billing)
  - All team members receive Team-tier grants
  - Removing a member reverts them to their individual tier
  - Billing visible to director only

**UC-4.4: Webhook Processing**
- Actor: System
- System processes Stripe webhooks for subscription lifecycle events
- Acceptance Criteria:
  - Handles: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted
  - Webhook signature verification
  - Idempotent processing (duplicate webhooks don't cause issues)
  - Failed webhook processing retried with backoff
  - Grant tier updated within 60 seconds of Stripe event

**UC-4.5: Production Deployment**
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

**UC-5.2: Join Ensemble**
- Actor: Musician
- Musician joins an ensemble via invite link or code
- Acceptance Criteria:
  - Invite link/code grants membership immediately (or pending approval, if director configured)
  - Musician can belong to multiple ensembles
  - Musician can leave an ensemble at any time
  - Joining is free for musicians (director's Team seat covers it)

**UC-5.3: Director Dashboard**
- Actor: Director
- Director views aggregate and individual practice data for ensemble members
- Acceptance Criteria:
  - Overview: total practice time across ensemble, active members count, average streak
  - Per-member drill-down: practice time, grid completions, streak, last active date
  - Sortable/filterable member list
  - Date range selector for all metrics
  - Highlight: members with broken streaks or low activity

**UC-5.4: Practice Activity Feed**
- Actor: Musician, Director
- Members see a social feed of practice activity within their ensemble
- Acceptance Criteria:
  - Feed shows: grid completions, achievements unlocked, streak milestones
  - Configurable by director: feed visibility can be full, achievements-only, or off
  - Musicians can react to feed items (emoji reactions)
  - Feed is chronological, paginated
  - Musicians can opt out of appearing in feed (privacy setting)

**UC-5.5: Ensemble Roles**
- Actor: Director
- Director assigns roles within the ensemble
- Acceptance Criteria:
  - Roles: Admin (full control), Section Leader (view section members), Member (basic)
  - Section Leaders can view analytics for their section only
  - Members can be organized into sections (e.g., "Cornets", "Trombones", "Percussion")
  - Role changes take effect immediately

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

**UC-6.2: Assignment Progress Tracking**
- Actor: Director
- Director views real-time progress on assignments
- Acceptance Criteria:
  - Progress view shows: each musician's completion %, last practice date, time spent
  - Aggregate: average completion %, on-track vs behind count
  - Visual indicator for musicians who haven't started
  - Sortable by name, completion %, last active

**UC-6.3: Practice Challenges**
- Actor: Musician, Director
- Musicians or directors create practice challenges within an ensemble
- Acceptance Criteria:
  - Challenge types: "Most practice minutes this week", "First to complete grid", "Longest streak"
  - Duration: start and end date
  - Leaderboard visible to all participants
  - Winner announcement in feed
  - Director can create challenges; musicians can create informal challenges (configurable)

**UC-6.4: Export Reports**
- Actor: Director
- Director exports ensemble analytics as PDF or CSV
- Acceptance Criteria:
  - Report types: attendance/practice summary, assignment progress, individual student report
  - CSV export for raw data
  - PDF export for formatted reports
  - Date range selector
  - Exportable per-student or ensemble-wide

**UC-6.5: Mentorship / Feedback**
- Actor: Musician, Director
- Musicians can share progress and receive feedback from directors or peers
- Acceptance Criteria:
  - Musicians can share a grid snapshot (read-only link) with notes
  - Directors/peers can leave text comments on shared grids
  - Notification when feedback is received
  - Feedback thread visible only to participants
  - Section Leaders can provide feedback to their section members

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

## Long-Term Vision: AI Practice Partner

The following features represent the evolution of Tessitura from a practice tracker into an intelligent practice companion. Each phase builds on the previous, creating a progressively deeper understanding of the musician's playing and the music they're working on. These are sketched at vision level — detailed specs will be written as they approach implementation.

### Phase A: Built-In Practice Tools

**Metronome**
- Built into the practice interface, tied to the active practice cell
- Auto-sets BPM to the cell's target tempo when a cell is selected
- Subdivisions, accent patterns, count-in
- Visual and audio beat (accessibility: works with headphones or silently)

**Tuner**
- Free chromatic tuner built into practice interface (extends existing Web Audio tuner)
- Real-time pitch detection with cent deviation display
- **In-tune percentage tracking:** records what % of time the player is within ±10 cents (configurable threshold)
- In-tune data recorded alongside practice session time tracking
- Historical in-tune trend per session, per piece, over time
- Transposition support: display in concert pitch or transposed pitch (Bb, Eb, F, etc.)

**Automated Recording & Playback**
- One-click recording during practice sessions
- Recordings linked to specific cells/rows/grids
- Playback with A/B looping for self-review
- Storage: compressed audio, user-managed (delete old recordings to save space)
- Reinforces good practice behavior: listen back, compare across sessions

### Phase B: Score Analysis & Auto-Grid Generation

**Sheet Music Scanning / Import**
- Upload a PDF/image of a part (individual instrument part)
- OCR/OMR (Optical Music Recognition) to extract note data: pitches, rhythms, dynamics, articulations
- Parse into structured music data: measures, beats, note sequences

**Automated Segment Identification**
- Analyze the part to identify natural segments (phrases, sections, technical passages)
- Heuristics: difficulty spikes (large intervals, fast passages, extreme range), phrase boundaries, rehearsal marks
- Compare individual part against a full score (if uploaded) to determine:
  - Song structure (intro, verse, chorus, bridge, coda, or rehearsal letters)
  - Voicing context: is this the melody? harmony? bass line? countermelody?
  - Exposed passages vs tutti sections
- Auto-suggest priority levels based on analysis (exposed solo = Critical, tutti unison = Low)

**Auto-Grid Generation**
- From analyzed score data, automatically generate a practice grid
- Each identified segment becomes a row
- Target tempos derived from tempo markings in the score
- Step count suggested based on segment difficulty
- User reviews and adjusts before accepting
- Dramatically reduces grid setup time — go from "I got new music" to "I'm practicing" in minutes

### Phase C: Audio-Linked Practice Verification

**Tonal Energy / External Tuner Integration**
- API or data import from Tonal Energy Tuner (or similar apps)
- Link tuning data — actual played frequencies — to the active practice session
- Map played tones to the written music (from Phase B score data)

**Automated Practice Verification**
- With note data (from score) + audio data (from tuner/mic):
  - Detect which notes were played and their duration
  - Map played notes to written notes in the current segment
  - Identify: correct notes, wrong notes, missed notes, timing accuracy
  - Score the attempt: pitch accuracy %, rhythm accuracy %, note coverage %
- Practice cell completion could be auto-suggested: "You played this segment at 90% accuracy at 80 BPM — mark as complete?"
- Verification data stored per-attempt for progress tracking over time

**Just Intonation Support**
- With score analysis (Phase B), determine harmonic context of each note:
  - Root, third, fifth, seventh of the chord
  - Passing tone, suspension, etc.
- Apply just intonation adjustments: "This is the major third — tune 14 cents flat from equal temperament"
- Tuner overlay shows JI target pitch alongside equal temperament
- Evaluate tuning accuracy against JI targets, not just ET
- Requires: chord analysis from score, or director-annotated harmonic analysis

### Phase D: Ear Training & Tone Analysis

**Ear Training Module**
- Play a random tone, user identifies the pitch
- Modes:
  - Concert pitch identification (C, C#, D, ...)
  - Transposed pitch identification (for Bb/Eb/F instruments)
  - Interval identification (play two notes, identify the interval)
  - Chord quality identification (major, minor, diminished, augmented)
- Difficulty scaling: start with octave range, expand
- Track accuracy over time, feed into achievement system
- Spaced repetition on weak intervals/pitches

**Tone Quality Analysis**
- Record the player's tone on sustained notes
- Analyze spectral characteristics: fundamental strength, overtone series, noise floor
- Compare against:
  - A reference model built from recordings of accomplished players
  - The user's own "best tone" recordings (self-identified benchmarks)
- Provide feedback: "Your tone on this note has stronger upper partials than your reference — try more air support"
- Track tone quality trends over time
- Requires significant ML/signal processing work — likely the furthest-out feature

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
- No LLM integration in V1-V6 — these features are explicitly post-foundation
- Each vision phase should be viable as a standalone premium feature
- Privacy: audio recordings and tuning data are user-owned, not shared without consent
- Accuracy before automation: never auto-complete a cell without user confirmation
- Instrument-agnostic where possible, but brass-optimized initially (JI, tone analysis)

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
- **Unit tests** for all business logic (tempo calculations, grant checks, XP calculations)
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows (registration, grid CRUD, cell completion)
- Tests must pass before commit
- Target: 80%+ coverage on business logic, critical path e2e coverage

### Definition of Done (per feature)
1. Code implements acceptance criteria
2. Unit/integration tests pass
3. Manual testing on desktop + mobile viewport
4. No TypeScript errors
5. No accessibility regressions (semantic HTML, keyboard navigation)

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
