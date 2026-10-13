import { expect, test } from '@playwright/test';

test.describe('스모크', () => {
  test('온보딩(마이크 없이) → 홈, 375 px 하단 탭 / 1280 px 사이드바', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('./');
    await expect(page.getByText('하이노트에 오신 걸 환영해요')).toBeVisible();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '이해했어요' }).click();
    await page.getByRole('button', { name: '마이크 없이 둘러보기' }).click();
    await expect(page.getByRole('button', { name: '오늘 훈련 시작' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: '하단 탭' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: '주 메뉴' })).toBeHidden();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('navigation', { name: '주 메뉴' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: '하단 탭' })).toBeHidden();
  });

  test('가짜 마이크(220 Hz 사인) → /dev/pitch에 A3 표시, 실제 마이크 설정 표시', async ({ page }) => {
    await page.goto('./#/dev/pitch');
    await page.getByRole('button', { name: '마이크 허용' }).click();
    await expect(page.getByText(/MIDI: 57\.\d\d 1옥타브 라 · A3/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/"echoCancellation": false/)).toBeVisible();
    const lat = await page.getByText(/P50 [\d.]+ ms/).textContent();
    expect(lat).toMatch(/P95/);
  });

  test('시작 전 확인에서 증상 선택 → 오늘은 쉬어 가요', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '이해했어요' }).click();
    await page.getByRole('button', { name: '마이크 없이 둘러보기' }).click();
    await page.getByRole('button', { name: '오늘 훈련 시작' }).click();
    await page.getByLabel('목이 아파요').check();
    await page.getByRole('button', { name: '오늘 훈련 시작' }).click();
    await expect(page.getByText('오늘은 쉬어 가요')).toBeVisible();
  });
});
