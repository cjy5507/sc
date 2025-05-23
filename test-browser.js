// Simple test to verify Playwright can launch browser
const { chromium } = require('playwright');

(async () => {
  console.log('Starting browser test...');
  
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch({
      headless: false,
      slowMo: 100
    });
    
    console.log('Browser launched successfully!');
    console.log('Creating browser context...');
    
    const context = await browser.newContext();
    console.log('Browser context created');
    
    const page = await context.newPage();
    console.log('Page created');
    
    console.log('Navigating to google.com...');
    await page.goto('https://www.google.com');
    console.log('Navigation successful!');
    
    // Wait for a few seconds to see the browser
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Closing browser...');
    await browser.close();
    console.log('Browser closed');
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
})(); 