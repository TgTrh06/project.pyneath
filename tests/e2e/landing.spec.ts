import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const anonymousSession = {
  authenticated: false,
  account: null,
  csrfToken: 'a'.repeat(64),
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/session', route => route.fulfill({ json: anonymousSession }));
  await page.addInitScript(() => {
    localStorage.setItem('pyneath:landing-scene', JSON.stringify({ light: true, motion: false, time: 'day', weather: 'clear' }));
  });
});

test('landing supports its primary keyboard and responsive journey', async ({ page }, testInfo) => {
  await page.goto('/#home');
  await expect(page).toHaveTitle('Pyneath — Một bước nhỏ để bắt đầu');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.getByRole('heading', { level: 1, name: /Không cần làm hết/ })).toBeVisible();

  const skipLink = page.getByRole('link', { name: 'Đến nội dung chính' });
  if (testInfo.project.name === 'chromium-desktop') {
    await page.keyboard.press('Tab');
  } else {
    // WebKit and Firefox automation inherit platform link-tab preferences.
    // Focus directly, then keep the activation assertion keyboard-driven.
    await skipLink.focus();
  }
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#landing-main')).toBeFocused();

  const trailChoices = page.getByRole('group', { name: 'Chọn tình huống minh họa' });
  const firstChoice = trailChoices.getByRole('button').first();
  await firstChoice.click();
  await expect(firstChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Ghé dưới tán thông' }).first()).toHaveAttribute('href', '#register');

  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
});

test('mobile menu closes with Escape and restores focus', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'), 'Mobile navigation only');
  await page.goto('/#home');
  const menu = page.getByRole('button', { name: 'Mở menu' });
  await menu.click();
  await expect(page.getByRole('dialog', { name: 'Menu Pyneath' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Menu Pyneath' })).toBeHidden();
  await expect(menu).toBeFocused();
});

test('landing has no automated WCAG A or AA violations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'One deterministic axe pass; browser journeys run separately');
  await page.goto('/#home');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('.lp-world')
    .analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
});
