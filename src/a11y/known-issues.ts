import type { KnownIssue } from "@/a11y/axe";

// Found by the accessibility suite. Remove an entry when the application fixes it:
// the scan fails while a listed issue no longer reproduces.

export const ACTIVE_NAV_CONTRAST: KnownIssue = {
  rule: "color-contrast",
  text: /^(Home|Applications|Settings)$/,
  description: "Current page in the sidebar: light text on the blue highlight, 3.74:1 (needs 4.5:1)",
};

export const DATE_LINE_CONTRAST: KnownIssue = {
  rule: "color-contrast",
  text: /^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}$/,
  description: "Date line above the dashboard heading: 12px blue text, 4.36:1 (needs 4.5:1)",
};

export const PRIORITY_BADGE_CONTRAST: KnownIssue = {
  rule: "color-contrast",
  text: /^High$/,
  description: "High priority badge in the landing page preview: 12px orange on light orange, 4.22:1 (needs 4.5:1)",
};
