/* Minimal xlsx reader. python3 is unusable on this Mac, so this parses the
   sheet XML directly. Returns rows of cell strings, blanks preserved. */
const fs = require("fs");
const path = require("path");
const ROOT = process.argv[2];

const dec = (s) => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&amp;/g, "&");

/* shared strings */
const sstPath = path.join(ROOT, "xl/sharedStrings.xml");
let sst = [];
if (fs.existsSync(sstPath)) {
  const raw = fs.readFileSync(sstPath, "utf8");
  sst = (raw.match(/<si>[\s\S]*?<\/si>/g) || []).map((si) =>
    dec((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [])
      .map((t) => t.replace(/<[^>]+>/g, "")).join("")));
}

/* sheet name -> file */
const wb = fs.readFileSync(path.join(ROOT, "xl/workbook.xml"), "utf8");
const rels = fs.readFileSync(path.join(ROOT, "xl/_rels/workbook.xml.rels"), "utf8");
const relMap = {};
for (const m of rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
  relMap[m[1]] = m[2].replace(/^\/?xl\//, "");
}
const sheets = [];
for (const m of wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
  sheets.push({ name: dec(m[1]), file: relMap[m[2]] });
}

const colNum = (ref) => {
  const a = ref.match(/^([A-Z]+)/)[1];
  let n = 0;
  for (const ch of a) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

function readSheet(file) {
  const xml = fs.readFileSync(path.join(ROOT, "xl", file), "utf8");
  const rows = [];
  for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const cm of rm[1].matchAll(/<c ([^>]*)\/>|<c ([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cm[1] || cm[2] || "";
      const body = cm[3] || "";
      const ref = (attrs.match(/r="([A-Z]+\d+)"/) || [])[1];
      const t = (attrs.match(/t="([^"]+)"/) || [])[1];
      let v = "";
      if (t === "inlineStr") {
        v = dec((body.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [])
          .map((x) => x.replace(/<[^>]+>/g, "")).join(""));
      } else {
        const vm = body.match(/<v>([\s\S]*?)<\/v>/);
        if (vm) v = t === "s" ? (sst[+vm[1]] ?? "") : dec(vm[1]);
      }
      if (ref) cells[colNum(ref)] = v;
    }
    for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = "";
    rows.push(cells);
  }
  return rows;
}

const want = process.argv.slice(3);
for (const s of sheets) {
  if (want.length && !want.includes(s.name)) continue;
  console.log("\n########## SHEET: " + s.name + " ##########");
  const rows = readSheet(s.file);
  rows.forEach((r, i) => {
    if (r.every((c) => !c || !String(c).trim())) return;
    console.log(String(i + 1).padStart(3) + " | " + r.join(" | "));
  });
}
