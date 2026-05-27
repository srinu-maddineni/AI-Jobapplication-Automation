const { chromium } = require('playwright');
const logger = require('../../utils/logger');

const fetchLinkedInJobs = async (query = 'software engineer', location = 'India') => {
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
    const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    logger.info(`LinkedIn scraping URL: ${url}`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for the results to load
    try {
      await page.waitForSelector('.base-search-card', { timeout: 15000 });
    } catch (e) {
      logger.warn('LinkedIn search card selector not found, might be empty or blocked');
    }

    // Scroll down to load more dynamic content (infinite scroll)
    try {
      logger.info('Scrolling LinkedIn page to load more jobs...');
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 300;
          let scrolls = 0;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            scrolls++;
            if (totalHeight >= scrollHeight || scrolls >= 30) {
              clearInterval(timer);
              resolve();
            }
          }, 150);
        });
      });
      await page.waitForTimeout(2000);
    } catch (scrollErr) {
      logger.warn(`LinkedIn scroll failed: ${scrollErr.message}`);
    }
    
    const jobs = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.base-search-card'));
      return cards.map(card => {
        const titleEl = card.querySelector('.base-search-card__title');
        const companyEl = card.querySelector('.base-search-card__subtitle');
        const locationEl = card.querySelector('.job-search-card__location');
        const linkEl = card.querySelector('a.base-card__full-link');
        const dateEl = card.querySelector('time');
        
        const title = titleEl ? titleEl.textContent.trim() : '';
        const company = companyEl ? companyEl.textContent.trim() : '';
        const location = locationEl ? locationEl.textContent.trim() : '';
        const applyUrl = linkEl ? linkEl.getAttribute('href') : '';
        const postedAtText = dateEl ? dateEl.textContent.trim() : '';
        const postedAtDatetime = dateEl ? dateEl.getAttribute('datetime') : null;
        
        let externalJobId = '';
        if (applyUrl) {
          const match = applyUrl.match(/-(\d+)\?/);
          if (match) {
            externalJobId = match[1];
          } else {
            const currentUrn = card.getAttribute('data-entity-urn');
            if (currentUrn) {
              externalJobId = currentUrn.split(':').pop();
            } else {
              externalJobId = String(Math.random());
            }
          }
        }
        
        return {
          source: 'LinkedIn',
          externalJobId,
          title,
          company,
          location,
          applyUrl,
          description: `Job at ${company} in ${location}. Click Apply to view full details on LinkedIn.`,
          remote: location.toLowerCase().includes('remote'),
          tags: ['LinkedIn', 'Scraped'],
          platform: 'linkedin',
          postedAt: postedAtDatetime ? new Date(postedAtDatetime) : new Date(),
        };
      });
    });
    
    return jobs.filter(j => j.title && j.company && j.applyUrl);
  } catch (error) {
    logger.error(`LinkedIn scraping failed: ${error.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = {
  fetchJobs: fetchLinkedInJobs,
};
