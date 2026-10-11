import { test, expect } from "@playwright/test";

test.describe("Timer Lifecycle & Session Recovery Smoke Test", () => {
  test("engages lane, survives browser reload with timer persistence, and logs session", async ({
    page,
  }) => {
    // 1. Navigate to application
    await page.goto("/");
    await expect(page.locator(".timer-cockpit")).toBeVisible();
    await expect(page.locator(".dial-clock")).toHaveText("00:00:00");
    await expect(page.locator(".dial-live-status")).toContainText("READY");

    // 2. Locate first available task start button
    const firstStartButton = page.locator(".start-button").first();
    await expect(firstStartButton).toBeVisible();
    await firstStartButton.click();

    // 3. Verify timer engages
    await expect(page.locator(".dial-live-status")).toContainText("STATUS: ENGAGED");
    await expect(page.locator(".timer-cockpit")).toHaveClass(/is-running/);

    // Wait 2 seconds for timer to tick
    await page.waitForTimeout(2200);

    // 4. Simulate page reload / recovery
    await page.reload();

    // 5. Verify session survived reload and is actively running
    await expect(page.locator(".dial-live-status")).toContainText("STATUS: ENGAGED");
    await expect(page.locator(".timer-cockpit")).toHaveClass(/is-running/);

    // 6. Record session note deliverables
    const noteInput = page.locator("#timer-session-note");
    await expect(noteInput).toBeEnabled();
    await noteInput.fill("Smoke test deliverable verified");

    // 7. Stamp log / complete session
    const stampButton = page.locator('button:has-text("Stamp Log")');
    await expect(stampButton).toBeEnabled();
    await stampButton.click();

    // 8. Verify timer returns to standby
    await expect(page.locator(".dial-live-status")).toContainText("STATUS: READY");
    await expect(page.locator(".timer-cockpit")).not.toHaveClass(/is-running/);
  });
});
