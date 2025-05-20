import { Page } from 'playwright';

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function waitForNetworkIdle(page: Page, timeout = 30000) {
  await page.waitForLoadState('networkidle');
  await delay(1000); // 추가적인 안전을 위한 지연
}

export async function waitForElement(page: Page, selector: string, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { state: 'attached', timeout });
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch (error) {
    console.error(`Element ${selector} not found within ${timeout}ms`);
    return false;
  }
}

export async function safeClick(page: Page, selector: string, timeout = 10000) {
  try {
    await waitForElement(page, selector, timeout);
    await page.click(selector);
    return true;
  } catch (error) {
    console.error(`Failed to click ${selector}:`, error);
    return false;
  }
}

export async function safeType(page: Page, selector: string, text: string, timeout = 10000) {
  try {
    await waitForElement(page, selector, timeout);
    await page.fill(selector, text);
    return true;
  } catch (error) {
    console.error(`Failed to type in ${selector}:`, error);
    return false;
  }
}

export async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
}

export async function scrollToTop(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
}
