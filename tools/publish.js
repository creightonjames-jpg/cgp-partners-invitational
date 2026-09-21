/* Publish the wall to GitHub without git.
 *
 * git is unusable on this Mac right now (Xcode license not accepted), so this
 * pushes through the GitHub Git Data API via `gh api`: blobs, one tree, one
 * commit, then move the ref. One clean commit, no local git needed.
 *
 *     node publish.js "<commit message>"
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OWNER = "creightonjames-jpg";
const REPO = "cgp-partners-invitational";
const ROOT = "/Users/creighton_macbook_2/Documents/Claude Code/Projects/cgp-partners-invitational";
const BRANCH = "main";

/* Everything except the internal docs/ folder, per .gitignore. */
const SKIP_DIRS = new Set(["docs", ".git", "node_modules", "confidential", "incoming"]);
const SKIP_FILES = new Set([".DS_Store"]);

function walk(dir, base = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + "/" + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...walk(path.join(dir, entry.name), rel));
    } else {
      if (SKIP_FILES.has(entry.name)) continue;
      out.push(rel);
    }
  }
  return out;
}

function gh(args, body) {
  const opts = { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 };
  if (body !== undefined) {
    opts.input = JSON.stringify(body);
    args = [...args, "--input", "-"];
  }
  return JSON.parse(execFileSync("gh", args, opts));
}

const message = process.argv[2] || "Update the wall";
const files = walk(ROOT).sort();
console.log("files to publish:", files.length);

/* 1. Repo, created on first run only. */
let repo;
try {
  repo = gh(["api", `repos/${OWNER}/${REPO}`]);
  console.log("repo exists:", repo.full_name);
} catch {
  console.log("creating repo...");
  repo = gh(["api", "user/repos", "-X", "POST"], {
    name: REPO,
    description: "Live wall for the 18th Annual Partners Invitational. PGA WEST, La Quinta, October 4 to 7, 2026.",
    private: false,
    auto_init: true,
    has_issues: false,
    has_wiki: false,
  });
  console.log("created:", repo.full_name);
  execFileSync("sleep", ["3"]);
}

/* 2. Current head, so the new commit has a parent. */
const ref = gh(["api", `repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`]);
const parentSha = ref.object.sha;
console.log("parent commit:", parentSha.slice(0, 7));

/* 3. One blob per file. Base64 so binaries survive. */
const tree = files.map((rel) => {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  const blob = gh(["api", `repos/${OWNER}/${REPO}/git/blobs`, "-X", "POST"], {
    content: buf.toString("base64"),
    encoding: "base64",
  });
  console.log("  blob", rel, buf.length + "B");
  return { path: rel, mode: "100644", type: "blob", sha: blob.sha };
});

/* 4. Tree WITHOUT base_tree, so files deleted locally also disappear
      upstream instead of lingering forever. */
const newTree = gh(["api", `repos/${OWNER}/${REPO}/git/trees`, "-X", "POST"], { tree });
console.log("tree:", newTree.sha.slice(0, 7));

/* 5. Commit and move the branch. */
const commit = gh(["api", `repos/${OWNER}/${REPO}/git/commits`, "-X", "POST"], {
  message,
  tree: newTree.sha,
  parents: [parentSha],
});
console.log("commit:", commit.sha.slice(0, 7));

gh(["api", `repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, "-X", "PATCH"], {
  sha: commit.sha,
});
console.log("pushed to", BRANCH);

/* 6. Wait for THIS commit to finish building.
      Polling for "built" alone is a trap: the previous build is still the
      latest one for a few seconds after a push, so you get "built", curl the
      site, and see the old content. Match the commit sha, not just status. */
function waitForBuild(sha) {
  for (let i = 0; i < 90; i++) {   // Pages can take several minutes
    let b;
    try { b = gh(["api", `repos/${OWNER}/${REPO}/pages/builds/latest`]); }
    catch { execFileSync("sleep", ["10"]); continue; }
    if (b.commit === sha && b.status === "built") { console.log("pages built:", sha.slice(0, 7)); return true; }
    if (b.commit === sha && b.status === "errored") {
      console.log("PAGES BUILD FAILED for", sha.slice(0, 7), b.error && b.error.message);
      return false;
    }
    execFileSync("sleep", ["10"]);
  }
  console.log("gave up waiting for the pages build; check manually");
  return false;
}

/* 7. Pages, enabled on first run only. */
try {
  const pages = gh(["api", `repos/${OWNER}/${REPO}/pages`]);
  console.log("pages already on:", pages.html_url);
} catch {
  console.log("enabling pages...");
  const pages = gh(["api", `repos/${OWNER}/${REPO}/pages`, "-X", "POST"], {
    source: { branch: BRANCH, path: "/" },
  });
  console.log("pages:", pages.html_url);
}

waitForBuild(commit.sha);
