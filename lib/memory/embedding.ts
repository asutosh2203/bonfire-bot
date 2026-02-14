import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// We use the specific embedding model designed for retrieval tasks
const embeddingModel = genAI.getGenerativeModel({
  model: 'gemini-embedding-001',
});

const sanitizerModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * THE JOURNALIST
 * Turns raw, messy chat logs into dry, factual 3rd-person statements.
 * Example: "Yo dawg I crashed my dad's car" -> "User crashed his father's car."
 */
export async function sanitizeMemory(
  text: string,
  userName: string,
): Promise<string> {
  try {
    const prompt = `
      TASK: Rewrite the following INPUT message into a purely factual, 3rd-person past-tense statement for a database.
      
      RULES:
      1. Remove all slang, filler words ("lol", "omg", "literally"), and emotions.
      2. Convert "I" or "Me" to the user's name: "${userName}".
      3. Keep it under 20 words.
      4. If the text is meaningless noise, return "SKIP".

      INPUT: "${text}"
      OUTPUT:
    `;

    const result = await sanitizerModel.generateContent(prompt);
    const summary = result.response.text().trim();

    // Safety check: If the AI thinks it's garbage, don't store it.
    if (summary.includes('SKIP')) return '';

    return summary;
  } catch (error) {
    console.error('❌ Summarizer Failed:', error);
    return text; // Fallback: Store the raw text if AI fails
  }
}

/**
 * Turns text into a vector (list of numbers).
 * Used for both saving memories and searching them.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Clean the text slightly to remove noise
    const cleanText = text.replace(/\n/g, ' ').trim();

    if (!cleanText) {
      console.warn('⚠️ generateEmbedding called with empty text.');
      throw new Error('Cannot generate embedding for empty text.');
    }

    const result = await embeddingModel.embedContent({
      content: { role: 'user', parts: [{ text: cleanText }] },
      outputDimensionality: 768,
    } as any); // Cast to any to bypass potential type definition issues in older SDK versions
    const embedding = result.embedding;

    return embedding.values;
  } catch (error) {
    console.error('❌ Embedding Generation Failed:', error);
    throw error;
  }
}
