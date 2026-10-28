// Cross-platform syntax check (the old npm script used Unix `find`,
// which doesn't exist on Windows). Walks src/ and checks every .js
// file with `node --check`, plus server.js at the root.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

const files = [...walk(path.join(__dirname, "..", "src")), path.join(__dirname, "..", "server.js")];

let failed = false;
for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    failed = true;
    console.error(`Syntax error in ${file}:\n${err.stderr?.toString() || err.message}`);
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log(`Checked ${files.length} files — no syntax errors.`);
}
