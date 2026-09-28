function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

// Getters, not constants: playwright.config.ts loads .env after this module is imported.
export const env = {
  get baseURL(): string {
    return process.env.BASE_URL ?? "https://rolequeue.vercel.app";
  },
  get userEmail(): string {
    return required("E2E_USER_EMAIL");
  },
  get userPassword(): string {
    return required("E2E_USER_PASSWORD");
  },
  get loginUserEmail(): string {
    return required("E2E_LOGIN_USER_EMAIL");
  },
  get loginUserPassword(): string {
    return required("E2E_LOGIN_USER_PASSWORD");
  },
  /** Base path of the applications API. Override to test a build that serves it elsewhere. */
  get applicationsApiPath(): string {
    return process.env.APPLICATIONS_API_PATH ?? "/api/v1/applications";
  },
  /** Where the migration seed phase writes its snapshot and the verify phase reads it. */
  get migrationSnapshotDir(): string {
    return process.env.MIGRATION_SNAPSHOT_DIR ?? "migration-snapshots";
  },
  /** Value changes the upgrade makes, as JSON, for example `{"status":{"OLD":"NEW"}}`. See src/migration/expected-changes.ts. */
  get migrationExpectedChanges(): string | undefined {
    return process.env.MIGRATION_EXPECTED_CHANGES;
  },
  /** Paths an upgrade removed, comma-separated. The verify phase expects each to answer 404. */
  get migrationRemovedPaths(): string[] {
    return (process.env.MIGRATION_REMOVED_PATHS ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  },
};

export const AUTH_STATE_PATH = "playwright/.auth/user.json";
