import { expect, test } from "@playwright/test";
import { completeOnboarding, expectNoA11yViolations, signUp } from "./helpers.ts";

test("visitors reach the Impressum and privacy policy from the footer", async ({ page }) => {
  await page.goto("/");
  const legal = page.getByRole("navigation", { name: "Legal" });

  await legal.getByRole("link", { name: "Impressum" }).click();
  await expect(page.getByRole("heading", { name: "Impressum", level: 1 })).toBeVisible();
  await expect(page.getByText("c/o Impressumservice Dein-Impressum")).toBeVisible();
  await expect(page.getByRole("link", { name: "nueslify@huibers.io" })).toBeVisible();
  await expectNoA11yViolations(page);

  await legal.getByRole("link", { name: "Privacy policy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("signed-in pages link to the legal pages too", async ({ page }) => {
  await signUp(page, "Legal Reader");
  await completeOnboarding(page);

  const legal = page.getByRole("navigation", { name: "Legal" });
  await expect(legal.getByRole("link", { name: "Impressum" })).toBeVisible();
  await legal.getByRole("link", { name: "Privacy policy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
});
