import { expect, test } from "@playwright/test";
import { completeOnboarding, expectNoA11yViolations, signUp, waitForHydration } from "./helpers.ts";

test("landing page introduces the station", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Nueslify/);
  await expect(page.getByText("Demo mode — AI voices are simulated")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start listening" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("a new listener signs up, tunes the station and goes on air", async ({ page }) => {
  await signUp(page, "Ada Lovelace");
  await expectNoA11yViolations(page);

  // Onboarding: German show, Berlin, sports only.
  await page.getByRole("button", { name: "Deutsch" }).click();
  await page.getByRole("button", { name: "Sports" }).click();
  await page.getByRole("button", { name: "Germany" }).click();
  await page.getByRole("button", { name: "World" }).click();
  await page.getByRole("button", { name: "Business" }).click();
  await completeOnboarding(page);

  await expect(page.getByRole("heading", { name: "Ada" })).toBeVisible();
  await expect(page.getByText("Deutsch", { exact: true })).toBeVisible();
  await expect(page.getByText("Sports", { exact: true })).toBeVisible();
  await expectNoA11yViolations(page);

  await waitForHydration(page);
  await page.getByRole("button", { name: "Start the show" }).click();

  // The opening is rendered in German by the (mock) host.
  await expect(page.getByText(/^Hallo Ada, hier ist News-lee-fy/)).toBeVisible();
  const rundown = page.getByRole("list");
  await expect(rundown.getByRole("listitem").first()).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("region", { name: "Player" })).toBeVisible();
  await expectNoA11yViolations(page);
});
