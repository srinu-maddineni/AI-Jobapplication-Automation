const aiService = require('../ai/services/aiService');
const aiRecordService = require('../services/aiRecordService');
const Job = require('../models/Job');
const Resume = require('../models/Resume');

const analyzeResume = async (req, res, next) => {
  try {
    const { resumeText } = req.body;

    console.log('Analyze resume request:', { 
      hasResumeText: !!resumeText, 
      resumeTextType: typeof resumeText,
      resumeTextLength: resumeText?.length || 0,
      userId: req.user.id 
    });

    if (!resumeText || typeof resumeText !== 'string') {
      console.error('Invalid resumeText:', { resumeText: resumeText?.substring(0, 100) });
      return res.status(400).json({ message: 'resumeText is required and must be a string.' });
    }

    if (resumeText.trim().length < 50) {
      console.error('Resume text too short:', resumeText.length);
      return res.status(400).json({ message: 'Resume text is too short. Please upload a complete resume.' });
    }

    const analysis = await aiService.analyzeResume(resumeText, req.user.id);
    await aiRecordService.saveAIAnalysis({
      userId: req.user.id,
      resumeScore: analysis.atsScore,
      matchedSkills: analysis.detectedSkills,
      missingSkills: analysis.missingSkills,
      aiSuggestions: analysis.recommendedImprovements,
      tokenUsage: analysis.tokenUsage,
      requestType: 'resume_analysis',
    });

    return res.json(analysis);
  } catch (error) {
    console.error('Analyze resume error:', error);
    next(error);
  }
};

const analyzeJob = async (req, res, next) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription || typeof jobDescription !== 'string') {
      return res.status(400).json({ message: 'jobDescription is required and must be a string.' });
    }

    const analysis = await aiService.analyzeJob(jobDescription);
    await aiRecordService.saveAIAnalysis({
      userId: req.user.id,
      resumeScore: 0,
      matchedSkills: analysis.requiredSkills,
      missingSkills: analysis.preferredSkills,
      aiSuggestions: analysis.responsibilities,
      tokenUsage: analysis.tokenUsage,
      requestType: 'job_analysis',
    });

    return res.json(analysis);
  } catch (error) {
    next(error);
  }
};

const matchResumeJob = async (req, res, next) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ message: 'resumeText and jobDescription are both required.' });
    }

    const matchResult = await aiService.matchResumeToJob(resumeText, jobDescription);
    await aiRecordService.saveAIAnalysis({
      userId: req.user.id,
      resumeScore: matchResult.matchScore,
      matchedSkills: [],
      missingSkills: matchResult.missingSkills,
      aiSuggestions: matchResult.recommendedResumeImprovements,
      tokenUsage: matchResult.tokenUsage,
      requestType: 'match',
    });

    return res.json(matchResult);
  } catch (error) {
    next(error);
  }
};

const generateCoverLetter = async (req, res, next) => {
  try {
    const { profile, company, role, jobDescription } = req.body;

    if (!profile || !company || !role || !jobDescription) {
      return res.status(400).json({ message: 'profile, company, role, and jobDescription are required.' });
    }

    const letter = await aiService.generateCoverLetter(profile, company, role, jobDescription);
    await aiRecordService.saveCoverLetter({
      userId: req.user.id,
      company,
      role,
      generatedContent: letter.generatedContent,
      tokenUsage: letter.tokenUsage,
    });

    return res.json(letter);
  } catch (error) {
    next(error);
  }
};

const optimizeResume = async (req, res, next) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ message: 'resumeText and jobDescription are required.' });
    }

    const optimization = await aiService.optimizeResume(resumeText, jobDescription);
    await aiRecordService.saveAIAnalysis({
      userId: req.user.id,
      resumeScore: 0,
      matchedSkills: [],
      missingSkills: optimization.missingTechnologies,
      aiSuggestions: [...optimization.atsKeywordSuggestions, ...optimization.resumeImprovementSuggestions, ...optimization.formattingRecommendations],
      tokenUsage: optimization.tokenUsage,
      requestType: 'resume_optimization',
    });

    return res.json(optimization);
  } catch (error) {
    next(error);
  }
};

const generateInterviewQuestions = async (req, res, next) => {
  try {
    const { profile, company, role, jobDescription } = req.body;

    if (!profile || !company || !role || !jobDescription) {
      return res.status(400).json({ message: 'profile, company, role, and jobDescription are required.' });
    }

    const questions = await aiService.generateInterviewQuestions(profile, company, role, jobDescription);
    await aiRecordService.saveAIAnalysis({
      userId: req.user.id,
      resumeScore: 0,
      matchedSkills: [],
      missingSkills: [],
      aiSuggestions: [
        ...questions.likelyInterviewQuestions,
        ...questions.technicalQuestions,
        ...questions.hrQuestions,
        ...questions.projectBasedQuestions,
      ],
      tokenUsage: questions.tokenUsage,
      requestType: 'interview_questions',
    });

    return res.json(questions);
  } catch (error) {
    next(error);
  }
};

/* ─── Smart rule-based chat bot (no OpenAI required) ─── */
const chat = async (req, res, next) => {
  try {
    const { message, lastJobs } = req.body; // lastJobs: frontend sends back the last shown job list for "tell me more"

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'message is required and must be a non-empty string.' });
    }

    const q = message.trim().toLowerCase();

    // ── Fetch resume context ──────────────────────────────
    let resumeRecord = null;
    try {
      resumeRecord = await Resume.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    } catch (_) {}

    const resumeSkills = resumeRecord?.extractedSkills || [];
    const hasResume = !!resumeRecord;

    // ── Intent helpers ─────────────────────────────────────
    const containsAny = (str, terms) => terms.some(t => str.includes(t));

    const isRecentIntent = containsAny(q, [
      'latest', 'recent', 'new jobs', 'newest', 'fresh', 'today', 'just posted', 'last posted',
      'show me jobs', 'show jobs', 'list jobs', 'what jobs', 'any jobs', 'all jobs',
    ]);
    const isResumeIntent = containsAny(q, [
      'resume', 'my skills', 'my profile', 'my experience', 'what skills',
      'match', 'fit', 'suitable', 'best for me', 'for me', 'recommend',
    ]);
    const isCountIntent  = containsAny(q, ['how many', 'count', 'total jobs', 'number of jobs', 'stats', 'statistics', 'breakdown']);
    const isSourceIntent = containsAny(q, ['linkedin', 'indeed', 'naukri', 'unstop']);
    const isHelpIntent   = containsAny(q, ['help', 'what can you', 'how do you', 'what do you', 'capabilities', 'commands']);
    const isGreeting     = containsAny(q, ['hi', 'hello', 'hey', 'good morning', 'good evening', 'good afternoon', 'howdy']);
    const isSyncIntent   = containsAny(q, ['sync', 'refresh', 'update jobs', 'fetch jobs', 'get new jobs', 'scrape']);
    const isRemoteIntent = containsAny(q, ['remote', 'work from home', 'wfh', 'remote jobs', 'remote work']);
    const isSalaryIntent = containsAny(q, ['salary', 'pay', 'lpa', 'ctc', 'compensation', 'package']);
    const isNavIntent    = containsAny(q, ['take me to', 'go to', 'navigate to', 'open the', 'switch to', 'bring me to']);

    // ── "Tell me more about job N" detection ───────────────
    const tellMoreMatch = q.match(/(?:tell me more|more about|details? (?:of|about)|about job|job number?|#)\s*(\d+)/);
    const tellMoreIdx   = tellMoreMatch ? parseInt(tellMoreMatch[1], 10) - 1 : -1;

    // ── Source filter ──────────────────────────────────────
    let sourceFilter = null;
    if (q.includes('linkedin')) sourceFilter = 'LinkedIn';
    else if (q.includes('indeed')) sourceFilter = 'Indeed';
    else if (q.includes('naukri')) sourceFilter = 'Naukri';
    else if (q.includes('unstop')) sourceFilter = 'Unstop';

    // ── Tech keyword extraction ────────────────────────────
    const techTerms = [
      'react', 'node', 'nodejs', 'python', 'java', 'javascript', 'typescript', 'angular', 'vue',
      'django', 'flask', 'spring', 'golang', 'go', 'rust', 'php', 'ruby', 'rails', 'swift',
      'kotlin', 'android', 'ios', 'flutter', 'dart', 'sql', 'mongodb', 'postgres', 'mysql',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'devops', 'ml', 'ai', 'data science',
      'machine learning', 'deep learning', 'fullstack', 'full stack', 'backend', 'frontend',
      'ui', 'ux', 'product manager', 'qa', 'testing', 'security', 'cloud', 'engineer',
      'data analyst', 'data engineer', 'mern', 'mean', 'graphql', 'redis', 'kafka',
    ];
    const mentionedTech = techTerms.filter(t => q.includes(t));

    // ── Date helpers ───────────────────────────────────────
    const fmtDate = (d) => {
      if (!d) return '';
      const diff = Math.floor((Date.now() - new Date(d)) / 60000);
      if (diff < 60)   return `${diff}m ago`;
      if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
      return `${Math.floor(diff / 1440)}d ago`;
    };

    // ── Common DB select fields ────────────────────────────
    const JOB_FIELDS = 'title company location source jobUrl applyUrlResolved createdAt salary requiredSkills remote';

    // ════════════════════════════════════════════════════════
    // INTENTS
    // ════════════════════════════════════════════════════════

    // ── SYNC ───────────────────────────────────────────────
    if (isSyncIntent) {
      return res.json({
        text: null,
        action: 'SYNC_JOBS',
        meta: { message: '🔄 Starting job sync from LinkedIn, Indeed, Naukri, and Unstop…\n\nThis may take 30–60 seconds. The job list will refresh automatically!' },
      });
    }

    // ── NAVIGATION fallback ────────────────────────────────
    if (isNavIntent) {
      const navPageMap = {
        'application': { label: '📋 Applications', path: '/applications' },
        'dashboard':   { label: '🏠 Dashboard',    path: '/dashboard'    },
        'resume':      { label: '📄 Resume',        path: '/resume'       },
        'jobs':        { label: '💼 Jobs',          path: '/jobs'         },
        'saved':       { label: '🔖 Saved Jobs',   path: '/saved-jobs'   },
        'automation':  { label: '⚙️ Automation',   path: '/automation'   },
        'cover':       { label: '✉️ Cover Letter',  path: '/cover-letter' },
      };
      const target = Object.entries(navPageMap).find(([k]) => q.includes(k));
      return res.json({
        text: target
          ? `✅ Navigating to **${target[1].label}** now…`
          : `I can take you to:\n\n🏠 **Dashboard** · 📄 **Resume** · 💼 **Jobs** · 🔖 **Saved Jobs** · 📋 **Applications** · ⚙️ **Automation** · ✉️ **Cover Letter**\n\nJust say *"take me to [page]"*!`,
      });
    }

    // ── TELL ME MORE ABOUT JOB N ───────────────────────────
    if (tellMoreIdx >= 0 && Array.isArray(lastJobs) && lastJobs[tellMoreIdx]) {
      const job = lastJobs[tellMoreIdx];
      const url = job.applyUrlResolved || job.jobUrl;
      const skills = (job.requiredSkills || []).length > 0
        ? `\n🔧 **Skills**: ${job.requiredSkills.join(', ')}`
        : '';
      const salary = job.salary ? `\n💰 **Salary**: ${job.salary}` : '';
      const remote = job.remote ? '\n🏡 **Remote**: Yes' : '';
      return res.json({
        text: `📌 **${job.title}**\n🏢 ${job.company}\n📍 ${job.location || 'Location not specified'}${skills}${salary}${remote}\n🌐 Source: ${job.source}\n⏱ Posted: ${fmtDate(job.createdAt)}\n\n[👉 Apply Now](${url})`,
        jobs: [job],
      });
    }

    // ── GREETING ───────────────────────────────────────────
    if (isGreeting && !isRecentIntent && !isResumeIntent) {
      const hour = new Date().getHours();
      const timeGreet = hour < 12 ? '☀️ Good morning' : hour < 17 ? '🌤 Good afternoon' : '🌙 Good evening';
      const resumeNote = hasResume
        ? `I can see you've uploaded your resume with **${resumeSkills.length} skills**.`
        : 'You haven\'t uploaded a resume yet — do that on the **Resume page** for better job matching!';
      const total = await Job.countDocuments({});
      return res.json({
        text: `${timeGreet}! I'm your **AI Job Assistant**.\n\n${resumeNote}\n\n📊 There are **${total} jobs** in the database right now.\n\nWhat can I help you with?`,
        meta: { totalJobs: total },
      });
    }

    // ── HELP ───────────────────────────────────────────────
    if (isHelpIntent) {
      return res.json({
        text: `Here's everything I can do:\n\n🆕 **"Show latest jobs"** — newest postings\n💼 **"Match my resume"** — jobs ranked by your skills\n🔍 **"React jobs"** / **"Python roles"** — skill search\n🏢 **"LinkedIn jobs"** / **"Naukri jobs"** — by source\n🏡 **"Remote jobs"** — work from home listings\n💰 **"Jobs with salary"** — filter by compensation info\n📊 **"Job stats"** — database breakdown\n🔄 **"Sync jobs"** — refresh from live sources\n🧭 **"Take me to Applications"** — page navigation\n📌 **"Tell me more about job 2"** — job details`,
      });
    }

    // ── JOB COUNT / STATS ──────────────────────────────────
    if (isCountIntent) {
      const total = await Job.countDocuments({});
      const bySource = await Job.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      const remoteCount = await Job.countDocuments({ remote: true });
      const withSalary  = await Job.countDocuments({ salary: { $ne: '' } });
      const breakdown = bySource.map(s => `  • **${s._id}**: ${s.count}`).join('\n');
      return res.json({
        text: `📊 **Job Database Stats**\n\n**Total: ${total} jobs**\n\n${breakdown}\n\n🏡 Remote: ${remoteCount} · 💰 With salary: ${withSalary}\n\nSay *"sync jobs"* to refresh from live sources!`,
        meta: { totalJobs: total, bySource, remoteCount, withSalary },
      });
    }

    // ── REMOTE JOBS ────────────────────────────────────────
    if (isRemoteIntent && !isResumeIntent) {
      const filter = { $or: [{ remote: true }, { location: /remote/i }] };
      if (sourceFilter) filter.source = sourceFilter;
      if (mentionedTech.length > 0) {
        const regexParts = mentionedTech.slice(0, 2).map(t => new RegExp(t, 'i'));
        filter.$or.push({ requiredSkills: { $in: regexParts } }, { title: { $in: regexParts } });
      }

      const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(8).select(JOB_FIELDS).lean();
      if (jobs.length === 0) {
        return res.json({ text: `No remote jobs found right now. Try **Sync Jobs** to refresh listings!` });
      }
      return res.json({
        text: `🏡 Found **${jobs.length} remote job${jobs.length > 1 ? 's' : ''}**:`,
        jobs,
      });
    }

    // ── JOBS WITH SALARY INFO ──────────────────────────────
    if (isSalaryIntent && !isResumeIntent) {
      const jobs = await Job.find({ salary: { $nin: ['', null] } })
        .sort({ createdAt: -1 }).limit(8).select(JOB_FIELDS).lean();
      if (jobs.length === 0) {
        return res.json({ text: `No jobs with salary information found. Scraped jobs sometimes omit salary — try **Sync Jobs** for fresh data!` });
      }
      return res.json({
        text: `💰 Found **${jobs.length} jobs with salary information**:`,
        jobs,
      });
    }

    // ── RESUME MATCH ───────────────────────────────────────
    if (isResumeIntent) {
      if (!hasResume) {
        return res.json({
          text: `I couldn't find your resume. Please upload one on the **📄 Resume page** first — then I can match you to the best jobs!\n\nIn the meantime, I can still show you the latest postings — just ask!`,
          action: 'SUGGEST_RESUME',
        });
      }

      const skillsLower = resumeSkills.map(s => s.toLowerCase());
      const allJobs = await Job.find({}).sort({ createdAt: -1 }).limit(200).select(JOB_FIELDS).lean();

      const scored = allJobs
        .map(job => {
          const jSkills = (job.requiredSkills || []).map(s => s.toLowerCase());
          const titleWords = (job.title || '').toLowerCase().split(/\W+/);
          const overlap = [
            ...jSkills.filter(s => skillsLower.some(rs => rs.includes(s) || s.includes(rs))),
            ...titleWords.filter(w => skillsLower.some(rs => rs === w)),
          ];
          const unique = [...new Set(overlap)];
          return { job: { ...job, score: unique.length, overlap: unique }, score: unique.length };
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      if (scored.length === 0) {
        const fallback = allJobs.slice(0, 5);
        return res.json({
          text: `Found your resume with **${resumeSkills.length} skills** (${resumeSkills.slice(0, 5).join(', ')}…).\n\nNo exact matches yet — here are the **5 most recent jobs** instead:`,
          jobs: fallback,
        });
      }

      return res.json({
        text: `💼 Based on your **${resumeSkills.length} resume skills**, here are your **top ${scored.length} matches**:`,
        jobs: scored.map(r => r.job),
        meta: { resumeSkills },
      });
    }

    // ── SKILL/TECH SEARCH ──────────────────────────────────
    if (mentionedTech.length > 0) {
      const techQuery = mentionedTech.slice(0, 3);
      const regexParts = techQuery.map(t => new RegExp(t, 'i'));
      const filter = {
        $or: [
          { title: { $in: regexParts } },
          { requiredSkills: { $in: regexParts } },
          { description: { $in: regexParts } },
        ],
      };
      if (sourceFilter) filter.source = sourceFilter;
      if (isRemoteIntent) filter.$or.push({ remote: true }, { location: /remote/i });

      const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(8).select(JOB_FIELDS).lean();
      if (jobs.length === 0) {
        return res.json({
          text: `🔍 No **${techQuery.join('/')}** jobs found yet.\n\nTry saying *"sync jobs"* to pull fresh listings, then search again!`,
        });
      }
      return res.json({
        text: `🔍 Found **${jobs.length} ${techQuery.join('/')} job${jobs.length > 1 ? 's' : ''}**:`,
        jobs,
      });
    }

    // ── SOURCE-SPECIFIC ────────────────────────────────────
    if (isSourceIntent && sourceFilter) {
      const jobs = await Job.find({ source: sourceFilter }).sort({ createdAt: -1 }).limit(8).select(JOB_FIELDS).lean();
      if (jobs.length === 0) {
        return res.json({ text: `No **${sourceFilter}** jobs found right now. Try *"sync jobs"* to pull fresh data!` });
      }
      return res.json({
        text: `📋 Latest **${sourceFilter}** jobs (${jobs.length} found):`,
        jobs,
      });
    }

    // ── RECENT JOBS (default / explicit) ──────────────────
    const recentJobs = await Job.find({}).sort({ createdAt: -1 }).limit(8).select(JOB_FIELDS).lean();
    if (recentJobs.length === 0) {
      return res.json({
        text: `No jobs in the database yet!\n\nSay *"sync jobs"* or go to the **💼 Jobs page** and click **Sync Jobs** to scrape live listings.`,
        action: 'SUGGEST_SYNC',
      });
    }
    return res.json({
      text: `🆕 Here are the **${recentJobs.length} most recently added jobs**:`,
      jobs: recentJobs,
    });

  } catch (error) {
    next(error);
  }
};

const getCompanyDomain = async (req, res, next) => {
  try {
    const { company } = req.body;
    if (!company) {
      return res.status(400).json({ message: 'company parameter is required' });
    }
    const result = await aiService.findCompanyDomain(company);
    return res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeResume,
  analyzeJob,
  matchResumeJob,
  generateCoverLetter,
  optimizeResume,
  generateInterviewQuestions,
  chat,
  getCompanyDomain,
};
