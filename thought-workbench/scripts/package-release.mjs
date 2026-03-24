import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const releaseRoot = path.join(rootDir, "release");
const packageDir = path.join(releaseRoot, "thought-workbench-web");
const appDir = path.join(packageDir, "app");

async function ensureDistExists() {
  try {
    const distStat = await stat(distDir);
    if (!distStat.isDirectory()) throw new Error();
  } catch {
    throw new Error("dist/ not found. Run `npm run build` before packaging the release.");
  }
}

async function listFilesRecursively(dir, relativeBase = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursively(absolutePath, relativeBase));
      continue;
    }
    const info = await stat(absolutePath);
    files.push({
      path: path.relative(relativeBase, absolutePath),
      size: info.size,
    });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function main() {
  await ensureDistExists();

  await rm(releaseRoot, { recursive: true, force: true });
  await mkdir(appDir, { recursive: true });

  await cp(distDir, appDir, { recursive: true });
  await cp(path.join(rootDir, "README.md"), path.join(packageDir, "README.md"));
  await cp(path.join(rootDir, "INSTALL.md"), path.join(packageDir, "INSTALL.md"));
  await cp(path.join(rootDir, "CHANGELOG.md"), path.join(packageDir, "CHANGELOG.md"));

  const generatedAt = new Date().toISOString();
  const appFiles = await listFilesRecursively(appDir, packageDir);

  const releaseManifest = {
    name: "thought-workbench-web",
    generatedAt,
    sourceDist: "dist/",
    contents: [
      {
        path: "app/",
        note: "Static web app bundle for deployment",
        files: appFiles,
      },
      {
        path: "README.md",
        note: "High-level deployment and usage summary",
      },
      {
        path: "INSTALL.md",
        note: "Setup and deployment checklist",
      },
      {
        path: "CHANGELOG.md",
        note: "Release summary and milestone changelog",
      },
    ],
  };

  const releaseReadme = `# Release Package

Generated: ${generatedAt}

## Contents

- app/: static web bundle copied from dist/
- README.md: project overview and deployment notes
- INSTALL.md: setup and release checklist
- CHANGELOG.md: milestone summary for this release line
- RELEASE_MANIFEST.json: machine-readable file inventory

## Usage

1. Upload the contents of app/ to your static host.
2. Keep README.md, INSTALL.md, and CHANGELOG.md alongside the release package for operators.
3. Use CHANGELOG.md to review the scope of the packaged milestone before deployment.
4. Do not deploy source files, node_modules, or development docs from the repository root.
`;

  await writeFile(path.join(packageDir, "RELEASE_MANIFEST.json"), `${JSON.stringify(releaseManifest, null, 2)}\n`, "utf8");
  await writeFile(path.join(packageDir, "RELEASE_README.md"), releaseReadme, "utf8");

  process.stdout.write(`Release package created at ${path.relative(rootDir, packageDir)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
