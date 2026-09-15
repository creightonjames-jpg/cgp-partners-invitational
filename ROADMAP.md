# ROADMAP

Partners Invitational Live Wall. Work phases in order. A task is done when its
acceptance criteria pass, per the definition of done in CLAUDE.md.

Status marks: `[ ]` open, `[x]` done, `[~]` in progress, `[!]` blocked on Jim.

---

## Phase 0. Scaffold

- [x] **P0.1 Project structure.** Repo folder, data files, serve.js, CLAUDE.md,
      ROADMAP.md. Accept: `node serve.js` serves the app on :4179.
- [x] **P0.2 Design system.** Mid-century Palm Springs tokens, Josefin Sans /
      Inter / Yellowtail type ramp, breeze block and sunburst and roofline
      motifs. Accept: tokens render as specified in CLAUDE.md at 380px and
      desktop with no horizontal scroll.
- [x] **P0.3 App shell.** Masthead, marquee strip, six-tab nav, admin gear.
      Accept: every tab reachable, active state visible, no console errors.
- [x] **P0.4 Preview mode.** In-memory store behind the same API the Firebase
      layer will use, seeded with clearly labeled sample data, banner visible.
      Accept: app is fully clickable with no Firebase project.
- [x] **P0.5 Itinerary, Field, Concierge, Resources tabs.** Render from
      data/*.json with placeholder-aware empty states. Accept: placeholder
      content is visibly labeled as placeholder everywhere it appears.
- [x] **P0.6 Leaderboard v1.** Scramble standings from teams/ and scores/,
      to-par math, thru-hole, shared ranks for ties, leader styling. Admin
      score grid: pick team, enter strokes per hole, clear a hole. Accept:
      demo scores produce correct to-par and rank order, ties share rank,
      teamless state reads cleanly.
- [x] **P0.7 Gallery v1.** Camera and library upload paths, canvas compression
      to ~1000px JPEG, like button with pinv_liked de-dupe, admin delete.
      Accept: both inputs present in the DOM, compressed size logged under
      300KB for a phone photo, like count cannot be double-tapped from one
      device.
- [x] **P0.8 Admin panel.** PIN gate (settings/adminPin), marquee editor, team
      add/rename/remove, score grid entry, photo delete, tab visibility
      toggles. Accept: admin state survives reload via pinv_admin, every
      admin write round-trips through the store layer.

## Phase 1. Content intake

- [x] **P1.1 Event dates and agenda.** Done Sep 14 from the final agenda doc
      (docs/2026-partners-final-agenda.docx). October 4 to 7, 2026.
- [!] **P1.2 Roster.** Real attendee list into data/roster.json, headshots to
      assets/attendees/. Accept: no sample entries remain on The Field.
- [x] **P1.3 Logos.** PGA WEST, La Quinta Resort, and event wordmark pulled
      from the agenda doc and Jim's pasted hi-res files, Sep 14. Recolored
      variants (dusk, pool) generated with his approval. Masthead and
      Concierge carry them.
- [~] **P1.4 Courses and pars.** Courses and formats confirmed from the doc:
      Round 1 Nicklaus Private (two-person scramble), Round 2 Palmer Private
      (two-person shamble). Par values still flat-72 PLACEHOLDER in
      data/course.json until Jim confirms the scorecards.
- [!] **P1.5 Teams.** Two-person pairings entered via admin panel, or
      confirmed TBD until on site. Accept: teams render on Leaderboard.
- [~] **P1.6 Concierge content.** Venues, travel, dress code, spouse policy,
      and extra golf filled from the doc Sep 14. Still open: Who to Call
      (Team Captain Host names and numbers).

## Phase 2. Go live

- [ ] **P2.1 Firebase project.** Jim creates it, paste config into
      FIREBASE_CONFIG, publish permanent rules and READ THEM BACK. Accept:
      preview banner gone, writes visible from a second device.
- [ ] **P2.2 GitHub repo and Pages.** Repo cgp-partners-invitational, Pages
      from root. Accept: public URL loads on a phone on cellular.
- [ ] **P2.3 QR code.** Generate, place in assets/brand/, hand to organizers.
      Accept: QR resolves on an iPhone camera from a printed page.
- [ ] **P2.4 PWA dressing.** manifest.webmanifest, icons, theme color. Accept:
      Add to Home Screen shows the right name and icon.

## Phase 3. Event hardening

- [ ] **P3.1 Display Mode for the leaderboard.** Big-screen standings view,
      auto-refresh, viewport-locked (the one allowed use). Accept: readable
      from 20 feet at 1080p.
- [ ] **P3.2 Physical phone pass.** Camera, library, maps handoff, tel links,
      fonts, safe areas. Accept: all pass on Jim's iPhone.
- [ ] **P3.3 Load and failure drill.** Airplane-mode reload, Firebase outage
      behavior, stale-tab recovery. Accept: no white screens, every failure
      state has copy.
