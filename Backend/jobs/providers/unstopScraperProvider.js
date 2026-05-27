const { chromium } = require('playwright');
const logger = require('../../utils/logger');

const fetchUnstopJobs = async (query = 'software engineer', location = 'India') => {
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
    const url = `https://unstop.com/job?search=${encodeURIComponent(query)}`;
    logger.info(`Unstop scraping URL: ${url}`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // First, try fetching the internal search API inside browser context (bypasses CORS & headers)
    const apiJobs = await page.evaluate(async (q) => {
      try {
        const res = await fetch(`https://unstop.com/api/public/opportunity/search-opportunity?opportunity=jobs&search=${encodeURIComponent(q)}`);
        const json = await res.json();
        const records = json?.data?.data || json?.data || json?.opportunities || [];
        if (!Array.isArray(records) || records.length === 0) return null;
        
        return records.map(item => {
          const title = item.title || item.name || '';
          const company = item.organisation?.name || item.promoter_name || 'Unstop Organization';
          const slug = item.slug || '';
          const applyUrl = slug ? `https://unstop.com/jobs/${slug}` : `https://unstop.com/opportunities/${item.id || ''}`;
          
          let loc = 'India';
          if (Array.isArray(item.locations) && item.locations.length > 0) {
            loc = item.locations.join(', ');
          } else if (item.job_location) {
            loc = item.job_location;
          }
          
          return {
            source: 'Unstop',
            externalJobId: String(item.id || slug || Math.random()),
            title,
            company,
            location: loc,
            applyUrl,
            description: item.description || `Job opportunity at ${company}. Open to applicants. Click Apply to view full details on Unstop.`,
            remote: loc.toLowerCase().includes('remote'),
            tags: ['Unstop', 'Opportunity', 'Scraped'],
            platform: 'unstop',
            postedAt: item.created_at ? new Date(item.created_at) : new Date(),
          };
        });
      } catch (e) {
        return null;
      }
    }, query);
    
    if (apiJobs && apiJobs.length > 0) {
      logger.info(`Successfully scraped ${apiJobs.length} jobs from Unstop internal API.`);
      return apiJobs.filter(j => j.title && j.applyUrl);
    }
    
    // Scroll down to load more jobs on fallback
    try {
      logger.info('Scrolling Unstop page to load more opportunity cards...');
      for (let i = 0; i < 4; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
      }
    } catch (scrollErr) {
      logger.warn(`Unstop scroll failed: ${scrollErr.message}`);
    }
    
    const htmlJobs = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/jobs/"], a[href*="/opportunities/"]'));
      const seenUrls = new Set();
      const results = [];
      
      for (const anchor of anchors) {
        const href = anchor.getAttribute('href');
        if (!href) continue;
        
        const fullUrl = href.startsWith('http') ? href : `https://unstop.com${href}`;
        if (seenUrls.has(fullUrl)) continue;
        seenUrls.add(fullUrl);
        
        const parentCard = anchor.closest('.opportunity-card, [class*="card"]') || anchor;
        const titleEl = parentCard.querySelector('h3.double-wrap, [itemprop="name"], h2, h3, h4');
        const companyEl = parentCard.querySelector('p.single-wrap, p[class*="single-wrap"], .company-name, .org');
        const locationEl = parentCard.querySelector('span.job_location, [class*="job_location"], .location, .loc');
        
        const title = titleEl ? titleEl.textContent.trim() : (anchor.textContent.split('\n')[0] || '').trim();
        const company = companyEl ? companyEl.textContent.trim() : 'Unstop';
        let locationStr = locationEl ? locationEl.textContent.trim() : 'India';
        if (locationStr.includes('|')) {
          locationStr = locationStr.split('|').pop().trim();
        }
        
        const skillsEl = Array.from(parentCard.querySelectorAll('span.font-12, span.chip_text, .chip, [class*="skill"]'));
        const extractedSkills = skillsEl
          .map(s => s.textContent.trim())
          .filter(t => t && !t.includes('+') && !t.toLowerCase().includes('days left') && !t.toLowerCase().includes('posted') && t.length > 1);
        
        const externalJobId = href.split('/').pop() || String(Math.random());
        
        if (title && title.length > 2) {
          results.push({
            source: 'Unstop',
            externalJobId,
            title,
            company,
            location: locationStr,
            applyUrl: fullUrl,
            description: `Opportunity on Unstop: ${title} at ${company}. Required skills: ${extractedSkills.join(', ') || 'General IT'}. Click Apply to view details.`,
            remote: locationStr.toLowerCase().includes('remote') || locationStr.toLowerCase().includes('home'),
            tags: [...extractedSkills, 'Unstop', 'Opportunity', 'Scraped'],
            platform: 'unstop',
            postedAt: new Date(),
          });
        }
      }
      return results;
    });
    
    logger.info(`Scraped ${htmlJobs.length} jobs from Unstop HTML page.`);
    return htmlJobs.filter(j => j.title && j.applyUrl);
  } catch (error) {
    logger.error(`Unstop scraping failed: ${error.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = {
  fetchJobs: fetchUnstopJobs,
};
