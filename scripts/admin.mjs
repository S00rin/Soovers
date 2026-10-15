import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import path from "node:path";
import { openDatabase, transaction } from "../server/database.mjs";
import { hashPassword, validPassword } from "../server/auth.mjs";
const [command, emailInput, name] = process.argv.slice(2);
const email = emailInput?.trim().toLowerCase();
if (
  !["create-user", "reset-password"].includes(command) ||
  !email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  email.length > 254 ||
  (command === "create-user" &&
    (!name || name.trim().length < 2 || name.trim().length > 80))
) {
  console.error(
    'Usage: pnpm admin create-user EMAIL "Full name" | pnpm admin reset-password EMAIL\nPassword is read securely from the terminal or standard input.',
  );
  process.exit(1);
}
let password;
if (process.stdin.isTTY) {
  process.stderr.write("New password (12–128 characters, hidden): ");
  const silent = new Writable({
    write(_chunk, _encoding, done) {
      done();
    },
  });
  const prompt = createInterface({
    input: process.stdin,
    output: silent,
    terminal: true,
  });
  password = await prompt.question("");
  prompt.close();
  process.stderr.write("\n");
} else {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  password = Buffer.concat(chunks)
    .toString()
    .replace(/\r?\n$/, "");
}
if (!validPassword(password)) {
  console.error("Password must be 12–128 characters.");
  process.exit(1);
}
const encoded = await hashPassword(password);
const db = openDatabase(
  path.resolve(process.env.DATABASE_PATH || "data/soovers.sqlite"),
);
try {
  transaction(db, () => {
    let user = db.prepare("SELECT id FROM users WHERE email=?").get(email);
    if (command === "create-user") {
      if (user) throw new Error("Account already exists.");
      user = { id: randomUUID() };
      db.prepare("INSERT INTO users VALUES (?,?,?,?,?)").run(
        user.id,
        email,
        name.trim(),
        encoded,
        new Date().toISOString(),
      );
    } else {
      if (!user) throw new Error("Account not found.");
      db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(
        encoded,
        user.id,
      );
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
    }
    db.prepare(
      "INSERT INTO audit_events(user_id,action,created_at) VALUES (?,?,?)",
    ).run(user.id, "operator." + command, new Date().toISOString());
  });
  console.log(
    command === "create-user"
      ? "Account created."
      : "Password reset; existing sessions revoked.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
