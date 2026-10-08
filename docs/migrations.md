# Database migration tests

An upgrade test proves that a release with a database migration keeps every record, keeps derived figures and access rules, and that the application still works on migrated data. It runs in two phases, through the API only:

1. **Seed**, against the version before the upgrade: creates a fixed dataset in two accounts and saves a snapshot of everything the API reports about each account.
2. **Verify**, against the version after the upgrade: compares both accounts with the snapshot, then exercises the migrated records.

The dataset covers what a migration can break: every stage and priority, every enum value, empty optional fields, maximum lengths (200-character text, a 10,000-character description, 10 tags of 40 characters), Unicode and emoji, the lowest and highest salary and a minimum equal to the maximum, all three dates set and unset, follow-ups due and not due, several pages of records, and records in a second account.

| Check | Protects against |
| --- | --- |
| Keeps every record, and adds none | Rows lost or duplicated while tables, keys or types are rewritten |
| Leaves every record as it was, apart from the expected changes, timestamps included | Truncated text, mangled Unicode, lost values, value rewrites that go further than intended, and backfills that touch `createdAt` or `updatedAt` |
| Keeps the dashboard figures | Enum or status mappings that shift records into the wrong stage or priority |
| Keeps each account's records private | Ownership or access rules lost or rebuilt wrongly |
| Migrated records can still be updated, filtered, sorted and deleted | Broken indexes, constraints or defaults that only show up on writes |
| Paths the upgrade removed answer 404 | Old endpoints left serving after a rename (set `MIGRATION_REMOVED_PATHS`) |

## Run an upgrade test

1. Start the version before the upgrade and point `BASE_URL` at it.
2. `pnpm test:migration:seed` writes the snapshot to `MIGRATION_SNAPSHOT_DIR` (default `migration-snapshots/`, git-ignored).
3. Apply the migration and start the new version, with the same database and accounts.
4. `pnpm test:migration:verify` runs the checks, then deletes the seeded records. If verify cannot start, for example because sign-in is rate limited, it keeps the data so it can simply run again.

| Variable | Used for |
| --- | --- |
| `APPLICATIONS_API_PATH` | Base path of the applications API, when one version serves it somewhere else |
| `MIGRATION_SNAPSHOT_DIR` | Where the snapshot is written and read |
| `MIGRATION_REMOVED_PATHS` | Comma-separated paths the upgrade removed; each must answer 404 |
| `MIGRATION_EXPECTED_CHANGES` | Values the upgrade rewrites, as JSON per field, for example `{"status":{"WITHDRAWN":"DECLINED"}}`. Verify applies them to the snapshot before comparing, including the keys of per-stage counts, so it checks that the migration rewrote exactly those values and nothing else |

Each phase signs in twice (both accounts).
