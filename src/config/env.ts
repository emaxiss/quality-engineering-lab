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
    return process.env.BASE_URL ?? "http://localhost:3000";
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
};

export const AUTH_STATE_PATH = "playwright/.auth/user.json";
