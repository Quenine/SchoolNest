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
const closurePath = path.resolve("database/migrations/step-5-2-step5-closure.sql");
const closure = await readFile(closurePath, "utf8");
for (const required of [
  "returns jsonb", "security definer", "set search_path = public, pg_temp", "auth.uid()",
  "drop function public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean)",
  "revoke all on function public.save_attendance_register",
  "grant select on table public.attendance_registers, public.attendance_entries",
  "get diagnostics added_count = row_count", "'register_id'", "'eligible_count'",
  "'existing_snapshot_count'", "'added_count'", "'already_present_count'", "'historical_preserved_count'",
]) {
  if (!closure.toLowerCase().includes(required.toLowerCase())) failures.push(`${closurePath}: missing Step 5 closure contract: ${required}`);
}
if (/create\s+policy[^;]+for\s+all\s+to\s+authenticated/is.test(closure)) failures.push(`${closurePath}: broad FOR ALL authenticated policy is forbidden`);
if (/create\s+policy[^;]+\bto\s+(anon|public)\b/is.test(closure)) failures.push(`${closurePath}: anonymous/public Step 5 policy is forbidden`);
if (/as\s+\$(?:\r?\n)|end\s+\$;/i.test(closure)) failures.push(`${closurePath}: malformed PostgreSQL dollar delimiter`);
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
