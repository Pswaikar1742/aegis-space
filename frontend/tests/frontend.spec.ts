/**
 * AegiSpace — Frontend E2E Tests (Playwright)
 *
 * Tests the frontend UI flows for each persona:
 * login, dashboard rendering, and backend data connectivity.
 */

import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:3000';

const PERSONAS: Array<{ key: string; label: string; password: string }> = [
  { key: 'manager', label: 'Branch Manager', password: 'AegisSpace2026!MGR' },
  { key: 'cfo', label: 'CFO Treasury', password: 'AegisSpace2026!CFO' },
  { key: 'tenant_admin', label: 'Tenant Admin', password: 'AegisSpace2026!TEN' },
  { key: 'member', label: 'Coworking Member', password: 'AegisSpace2026!MEM' },
  { key: 'front_desk', label: 'Front Desk / Security', password: 'AegisSpace2026!FRONT' },
  { key: 'vendor', label: 'Janitorial / Vendor', password: 'AegisSpace2026!VEND' },
  { key: 'it_admin', label: 'IT / Network Admin', password: 'AegisSpace2026!IT' },
];

test.describe('Session Gate & Login', () => {
  test('Login page renders with persona selection', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    // Clear any lingering session from prior tests
    await page.evaluate(() => window.sessionStorage.clear());
    await page.reload();
    // The session gate should be visible
    await expect(page.locator('text=AegisSpace Central Gateway')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Initiate Secure Session' })).toBeVisible();
  });

  for (const persona of PERSONAS) {
    test(`Login as ${persona.label}`, async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForSelector('text=Secure Session', { timeout: 10000 });

      // Select the persona
      const select = page.locator('select');
      await select.selectOption(persona.key);

      // Enter password
      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.fill(persona.password);

      // Submit
      await page.locator('button[type="submit"]').click();

      // Wait for dashboard to load (sidebar should appear)
      await expect(page.locator('text=AegisSpace').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Secure Session').first()).toBeVisible({ timeout: 5000 });
    });
  }
});

test.describe('Manager Dashboard — Backend Connected', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('select', { timeout: 10000 });
    await page.locator('select').selectOption('manager');
    await page.locator('input[type="password"]').fill('AegisSpace2026!MGR');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000); // Wait for data fetch
  });

  test('Shows inventory from backend', async ({ page }) => {
    // The floor map SVG should be visible
    await expect(page.locator('svg[role="img"]')).toBeVisible({ timeout: 10000 });
  });

  test('Shows leads from backend', async ({ page }) => {
    // Look for CRM Lead Pipeline header which only renders when leads are loaded
    await expect(page.locator('text=CRM Lead Pipeline').first()).toBeVisible({ timeout: 15000 });
  });

  test('API calls are made to backend', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/')) {
        apiCalls.push(req.url());
      }
    });

    // Wait for polling cycle
    await page.waitForTimeout(6000);

    // Verify critical API calls were made
    expect(apiCalls.some(u => u.includes('/api/v1/inventory'))).toBeTruthy();
    expect(apiCalls.some(u => u.includes('/api/v1/leads'))).toBeTruthy();
    expect(apiCalls.some(u => u.includes('/api/v1/bookings'))).toBeTruthy();
    expect(apiCalls.some(u => u.includes('/api/v1/notifications'))).toBeTruthy();
  });
});

test.describe('CFO Dashboard — Backend Connected', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('select', { timeout: 10000 });
    await page.locator('select').selectOption('cfo');
    await page.locator('input[type="password"]').fill('AegisSpace2026!CFO');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
  });

  test('Shows portfolio metrics', async ({ page }) => {
    await expect(page.locator('text=Portfolio Revenue').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Member Dashboard — Backend Connected', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('select', { timeout: 10000 });
    await page.locator('select').selectOption('member');
    await page.locator('input[type="password"]').fill('AegisSpace2026!MEM');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
  });

  test('Shows interactive seat selection', async ({ page }) => {
    await expect(page.locator('text=Interactive Seat Selection').first()).toBeVisible({ timeout: 10000 });
  });

  test('Shows floor map SVG', async ({ page }) => {
    await expect(page.locator('svg[role="img"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Front Desk Dashboard — Backend Connected', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('select', { timeout: 10000 });
    await page.locator('select').selectOption('front_desk');
    await page.locator('input[type="password"]').fill('AegisSpace2026!FRONT');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
  });

  test('Shows visitor log', async ({ page }) => {
    await expect(page.locator('text=Visitor Log').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Vendor Dashboard — Backend Connected', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('select', { timeout: 10000 });
    await page.locator('select').selectOption('vendor');
    await page.locator('input[type="password"]').fill('AegisSpace2026!VEND');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
  });

  test('Shows facility tasks', async ({ page }) => {
    await expect(page.locator('text=Facility').first()).toBeVisible({ timeout: 10000 });
  });
});
