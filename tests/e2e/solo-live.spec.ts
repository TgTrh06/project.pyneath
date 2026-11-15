import { expect, test } from '@playwright/test';

test('registers, starts and checks out a Solo session with a study step and Open Seed', async ({ page }, testInfo) => {
  test.skip(process.env.PYNEATH_E2E_LIVE !== '1', 'Requires an explicitly authorized disposable API and database');
  test.skip(testInfo.project.name !== 'chromium-desktop', 'One real browser lifecycle; parity is covered by isolated UI journeys');

  await page.addInitScript(() => {
    localStorage.setItem('pyneath:return-scene', JSON.stringify({ light: true, motion: false, time: 'day', weather: 'clear' }));
    localStorage.setItem('pyneath:landing-scene', JSON.stringify({ light: true, motion: false, time: 'day', weather: 'clear' }));
  });
  await page.goto('/#register');
  await expect(page.getByRole('heading', { level: 1, name: 'Một chỗ dành cho bạn.' })).toBeFocused();

  const email = `e2e-${Date.now()}@example.test`;
  const password = 'E2e-disposable-password-2026';
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByLabel('Nhập lại mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

  const timezoneHeading = page.getByRole('heading', { level: 1, name: 'Giờ địa phương của bạn.' });
  await expect(timezoneHeading).toBeVisible();
  await page.getByLabel('Múi giờ IANA').fill('Asia/Ho_Chi_Minh');
  await page.getByRole('button', { name: 'Xác nhận múi giờ' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Một việc nhỏ, ngay lúc này.' })).toBeVisible();
  await page.getByLabel('Việc nhỏ bạn muốn bắt đầu').fill('Đọc phần mở đầu của chương kiểm thử');
  await page.getByRole('button', { name: '5 phút', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu phiên' }).click();

  await expect(page.getByRole('timer', { name: 'Thời gian còn lại' })).toBeVisible();
  await page.getByRole('button', { name: 'Khép lại chặng này' }).click();
  const checkout = page.getByRole('dialog', { name: 'Bạn muốn khép lại thế nào?' });
  await expect(checkout).toBeVisible();
  await checkout.getByRole('button', { name: 'Có tiến triển' }).click();
  await checkout.getByLabel('Lần sau mở từ đâu?').selectOption('replace');
  await checkout.getByLabel('Lần sau mở từ đâu?').last().fill('Tiếp tục đọc mục kiểm thử API');
  await checkout.getByLabel('Kết quả').selectOption('partial');
  await checkout.getByLabel('Ghi chú riêng (không bắt buộc)').fill('Đã đọc phần giới thiệu.');
  await checkout.getByRole('button', { name: 'Xác nhận và quay lại' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Lần trước bạn dừng ở đây.' })).toBeVisible();
  await expect(page.getByText('Tiếp tục đọc mục kiểm thử API', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Đọc phần mở đầu của chương kiểm thử · Đã làm một phần' })).toBeVisible();
});
