import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const forbidden = [
  "user_has_school_access",
  "user_has_school_role",
  "is_platform_admin",
];

async function sqlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sqlFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".sql")) files.push(target);
  }
  return files;
}

const failures = [];
for (const file of await sqlFiles(path.resolve("database"))) {
  const source = await readFile(file, "utf8");
  for (const token of forbidden) {
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.includes(token)) failures.push(`${file}:${index + 1}: forbidden SQL helper reference: ${token}`);
    });
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("SQL helper reference audit passed.");
}
