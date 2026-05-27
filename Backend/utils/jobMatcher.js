const SKILL_LIST = [
  // Frontend
  'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Next.js', 'HTML', 'CSS',
  'Tailwind', 'Bootstrap', 'SASS', 'jQuery', 'Redux', 'Svelte', 'Webpack', 'Vite',
  // Backend
  'Node.js', 'Express', 'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring',
  'Spring Boot', 'C#', '.NET', 'ASP.NET', 'Ruby', 'Rails', 'PHP', 'Laravel',
  'Go', 'Golang', 'Rust', 'Kotlin', 'Scala', 'Elixir',
  // Databases
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase', 'DynamoDB',
  'Cassandra', 'SQLite', 'Oracle', 'Elasticsearch', 'GraphQL',
  // Cloud & DevOps
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins',
  'CI/CD', 'Terraform', 'Ansible', 'Linux', 'Nginx', 'Apache',
  // Data & AI/ML
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas',
  'NumPy', 'Scikit-learn', 'NLP', 'Computer Vision', 'Data Science',
  'Data Analysis', 'Power BI', 'Tableau', 'R', 'Hadoop', 'Spark', 'Kafka',
  // Mobile
  'React Native', 'Flutter', 'Swift', 'iOS', 'Android', 'Dart',
  // Tools & Practices
  'Git', 'GitHub', 'GitLab', 'Jira', 'Agile', 'Scrum', 'REST', 'API',
  'Microservices', 'DevOps', 'Testing', 'Unit Testing', 'Selenium',
  'Playwright', 'Cypress',
  // Soft skills / roles
  'Leadership', 'Communication', 'Problem Solving', 'Project Management',
  'Full Stack', 'Frontend', 'Backend', 'Software Engineer', 'Data Engineer',
  'Cloud Engineer', 'DevOps Engineer', 'QA', 'Product Management',
];

const normalizeSkill = (skill) => {
  return String(skill || '')
    .trim()
    .toLowerCase()
    .replace(/[\.\-_]/g, ' ')
    .replace(/\s+/g, ' ');
};

const normalizeSkills = (skills) => {
  const set = new Set();
  if (!Array.isArray(skills)) {
    return [];
  }

  skills.forEach((skill) => {
    const normalized = normalizeSkill(skill);
    if (normalized) {
      set.add(normalized);
    }
  });

  return Array.from(set);
};

const extractSkillsFromText = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const normalizedText = text.toLowerCase();
  return SKILL_LIST.filter((skill) => normalizedText.includes(skill.toLowerCase()));
};

const compareSkills = (userSkills = [], jobSkills = []) => {
  const normalizedUserSkills = normalizeSkills(userSkills);
  const normalizedJobSkills = normalizeSkills(jobSkills);

  const matchedSkills = normalizedJobSkills.filter((skill) => normalizedUserSkills.includes(skill));
  const missingSkills = normalizedJobSkills.filter((skill) => !normalizedUserSkills.includes(skill));

  const requiredCount = normalizedJobSkills.length;
  const matchPercentage = requiredCount === 0 ? 0 : Math.round((matchedSkills.length / requiredCount) * 100);

  return {
    matchedSkills,
    missingSkills,
    matchPercentage,
  };
};

module.exports = {
  SKILL_LIST,
  normalizeSkill,
  normalizeSkills,
  extractSkillsFromText,
  compareSkills,
};
