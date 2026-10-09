// k6 provides the Web Crypto API as a global; @types/k6 does not declare it.
declare const crypto: { randomUUID(): string };
