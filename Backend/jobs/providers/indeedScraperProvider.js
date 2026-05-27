const { chromium } = require('playwright');
const logger = require('../../utils/logger');

const fetchIndeedJobs = async (query = 'software engineer', location = 'India') => {
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
    
    const isIndia = location.toLowerCase().includes('india') || !location;
    const baseUrl = isIndia ? 'https://in.indeed.com' : 'https://www.indeed.com';
    const allJobs = [];
    
    // Scrape 2 pages to double the job count
    for (let pageNum = 0; pageNum < 2; pageNum++) {
      const page = await context.newPage();
      const start = pageNum * 10;
      const url = `${baseUrl}/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&start=${start}`;
      logger.info(`Indeed scraping URL (Page ${pageNum + 1}): ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        try {
          await page.waitForSelector('.job_seen_beacon', { timeout: 15000 });
        } catch (e) {
          logger.warn(`Indeed search beacon not loaded on page ${pageNum + 1}, might be blocked or empty`);
        }
        
        const jobs = await page.evaluate((baseUrl) => {
          const cards = Array.from(document.querySelectorAll('.job_seen_beacon'));
          return cards.map(card => {
            const titleEl = card.querySelector('h2.jobTitle a, h2.jobTitle span');
            const companyEl = card.querySelector('[data-testid="company-name"]');
            const locationEl = card.querySelector('[data-testid="text-location"]');
            const descEl = card.querySelector('.job-snippet');
            const linkEl = card.querySelector('h2.jobTitle a');
            
            const title = titleEl ? titleEl.textContent.trim() : '';
            const company = companyEl ? companyEl.textContent.trim() : '';
            const location = locationEl ? locationEl.textContent.trim() : '';
            const path = linkEl ? linkEl.getAttribute('href') : '';
            const applyUrl = path ? (path.startsWith('http') ? path : `${baseUrl}${path}`) : '';
            const description = descEl ? descEl.textContent.trim() : `Job at ${company} in ${location}`;
            
            let externalJobId = '';
            if (path) {
              const match = path.match(/jk=([a-f0-9]+)/);
              if (match) {
                externalJobId = match[1];
              } else {
                externalJobId = String(Math.random());
              }
            }
            
            return {
              source: 'Indeed',
              externalJobId,
              title,
              company,
              location,
              applyUrl,
              description,
              remote: location.toLowerCase().includes('remote'),
              tags: ['Indeed', 'Scraped'],
              platform: 'indeed',
              postedAt: new Date(),
            };
          });
        }, baseUrl);
        
        allJobs.push(...jobs);
      } catch (pageErr) {
        logger.error(`Indeed page ${pageNum + 1} scraping failed: ${pageErr.message}`);
      } finally {
        await page.close();
      }
      
      if (pageNum < 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    return allJobs.filter(j => j.title && j.company && j.applyUrl);
  } catch (error) {
    logger.error(`Indeed scraping failed: ${error.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = {
  fetchJobs: fetchIndeedJobs,
};
