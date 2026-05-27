const OpenAI = require('openai');
const { getCache, setCache, createCacheKey } = require('../utils/cache');

let client;

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return client;
};

const extractTextFromResponse = (response) => {
  if (!response) return '';
  if (typeof response.output_text === 'string') {
    return response.output_text.trim();
  }
  if (Array.isArray(response.output)) {
    return response.output
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.content) {
          return item.content.map((chunk) => chunk.text || '').join('');
        }
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
};

const callOpenAI = async (prompt, cacheKeyPayload = null, maxTokens) => {
  const cacheKey = cacheKeyPayload ? createCacheKey('openai', cacheKeyPayload) : null;
  if (cacheKey) {
    const cached = getCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const tokens = parseInt(process.env.MAX_TOKENS || '1000', 10);

  const response = await getClient().chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_completion_tokens: Math.min(tokens, maxTokens || tokens),
    temperature: 0.7,
  });

  const text = response.choices[0]?.message?.content || '';
  const usage = response?.usage || {};
  const result = { text, usage, raw: response };

  if (cacheKey) {
    setCache(cacheKey, result, 15 * 60);
  }

  return result;
};

const callOpenAIChat = async (messages, maxTokens) => {
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const tokens = parseInt(process.env.MAX_TOKENS || '1000', 10);

  const response = await getClient().chat.completions.create({
    model,
    messages,
    max_completion_tokens: Math.min(tokens, maxTokens || tokens),
    temperature: 0.7,
  });

  const text = response.choices[0]?.message?.content || '';
  const usage = response?.usage || {};
  return { text, usage };
};

module.exports = {
  callOpenAI,
  callOpenAIChat,
};
