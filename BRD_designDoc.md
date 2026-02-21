# PS21 BRD Generation Agent — Complete UI Component Design Document

---

## Design Philosophy

Three principles govern every component decision. Informed agency — the user always knows what the system did, why it did it, and what source data produced it. State transparency — every component reflects live AKS state, never cached or stale data. Progressive disclosure — simple surfaces by default, detail available on demand without losing context.

---

## Design System Foundations

**Colour tokens:**
```
--signal-requirement:  #3B82F6  (blue)
--signal-decision:     #8B5CF6  (purple)
--signal-feedback:     #F59E0B  (amber)
--signal-timeline:     #10B981  (green)
--signal-noise:        #6B7280  (grey)

--severity-high:       #EF4444  (red)
--severity-medium:     #F59E0B  (amber)
--severity-low:        #3B82F6  (blue)

--path-heuristic:      #10B981  (green badge)
--path-domain-gate:    #6B7280  (grey badge)
--path-llm:            #8B5CF6  (purple badge)

--state-complete:      #10B981
--state-running:       #F59E0B (pulsing)
--state-pending:       #D1D5DB
--state-error:         #EF4444
```

**Typography:** Inter for UI, JetBrains Mono for chunk text and source references, all code and IDs.

**Spacing unit:** 4px base. All spacing is multiples of 4.

**Border radius:** 8px for cards, 4px for badges, 12px for modals.

---

## Global Shell Components

### GS-01 — Navigation Sidebar

Always visible. Fixed left. Width 240px collapsed to 64px on small screens.

**Contents top to bottom:**

Logo and project name at top. Session selector dropdown showing current session name and creation date — clicking opens a session management modal. Navigation items with icon and label: Dashboard, Sources, Signals, BRD Draft, Export, Settings. Each item shows a status dot — green if that pipeline stage is complete, amber if in progress, grey if not started, red if errored.

At the bottom: current pipeline stage indicator showing which stage is actively running with a pulsing animation. API connection status indicator — green dot for Groq connected, red for disconnected.

**Behaviour:** Clicking a nav item with a red dot shows an inline tooltip explaining why that stage has not started yet rather than navigating to a broken state.

---

### GS-02 — Session Status Bar

Sits at the very top of every screen. Full width. Height 48px.

Shows left to right: current session ID in monospace, pipeline stage completion as a horizontal mini-stepper with 6 dots, total signals count, and a global notification bell showing unacknowledged validation flags count with a red badge.

---

### GS-03 — Pipeline Stage Stepper

Used both in the status bar (compact) and on the Dashboard (expanded). Six stages: Ingestion, Noise Filtering, AKS Storage, BRD Generation, Validation, Export.

Each stage node shows its icon, its label, and its status. Completed stages are solid green with a checkmark. The active stage pulses amber. Future stages are grey. Error stages are red with an X.

Clicking any completed stage navigates directly to that stage's primary screen.

---

### GS-04 — Toast Notification System

Slides in from bottom-right. Maximum 3 toasts visible simultaneously. Auto-dismisses after 5 seconds.

Four variants: success (green left border), warning (amber), error (red), info (blue). Every destructive action toast includes an Undo button that is active for 8 seconds. Toasts stack vertically and older ones compress to make room for new ones.

---

### GS-05 — Drawer Component

Slide-over panel from the right. Width 480px on desktop. Does not block the primary content — main content dims to 60% opacity but remains visible and scrollable.

Used for: raw chunk inspection, version history, source detail, attribution detail. Always has a close button and a keyboard shortcut (Escape). Title, subtitle, and action buttons in a fixed header. Scrollable content body. Fixed footer with primary and secondary actions.

---

## Screen 1 — Session Home (Dashboard)

### S1-01 — Pipeline Status Card

Full width at top. Shows the expanded Pipeline Stage Stepper (GS-03) with additional detail per stage: completion timestamp, item count processed, and a View Details link.

---

### S1-02 — Signal Donut Chart

Centre of dashboard. Shows breakdown of classified chunks by label type. Five segments coloured by signal colour tokens. Centre of donut shows total chunk count.

Below the chart: a legend table showing label name, count, percentage, and a coloured dot. Clicking any segment filters the Signal Review Panel to that label type.

---

### S1-03 — Contextual Action Centre

Right side of dashboard. Shows the most important next action based on current pipeline state. Examples:

If noise filtering is complete but BRD generation has not run: shows "Generate BRD Draft" as primary button with a count of available signals.

If flagged items exist: shows "Review N Flagged Signals" with amber styling.

If validation flags are unacknowledged: shows "Acknowledge N Issues" with red styling.

If everything is complete: shows "Export BRD" as primary action.

Never shows more than two action buttons. Always shows the highest priority action first.

---

### S1-04 — Session Stats Row

Four stat cards in a row below the chart. Total Sources Connected, Total Chunks Processed, Signals Extracted, Active Validation Flags. Each card shows the number large, a label small, and a trend indicator if a previous run exists for comparison.

---

## Screen 2 — Source Management

### S2-01 — Source Connector Cards

Three cards in a row: Slack, Gmail (out of scope — shown as greyed out with "Coming Soon" badge), File Upload.

**Slack connector card:** Shows connection status badge. If not connected, shows Connect with Slack button that triggers OAuth2 flow. If connected, shows workspace name, connected timestamp, and a Disconnect link. Below connection status: channel selector as a searchable multi-select checklist showing channel name, member count, and message count. A Sync Selected Channels button at the bottom. Rate limit indicator showing current token usage as a thin progress bar — green under 70%, amber 70-90%, red above 90%.

**File upload card:** Drag and drop zone with dotted border. Accepts CSV, PDF, TXT. Shows accepted file types and maximum file size. Below the drop zone: a list of uploaded files with name, size, type badge, and upload status. Each file has a Remove button. A Process Files button triggers ingestion for all uploaded files.

---

### S2-02 — Active Sources List

Below the connector cards. A table showing all sources that have been ingested with columns: Source Type (icon + label), Source Name, Status, Chunks Extracted, Duplicates Removed, Last Synced, and Actions.

Actions column: View Chunks (opens drawer), Re-sync, Remove.

---

### S2-03 — Raw Chunks Drawer

Opened from the View Chunks action on any source. Uses GS-05 Drawer component.

Header shows source name and total chunk count. A search bar filters chunks by text content. Each chunk shows: chunk ID in monospace, speaker attribution, source reference, word count, and the first 200 characters of cleaned text. A View Full Text toggle expands to show the complete chunk. Read-only — no actions available here. This is a transparency surface only.

---

## Screen 3 — Signal Review Panel

### S3-01 — Three Column Layout

Fixed columns. Left filter sidebar 240px. Centre signal feed flexible width. Right detail panel 360px (hidden until a card is selected, then slides in compressing the centre column).

---

### S3-02 — Filter Sidebar

**Label filter:** Checkbox group with colour-coded labels. Shows count per label in brackets. All checked by default.

**Confidence filter:** Three radio options — All, Auto-Accepted Only, Flagged for Review Only.

**Classification path filter:** Three checkboxes — Heuristic, Domain Gate, LLM.

**Speaker filter:** Searchable dropdown populated from unique speaker values in AKS. Multi-select.

**Source filter:** Checkboxes for each connected source.

**Clear All Filters** link at the bottom. Filter state persists across page navigations within the session.

---

### S3-03 — Signal Feed Header

Above the card list. Shows: count of visible items given current filters, a sort dropdown (by confidence descending, by label, by created time), and a tab strip with two tabs — Active Signals and Suppressed Items.

---

### S3-04 — Signal Card

The primary repeating unit in the centre column.

**Card anatomy top to bottom:**

Header row: label badge (coloured by signal type), classification path badge (Heuristic/Domain Gate/LLM in respective colours), confidence indicator as a small horizontal bar, speaker name in grey.

Body: the cleaned text of the chunk, truncated to 3 lines with a Read More toggle.

Footer row: source reference in monospace, created timestamp, and action buttons.

**Action buttons vary by card state:**

For auto-accepted active signals: Override Label (dropdown), View Attribution.

For flagged signals: Accept Classification (green), Reclassify (dropdown), View Detail.

For suppressed items: Restore to Signals (blue), View Detail.

**Interaction:** Clicking anywhere on the card body (not a button) opens the detail panel on the right.

---

### S3-05 — Detail Panel

Opens on the right when a signal card is selected. Fixed position, does not scroll with the card list.

**Contents:**

Section header with label badge and classification path badge. Full chunk text in monospace with no truncation. Reasoning section showing the LLM's exact reasoning string. Source attribution block showing source type icon, source reference, speaker, and timestamp. Confidence score shown as a large number with colour coding. Downgrade reasons if any — listed as small badges showing embedding outlier, weak statement, or vague reasoning. Action buttons repeated from the card footer.

**If the item is locked (human edited):** Shows a Human Edited badge and the date of edit. Lock icon appears next to the label. Action buttons are disabled except View History.

---

### S3-06 — Suppressed Items Tab

Switches the centre column to show noise-classified chunks. Same card design but with a grey left border instead of a coloured one. Each card shows the suppression reason code prominently as a badge: Structural Discard, Domain Gate, Semantic Noise, Low Confidence, Duplicate, Parse Error.

A filter at the top of this tab allows filtering by suppression reason code.

The Restore button on each card triggers a confirmation toast (GS-04) with an Undo option. Restoring moves the item to the Active Signals tab immediately with a success animation.

---

### S3-07 — Calibration Stats Bar

A thin bar above the signal feed. Shows: N chunks classified, N% auto-accepted, N% flagged, N% suppressed, and mean LLM confidence score. If the auto-accept percentage exceeds 90%, a yellow warning icon appears with tooltip text explaining the calibration concern.

---

## Screen 4 — BRD Draft View

### S4-01 — Section Navigation Sidebar

Left sidebar 200px. Lists all 7 BRD sections with status indicators.

Each section item shows: section name, version number (v1, v2 etc), status badge (Generated, Insufficient Data, Locked, Flagged, Human Edited), and source count (how many AKS chunks contributed).

Clicking a section item smooth-scrolls the main content area to that section. The currently visible section is highlighted in the sidebar as the user scrolls.

A Regenerate All button at the bottom triggers all agents to run again with a version increment.

---

### S4-02 — Validation Flags Banner

Appears at the top of the main content area if any validation flags exist. Shows flag count and severity breakdown as coloured dots. Fully collapsed by default. Clicking expands to show the full flags list with section name, flag type, severity, and description for each flag. Each flag has an Acknowledge button and a View Section link. The banner turns green and collapses when all high-severity flags are acknowledged.

---

### S4-03 — BRD Section Component

The repeating unit in the main content area. Each section is a distinct card.

**Section header:** Section number and title. Version badge. Status badge. Generated timestamp. Regenerate this section button. Edit button.

**Section body states:**

Generated state — formatted markdown content rendered as HTML. Requirement items are numbered. Attribution footnote references appear inline as superscript numbers.

Insufficient Data state — striped grey background. A prominent banner with the specific placeholder text explaining what signals were missing. A "What's needed" tooltip listing the signal types the agent looks for. An Add Sources shortcut link.

Human Edited state — normal content display with a yellow Human Edited badge in the header and a lock icon. Edit button is replaced by Unlock and Edit button that requires confirmation.

Flagged state — a red or amber alert banner appears at the top of the section body showing the flag type, severity, and description. An Acknowledge button appears in the banner. Content still displays below the banner.

**Section footer:** Source count badge showing "Generated from N signals". View Attribution link that opens the attribution drawer. View Version History link.

---

### S4-04 — Inline Section Editor

Activated by the Edit button on any unlocked section. Replaces the rendered content with a textarea pre-populated with the current markdown content. Monospace font. A character count indicator. Save Changes button and Cancel button in a sticky footer. Saving triggers the Human Edited lock and shows a success toast.

---

### S4-05 — Attribution Drawer

Opens from the View Attribution link on any section. Uses GS-05 Drawer component.

Header shows section name and total source count. Body is a list of contributing chunks. Each chunk entry shows: the specific text excerpt used (highlighted), speaker name, source type icon, source reference in monospace, signal label badge, and confidence score.

Chunks are sorted by relevance — the chunks most central to the generated content appear first. A View in Signal Review link on each chunk navigates to that specific card in Screen 3 with the filter pre-set.

---

### S4-06 — Version History Drawer

Opens from the View Version History link. Uses GS-05 Drawer component.

Shows a linear timeline of all versions for the selected section. Each version entry shows: version number, generated timestamp, source count at that version, and a content preview (first 100 characters). A View button opens the full content in a read-only modal. A Restore this Version button appears on all versions except the current one — clicking triggers a confirmation and creates a new version with the restored content.

---

## Screen 5 — Export

### S5-01 — Pre-Export Checklist

Full width card at the top. Shows a list of checklist items each with a green checkmark or amber warning:

All sections generated or marked incomplete — checks if every section has content or an explicit placeholder. All high-severity validation flags acknowledged — checks the brd_validation_flags table. At least one source connected — checks source management. BRD has been human reviewed — checks if at least one section has been opened in the detail view. Session has a name — prompts the user to name the session if they have not.

Each incomplete item has a Fix Now link that navigates directly to the relevant screen. Export buttons remain disabled until all checklist items are green or the user clicks Proceed Anyway which logs the override with a timestamp.

---

### S5-02 — Document Preview Panel

Below the checklist. A thumbnail preview of the export output showing the cover page layout with session name, generation date, source count, and section list. Not an interactive preview — a static template illustration showing what the document will look like.

---

### S5-03 — Export Format Options

Three format cards side by side: Markdown, PDF, DOCX.

Each card shows the format icon, format name, a brief description of what it includes (all sections, validation appendix, cover page, metadata footer), and a Download button.

PDF card shows "Styled with WeasyPrint" subtext. DOCX card shows "Template-based layout" subtext. Markdown card shows "Raw content, no styling" subtext.

All three buttons are disabled if the checklist has unresolved high-severity items.

---

### S5-04 — Export Metadata Block

Below the format options. A read-only summary of what will be included in the export: session ID, export timestamp, sections included with version numbers, total source signals, validation flags count and resolution status, and a generation disclaimer text that will appear in the document footer.

---

## Screen 6 — Settings

### S6-01 — API Configuration

Card showing Groq API key field (masked, with show/hide toggle), connection test button that makes a lightweight test call and shows latency, and model selector showing the current active model name.

---

### S6-02 — Processing Limits

Card with editable fields for: maximum emails to process per run (default 200), cost guardrail chunk limit (default 500), classification batch size (default 10). Each field has a reset to default link. Changes take effect on the next pipeline run.

---

### S6-03 — Classification Thresholds

Card showing the three confidence bands as editable range inputs: auto-accept threshold (default 0.75), review band lower bound (default 0.65), forced noise upper bound (default 0.65). A visual diagram shows how the three bands divide the 0-1 confidence range. A Reset to Defaults button. A warning label stating that changing these values affects signal quality and review queue size.

---

### S6-04 — Session Management

Card listing all sessions for the current user with columns: session name, created date, source count, signal count, BRD status. Actions per session: Open, Rename, Delete. A Create New Session button at the top of the list. Delete requires typing the session name to confirm — no accidental deletions.

---

### S6-05 — Database Status

Read-only card showing: database connection status, table row counts for each table (classified_chunks, brd_sections, brd_snapshots, brd_validation_flags), and a Test Connection button. If the connection fails, shows the error message and a troubleshooting link.

---

## Component Interaction Map

```
Dashboard (S1)
    ├── Pipeline Stepper → navigates to stage screen
    ├── Donut Chart segment → Signal Review with label filter
    └── Action Centre buttons → context-dependent navigation

Source Management (S2)
    └── View Chunks → Raw Chunks Drawer (GS-05)

Signal Review (S3)
    ├── Signal Card click → Detail Panel (S3-05)
    ├── Restore button → moves to Active Signals tab
    ├── View Attribution → Attribution Drawer (GS-05)
    └── Override Label → inline dropdown, saves to DB

BRD Draft (S4)
    ├── Section Edit → Inline Editor (S4-04)
    ├── View Attribution → Attribution Drawer (S4-05)
    │       └── View in Signal Review → S3 with pre-filter
    ├── Version History → Version History Drawer (S4-06)
    │       └── Restore Version → creates new version
    └── Validation Flag Acknowledge → updates DB flag record

Export (S5)
    ├── Checklist Fix Now links → relevant screens
    └── Download buttons → triggers export generation

Settings (S6)
    └── Session Open → loads session into active state
```

---

## Demo Flow Mapped to Components

For the hackathon demo, walk through these components in this order. Open Dashboard showing pipeline complete with the donut chart and action centre. Click signal count to navigate to Signal Review — show one requirement card with LLM path badge, open detail panel showing reasoning and attribution. Switch to Suppressed Items tab, show a structural discard with reason code, click Restore to demonstrate no-silent-data-loss. Navigate to BRD Draft — show the Functional Requirements section with attribution drawer open listing source chunks. Show a validation flag banner and click Acknowledge. Navigate to Export, show the checklist turning green, click Download. Total time under five minutes covering every architectural claim.