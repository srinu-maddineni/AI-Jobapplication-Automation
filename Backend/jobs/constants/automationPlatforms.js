/** ATS platforms that support Playwright-based auto-apply adapters */
const AUTOMATION_PLATFORMS = ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workday'];

/** Portals eligible for orchestration auto-apply (ATS + manual social portals) */
const SUPPORTED_PORTALS = [
  ...AUTOMATION_PLATFORMS,
  'linkedin',
  'indeed',
];

const isAutomationPlatform = (platform = '') => {
  const normalized = String(platform || '').toLowerCase();
  return AUTOMATION_PLATFORMS.some((p) => normalized.includes(p));
};

module.exports = {
  AUTOMATION_PLATFORMS,
  SUPPORTED_PORTALS,
  isAutomationPlatform,
};
