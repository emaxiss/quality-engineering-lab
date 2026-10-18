import type { Locator } from "@playwright/test";

/**
 * Types a credential into an input the way fill() does, without the value showing up in the
 * report. fill() names its step after the value ("Fill "…""), and the HTML report is published.
 * The value goes in through the native setter plus an input event, which React picks up as typing.
 */
export async function fillSecret(input: Locator, value: string): Promise<void> {
  await input.evaluate((element, secret) => {
    if (!(element instanceof HTMLInputElement)) throw new Error("fillSecret needs an <input>");
    // The prototype's setter, not element.value: React tracks the instance property and would
    // treat a plain assignment as no change.
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.bind(element);
    element.focus();
    setValue?.(secret);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}
