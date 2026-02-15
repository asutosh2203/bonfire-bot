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
      TASK: Rewrite the following INPUT message into a purely factual, 3rd-person narrative past-tense statement for a database.
      
      RULES:
      1. Remove all slang, filler words ("lol", "omg", "literally"), and emotions.
      2. Convert "I" or "Me" to "User".
      3. Keep it under 20 words.
      4. If the text is meaningless noise, return "SKIP".

      INPUT: "${text}"
      OUTPUT:

      EXAMPLES:
      INPUT: lol I forgot my laptop at the cafe again
      OUTPUT: User forgot laptop at a cafe

      INPUT: OMG I just missed my flight by like two minutes
      OUTPUT: User missed the flight

      INPUT: Me and my friend got stuck in traffic for hours
      OUTPUT: User and friend were stuck in traffic for hours

      INPUT: I accidentally deleted the whole project folder
      OUTPUT: User accidentally deleted the project folder

      INPUT: Bro I stayed up all night finishing this assignment
      OUTPUT: User stayed awake all night to finish an assignment

      INPUT: I lost my wallet somewhere downtown today
      OUTPUT: User lost wallet downtown

      INPUT: I spilled coffee all over my keyboard this morning
      OUTPUT: User spilled coffee on keyboard

      INPUT: Me and my team finally shipped the feature today
      OUTPUT: User and team released the feature

      INPUT: I quit my job yesterday, couldn't take it anymore
      OUTPUT: User quit his job

      INPUT: I missed the meeting because I overslept
      OUTPUT: User missed meeting due to oversleeping

      INPUT: asdfghjkl lol what even
      OUTPUT: SKIP

      INPUT: uhhh yeah whatever blah blah
      OUTPUT: SKIP

      INPUT: I dropped my phone and cracked the screen
      OUTPUT: User dropped phone and cracked the screen

      INPUT: Me and my brother fixed the bike last night
      OUTPUT: User and brother repaired the bike

      INPUT: I sent the email to the wrong client
      OUTPUT: User sent email to the wrong client
    `;

    const result = await sanitizerModel.generateContent(prompt);
    const summary = result.response.text().trim();

    console.log('Sanitizer summary:', summary);

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
