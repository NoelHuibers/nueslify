import { expect, test } from "@playwright/test";
import {
  chooseMusicSource,
  completeOnboarding,
  expectNoA11yViolations,
  signUp,
  waitForHydration,
} from "./helpers.ts";

test("a listener picks international outlets and hears them", async ({ page }) => {
  await signUp(page, "Kofi");
  await waitForHydration(page);
  await chooseMusicSource(page, /^No music/);

  const germany = page.getByRole("group", { name: "Germany" });
  await expect(germany.getByRole("checkbox", { name: "tagesschau" })).toBeChecked();
  await expect(germany.getByText("Öffentlich-rechtlich").first()).toBeVisible();

  await page.getByRole("checkbox", { name: "BBC News" }).click();
  await page.getByRole("checkbox", { name: "The Guardian" }).click();
  await germany.getByRole("checkbox", { name: "tagesschau" }).click();
  await expect(page.getByText("2 outlets · your mix leans centre")).toBeVisible();
  await expectNoA11yViolations(page);

  await completeOnboarding(page);
  await waitForHydration(page);
  await page.keyboard.press("Space");
  await expect(page.getByText(/^Good \w+, Kofi!|^Hey there, Kofi!/)).toBeVisible();
  await page.keyboard.press("n");
  await expect(
    page.getByRole("link", { name: /Read on (bbc\.co\.uk|theguardian\.com)/ }),
  ).toBeVisible();
});

test("the same event from several outlets is played once, with credits", async ({ page }) => {
  await signUp(page, "Ines");
  await waitForHydration(page);
  await chooseMusicSource(page, /^No music/);
  await page.getByRole("checkbox", { name: "DER SPIEGEL" }).click();
  await page.getByRole("checkbox", { name: "ZDFheute" }).click();
  await page.getByRole("checkbox", { name: "Deutschlandfunk" }).click();
  await completeOnboarding(page);
  await waitForHydration(page);

  await page.keyboard.press("Space");
  await expect(page.getByText(/^Good \w+, Ines!|^Hey there, Ines!/)).toBeVisible();
  await page.keyboard.press("n");
  await expect(page.getByText(/^Also reported by /)).toBeVisible();
  await expect(page.getByText(/reported it too\.$/)).toBeVisible();
});

test("the about page lists every outlet with ownership and ratings", async ({ page }) => {
  await page.goto("/about");
  const table = page.getByRole("table", { name: "News outlets, ownership and ratings" });
  const tagesschau = table.getByRole("row", { name: /tagesschau/ });
  await expect(tagesschau).toContainText("Öffentlich-rechtlich");
  await expect(tagesschau).toContainText("Centre");
  await expect(table.getByRole("row", { name: /taz/ })).toContainText("Left");
  await expect(
    table.getByRole("link", { name: /rating for The Telegraph on Media Bias\/Fact Check/ }),
  ).toHaveAttribute("href", "https://mediabiasfactcheck.com/daily-telegraph/");
  await expectNoA11yViolations(page);
});
