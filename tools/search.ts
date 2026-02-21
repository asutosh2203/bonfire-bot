import { tool } from 'ai';
import { z } from 'zod';

const search_the_web = tool({
  description:
    'Search the internet for up-to-date information, news, or facts.',
  inputSchema: z.object({
    query: z.string().describe('The specific search query.'),
  }),
  execute: async ({ query }) => {

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: query,
        search_depth: 'basic', // Keep it fast so the chat doesn't lag
        max_results: 3,
      }),
    });

    if (!response.ok) return { success: false, error: 'Search failed' };

    const data = await response.json();
    // Returns a clean array of { title, url, content }
    return { success: true, results: data.results };
  },
});

export default search_the_web;
