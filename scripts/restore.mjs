import { DatabaseSync } from "node:sqlite";
import { mkdir, copyFile, chmod, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
const source = process.argv[2] && path.resolve(process.argv[2]);
const destination = path.resolve(
  process.env.DATABASE_PATH || "data/soovers.sqlite",
);
if (!source || source === destination)
  throw new Error(
    "Usage: DATABASE_PATH=/empty-volume/academy.sqlite node scripts/restore.mjs /backup/academy.sqlite",
  );
// Never overwrite a database or its journal, even when the service is stopped.
for (const filename of [
  destination,
  destination + "-wal",
  destination + "-shm",
]) {
  try {
    await access(filename);
    throw new Error("Restore requires a new, empty database destination.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const copy = new DatabaseSync(source, { readOnly: true });
try {
  if (copy.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
    throw new Error("Backup integrity check failed.");
  if (
    !copy
      .prepare("SELECT name FROM migrations WHERE name='001_academy.sql'")
      .get()
  )
    throw new Error("Not a supported academy backup.");
} finally {
  copy.close();
}
await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
await copyFile(source, destination, constants.COPYFILE_EXCL);
await chmod(destination, 0o600);
console.log(
  "Backup restored into an empty destination. Start the matching application version and verify learner access.",
);
