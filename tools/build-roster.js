/* Build data/teams.json and data/sponsors.json from the master roster xlsx.
 *
 *   node tools/build-roster.js "/path/to/PI ROSTER.xlsx"
 *
 * Rerun this whenever Carol sends an updated roster. Do NOT hand edit the two
 * JSON files it writes, the next rebuild overwrites them.
 *
 * PRIVACY. The source workbook holds dates of birth, home addresses,
 * emergency contacts, food allergies, airline rewards numbers, passport
 * names, handicap indexes and apparel sizes. The wall is a PUBLIC URL. This
 * script is the gate: it copies ONLY club, names, the captain's mobile and
 * work email, and the sponsored count. If you add a field here, you are
 * publishing it to the open internet. Ask Jim first.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const os = require("os");

/* Top Sponsors are the Platinum and Gold tiers only, per Donny, which is
   everyone who sponsored 4 or more. ASSUMPTION pending his confirmation:
   Platinum is 5 and up, Gold is 4 to 4.9. Change these two numbers if he
   splits it differently. */
const TOP_SPONSOR_MIN = 4;
const PLATINUM_MIN = 5;

const SRC = process.argv[2];
if (!SRC || !fs.existsSync(SRC)) {
  console.error("Usage: node tools/build-roster.js <roster.xlsx>");
  process.exit(1);
}
const REPO = path.resolve(__dirname, "..");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pi-roster-"));
execFileSync("unzip", ["-o", "-q", SRC, "-d", tmp]);

function sheet(name) {
  const out = execFileSync("node", [path.join(__dirname, "xlsx.js"), tmp, name],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return out.split("\n")
    .filter((l) => /^\s*\d+ \| /.test(l))
    .map((l) => l.replace(/^\s*\d+ \| /, "").split(" | "));
}

const clean = (s) => (s == null ? "" : String(s).trim());

/* The two sheets disagree on two club names: the pro roster writes "The Oregon
   Golf Club" and "The Nelson Golf & Sports Club", the player sheet drops the
   "The". Without this the clubs split in two, one holding a captain and no
   players, the other holding players and no captain. */
const clubKey = (s) => clean(s).toLowerCase()
  .replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();

const slugify = (s) => clean(s).toLowerCase()
  .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Shouty rows exist ("JASON HUMRICH"). Fix a name only when first AND last are
   both all caps, so McNaught, LoPresti and AJ survive untouched. */
const titleOne = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
function fixName(first, last) {
  const f = clean(first), l = clean(last);
  const allCaps = (s) => s.length > 1 && s === s.toUpperCase() && /[A-Z]/.test(s);
  if (allCaps(f) && allCaps(l)) {
    return [f, l].map((s) => s.split(/\s+/).map(titleOne).join(" ")).join(" ").trim();
  }
  return [f, l].filter(Boolean).join(" ").trim();
}

/* Ten digit US numbers become (xxx) xxx-xxxx. Anything else is left exactly as
   typed rather than guessed at, so bad source data stays visible. */
function fixPhone(raw) {
  const s = clean(raw);
  const d = s.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1") return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return s;
}

const num = (v) => {
  const n = parseFloat(clean(v));
  return isNaN(n) ? 0 : n;
};

const warnings = [];

/* ------------------------------------------------------------------ teams */
const pros = sheet("Golf Pro Roster").slice(1);
const playerRows = sheet("Player Profiles").slice(1);

const clubs = new Map();   // key -> { club, captain, players }
function clubEntry(rawName, preferName) {
  const k = clubKey(rawName);
  if (!clubs.has(k)) clubs.set(k, { club: clean(rawName), players: [] });
  const e = clubs.get(k);
  if (preferName) e.club = clean(rawName);   // pro roster spelling wins
  return e;
}

for (const r of pros) {
  if (!clean(r[0])) continue;
  const e = clubEntry(r[0], true);
  e.captain = {
    name: fixName(r[2], r[3]),
    mobile: fixPhone(r[4]),
    email: clean(r[7]).toLowerCase(),
  };
  if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(e.captain.mobile)) {
    warnings.push(`captain mobile not a valid US number: ${e.club} / ${e.captain.name} / "${e.captain.mobile}"`);
  }
}

for (const r of playerRows) {
  if (!clean(r[0]) || clean(r[1]) === "Team Captain") continue;
  const name = fixName(r[2], r[3]);
  if (!name) continue;
  clubEntry(r[0], false).players.push({ name, sponsored: num(r[36]) || null });
}

const teams = [...clubs.values()]
  .sort((a, b) => a.club.localeCompare(b.club))
  .map((e) => {
    /* A captain who also plays (Huntington) appears on both sheets. The
       captain block already names him, so drop the duplicate player row. */
    let players = e.players;
    if (e.captain) {
      const before = players.length;
      players = players.filter((p) => p.name !== e.captain.name);
      if (players.length !== before) {
        warnings.push(`captain also listed as a player, deduped: ${e.club} / ${e.captain.name}`);
      }
    } else {
      warnings.push(`no captain found for club: ${e.club}`);
    }
    const t = { id: slugify(e.club), club: e.club,
      players: players.sort((a, b) => a.name.localeCompare(b.name)) };
    if (e.captain) t.captain = e.captain;
    return t;
  });

fs.writeFileSync(path.join(REPO, "data/teams.json"), JSON.stringify({
  _note: "GENERATED by tools/build-roster.js from the master PI roster xlsx. Do not hand edit. Contact details are captains only, by design. See the privacy note in the script.",
  generated: new Date().toISOString().slice(0, 10),
  teams,
}, null, 2) + "\n");

/* --------------------------------------------------------- top sponsors */
const sponsorRows = sheet("Top Sponsors").slice(1);
const picked = [];
for (const r of sponsorRows) {
  const name = clean(r[5]) || fixName(r[1], r[2]);
  const count = num(r[6]);
  if (!name || count < TOP_SPONSOR_MIN) continue;
  const slug = slugify(name);
  /* Only point at a photo that exists. A path to a missing file is a 404 in
     every attendee's console and a wasted request on venue wifi. Drop a
     headshot in assets/sponsors/ named for the slug and rerun this script.
     Organizers can also upload from the wall, which lands in Firebase and
     wins over the file. */
  const photo = ["jpg", "jpeg", "png", "webp"]
    .map((ext) => `assets/sponsors/${slug}.${ext}`)
    .find((rel) => fs.existsSync(path.join(REPO, rel))) || null;
  picked.push({
    slug,
    name,
    club: clean(r[0]),
    count,
    tier: count >= PLATINUM_MIN ? "Platinum" : "Gold",
    photo,
  });
}
picked.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const tiers = ["Platinum", "Gold"].map((tier) => ({
  tier,
  sponsors: picked.filter((s) => s.tier === tier),
})).filter((t) => t.sponsors.length);

fs.writeFileSync(path.join(REPO, "data/sponsors.json"), JSON.stringify({
  _note: "GENERATED by tools/build-roster.js from the Top Sponsors sheet, filtered to Platinum and Gold. These are members ranked by full privilege members sponsored, not corporate sponsors. Do not hand edit.",
  generated: new Date().toISOString().slice(0, 10),
  intro: "Our thanks to the members who brought the most new faces into their clubs this year.",
  tiers,
}, null, 2) + "\n");

fs.rmSync(tmp, { recursive: true, force: true });

console.log("teams:", teams.length, "clubs");
console.log("  with captain:", teams.filter((t) => t.captain).length);
console.log("  players:", teams.reduce((n, t) => n + t.players.length, 0));
tiers.forEach((t) => console.log(`${t.tier}: ${t.sponsors.length}`));
const missing = picked.filter((s) => !s.photo);
if (missing.length) {
  console.log(`\nno photo yet for ${missing.length} of ${picked.length} sponsors:`);
  missing.forEach((s) => console.log(`  assets/sponsors/${s.slug}.jpg  (${s.name})`));
}
if (warnings.length) {
  console.log("\nWARNINGS");
  warnings.forEach((w) => console.log("  ! " + w));
}
