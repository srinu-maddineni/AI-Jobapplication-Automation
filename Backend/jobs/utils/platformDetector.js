const axios = require('axios');
const { isAutomationPlatform } = require('../constants/automationPlatforms');

const sanitizeUrl = (url) => {
  if (!url) return '';
  return url
    .replace(/\\u0026/g, '&')
    .replace(/\\/g, '')
    .replace(/&amp;/g, '&')
    .trim();
};

const detectPlatformFromUrl = (url = '') => {
  const urlLower = String(url).toLowerCase();
  if (urlLower.includes('greenhouse.io') || urlLower.includes('gh_jid')) {
    return { platform: 'greenhouse', url };
  }
  if (urlLower.includes('lever.co') || urlLower.includes('jobs.lever.co')) {
    return { platform: 'lever', url };
  }
  if (urlLower.includes('ashbyhq.com') || urlLower.includes('jobs.ashby')) {
    return { platform: 'ashby', url };
  }
  if (urlLower.includes('smartrecruiters.com')) {
    return { platform: 'smartrecruiters', url };
  }
  if (urlLower.includes('myworkdayjobs.com') || urlLower.includes('workday.com')) {
    return { platform: 'workday', url };
  }
  return null;
};

const scrapePlatformFromHtml = (html, fallbackUrl) => {
  if (typeof html !== 'string') {
    return { platform: 'other', url: fallbackUrl };
  }

  const patterns = [
    { platform: 'greenhouse', regex: /https:\/\/boards\.greenhouse\.io\/[^\s"'\\]+/gi },
    { platform: 'lever', regex: /https:\/\/jobs\.lever\.co\/[^\s"'\\]+/gi },
    { platform: 'ashby', regex: /https:\/\/jobs\.ashbyhq\.com\/[^\s"'\\]+/gi },
    { platform: 'smartrecruiters', regex: /https:\/\/jobs\.smartrecruiters\.com\/[^\s"'\\]+/gi },
    { platform: 'workday', regex: /https:\/\/[^\s"'\\]*myworkdayjobs\.com\/[^\s"'\\]+/gi },
  ];

  for (const { platform, regex } of patterns) {
    const match = html.match(regex);
    if (match?.[0]) {
      return { platform, url: sanitizeUrl(match[0]) };
    }
  }

  return { platform: 'other', url: fallbackUrl };
};

/**
 * Resolve ATS platform from apply URL (with optional redirect follow).
 */
const detectSupportedPlatform = async (url) => {
  if (!url) {
    return { platform: 'other', url: '', automationSupported: false };
  }

  const direct = detectPlatformFromUrl(url);
  if (direct) {
    return { ...direct, automationSupported: isAutomationPlatform(direct.platform) };
  }

  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      timeout: 5000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const finalUrl = response.request?.res?.responseUrl || url;
    const fromFinal = detectPlatformFromUrl(finalUrl);
    if (fromFinal) {
      return { ...fromFinal, automationSupported: isAutomationPlatform(fromFinal.platform) };
    }

    const scraped = scrapePlatformFromHtml(response.data, finalUrl);
    return {
      ...scraped,
      automationSupported: isAutomationPlatform(scraped.platform),
    };
  } catch {
    return { platform: 'other', url, automationSupported: false };
  }
};

module.exports = {
  detectSupportedPlatform,
  detectPlatformFromUrl,
  sanitizeUrl,
};
