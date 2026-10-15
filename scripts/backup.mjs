import { DatabaseSync, backup } from "node:sqlite";
import { mkdir, chmod, access } from "node:fs/promises";
import path from "node:path";
const source = path.resolve(process.env.DATABASE_PATH || "data/soovers.sqlite");
const destination = path.resolve(
  process.argv[2] ||
    `backups/soovers-${new Date().toISOString().replaceAll(":", "-")}.sqlite`,
);
if (source === destination)
  throw new Error("Backup destination must differ from the live database.");
await access(source);
try {
  await access(destination);
  throw new Error("Backup destination already exists. Choose a new filename.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, destination);
  await chmod(destination, 0o600);
} finally {
  db.close();
}
const copy = new DatabaseSync(destination, { readOnly: true });
try {
  if (copy.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
    throw new Error("Backup integrity check failed.");
} finally {
  copy.close();
}
console.log(`Verified database backup: ${destination}`);
