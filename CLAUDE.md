# CLAUDE.md

Standing instructions for this repository. Read before acting in any session.

---

## The project

A mobile web application serving as the live wall for the 18th Annual Partners
Invitational, October 4 to 7, 2026, at PGA WEST in La Quinta, California, with
lodging at the La Quinta Resort & Club. Attendees reach it by QR code. The
audience is partners and owners, so the register is polished and upscale. The
look is mid-century Palm Springs: light, airy, cream and aqua and mustard,
breeze block and butterfly roof motifs, with the PGA WEST logo in the masthead.

The golf: two-person teams. Round 1 Monday is a two-person scramble on the
Nicklaus Private (35% low index + 15% high). Round 2 Tuesday is a two-person
shamble on the Palmer Private (70% of GHIN). Top three teams and ties advance
to a two-hole Shoot-Out. The leaderboard carries NET TEAM SCORES PER ROUND
entered by the scoring table, not hole-by-hole gross.

Source of truth for event facts: docs/2026-partners-final-agenda.docx. Known
discrepancy in that doc: the schedule puts the Shoot-Out at Tuesday 2:00 pm,
the Q&A section says Wednesday after play. The wall follows the schedule.

You are working with Jim Creighton, Director of People Development and
Innovation at CGP.

Reference documents:
- `ROADMAP.md` in this repo. Phased task list with acceptance criteria. Work it in order.
- The predecessor build lives at `../Membership Live Wall 2026`. Its CLAUDE.md
  records the hard lessons. Most of the rules below were earned there.

Open content gaps (do not invent any of these):
- Attendee roster
- Team pairings
- Real scorecard pars for the Nicklaus and Palmer Private courses
- Team Captain Host names and numbers for Who to Call

---

## How to work with Jim

**Plan before executing.** For any structural change, new feature, or bulk
operation, state what you are going to do and get a green light. For typos,
copy tweaks, and single-value adjustments, just do it.

**Ask instead of assuming.** When scope or content is ambiguous, ask one focused
question with two to four concrete options. Do not fill gaps with invented
roster entries, club names, financial figures, or attendee data. If real data is
missing, use a clearly labeled placeholder and say so.

**Read before you write.** Read any file before editing it. Do not pattern-match
from memory when the file is available.

**Never delete without approval.** Confirm what is being removed and wait.

**Verify your own work.** Check syntax after every code edit. babel-standalone
means a JSX error is a white screen, not a build failure. Load the page in a
browser before calling anything done.

**Report against the roadmap.** When you finish work, say which task IDs moved
and whether their acceptance criteria passed.

---

## Voice rules

These apply to every word that ships: interface copy, empty states,
confirmations, error messages, commit messages, documentation.

**Required:**
- No em-dashes. Use periods, commas, parentheses, or restructure the sentence.
- Plain verbs. "Use" not "utilize." "Show" not "demonstrate."
- Short sentences. Two short beats beat one long one.
- Direct address. Talk to the reader.
- Concrete over abstract. Name the thing.

**Forbidden:**
- Negate-then-assert constructions. "This is not just X, it is Y."
- Decorative tricolons. "Clear, concise, and compelling."
- Filler transitions. "It is worth noting that." "That said." "Ultimately."
- Empty sign-offs. "Hope this helps."

**Interface voice specifically.** This wall talks to partners and owners. The
register is a good concierge: warm, confident, brief, never flip and never
stiff. Working examples: "Welcome to the desert." "The first group is on the
tee." "No photos yet. Be the first." The rock-tour irreverence from the
membership wall does not travel here.

**Client terminology.** CGP properties are called clubs, never properties.

---

## Architecture

**Stack**
- React 18 via CDN, single `index.html`, inline Babel transpilation
- Firebase Realtime Database for live state (NOT YET WIRED, see ROADMAP P2)
- GitHub Pages from repo root, live at
  https://creightonjames-jpg.github.io/cgp-partners-invitational/
- Google Fonts: Josefin Sans, Yellowtail, Inter
- Until Firebase is wired, the app runs in preview mode on an in-memory store
  with clearly labeled sample data. `FIREBASE_CONFIG` in index.html is the
  switch: paste real config and preview mode turns itself off.

**File layout**
```
/index.html                       app logic and design system
/data/agenda.json                 session schedule (PLACEHOLDER content)
/data/roster.json                 attendee list (PLACEHOLDER content)
/data/course.json                 course name and pars (PLACEHOLDER content)
/data/concierge.json              venue, travel, contacts (PLACEHOLDER content)
/data/resources.json              resource links (PLACEHOLDER content)
/assets/attendees/{slug}.jpg      headshots, 400x400
/assets/brand/                    logo, favicons, textures
/serve.js                         local static server, node serve.js, port 4179
```

**Publishing.** `git` does not run on this Mac: the Xcode license has not been
accepted, so `/usr/bin/git` and `/usr/bin/python3` both refuse with a license
error, and only Jim can clear it (`sudo xcodebuild -license`, needs his
password). Until then, publish through the GitHub API instead:

```
node tools/publish.js "commit message"
```

It reads every file except `docs/`, writes blobs, builds one tree, commits,
moves `main`, and turns Pages on if it is off. `gh` is already authenticated as
creightonjames-jpg. The tree is built WITHOUT `base_tree`, so a file deleted
locally is deleted upstream too. Never put secrets in this repo: it is public,
like every other CGP wall repo.

**The data split.** Anything created during the event goes in Firebase.
Anything fixed before the event lives in the repo as a static file.

| Content | Location |
|---|---|
| Roster, agenda, concierge, resources, rounds config | Repo, static |
| Headshots, logos | Repo, static |
| Teams and per-round net scores | Firebase `teams/`, `scores/{teamId}/{r1,r2}` |
| Live event photos, likes | Firebase `photos/`, compressed ~1000px |
| Marquee, tab visibility, admin PIN | Firebase `settings/` |
| Per device like history, admin session | Local storage, `pinv_` prefix |
| Videos | YouTube or Vimeo unlisted embeds, never repo files |

**Firebase nodes:** `settings/`, `teams/`, `scores/`, `photos/`, `photoLikes/`

**Local storage keys:** `pinv_liked`, `pinv_admin`

---

## Hard rules

Earned on the membership wall. Do not relearn them here.

**Firebase security rules are permanent.** They must read exactly
`{ "rules": { ".read": true, ".write": true } }` with no expiration clause.
Firebase's default test-mode rule expires after 30 days and once fired
mid-event, blanking the whole wall. Verify published rules by reading them
back, not by assuming a paste worked.

**No base64 images in Firebase except live event photos.** Headshots and
graphics belong in the repo as static files.

**No video files in the repo.** GitHub Pages is not a video CDN.

**Both photo upload paths ship together.** Camera via `capture="environment"`
and library via a second input without the capture attribute.

**No fixed-height inner scroll containers.** Let content flow with the page.
Viewport-locked heights are for a future Display Mode only.

**Every local storage key carries the `pinv_` prefix.** Unprefixed keys collide
with other CGP walls in the same browser. The membership wall owns `mm26_`.

**Score entry is admin only.** The scoring table computes the handicap net;
the wall just posts it, one number per team per round, decimals allowed.
Standings math lives in one function (`computeStandings`). Rank compares
to-par over rounds posted so partial states stay fair. Ties share a rank. A
team with no scores shows as no card yet, not as leader at even par.

**Test on a physical phone before the event.** Desktop responsive mode does not
catch camera behavior, maps handoff, tappable phone numbers, or font loading.

---

## Design tokens

```
--linen    #F7F2E8   page background, warm cream
--paper    #FFFDF6   card surface
--sand     #EFE7D6   form fields, inactive pills, table stripes
--pool     #3E8E90   primary accent, turquoise
--pool-deep #2C6B6D  pressed and hover, deep borders
--mustard  #D9A441   secondary accent, leader gold, awards
--terra    #C2643F   warm accent, terracotta
--dusk     #55496B   mountain purple, quiet headers
--ink      #2E2A24   body text, warm near-black
--dim      #6F6758   secondary text, metadata
--mute     #9C927F   timestamps, fine print
--edge     #E2D8C3   borders and dividers
--danger   #B0442E   destructive admin actions
--glow     rgba(62,142,144,0.10)
```

**Type:** Josefin Sans for display, all caps, generous tracking. Inter for body
and UI. Yellowtail script is rationed the way Alfa Slab One was on the
membership wall: the hero greeting and nowhere else. Everywhere else it reads
as a cocktail menu.

**Motifs:** breeze block screen (SVG pattern band), sunburst divider, roofline
cards (butterfly roof angle on card headers), scorecard grid, mountain horizon.

---

## The six tabs

| Tab | Function | Data source |
|---|---|---|
| Itinerary | Agenda with day pills | data/agenda.json |
| The Field | Attendee roster and directory | data/roster.json |
| Leaderboard | Scramble standings, admin score entry | Firebase teams/ scores/ |
| Gallery | Photo uploads with likes | Firebase photos/ |
| Concierge | Venue, travel, contacts | data/concierge.json |
| Resources | Links and documents | data/resources.json |

---

## Definition of done for any task

1. Acceptance criteria in `ROADMAP.md` pass.
2. No console errors.
3. Verified at 380px width and at desktop width.
4. Verified on a physical phone if the feature touches camera, maps, phone
   links, or fonts.
5. Copy passes the voice rules. No em-dashes.
6. Committed with a clear message. Confirm the commit landed.
7. Task status updated in `ROADMAP.md`.
