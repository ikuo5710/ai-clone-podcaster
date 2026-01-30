import { test, expect } from '@playwright/test';
import path from 'node:path';

const screenshotDir = path.resolve('docs/screenshots');

test.describe('Screenshot capture', () => {
  let registeredVoiceId: string | null = null;

  test.afterAll(async ({ request }) => {
    // テストで登録した声を削除してクリーンアップ
    if (registeredVoiceId) {
      await request.delete(`http://localhost:3000/api/voices/${registeredVoiceId}`);
    }
  });

  test('SS1: 初期表示（声の管理タブ）', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('AI Clone Podcaster');
    // タブが表示されていることを確認
    await expect(page.getByRole('button', { name: '声の管理' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ポッドキャスト作成' })).toBeVisible();
    // 声の録音セクション
    await expect(page.locator('text=声の録音')).toBeVisible();
    // 登録済みの声セクション
    await expect(page.locator('text=登録済みの声')).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, '01-initial-voice-management.png'),
      fullPage: true,
    });
  });

  test('SS2: 声の登録後の一覧表示', async ({ page, request }) => {
    // APIで声を直接登録（ダミー音声ファイル）
    const dummyAudio = Buffer.from('dummy-audio-data-for-screenshot');
    const response = await request.post('http://localhost:3000/api/voices', {
      multipart: {
        label: 'テスト用の声',
        audio: {
          name: 'test.webm',
          mimeType: 'audio/webm',
          buffer: dummyAudio,
        },
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    registeredVoiceId = body.id;

    // ページ表示
    await page.goto('/');
    // 声の一覧に登録した声が表示されることを確認
    await expect(page.locator('.card-label', { hasText: 'テスト用の声' })).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, '02-voice-list-with-entry.png'),
      fullPage: true,
    });
  });

  test('SS3: ポッドキャスト作成タブ', async ({ page }) => {
    await page.goto('/');
    // ポッドキャスト作成タブに切り替え
    await page.getByRole('button', { name: 'ポッドキャスト作成' }).click();

    // フォーム要素が表示されることを確認
    await expect(page.locator('text=ポッドキャスト作成').first()).toBeVisible();
    await expect(page.locator('#script')).toBeVisible();
    await expect(page.locator('#voice-select')).toBeVisible();
    await expect(page.locator('#bgm')).toBeVisible();
    await expect(page.locator('#bgm-volume')).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, '03-podcast-creation-tab.png'),
      fullPage: true,
    });
  });

  test('SS4: ポッドキャスト作成タブ（声選択+台本入力済み）', async ({ page }) => {
    await page.goto('/');
    // ポッドキャスト作成タブに切り替え
    await page.getByRole('button', { name: 'ポッドキャスト作成' }).click();

    // 台本を入力
    await page.locator('#script').fill(
      'こんにちは、AI Clone Podcasterのテストエピソードです。\n' +
      '本日は天気が良いですね。\n' +
      'それではまた次回のエピソードでお会いしましょう。'
    );

    // 声を選択（SS2で登録した声が存在する前提）
    const select = page.locator('#voice-select');
    const options = select.locator('option:not([disabled])');
    const count = await options.count();
    if (count > 0) {
      const value = await options.first().getAttribute('value');
      if (value) {
        await select.selectOption(value);
      }
    }

    await page.screenshot({
      path: path.join(screenshotDir, '04-podcast-form-filled.png'),
      fullPage: true,
    });
  });
});
