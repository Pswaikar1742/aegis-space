# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend.spec.ts >> Session Gate & Login >> Login page renders with persona selection
- Location: tests/frontend.spec.ts:23:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Secure Session')
Expected: visible
Error: strict mode violation: locator('text=Secure Session') resolved to 3 elements:
    1) <p class="max-w-2xl text-sm lg:text-base text-slate-300 leading-7">Select a persona, enter the mock secure passphras…</p> aka getByText('Select a persona, enter the')
    2) <h2 class="text-xl font-semibold mt-1">Initiate Secure Session</h2> aka getByRole('heading', { name: 'Initiate Secure Session' })
    3) <button type="submit" class="btn-primary w-full !py-3.5 text-base">Initiate Secure Session</button> aka getByRole('button', { name: 'Initiate Secure Session' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Secure Session')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e11]:
        - img [ref=e13]
        - generic [ref=e17]:
          - paragraph [ref=e18]: AegisSpace Central Gateway
          - heading "Enterprise Session Gate" [level=1] [ref=e19]
      - paragraph [ref=e20]: Select a persona, enter the mock secure passphrase, and initiate a gated session. The dashboard behind this lock is still persona-driven, but it will not render until a secure session is established.
      - generic [ref=e21]:
        - generic [ref=e22]:
          - paragraph [ref=e23]: CFO Treasury
          - paragraph [ref=e24]: Executive finance and portfolio reporting
        - generic [ref=e25]:
          - paragraph [ref=e26]: Branch Manager
          - paragraph [ref=e27]: Operations, bookings, and floor control
        - generic [ref=e28]:
          - paragraph [ref=e29]: Tenant Admin
          - paragraph [ref=e30]: Member perks and internal tenant workflows
      - generic [ref=e31]:
        - generic [ref=e32]:
          - img [ref=e33]
          - generic [ref=e36]:
            - paragraph [ref=e37]: Persona-bound access
            - paragraph [ref=e38]: The selected workspace is stored with the session.
        - generic [ref=e39]:
          - img [ref=e40]
          - generic [ref=e49]:
            - paragraph [ref=e50]: Mock verification
            - paragraph [ref=e51]: No backend auth required, just a deliberate gate.
        - generic [ref=e52]:
          - img [ref=e53]
          - generic [ref=e56]:
            - paragraph [ref=e57]: Easy demo password
            - paragraph [ref=e58]: Use the persona passphrase shown in the right panel.
    - generic [ref=e59]:
      - generic [ref=e60]:
        - generic [ref=e61]:
          - paragraph [ref=e62]: Secure login
          - heading "Initiate Secure Session" [level=2] [ref=e63]
        - img [ref=e65]
      - generic [ref=e67]:
        - generic [ref=e68]:
          - generic [ref=e69]: Persona
          - combobox [ref=e70]:
            - option "CFO Treasury"
            - option "Branch Manager" [selected]
            - option "Tenant Admin"
            - option "Coworking Member"
            - option "Front Desk / Security"
            - option "IT / Network Admin"
            - option "Janitorial / Vendor"
        - generic [ref=e71]:
          - generic [ref=e72]: Mock password
          - textbox "Enter Branch Manager passphrase" [ref=e73]
          - paragraph [ref=e74]: "Demo credential for this persona: AegisSpace2026!MGR"
        - generic [ref=e75]: "Session scope: Operations, bookings, and floor control"
        - button "Initiate Secure Session" [ref=e76] [cursor=pointer]
      - generic [ref=e77]: This gate is intentionally local and deterministic. It exists to separate personas at the UI layer while keeping the current dashboard behavior intact after authentication.
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
> 27  |     await expect(page.locator('text=Secure Session')).toBeVisible();
      |                                                       ^ Error: expect(locator).toBeVisible() failed
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
  70  |     await expect(page.locator('text=Wayne Enterprises').first()).toBeVisible({ timeout: 10000 });
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
```