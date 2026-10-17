import { expect, test } from "@playwright/test";
import { chooseMusicSource, completeOnboarding, signUp, waitForHydration } from "./helpers.ts";

test("skipping through the show, saving a story and finding it in history", async ({ page }) => {
  await signUp(page, "Grace Hopper");
  await waitForHydration(page);
  await chooseMusicSource(page, /^No music/);
  await completeOnboarding(page);
  await waitForHydration(page);
  await expect(page.getByText("News only", { exact: true })).toBeVisible();

  await page.keyboard.press("Space");
  await expect(page.getByText(/^Good \w+, Grace!|^Hey there, Grace!/)).toBeVisible();

  // Skip the opening with the keyboard shortcut; a news story follows (news-only show).
  await page.keyboard.press("n");
  const storyHeading = page.locator("h2").first();
  await expect(page.getByRole("link", { name: /Read on tagesschau.de/ })).toBeVisible();
  const title = (await storyHeading.textContent()) ?? "";
  expect(title.length).toBeGreaterThan(5);

  await page.getByRole("button", { name: "Save story" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

  // The show keeps running while browsing: the player dock stays on screen.
  await page.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(/\/history/);
  await expect(page.getByRole("heading", { name: "History", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Player" })).toBeVisible();
  await expect(page.getByRole("main").getByText(title, { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Saved" }).click();
  await expect(page).toHaveURL(/saved=true/);
  await expect(page.getByRole("main").getByText(title, { exact: true })).toBeVisible();
});

test("pause and resume from the dock", async ({ page }) => {
  await signUp(page, "Linus");
  await completeOnboarding(page);
  await waitForHydration(page);
  await page.getByRole("button", { name: "Start the show" }).click();

  const dock = page.getByRole("region", { name: "Player" });
  await expect(dock.getByRole("button", { name: "Pause" })).toBeVisible();
  await dock.getByRole("button", { name: "Pause" }).click();
  await expect(dock.getByRole("button", { name: "Play" })).toBeVisible();
  await dock.getByRole("button", { name: "Play" }).click();
  await expect(dock.getByRole("button", { name: "Pause" })).toBeVisible();
});

test("free music plays between the news and the show moves on by itself", async ({ page }) => {
  await signUp(page, "Ella");
  // Without any connected account, the free catalogue is offered automatically.
  await expect(page.getByText("No account needed").first()).toBeVisible();
  await completeOnboarding(page);
  await expect(page.getByText("Music: Audius")).toBeVisible();
  await waitForHydration(page);

  await page.keyboard.press("Space");
  await expect(page.getByText(/This is News-lee-fy/)).toBeVisible();
  await page.keyboard.press("n");

  // A song from the catalogue, with the attribution and link-back the provider requires.
  await expect(page.getByText("Now playing")).toBeVisible();
  const songTitle = (await page.locator("h2").first().textContent()) ?? "";
  expect(songTitle).toMatch(/Tone$/);
  await expect(page.getByRole("link", { name: "via Audius (demo)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Listen on Audius" })).toHaveAttribute(
    "href",
    /^https:\/\/audius\.co\//,
  );
  await expect(page.getByRole("region", { name: "Player" })).toContainText(songTitle);

  // The 2-second demo song ends on its own and the show continues with the next segment.
  await expect(page.locator("h2").first()).not.toHaveText(songTitle, { timeout: 10_000 });
});
