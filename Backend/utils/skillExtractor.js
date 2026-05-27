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

const extractSkillsFromText = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const normalizedText = text.toLowerCase();
  const foundSkills = new Set();

  SKILL_LIST.forEach((skill) => {
    if (normalizedText.includes(skill.toLowerCase())) {
      foundSkills.add(skill);
    }
  });

  return Array.from(foundSkills);
};

module.exports = {
  SKILL_LIST,
  extractSkillsFromText,
};
