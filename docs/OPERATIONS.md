# Infrastructure runbook — SooVers Academy 1.0

## Deployment shape

One application container serves the built React app and authenticated API. Node 24's built-in SQLite driver stores records in `/app/data/academy.sqlite`. Compose creates a named volume at `/app/data`, runs as UID/GID 1000, drops capabilities, sets no-new-privileges, makes the container root filesystem read-only, and publishes `127.0.0.1:8080` on the host. A host HTTPS reverse proxy terminates TLS.

Use local durable storage. Do not share the SQLite volume across replicas or place it on a network filesystem. This deployment has no background worker or external identity/email service. Its course is an educational simulation.

## Build and start

From the repository root on a Docker/Compose host:

```sh
export APP_ORIGIN=https://academy.your-company.example
export REGISTRATION_OPEN=true
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:8080/readyz
```

Replace the example origin with the real HTTPS scheme and host, without a path or trailing slash. Install the host's TLS certificate and use `deploy/nginx.conf` within that HTTPS virtual host. Serve at the domain root. The application does not support a subpath deployment. Preserve Origin through the proxy. Do not enable caching for `/api/`.

`APP_ORIGIN` is required in production; insecure origins prevent startup. `REGISTRATION_OPEN=false` disables new public registrations but allows login and operator-created accounts. Port, bind address and database path are set in the image; normal deployments should retain them. `.env.example` also describes direct Node/systemd deployment. Compose reads exported variables or a local `.env`; the Node process does not implicitly load `.env`.

If building behind a corporate HTTPS proxy, supply the public CA to the existing build secret without baking it into the image:

```sh
docker build --secret id=build_ca,src=/path/to/public-proxy-ca.pem -t soovers-academy:1.0.0 .
```

Retain TLS verification and your Docker proxy configuration. The runtime makes no third-party requests. The image contains the compiled web assets and the API source; it does not contain npm dependencies, the original ZIP, test accounts, or a database.

## Prebuilt image handoff

The supplied image archive is Linux amd64. On a matching Docker host, load it and start Compose without rebuilding:

```sh
sha256sum -c SooVers_Academy_1.0.0_linux-amd64.tar.gz.sha256
gunzip -c SooVers_Academy_1.0.0_linux-amd64.tar.gz | docker load
export APP_ORIGIN=https://academy.your-company.example
docker compose up -d --no-build
```

Run these from the extracted source package containing `compose.yaml`, with the image archive and its checksum in that directory. The image tag is `soovers-academy:1.0.0`. For a different CPU architecture, build from the included source on that host and run the same container validation. No public registry push or public deployment was performed.

## First run and accounts

Open the HTTPS site and create a learner account. No default credentials exist. For controlled enrollment, close registration and create accounts using the operator CLI:

```sh
docker compose exec soovers node scripts/admin.mjs create-user learner@example.com 'Learner Name'
docker compose exec soovers node scripts/admin.mjs reset-password learner@example.com
```

Both commands prompt for a hidden password (12–128 characters). Do not put passwords in command arguments or tickets. Reset revokes all prior sessions. Convey the temporary password through your approved private channel; the learner can change it in account settings. Provide your learners with the infrastructure team's recovery contact. Self-service email recovery is not implemented, and email ownership is not verified.

Learner roles cannot be elevated through the UI. The campus preview's role selector is unrelated to academy authentication.

## Backup and restore

A consistent online backup uses SQLite's backup API, checks integrity, and creates a file readable only by its owner. Copy it off the application host and protect it as account data. Schedule this through your organization's scheduler; nothing is scheduled automatically.

```sh
docker compose exec soovers node scripts/backup.mjs /app/data/backup-2026-10-15.sqlite
docker compose cp soovers:/app/data/backup-2026-10-15.sqlite ./backup-2026-10-15.sqlite
```

Use a fresh filename every run. Do not simply copy a live database: committed data can reside in its WAL. Retention and off-host storage are infrastructure responsibilities. Backups include password hashes, sessions, email addresses, and learning records.

Restore into an **empty new named volume**, keeping the old volume intact:

1. Stop the application: `docker compose stop soovers`.
2. Save the existing image and volume identifiers for rollback. Make a final verified backup before stopping if the database is healthy.
3. Create a new named volume and point the Compose `academy-data` volume's `name` at it using an override. Do not remove the original volume.
4. Restore the backup with the included tool. It verifies the SQLite file and refuses to overwrite an existing database or journal. For example, with a new volume named `soovers-restored` and the backup in the current directory:

   ```sh
   docker volume create soovers-restored
   docker run --rm --mount type=volume,src=soovers-restored,dst=/app/data --mount type=bind,src="$PWD/backup-2026-10-15.sqlite",dst=/backup.sqlite,readonly soovers-academy:1.0.0 node scripts/restore.mjs /backup.sqlite
   ```

   The mounted backup must be readable by container UID 1000 through an approved transfer location. Do not make backups world-readable. The new volume receives ownership from the image; the restore creates a mode-0600 database. Never restore into the active volume.
5. Start the application against the restored volume. It applies missing migrations transactionally. Check `/readyz`, then verify sign-in, enrollment, progress and report export with a known test account.
6. After any credential compromise, revoke restored sessions before reopening: use the password-reset tool for affected accounts, or delete all rows from `sessions` with an approved operator procedure.

Test the restore process on your infrastructure before accepting learner data. Never use `docker compose down -v` as a routine restart; it deletes the database volume.

## Monitoring and limits

- `/healthz` and `/readyz` check application and database availability. Docker checks `/healthz` every 30 seconds.
- Request failures include a request ID; internal logs omit credentials, cookies, payloads and email addresses. Inspect with `docker compose logs --tail=100 soovers`.
- Audit events record account creation, login, password changes, enrollment and submissions in SQLite. Define retention and access according to your operating needs.
- Authentication is limited per email and socket peer; forwarded IP headers are deliberately not trusted. A reverse proxy may combine learners under one peer. This initial release allows 40 authentication requests per peer and 12 per email in 15 minutes. Validate this limit against planned class size; use a reviewed trusted-proxy policy before a larger rollout.
- Authenticated APIs permit 240 requests per minute per learner. Request bodies are limited to 16 KiB. Requests time out after 15 seconds. Sessions expire after seven days.
- SQLite is appropriate for this single-server deployment. Concurrency, backup objectives, availability targets, and independent security testing must be validated for the organization's intended load. No capacity claim is made.

## Updates and rollback

Build a versioned image and retain the previous image digest. Run the automated tests, back up the database, deploy the image, and check health plus the learner journey. Migrations run at startup in transactions and are tracked in `migrations`. This release introduces schema 001; no destructive migration is included.

For an application-only regression with a compatible schema, switch back to the previous image. If a future migration is incompatible, restore the matching pre-upgrade backup into a new volume and run the matching image. Do not run an older application against an unreviewed newer schema.

## Reproducible checks

```sh
docker build -t soovers-academy:1.0.0 .
SOOVERS_TEST_IMAGE=soovers-academy:1.0.0 node scripts/test-container.mjs
```

The container test requires Node 24 and Docker on the host. It creates a temporary container and volume, registers a synthetic account, persists course progress, restarts the container, checks the session and learning record, and verifies an online database backup. It removes only its own temporary container and volume.
