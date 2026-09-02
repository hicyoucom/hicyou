# Migrating from HiCyou v1

The v2 preview changes authentication and database structure. Treat the upgrade as a data migration, not an in-place application update.

1. Stop writes to the v1 instance and create a verified database backup.
2. Restore that backup into a separate staging database.
3. Set `V1_DATABASE_URL` to the read-only v1 database and `DATABASE_URL` to an empty, migrated v2 staging database.
4. Run `bun run migrate:v1 -- --dry-run` and review aggregate counts and conflicts.
5. Run `bun run migrate:v1 -- --backup-confirmed` only against staging after verifying the backup.
6. Test content, submissions, administrator access, and redirects before scheduling production cutover.

The migration does not copy passwords, OAuth tokens, sessions, service-role keys, or other credentials. Existing users must sign in again and may need to reconnect ownership. The tool reports only aggregate counts and generated identifiers; it does not print user records.

The v2.0 preview does not claim a lossless migration for every customized v1 installation. Keep the v1 backup and deployment available until you have independently verified the result.
