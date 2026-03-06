// @ts-check
/**
 * E2E Test: Full Single-Match Round Robin Tournament
 *
 * Auth:     handled by tests/auth.setup.js (storageState)
 * Selectors: verified against Scribe recording + source code
 *
 * BUGS FIXED:
 *  - goTab used anchored regex /^Setup$/ but nav buttons contain icon+label
 *    (e.g. inner text is "⚙️\nSetup") — changed to substring match
 *  - Added handling for "Migrate Data" cloud dialog in beforeEach
 *  - beforeEach uses End → End & Clear to properly reset cloud + local state
 */
const { test, expect } = require('@playwright/test');

// ── Players ────────────────────────────────────────────────────────────────
const ALL_PLAYERS = `Don McMillan, 3.45, M
Austin Newell, 3.19, M
Debra Wales, 3.63, F
Ricky Whittaker, 3.6, M
Josh Mellette, 3.66, M
Jerry DeKeyser, 2.5, M
Raj Patel, 3.59, M
Mark Cauthen, 3.55, M
Rachael Henson, 3.0, F
Kent Jones, 3.0, M
Claudia M, 3.41, F
Ken Robinson, 3.0, M
Fili Siamomua, 4.0, M
Keith Poindexter, 3.71, M
Tia Chick, 3.14, F
Kelvin Clark, 3.0, M
Rick Towner, 3.0, M
Marion Acosta, 3.0, F
Patrick McCabe, 3.7, M
Thomas Sheffield, 3.0, M
Cade Clason, 3.0, M`;

const ABSENT_ROLL_CALL = ['Jerry DeKeyser', 'Rachael Henson', 'Rick Towner'];
const ABSENT_ROUND_8 = ['Don McMillan', 'Austin Newell', 'Josh Mellette', 'Mark Cauthen'];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Click a bottom-nav tab — uses substring match because buttons have icon + label text */
async function goTab(page, label) {
    // Nav button inner text is like "⚙️\nSetup" so we can't use anchored regex
    await page.locator('nav button').filter({ hasText: label }).first().click();
    await page.waitForTimeout(400);
}

/** Ensure app is loaded; fallback to UI login */
async function ensureLoggedIn(page) {
    // Check for any nav button containing "Setup" text (substring)
    const onApp = await page.locator('nav button')
        .filter({ hasText: 'Setup' })
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
    if (!onApp) {
        const emailInput = page.locator('input[type="email"]').first();
        if (await emailInput.isVisible({ timeout: 4000 }).catch(() => false)) {
            await emailInput.fill('rickykwhittaker.rw@gmail.com');
            await page.locator('input[type="password"]').first().fill('W4488253r!');
            await page.locator('button[type="submit"]').click();
            await page.locator('nav button').filter({ hasText: 'Setup' })
                .first().waitFor({ timeout: 15000 });
            console.log('  [E2E] Fell back to UI login');
        }
    }
}

/** Dismiss any blocking dialogs (Migrate Data, Continue prompts) */
async function dismissDialogs(page) {
    // "Migrate Data" dialog (Scribe step 4)
    const migrateBtn = page.getByRole('button', { name: /migrate data/i });
    if (await migrateBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await migrateBtn.click();
        await page.waitForTimeout(500);
    }
    // "Continue" after migrate (Scribe step 5)
    const continueBtn = page.getByRole('button', { name: /^Continue$/i });
    if (await continueBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
    }
    // Escape any other modal
    await page.keyboard.press('Escape').catch(() => { });
    await page.waitForTimeout(200);
}

/** Clear tournament via the app's End & Clear (clears cloud + local session) */
async function clearSession(page) {
    try {
        const endBtn = page.locator('nav button').filter({ hasText: 'End' }).first();
        if (await endBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await endBtn.click();
            await page.waitForTimeout(600);
            const endClearBtn = page.getByRole('button', { name: /End & Clear/i });
            if (await endClearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await endClearBtn.click();
                await page.waitForTimeout(1500);
            } else {
                // No data to clear — just close the End modal
                await page.keyboard.press('Escape').catch(() => { });
            }
        }
    } catch {
        // Not blocking if this fails
    }
}

/**
 * Add all players via bulk-add in Setup tab.
 * Scribe: expand "(one per line)" accordion → paste → "Parse & add" → "Continue to Roster →"
 */
async function bulkAddPlayers(page) {
    await goTab(page, 'Setup');
    await dismissDialogs(page);

    // Expand the bulk-add accordion
    const summary = page.locator('summary').filter({ hasText: /Add multiple players at once/i });
    const details = summary.locator('..');  // parent <details>
    const isOpen = await details.evaluate(el => el.open).catch(() => false);
    if (!isOpen) await summary.click();
    await page.waitForTimeout(300);

    // Fill textarea and submit
    const textarea = page.locator('textarea').filter({ hasText: '' }).first();
    await textarea.waitFor({ timeout: 8000 });
    await textarea.fill(ALL_PLAYERS);
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: 'Parse & add' }).click();
    await page.waitForTimeout(1200);

    // "Continue to Roster →" (Scribe step 12)
    const continueBtn = page.getByRole('button', { name: /Continue to Roster/i });
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(600);
    }
}

/**
 * On Roster tab: mark all present, then mark specified players absent.
 */
async function setupPresence(page, absentNames) {
    await goTab(page, 'Roster');
    await page.waitForTimeout(500);

    // Mark everyone present
    const presentBtns = page.locator('button[aria-label="Mark present"]');
    const count = await presentBtns.count();
    for (let i = 0; i < count; i++) {
        if (await presentBtns.nth(i).isVisible().catch(() => false)) {
            await presentBtns.nth(i).click();
            await page.waitForTimeout(80);
        }
    }

    // Mark specified absent
    for (const name of absentNames) {
        const row = page.locator('div, li').filter({ hasText: name }).last();
        const btn = row.locator('button[aria-label="Mark absent"]').first();
        if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
            await btn.click();
            await page.waitForTimeout(150);
            console.log(`  → Absent: ${name}`);
        }
    }
}

/** Mark specific players absent mid-tournament */
async function markAbsent(page, names) {
    await goTab(page, 'Roster');
    await page.waitForTimeout(400);
    for (const name of names) {
        const row = page.locator('div, li').filter({ hasText: name }).last();
        const btn = row.locator('button[aria-label="Mark absent"]').first();
        if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
            await btn.click();
            await page.waitForTimeout(150);
            console.log(`  → Mid-round absent: ${name}`);
        }
    }
}

/** Generate Round 1 from Setup tab */
async function generateRound1(page) {
    await goTab(page, 'Setup');
    await page.getByRole('button', { name: 'Start Tournament (Generate Round 1)' }).click();
    await page.waitForTimeout(2000);
    await goTab(page, 'Schedule');
}

/** Generate next round — button text is "🎾 Start Round N" (Scribe step 35) */
async function generateNextRound(page) {
    await goTab(page, 'Schedule');
    const btn = page.getByRole('button', { name: /Start Round \d+/i });
    await btn.waitFor({ timeout: 8000 });
    await btn.click();
    await page.waitForTimeout(2000);
}

/**
 * Complete all courts using quick-win buttons (player name + " win")
 * Falls back to Score modal flow if quick-win buttons aren't visible.
 */
async function completeAllCourts(page) {
    await goTab(page, 'Schedule');
    await page.waitForTimeout(500);

    // Quick-win: buttons ending in " win" in round cards
    const winBtns = page.locator('button').filter({ hasText: / win$/ });
    const winCount = await winBtns.count();

    if (winCount > 0) {
        // Each match has 2 win buttons; click the first of each pair
        for (let i = 0; i < winCount; i += 2) {
            if (await winBtns.nth(i).isVisible().catch(() => false)) {
                await winBtns.nth(i).click();
                await page.waitForTimeout(400);
            }
        }
    } else {
        // Fallback: Score modal (Scribe steps 14–34)
        let attemptsLeft = 10;
        while (attemptsLeft-- > 0) {
            const scoreBtn = page.getByRole('button', { name: '✓ Score' }).first();
            if (!await scoreBtn.isVisible({ timeout: 2000 }).catch(() => false)) break;
            await scoreBtn.click();
            await page.waitForTimeout(500);

            const inputs = page.locator('input[type="number"]').filter({ visible: true });
            if (await inputs.nth(0).isVisible({ timeout: 2000 }).catch(() => false)) {
                await inputs.nth(0).fill('11');
                if (await inputs.nth(1).isVisible().catch(() => false)) {
                    await inputs.nth(1).fill('7');
                }
            }

            const saveBtn = page.getByRole('button', { name: /Save & Complete Match/i });
            const clearBtn = page.getByRole('button', { name: /Complete & Clear Court/i });
            if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await saveBtn.click();
            } else if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await clearBtn.click();
            } else {
                break; // No completion button found
            }
            await page.waitForTimeout(700);
        }
    }
    await page.waitForTimeout(800);
}

// ── Test Suite ─────────────────────────────────────────────────────────────
test.describe('Single Match E2E Tournament', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
        await ensureLoggedIn(page);
        await dismissDialogs(page);
        await clearSession(page);           // End & Clear resets cloud + local
        await dismissDialogs(page);         // Handle any post-clear dialogs
        console.log('  [✓] beforeEach ready');
    });

    // ── 1 ─────────────────────────────────────────────────────────────────
    test('1 · Add 21 players via bulk add', async ({ page }) => {
        await bulkAddPlayers(page);
        await expect(page.getByText('Don McMillan').first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Cade Clason').first()).toBeVisible();
        await page.screenshot({ path: 'tests/screenshots/01-players-added.png', fullPage: true });
        console.log('✓ Test 1 PASSED');
    });

    // ── 2 ─────────────────────────────────────────────────────────────────
    test('2 · Roll call — 3 absent, 18 present', async ({ page }) => {
        await bulkAddPlayers(page);
        await setupPresence(page, ABSENT_ROLL_CALL);
        await expect(page.getByText(/Present: 18/)).toBeVisible({ timeout: 3000 });
        await page.screenshot({ path: 'tests/screenshots/02-roll-call.png', fullPage: true });
        console.log('✓ Test 2 PASSED');
    });

    // ── 3 ─────────────────────────────────────────────────────────────────
    test('3 · Generate and complete Round 1', async ({ page }) => {
        await bulkAddPlayers(page);
        await setupPresence(page, ABSENT_ROLL_CALL);
        await generateRound1(page);
        await expect(page.getByText(/Round 1/i)).toBeVisible({ timeout: 8000 });
        await page.screenshot({ path: 'tests/screenshots/03a-round1.png', fullPage: true });
        await completeAllCourts(page);
        await page.screenshot({ path: 'tests/screenshots/03b-round1-done.png', fullPage: true });
        await expect(page.getByText(/Completed/i).first()).toBeVisible({ timeout: 5000 });
        console.log('✓ Test 3 PASSED');
    });

    // ── 4 ─────────────────────────────────────────────────────────────────
    test('4 · Hard refresh during Round 2 preserves session', async ({ page }) => {
        await bulkAddPlayers(page);
        await setupPresence(page, ABSENT_ROLL_CALL);
        await generateRound1(page);
        await completeAllCourts(page);
        await generateNextRound(page);
        await expect(page.getByText(/Round 2/i)).toBeVisible({ timeout: 8000 });
        await page.screenshot({ path: 'tests/screenshots/04a-before-refresh.png', fullPage: true });

        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(4000);
        await ensureLoggedIn(page);
        await dismissDialogs(page);

        await page.screenshot({ path: 'tests/screenshots/04b-after-refresh.png', fullPage: true });
        const body = await page.locator('body').textContent();
        const survived = body?.includes('Don McMillan') ?? false;
        console.log(`  Session survived refresh: ${survived}`);
        expect(survived, 'Players must survive hard refresh').toBe(true);
        console.log('✓ Test 4 PASSED');
    });

    // ── 5 ─────────────────────────────────────────────────────────────────
    test('5 · 11 rounds with 4 players removed at Round 8', async ({ page }) => {
        test.setTimeout(12 * 60 * 1000);
        await bulkAddPlayers(page);
        await setupPresence(page, ABSENT_ROLL_CALL);
        await generateRound1(page);

        for (let r = 1; r <= 7; r++) {
            await completeAllCourts(page);
            if (r < 7) await generateNextRound(page);
            console.log(`  ✓ Round ${r}`);
        }

        await generateNextRound(page);
        await expect(page.getByText(/Round 8/i)).toBeVisible({ timeout: 8000 });
        await markAbsent(page, ABSENT_ROUND_8);
        await page.screenshot({ path: 'tests/screenshots/05a-round8.png', fullPage: true });

        for (let r = 8; r <= 11; r++) {
            await goTab(page, 'Schedule');
            await completeAllCourts(page);
            if (r < 11) await generateNextRound(page);
            console.log(`  ✓ Round ${r}`);
        }

        await page.screenshot({ path: 'tests/screenshots/05b-11-rounds.png', fullPage: true });
        await expect(page.getByText(/Round 11/i)).toBeVisible({ timeout: 5000 });
        console.log('✓ Test 5 PASSED');
    });

    // ── 6 ─────────────────────────────────────────────────────────────────
    test('6 · Stats page populated after Round 1', async ({ page }) => {
        await bulkAddPlayers(page);
        await setupPresence(page, ABSENT_ROLL_CALL);
        await generateRound1(page);
        await completeAllCourts(page);
        await goTab(page, 'Stats');
        await page.waitForTimeout(800);
        await page.screenshot({ path: 'tests/screenshots/06-stats.png', fullPage: true });
        const body = await page.locator('body').textContent();
        expect(body).not.toContain('Stats appear here automatically after you generate');
        console.log('✓ Test 6 PASSED');
    });

    // ── 7 ─────────────────────────────────────────────────────────────────
    test('7 · CSV export downloads with match data', async ({ page }) => {
        await bulkAddPlayers(page);
        await setupPresence(page, ABSENT_ROLL_CALL);
        await generateRound1(page);
        await completeAllCourts(page);

        await page.locator('nav button').filter({ hasText: 'End' }).first().click();
        await page.waitForTimeout(600);

        const csvBtn = page.getByRole('button', { name: 'Download CSV' });
        await csvBtn.waitFor({ timeout: 5000 });

        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 10000 }),
            csvBtn.click(),
        ]);

        const filename = download.suggestedFilename();
        console.log(`  Downloaded: "${filename}"`);
        expect(filename).toMatch(/\.csv$/i);
        await page.screenshot({ path: 'tests/screenshots/07-csv.png' });
        console.log('✓ Test 7 PASSED');
    });
});
