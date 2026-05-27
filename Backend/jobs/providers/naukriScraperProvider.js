const { chromium } = require('playwright');
const logger = require('../../utils/logger');

const fetchNaukriJobs = async (query = 'software engineer', location = 'India') => {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage']
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    const url = `https://www.naukri.com/jobs-in-india?k=${encodeURIComponent(query)}`;
    logger.info(`Naukri scraping URL: ${url}`);
    
    try {
      // Use 'commit' to bypass heavy analytic/telemetry scripts hanging navigation
      await page.goto(url, { waitUntil: 'commit', timeout: 20000 });
    } catch (gotoErr) {
      logger.warn(`Naukri page.goto warning: ${gotoErr.message}. Continuing...`);
    }
    
    try {
      await page.waitForSelector('.srp-jobtuple, [class*="jobTuple"], [class*="job-tuple"], .cust-job-tuple, .jobTuple, a.title', { timeout: 15000 });
    } catch (e) {
      logger.warn('Naukri search results not loaded, trying to parse what is available');
    }

    // Scroll down to trigger lazy loading of cards
    try {
      logger.info('Scrolling Naukri page to render cards...');
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
      }
    } catch (scrollErr) {
      logger.warn(`Naukri scroll failed: ${scrollErr.message}`);
    }
    
    const jobs = await page.evaluate(() => {
      const tuples = Array.from(document.querySelectorAll('.srp-jobtuple, [class*="jobTuple"], [class*="job-tuple"], .cust-job-tuple, .jobTuple, article'));
      return tuples.map(tuple => {
        const titleEl = tuple.querySelector('a.title, [class*="title"]');
        const companyEl = tuple.querySelector('a.comp-name, [class*="companyName"]');
        const locationEl = tuple.querySelector('.loc-wrap, [class*="location"]');
        const descEl = tuple.querySelector('.job-desc, [class*="jobDescription"]');
        const skillsEl = Array.from(tuple.querySelectorAll('.chip, [class*="skill"]'));
        
        const title = titleEl ? titleEl.textContent.trim() : '';
        const company = companyEl ? companyEl.textContent.trim() : '';
        const location = locationEl ? locationEl.textContent.trim() : '';
        const applyUrl = titleEl ? titleEl.getAttribute('href') : '';
        const description = descEl ? descEl.textContent.trim() : `Job at ${company} in ${location}`;
        const tags = skillsEl.map(s => s.textContent.trim()).filter(Boolean);
        
        let externalJobId = '';
        if (applyUrl) {
          const match = applyUrl.match(/-(\d+)\?/);
          if (match) {
            externalJobId = match[1];
          } else {
            const parts = applyUrl.split('-');
            externalJobId = parts[parts.length - 1] || String(Math.random());
          }
        }
        
        return {
          source: 'Naukri',
          externalJobId,
          title,
          company,
          location,
          applyUrl,
          description,
          remote: location.toLowerCase().includes('remote'),
          tags: [...tags, 'Naukri', 'Scraped'],
          platform: 'naukri',
          postedAt: new Date(),
        };
      });
    });
    
    return jobs.filter(j => j.title && j.company && j.applyUrl);
  } catch (error) {
    logger.error(`Naukri scraping failed: ${error.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = {
  fetchJobs: fetchNaukriJobs,
};
