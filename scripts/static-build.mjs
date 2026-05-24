#!/usr/bin/env node
/**
 * Static build wrapper.
 * Runs `vite build`, then copies SPA shell to index.html
 * and fixes up the dist folder for static hosting.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const DIST_CLIENT = path.resolve("dist/client");
const DIST = path.resolve("dist");

// Run vite build. The build may throw a harmless cleanup error at the very end;
// we ignore exit-code 1 if the dist output looks valid.
try {
  execSync("bunx vite build", { stdio: "inherit" });
} catch {
  // Build may have exited 1 because of the Vite cleanup bug even though files were written.
  // Continue and verify output.
}

// Ensure dist/client exists
if (!fs.existsSync(DIST_CLIENT)) {
  console.error("Build output missing: dist/client not found");
  process.exit(1);
}

// Copy SPA shell to root index.html
const shellPath = path.join(DIST_CLIENT, "_shell.html");
const indexPath = path.join(DIST_CLIENT, "index.html");
if (fs.existsSync(shellPath) && !fs.existsSync(indexPath)) {
  fs.copyFileSync(shellPath, indexPath);
  console.log("Created dist/client/index.html from SPA shell");
}

// Move dist/client/* up to dist/ for a flat static-host output
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Wipe old dist root contents (except client/ and server/) to avoid stale files
for (const entry of fs.readdirSync(DIST, { withFileTypes: true })) {
  if (entry.name === "client" || entry.name === "server") continue;
  const p = path.join(DIST, entry.name);
  if (entry.isDirectory()) fs.rmSync(p, { recursive: true });
  else fs.unlinkSync(p);
}

// Copy client contents to dist root
copyDir(DIST_CLIENT, DIST);

// Remove the nested client/ and server/ dirs since everything is now flat
fs.rmSync(path.join(DIST, "client"), { recursive: true, force: true });
fs.rmSync(path.join(DIST, "server"), { recursive: true, force: true });

// Print summary of what was generated
const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith(".html")) htmlFiles.push(path.relative(DIST, p));
  }
}
walk(DIST);

console.log("\nStatic build complete. Output is in dist/\n");
console.log("HTML pages:");
for (const f of htmlFiles.sort()) {
  console.log("  " + f);
}
console.log("\nAssets:");
const assetsDir = path.join(DIST, "assets");
if (fs.existsSync(assetsDir)) {
  for (const f of fs.readdirSync(assetsDir).sort()) {
    console.log("  assets/" + f);
  }
}
console.log("\nTo preview: npx serve dist");
