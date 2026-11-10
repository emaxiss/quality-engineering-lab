import type { KnownIssue } from "@/a11y/axe";

// Accessibility issues found by the suite and not fixed yet, passed to expectAccessible() by the
// scans they affect. Remove an entry when the application fixes it: the scan fails while a listed
// issue no longer reproduces.

export const PROFILE_LINK_LABEL_IN_NAME: KnownIssue = {
  rule: "label-content-name-mismatch",
  text: /Account settings$/,
  description:
    'Profile link in the sidebar shows the account\'s email but is named only "Account settings" (WCAG 2.5.3)',
};

// The names differ from the visible text only by a colon ("Saved: 1" for "Saved 1"). WCAG's
// guidance on 2.5.3 treats punctuation as not significant; axe 4.14 does not.
export const CHART_BAR_LABEL_IN_NAME: KnownIssue = {
  rule: "label-content-name-mismatch",
  text: /^(Saved|Applied|Interviewing|Offer|Rejected|High|Medium|Low)\s*\d+$/,
  description: 'Home chart bars named "Saved: 1" for the visible "Saved 1" (punctuation only)',
};

// The name holds company and title, which is the card's label. The visible card also shows the
// initials, location, work mode, date and priority, which axe 4.14 expects in the name too.
export const CARD_LABEL_IN_NAME: KnownIssue = {
  rule: "label-content-name-mismatch",
  text: /Added [A-Z][a-z]{2} \d{1,2}/,
  description: "Board cards named by company and title, without the initials and details also shown on the card",
};
