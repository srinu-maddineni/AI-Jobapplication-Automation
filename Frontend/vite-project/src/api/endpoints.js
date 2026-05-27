export const ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    signup: '/api/auth/signup',
  },
  resume: {
    upload: '/api/resume/upload',
    myResume: '/api/resume/my-resume',
  },
  jobs: {
    list: '/api/jobs',
    details: (id) => `/api/jobs/${id}`,
    fetch: '/api/jobs/fetch',
    matched: '/api/jobs/matched',
    recommendations: '/api/jobs/recommendations',
    sync: '/api/jobs/sync',
    syncStatus: '/api/jobs/sync/status',
  },
  applications: {
    apply: '/api/applications/apply',
    mine: '/api/applications/my-applications',
  },
  automation: {
    sendHREmail: '/api/automation/send-hr-email',
  },
  ai: {
    analyzeResume: '/api/ai/analyze-resume',
    analyzeJob: '/api/ai/analyze-job',
    match: '/api/ai/match',
    generateCoverLetter: '/api/ai/generate-cover-letter',
    optimizeResume: '/api/ai/optimize-resume',
    interviewQuestions: '/api/ai/interview-questions',
    chat: '/api/ai/chat',
    companyDomain: '/api/ai/company-domain',
  },
};
