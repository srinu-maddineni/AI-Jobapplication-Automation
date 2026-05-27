const { chromium } = require('playwright');
const logger = require('../../utils/logger');

const fetchInternshalaJobs = async (query = 'software engineer', location = 'India') => {
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
    
    // Internshala uses hyphenated keywords, e.g. "software-engineer"
    const formattedQuery = query.toLowerCase().trim().replace(/\s+/g, '-');
    const url = `https://internshala.com/jobs/keywords-${encodeURIComponent(formattedQuery)}`;
    logger.info(`Internshala scraping URL: ${url}`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    try {
      await page.waitForSelector('.individual_internship', { timeout: 10000 });
    } catch (e) {
      logger.warn('Internshala individual_internship selector not found. Might be empty or blocked.');
    }
    
    const htmlJobs = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.individual_internship'));
      const results = [];
      
      for (const card of cards) {
        // Skip ad cards
        if (card.classList.contains('jos_native_ad_text') || card.innerHTML.includes('Online Course with Placement')) {
          continue;
        }
        
        const titleEl = card.querySelector('.job-title-href');
        const companyEl = card.querySelector('.company-name');
        const locationEl = card.querySelector('.locations');
        
        // Salary / Stipend
        const salaryContainer = Array.from(card.querySelectorAll('.row-1-item')).find(el => el.querySelector('.ic-16-money'));
        const salary = salaryContainer ? (salaryContainer.querySelector('span.desktop')?.textContent.trim() || salaryContainer.textContent.trim()) : '';
        
        // Experience
        const expContainer = Array.from(card.querySelectorAll('.row-1-item')).find(el => el.querySelector('.ic-16-briefcase'));
        const experience = expContainer ? expContainer.textContent.trim() : '';
        
        // Skills
        const skillEls = Array.from(card.querySelectorAll('.job_skill'));
        const skills = skillEls.map(el => el.textContent.trim());
        
        // Description
        const descriptionEl = card.querySelector('.about_job .text');
        const descriptionText = descriptionEl ? descriptionEl.textContent.trim() : '';
        
        const title = titleEl ? titleEl.textContent.trim() : '';
        const href = titleEl ? titleEl.getAttribute('href') : '';
        const fullUrl = href ? (href.startsWith('http') ? href : `https://internshala.com${href}`) : '';
        const company = companyEl ? companyEl.textContent.trim() : 'Internshala Organization';
        const locationStr = locationEl ? locationEl.textContent.trim() : 'India';
        
        const externalJobId = href ? href.split('/').pop() : String(Math.random());
        
        if (title && title.length > 2) {
          results.push({
            source: 'Internshala',
            externalJobId,
            title,
            company,
            location: locationStr,
            applyUrl: fullUrl,
            description: descriptionText || `Job opportunity at ${company}: ${title}. Location: ${locationStr}. Salary/Stipend: ${salary || 'Not specified'}. Click Apply to view full details on Internshala.`,
            remote: locationStr.toLowerCase().includes('remote') || locationStr.toLowerCase().includes('home') || locationStr.toLowerCase().includes('work from home'),
            tags: [...skills, 'Internshala', 'Scraped', 'Job'],
            platform: 'internshala',
            postedAt: new Date(),
            salary,
            country: 'IN',
          });
        }
      }
      return results;
    });
    
    logger.info(`Scraped ${htmlJobs.length} jobs from Internshala HTML page.`);
    return htmlJobs.filter(j => j.title && j.applyUrl);
  } catch (error) {
    logger.error(`Internshala scraping failed: ${error.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = {
  fetchJobs: fetchInternshalaJobs,
};
