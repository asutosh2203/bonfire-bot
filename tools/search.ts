import { tool } from 'ai';
import { z } from 'zod';

const search_the_web = tool({
  description:
    'Search the internet for up-to-date information, news, or facts.',
  inputSchema: z.object({
    query: z.string().describe('The specific search query.'),
  }),
  execute: async ({ query }) => {
    console.log(`Bonfire is Googling via Serper: ${query}`);

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 3, // Keep the payload lean by just asking for top 3
      }),
    });

    if (!response.ok) {
      console.error('Search API crashed');
      return { success: false, error: 'Search failed' };
    }

    const data = await response.json();

    // Serper keeps the good stuff inside the 'organic' array
    const results = (data.organic || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      content: item.snippet,
    }));
    
    // Returns a clean array of { title, url, content }
    return { success: true, results };
  },
});

export default search_the_web;
