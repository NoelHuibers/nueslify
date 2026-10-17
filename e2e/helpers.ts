import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const CRON_SECRET = "e2e-cron-secret-0123456789";
export const PASSWORD = "correct-horse-battery";

/** Waits until React has hydrated, so clicks hit handlers instead of native defaults. */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    [...document.querySelectorAll("a,button,form")].some((element) =>
      Object.keys(element).some((key) => key.startsWith("__react")),
    ),
  );
}

export function uniqueEmail(prefix = "listener"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

export async function signUp(
  page: Page,
  name = "Ada Lovelace",
  email = uniqueEmail(),
): Promise<string> {
  await page.goto("/sign-up");
  await waitForHydration(page);
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  return email;
}

export async function completeOnboarding(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Let's tune your station" })).toBeVisible();
  await waitForHydration(page);
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page).toHaveURL(/\/listen$/);
}

export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // The TanStack devtools button only exists in development builds.
    .exclude("[data-testid='tanstack_devtools']")
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

/** Picks an option in the "Play music from" select on the welcome or settings page. */
export async function chooseMusicSource(page: Page, option: string | RegExp): Promise<void> {
  await page.getByLabel("Play music from").click();
  await page.getByRole("option", { name: option }).click();
}
