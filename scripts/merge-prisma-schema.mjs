import { promises as fs } from "fs";
import path from "path";

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listPrismaFilesRecursive(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listPrismaFilesRecursive(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".prisma")) {
      files.push(fullPath);
    }
  }

  return files;
}

function ensureTrailingNewline(s) {
  return s.endsWith("\n") ? s : `${s}\n`;
}

async function main() {
  const repoRoot = process.cwd();

  const basePath = path.join(repoRoot, "prisma", "schema", "base.prisma");
  const activeDir = path.join(repoRoot, "prisma", "schema", "active");
  const outPath = path.join(repoRoot, "prisma", "schema.prisma");

  if (!(await fileExists(basePath))) {
    throw new Error(`Missing base schema file: ${basePath}`);
  }
  if (!(await fileExists(activeDir))) {
    throw new Error(`Missing active schema folder: ${activeDir}`);
  }

  const base = ensureTrailingNewline(await fs.readFile(basePath, "utf8"));

  const activeFiles = (await listPrismaFilesRecursive(activeDir))
    .filter((p) => !p.endsWith(path.sep + "base.prisma"))
    .sort((a, b) => a.localeCompare(b));

  if (activeFiles.length === 0) {
    throw new Error(`No .prisma files found under: ${activeDir}`);
  }

  const parts = [base];
  for (const filePath of activeFiles) {
    const content = ensureTrailingNewline(await fs.readFile(filePath, "utf8"));
    parts.push(content);
  }

  const merged = parts.join("\n");
  await fs.writeFile(outPath, merged, "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
