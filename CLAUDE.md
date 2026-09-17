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
- Firebase Realtime Database, LIVE since Sep 17
- GitHub Pages from repo root, live at
  https://creightonjames-jpg.github.io/cgp-partners-invitational/
- Google Fonts: Josefin Sans, Yellowtail, Inter
- `FIREBASE_CONFIG` in index.html is the switch. Setting apiKey back to
  PASTE_ME drops the app into the in-memory preview store, which is useful
  for testing without writing to the live event data.

**Which database.** The wall uses its own Realtime Database instance,
`cgp-partners-inv-2026`, reached at
https://cgp-partners-inv-2026.firebaseio.com. That instance lives inside the
`cgp-membership-wall-2026` Firebase project, NOT because the two events share
data but because Jim's Google account has hit its Cloud project quota and a
new project could not be created. A separate instance means separate data and
separate rules. Nothing in this wall can read or write the membership wall's
database. If the quota is ever freed, moving to a dedicated project is a one
line change to `databaseURL` plus a rules deploy.

**Deploying rules.** `firebase.json` uses the ARRAY form of the database key.
The object form silently ignores `instance` and deploys to the project's
default database, which is the membership wall's. That happened once on
Sep 17. It did no harm because both use the same open rules, but check the
deploy output names `cgp-partners-inv-2026` before believing it.

```
firebase deploy --only database --project cgp-membership-wall-2026
firebase database:get "/.settings/rules" --instance cgp-partners-inv-2026 --project cgp-membership-wall-2026
```

The second command is not optional. Read the rules back every time.

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

**Firebase nodes:** `settings/`, `questions/`, `photos/`, `photoLikes/`,
`sponsorPhotos/{slug}`.
`teams/` and `scores/` belong to the parked leaderboard and are no longer
seeded or written.

**Local storage keys:** `pinv_liked`, `pinv_admin`, `pinv_asked`

**Admin login.** The gear at the right end of the tab strip. The PIN lives at
`settings/adminPin` in Firebase, so it is changed there, not in code. In
preview mode the seeded PIN is 0000. **When Firebase goes live, set a real PIN
before the QR code goes out.** If `settings/adminPin` is missing entirely no
PIN will work, which fails closed rather than open. Admin unlocks: sponsor
photo upload, question answering, marquee, tab visibility, photo removal.

**Photo cropping.** `PhotoCropper` is a local component, no library, because a
CDN cropper is one more thing that can be blocked by venue wifi. Drag to pan,
slider to zoom, square output. Sponsor photos crop round at 800px and are
required; gallery photos crop at 1000px and offer "Use the whole photo".
Object URLs live for the life of the modal. Revoking one on load blanks the
preview, which is how it broke the first time.

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

## Privacy, read this before touching the roster

The master roster workbook (OneDrive, "2026 MASTER USE THIS ONE - PI ROSTER
ORIGINAL") holds dates of birth, home addresses, emergency contacts, food
allergies, airline rewards numbers, passport names, handicap indexes and
apparel sizes for 125 people. **The wall is a public URL.**

`tools/build-roster.js` is the gate. It copies only club, names, the
captain mobile and work email, and the sponsored count. Adding a field there
publishes it to the open internet. Ask Jim first, every time.

Player contact details are deliberately NOT published. Captains only, because
they are the hosts attendees need to reach. The page carries a noindex tag so
the contact details do not end up in search results.

## The seven tabs

Donny set this list on Sep 15. His order, his names. Do not add, rename, or
reorder a tab without him.

| Tab | Function | Data source |
|---|---|---|
| Agenda | Schedule with day pills | data/agenda.json |
| Teams | Club, captain contact, players | data/teams.json (GENERATED) |
| Top Sponsors | Platinum and Gold members, photos | data/sponsors.json (GENERATED) |
| Program Guide | Venues, format, dress, travel, documents | data/guide.json |
| Area Guide | La Quinta and Coachella Valley | data/area-guide.json |
| Photos | Photo uploads with likes | Firebase photos/ |
| Questions | Attendees ask, organizers answer | Firebase questions/ |

**Questions is moderated by default.** A question goes to the organizers and
publishes when it is answered. The asker sees their own marked as sent, via
`pinv_asked`. A room of partners should never see a column of unanswered
questions. `settings/qaPublic` flips this to publish everything immediately,
toggled from the admin panel.

**The Leaderboard is parked, not deleted.** Golf Genius runs scoring for this
event and computes the handicap allowances itself, so a second leaderboard
would mean the scoring table keys every number twice. The component and
`computeStandings` are still in index.html with a comment explaining how to
revive them. Ask Jim before deleting any of it. Golf Genius deep links use
`https://www.golfgenius.com/deeplink_ggid?ggid=<GGID>`, which is the only URL
shape that opens their app instead of a browser. GGIDs have not arrived yet.

**Reading PDFs and Office files on this Mac.** There is no poppler, no
pdftotext, and `brew install` fails for the same Xcode licence reason git
does. `node tools/pdftext.js <file.pdf>` is the workaround: it inflates the
content streams with node's zlib and applies each font's ToUnicode CMap,
including two-byte Type0 fonts. `tools/xlsx.js` does the same job for
spreadsheets.

**A warning about the 2026 brochure.** Its PGA WEST amenities page uses a
subset font whose ToUnicode table is incomplete, so extraction silently drops
individual digits. "760.564.3914" comes out as "70.54.3914". Hours are
affected too, and it is not always visible which character went missing. The
Area Guide deliberately omits every phone number and opening time from that
one page rather than reconstructing them. Do not "fix" this by guessing. Get
the numbers from the club.

**Generated data files.** `data/teams.json` and `data/sponsors.json` are built
by `node tools/build-roster.js <roster.xlsx>`. Do not hand edit either one, a
rebuild overwrites it. Rerun it whenever a new roster arrives. It prints
warnings for bad source data, currently one malformed captain mobile.

**Orphaned data files.** `data/concierge.json`, `data/resources.json`, and
`data/roster.json` were folded into `guide.json` and `teams.json` on Sep 15.
Nothing reads them. They are still on disk pending Jim's approval to delete.
Do not edit them expecting a change on the wall.

**The preview store returns null, not undefined,** for a path that does not
exist, because that is what Firebase does. A component that treats undefined
as "still loading" rendered a blank tab forever when its node was unseeded.
Fixed Sep 17 in `makeMemoryStore`. Do not reintroduce it.

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
