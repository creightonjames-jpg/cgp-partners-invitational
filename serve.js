/* Local static server, for checking a change before it reaches GitHub Pages.
 *
 *     node serve.js          then open http://localhost:4179
 *
 * Why this exists. index.html transpiles JSX in the browser with babel-standalone,
 * so a syntax error in the app does not fail a build. There is no build. It fails
 * as a white screen for whoever loads the page next. Balanced braces are not
 * proof that JSX parses.
 *
 * Port 4179, one above the membership wall's 4178, so both can run at once.
 * Deliberately dumb. No caching, no directory listing, no dependencies.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = 4179;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel === "/") rel = "/index.html";

  // Keep the server inside the repo even if the path tries to climb out.
  const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("Outside the repo.");
    return;
  }

  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found: " + rel);
      return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    }).end(buf);
  });
}).listen(PORT, () => {
  console.log("Partners Invitational wall on http://localhost:" + PORT);
});
