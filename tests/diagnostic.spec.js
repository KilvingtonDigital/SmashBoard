// @ts-check
/**
 * DIAGNOSTIC: step-by-step screenshots to identify hang point in bulkAddPlayers
 */
const { test, expect } = require('@playwright/test');

test('DIAG · Find exact hang point', async ({ page }) => {
    test.setTimeout(90000);

    console.log('STEP 1: Navigate');
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/diag-01-load.png', fullPage: true });

    console.log('STEP 2: Check what is visible');
    const body = await page.locator('body').textContent();
    const navBtns = await page.locator('nav button').all();
    for (const btn of navBtns) {
        const txt = await btn.textContent().catch(() => '?');
        console.log(`  nav btn: "${txt?.replace(/\s+/g, ' ').trim()}"`);
    }

    console.log('STEP 3: Handle any dialogs');
    const migrateBtn = page.getByRole('button', { name: /migrate data/i });
    if (await migrateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('  → Migrate Data dialog found, clicking...');
        await migrateBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'tests/screenshots/diag-02-migrate.png' });
    }
    const continueBtn = page.getByRole('button', { name: /^Continue$/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('  → Continue dialog found, clicking...');
        await continueBtn.click();
        await page.waitForTimeout(500);
    }

    console.log('STEP 4: Try End & Clear');
    const endBtn = page.locator('nav button').filter({ hasText: 'End' }).first();
    const endVisible = await endBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  End button visible: ${endVisible}`);
    if (endVisible) {
        await endBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: 'tests/screenshots/diag-03-end-modal.png' });
        const endClearBtn = page.getByRole('button', { name: /End & Clear/i });
        const endClearVisible = await endClearBtn.isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`  End & Clear visible: ${endClearVisible}`);
        if (endClearVisible) {
            await endClearBtn.click();
            await page.waitForTimeout(1500);
        } else {
            await page.keyboard.press('Escape');
        }
    }

    console.log('STEP 5: List all modals/overlays on page');
    await page.screenshot({ path: 'tests/screenshots/diag-04-after-clear.png', fullPage: true });

    console.log('STEP 6: Click Setup tab');
    const setupBtn = page.locator('nav button').filter({ hasText: 'Setup' }).first();
    const setupVisible = await setupBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  Setup button visible: ${setupVisible}`);
    if (setupVisible) {
        await setupBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: 'tests/screenshots/diag-05-setup-tab.png', fullPage: true });
    }

    console.log('STEP 7: Find bulk add summary');
    const summaries = await page.locator('summary').all();
    for (const s of summaries) {
        const txt = await s.textContent().catch(() => '?');
        console.log(`  summary: "${txt?.replace(/\s+/g, ' ').trim()}"`);
    }

    const bulkSummary = page.locator('summary').filter({ hasText: /Add multiple/i }).first();
    const bulkVisible = await bulkSummary.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  Bulk add summary visible: ${bulkVisible}`);

    if (bulkVisible) {
        await bulkSummary.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: 'tests/screenshots/diag-06-accordion.png' });
    }

    console.log('STEP 8: Find textarea');
    const textareas = await page.locator('textarea').all();
    console.log(`  Textareas found: ${textareas.length}`);
    for (const ta of textareas) {
        const ph = await ta.getAttribute('placeholder').catch(() => '?');
        console.log(`    placeholder: "${ph}"`);
    }

    console.log('DIAG complete');
    await page.screenshot({ path: 'tests/screenshots/diag-07-final.png', fullPage: true });
});
