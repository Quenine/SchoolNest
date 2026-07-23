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
const step5Path = path.resolve("database/migrations/step-5-1-attendance-and-communication.sql");
const step5 = await readFile(step5Path, "utf8");
for (const required of [
  "security definer set search_path=public,pg_temp",
  "auth.uid()",
  "revoke all on function public.save_attendance_register",
  "grant select on table public.attendance_registers, public.attendance_entries",
]) {
  if (!step5.toLowerCase().includes(required.toLowerCase())) failures.push(`${step5Path}: missing Step 5 security contract: ${required}`);
}
if (/for\s+all\s+to\s+authenticated/i.test(step5)) failures.push(`${step5Path}: broad FOR ALL authenticated policy is forbidden`);
if (/create\s+policy[^;]+\bto\s+(anon|public)\b/is.test(step5)) failures.push(`${step5Path}: anonymous/public Step 5 policy is forbidden`);
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
