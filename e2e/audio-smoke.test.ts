import { test, expect } from '@playwright/test';

test('AudioContext resumes on play button click (AUDIO-08)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  const playButton = page.getByTestId('play-button');
  await expect(playButton).toBeVisible();
  await expect(playButton).toHaveText('Play');

  // Click play - this is a user gesture, should resume AudioContext
  await playButton.click();

  // Button should toggle to Pause, proving init/resume succeeded
  await expect(playButton).toHaveText('Pause');

  // Verify no console errors occurred
  expect(errors).toEqual([]);
});
