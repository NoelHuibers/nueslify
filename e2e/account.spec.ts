import { expect, test } from "@playwright/test";
import { completeOnboarding, PASSWORD, signUp, uniqueEmail, waitForHydration } from "./helpers.ts";

test("protected pages redirect to sign-in and back", async ({ page }) => {
  const email = uniqueEmail("returning");
  await signUp(page, "Returning Listener", email);
  await completeOnboarding(page);

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fsettings/);
  await waitForHydration(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});

test("wrong password shows an error", async ({ page }) => {
  const email = uniqueEmail("typo");
  await signUp(page, "Typo", email);
  await completeOnboarding(page);
  await page.context().clearCookies();

  await page.goto("/sign-in");
  await waitForHydration(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});

test("settings are saved and the theme can be switched", async ({ page }) => {
  await signUp(page, "Settings Fan");
  await completeOnboarding(page);
  await page.goto("/settings");
  await waitForHydration(page);

  await page.getByRole("radio", { name: /Professional/ }).click();
  await page.getByLabel("What should your host call you?").fill("Captain");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved. Your host has taken notes.")).toBeVisible();

  await page.goto("/listen");
  await expect(page.getByRole("heading", { name: "Captain" })).toBeVisible();
  await expect(page.getByText("Professional host")).toBeVisible();

  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitemradio", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("deleting the account signs out for good", async ({ page }) => {
  const email = uniqueEmail("leaving");
  await signUp(page, "Leaving", email);
  await completeOnboarding(page);
  await page.goto("/settings");
  await waitForHydration(page);

  await page.getByRole("button", { name: "Delete account" }).click();
  await page.getByRole("button", { name: "Delete forever" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/sign-in");
  await waitForHydration(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});
