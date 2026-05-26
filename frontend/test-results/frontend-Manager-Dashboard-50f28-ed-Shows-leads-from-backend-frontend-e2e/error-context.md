# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend.spec.ts >> Manager Dashboard — Backend Connected >> Shows leads from backend
- Location: tests/frontend.spec.ts:68:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Wayne Enterprises').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=Wayne Enterprises').first()

```

```yaml
- alert
- complementary:
  - text: A
  - heading "AegisSpace" [level=1]
  - button "Lock session"
  - button
  - navigation:
    - paragraph: Native Workspaces
    - button "CFO Treasury"
    - button "Branch Manager"
    - button "Tenant Admin"
    - button "Coworking Member"
    - paragraph: Integrations
    - button "Front Desk / Security"
    - button "IT / Network Admin"
    - button "Janitorial / Vendor"
- banner:
  - heading "Branch Manager" [level=2]
  - paragraph: Session active for Branch Manager
  - text: Secure Session
  - button
  - button "Lock"
- main:
  - heading "Kalyan Center Floor Map" [level=3]
  - img "Floor plan": HOT DESKS DEDICATED CONFERENCE PRIVATE SUITES HD-01 HD-02 HD-03 HD-04 HD-05 HD-06 DS-40 Suite 203 Conf. Alpha Booth A Available Allocated Maintenance
  - heading "CRM Lead Pipeline" [level=3]
  - table:
    - rowgroup:
      - row "Company Status Value Actions":
        - columnheader "Company"
        - columnheader "Status"
        - columnheader "Value"
        - columnheader "Actions"
    - rowgroup:
      - row "Oscorp proposal sent $28,000 Won Halt":
        - cell "Oscorp"
        - cell "proposal sent"
        - cell "$28,000"
        - cell "Won Halt":
          - button "Won"
          - button "Halt"
  - heading "Maintenance Feed" [level=3]
```

# Test source

```ts
  1   | /**
  2   |  * AegiSpace — Frontend E2E Tests (Playwright)
  3   |  *
  4   |  * Tests the frontend UI flows for each persona:
  5   |  * login, dashboard rendering, and backend data connectivity.
  6   |  */
  7   | 
  8   | import { test, expect } from '@playwright/test';
  9   | 
  10  | const FRONTEND_URL = 'http://localhost:3000';
  11  | 
  12  | const PERSONAS: Array<{ key: string; label: string; password: string }> = [
  13  |   { key: 'manager', label: 'Branch Manager', password: 'AegisSpace2026!MGR' },
  14  |   { key: 'cfo', label: 'CFO Treasury', password: 'AegisSpace2026!CFO' },
  15  |   { key: 'tenant_admin', label: 'Tenant Admin', password: 'AegisSpace2026!TEN' },
  16  |   { key: 'member', label: 'Coworking Member', password: 'AegisSpace2026!MEM' },
  17  |   { key: 'front_desk', label: 'Front Desk / Security', password: 'AegisSpace2026!FRONT' },
  18  |   { key: 'vendor', label: 'Janitorial / Vendor', password: 'AegisSpace2026!VEND' },
  19  |   { key: 'it_admin', label: 'IT / Network Admin', password: 'AegisSpace2026!IT' },
  20  | ];
  21  | 
  22  | test.describe('Session Gate & Login', () => {
  23  |   test('Login page renders with persona selection', async ({ page }) => {
  24  |     await page.goto(FRONTEND_URL);
  25  |     // The session gate should be visible
  26  |     await expect(page.locator('text=AegisSpace Central Gateway')).toBeVisible({ timeout: 10000 });
  27  |     await expect(page.locator('text=Secure Session')).toBeVisible();
  28  |   });
  29  | 
  30  |   for (const persona of PERSONAS) {
  31  |     test(`Login as ${persona.label}`, async ({ page }) => {
  32  |       await page.goto(FRONTEND_URL);
  33  |       await page.waitForSelector('text=Secure Session', { timeout: 10000 });
  34  | 
  35  |       // Select the persona
  36  |       const select = page.locator('select');
  37  |       await select.selectOption(persona.key);
  38  | 
  39  |       // Enter password
  40  |       const passwordInput = page.locator('input[type="password"]');
  41  |       await passwordInput.fill(persona.password);
  42  | 
  43  |       // Submit
  44  |       await page.locator('button[type="submit"]').click();
  45  | 
  46  |       // Wait for dashboard to load (sidebar should appear)
  47  |       await expect(page.locator('text=AegisSpace').first()).toBeVisible({ timeout: 10000 });
  48  |       await expect(page.locator('text=Secure Session').first()).toBeVisible({ timeout: 5000 });
  49  |     });
  50  |   }
  51  | });
  52  | 
  53  | test.describe('Manager Dashboard — Backend Connected', () => {
  54  |   test.beforeEach(async ({ page }) => {
  55  |     await page.goto(FRONTEND_URL);
  56  |     await page.waitForSelector('select', { timeout: 10000 });
  57  |     await page.locator('select').selectOption('manager');
  58  |     await page.locator('input[type="password"]').fill('AegisSpace2026!MGR');
  59  |     await page.locator('button[type="submit"]').click();
  60  |     await page.waitForTimeout(3000); // Wait for data fetch
  61  |   });
  62  | 
  63  |   test('Shows inventory from backend', async ({ page }) => {
  64  |     // The floor map SVG should be visible
  65  |     await expect(page.locator('svg[role="img"]')).toBeVisible({ timeout: 10000 });
  66  |   });
  67  | 
  68  |   test('Shows leads from backend', async ({ page }) => {
  69  |     // Look for lead company names in the dashboard
> 70  |     await expect(page.locator('text=Wayne Enterprises').first()).toBeVisible({ timeout: 10000 });
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
  71  |   });
  72  | 
  73  |   test('API calls are made to backend', async ({ page }) => {
  74  |     const apiCalls: string[] = [];
  75  |     page.on('request', (req) => {
  76  |       if (req.url().includes('/api/v1/')) {
  77  |         apiCalls.push(req.url());
  78  |       }
  79  |     });
  80  | 
  81  |     // Wait for polling cycle
  82  |     await page.waitForTimeout(6000);
  83  | 
  84  |     // Verify critical API calls were made
  85  |     expect(apiCalls.some(u => u.includes('/api/v1/inventory'))).toBeTruthy();
  86  |     expect(apiCalls.some(u => u.includes('/api/v1/leads'))).toBeTruthy();
  87  |     expect(apiCalls.some(u => u.includes('/api/v1/bookings'))).toBeTruthy();
  88  |     expect(apiCalls.some(u => u.includes('/api/v1/notifications'))).toBeTruthy();
  89  |   });
  90  | });
  91  | 
  92  | test.describe('CFO Dashboard — Backend Connected', () => {
  93  |   test.beforeEach(async ({ page }) => {
  94  |     await page.goto(FRONTEND_URL);
  95  |     await page.waitForSelector('select', { timeout: 10000 });
  96  |     await page.locator('select').selectOption('cfo');
  97  |     await page.locator('input[type="password"]').fill('AegisSpace2026!CFO');
  98  |     await page.locator('button[type="submit"]').click();
  99  |     await page.waitForTimeout(3000);
  100 |   });
  101 | 
  102 |   test('Shows portfolio metrics', async ({ page }) => {
  103 |     await expect(page.locator('text=Portfolio Revenue').first()).toBeVisible({ timeout: 10000 });
  104 |   });
  105 | });
  106 | 
  107 | test.describe('Member Dashboard — Backend Connected', () => {
  108 |   test.beforeEach(async ({ page }) => {
  109 |     await page.goto(FRONTEND_URL);
  110 |     await page.waitForSelector('select', { timeout: 10000 });
  111 |     await page.locator('select').selectOption('member');
  112 |     await page.locator('input[type="password"]').fill('AegisSpace2026!MEM');
  113 |     await page.locator('button[type="submit"]').click();
  114 |     await page.waitForTimeout(3000);
  115 |   });
  116 | 
  117 |   test('Shows interactive seat selection', async ({ page }) => {
  118 |     await expect(page.locator('text=Interactive Seat Selection').first()).toBeVisible({ timeout: 10000 });
  119 |   });
  120 | 
  121 |   test('Shows floor map SVG', async ({ page }) => {
  122 |     await expect(page.locator('svg[role="img"]')).toBeVisible({ timeout: 10000 });
  123 |   });
  124 | });
  125 | 
  126 | test.describe('Front Desk Dashboard — Backend Connected', () => {
  127 |   test.beforeEach(async ({ page }) => {
  128 |     await page.goto(FRONTEND_URL);
  129 |     await page.waitForSelector('select', { timeout: 10000 });
  130 |     await page.locator('select').selectOption('front_desk');
  131 |     await page.locator('input[type="password"]').fill('AegisSpace2026!FRONT');
  132 |     await page.locator('button[type="submit"]').click();
  133 |     await page.waitForTimeout(3000);
  134 |   });
  135 | 
  136 |   test('Shows visitor log', async ({ page }) => {
  137 |     await expect(page.locator('text=Visitor Log').first()).toBeVisible({ timeout: 10000 });
  138 |   });
  139 | });
  140 | 
  141 | test.describe('Vendor Dashboard — Backend Connected', () => {
  142 |   test.beforeEach(async ({ page }) => {
  143 |     await page.goto(FRONTEND_URL);
  144 |     await page.waitForSelector('select', { timeout: 10000 });
  145 |     await page.locator('select').selectOption('vendor');
  146 |     await page.locator('input[type="password"]').fill('AegisSpace2026!VEND');
  147 |     await page.locator('button[type="submit"]').click();
  148 |     await page.waitForTimeout(3000);
  149 |   });
  150 | 
  151 |   test('Shows facility tasks', async ({ page }) => {
  152 |     await expect(page.locator('text=Facility').first()).toBeVisible({ timeout: 10000 });
  153 |   });
  154 | });
  155 | 
```