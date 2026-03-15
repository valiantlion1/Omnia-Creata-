import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, "omnia.repo.json"), "utf8"));

const errors = [];
const warnings = [];

function isAsciiKebabCase(value) {
  return /^[a-z0-9-]+$/.test(value);
}

function walkDirectories(dir, visitor) {
  if (!existsSync(dir)) {
    return;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    visitor(fullPath, entry);
    if (entry.isDirectory()) {
      walkDirectories(fullPath, visitor);
    }
  }
}

function assertExists(path) {
  if (!existsSync(join(root, path))) {
    errors.push(`Missing required path: ${path}`);
  }
}

for (const topLevel of Object.keys(manifest.topLevel)) {
  assertExists(topLevel);
}

for (const app of manifest.coreApps) {
  assertExists(app.path);
}

for (const site of manifest.websiteProperties) {
  assertExists(site.path);
}

const appsRoot = join(root, "apps");
const allowedAppRoots = new Set(
  manifest.coreApps
    .map((app) => app.path.split("/")[1])
    .filter(Boolean)
    .concat(["internal"])
);

for (const entry of readdirSync(appsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }

  const fullPath = join(appsRoot, entry.name);
  const isEmpty = readdirSync(fullPath).length === 0;

  if (!allowedAppRoots.has(entry.name)) {
    if (isEmpty) {
      warnings.push(`Empty legacy app directory remains: apps/${entry.name}`);
    } else {
      errors.push(`Non-canonical app directory found: apps/${entry.name}`);
    }
    continue;
  }

  if (entry.name !== "internal" && !isAsciiKebabCase(entry.name)) {
    errors.push(`App directory is not ASCII kebab-case: apps/${entry.name}`);
  }
}

const websiteRoot = join(root, "website");
for (const entry of readdirSync(websiteRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }
  if (!isAsciiKebabCase(entry.name)) {
    errors.push(`Website directory is not ASCII kebab-case: website/${entry.name}`);
  }
}

const docsRoot = join(root, "docs");
const allowedDocs = new Set(["architecture", "products", "decisions", "operations"]);
for (const entry of readdirSync(docsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    errors.push(`Non-directory file found at docs root: docs/${entry.name}`);
    continue;
  }
  if (!allowedDocs.has(entry.name)) {
    errors.push(`Unexpected docs root directory: docs/${entry.name}`);
  }
}

const canonicalRoots = [
  "apps",
  "website",
  "packages",
  "design",
  "docs",
  "research",
  "prototypes"
];

for (const area of canonicalRoots) {
  walkDirectories(join(root, area), (fullPath, entry) => {
    const rel = relative(root, fullPath).replaceAll("\\", "/");
    if (entry.isDirectory() && entry.name === ".git") {
      errors.push(`Nested .git directory found: ${rel}`);
    }
    if (entry.isDirectory() && entry.name === "apps" && !rel.startsWith("apps/internal")) {
      errors.push(`Nested apps directory found inside canonical area: ${rel}`);
    }
  });
}

if (warnings.length) {
  console.warn("Warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (errors.length) {
  console.error("Errors:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Repo structure checks passed.");
