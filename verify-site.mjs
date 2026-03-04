#!/usr/bin/env node
/**
 * Verification script to capture screenshots of portfolio sections
 * Run: node verify-site.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'http://localhost:4321/PersonalPortfolio';
const SCREENSHOTS_DIR = join(process.cwd(), 'verification-screenshots');

async function main() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });
    if (!response?.ok) {
      console.error('Failed to load page:', response?.status());
      process.exit(1);
    }

    const sections = [
      { id: 'hero', name: '01-hero', scroll: 0 },
      { id: 'about', name: '02-about', scroll: 700 },
      { id: 'projects', name: '03-projects', scroll: 1350 },
      { id: 'skills', name: '04-skills', scroll: 2000 },
      { id: 'experience', name: '05-experience', scroll: 2600 },
      { id: 'contact', name: '06-contact-footer', scroll: 3400 },
    ];

    for (const { id, name, scroll } of sections) {
      await page.evaluate((y) => window.scrollTo(0, y), scroll);
      await page.waitForTimeout(400);
      const selector = id === 'contact' ? 'section#contact' : `section#${id}`;
      const element = await page.$(selector);
      const path = join(SCREENSHOTS_DIR, `${name}.png`);
      if (element) {
        await element.screenshot({ path });
        console.log(`Captured: ${name}.png`);
      } else {
        await page.screenshot({ path });
        console.log(`Captured full page: ${name}.png (section not found)`);
      }
    }

    // Navbar glassmorphism - scroll down and capture navbar
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(300);
    const navbar = await page.$('#navbar');
    if (navbar) {
      await navbar.screenshot({ path: join(SCREENSHOTS_DIR, '07-navbar-scrolled.png') });
      console.log('Captured: 07-navbar-scrolled.png (glassmorphism check)');
    }

    // Footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const footer = await page.$('footer.footer');
    if (footer) {
      await footer.screenshot({ path: join(SCREENSHOTS_DIR, '06b-footer.png') });
      console.log('Captured: 06b-footer.png');
    }

    // Also capture navbar at top (unscrolled)
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const navbarTop = await page.$('#navbar');
    if (navbarTop) {
      await navbarTop.screenshot({ path: join(SCREENSHOTS_DIR, '00-navbar-top.png') });
      console.log('Captured: 00-navbar-top.png');
    }

    console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
