import winkSentiment from 'wink-sentiment';
import { GoogleGenerativeAI } from '@google/generative-ai';

// AI analysis output interface
export interface MessageAnalysis {
  intensity: number; // 1-10
  sentiment: 'positive' | 'negative' | 'neutral';
  intent:
    | 'flex'
    | 'roast'
    | 'sadness'
    | 'question'
    | 'joke'
    | 'noise'
    | 'memorize'
    | 'banter_defense';
  target: 'self' | 'other_user' | 'bot' | 'general'; // 'bot' means the user is talking TO Bonfire
  reasoning: string;
}
/**
 * The "Gatekeeper" that decides if Bonfire should wake up.
 */
export function analyzeVibe(text: string) {
  // We only replace words that act as ADVERBS (intensifiers).
  // We leave nouns (shit, bitch, etc) alone because they usually ARE negative.

  const intensifiers =
    /\b(fucking|fuckin|fkn|freaking|friggin|damn|goddamn|bloody|hella)\b/gi;

  // Replace them with 'super' to keep the intensity but remove the negative score
  const patchedText = text.replace(intensifiers, 'super');

  // 1. Run the lightweight analysis
  let { normalizedScore } = winkSentiment(patchedText); // wink-sentiment scores are usually -5 to +5.

  // Scale it 2 times
  normalizedScore *= 2;
  console.log(`Sentiment score on ${text} :`, normalizedScore);

  // We want to detect INTENSITY.

  const isLoud = normalizedScore > 2.0 || normalizedScore < -2.0;

  return { isLoud, score: normalizedScore };
}

export async function analyzeVibeV2(
  text: string,
  userName: string,
  context: {
    previousMessage?: string;
    previousSender?: string; // Name of the person who sent the last message
    botName?: string; // "Bonfire"
  },
): Promise<MessageAnalysis> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  console.log('Text:', text);
  console.log('User:', userName);
  console.log('Context:', context);

  const prompt = `
    ROLE: You are the social intelligence engine for a chat bot named "${context.botName || 'Bonfire'}" in a group chat.
    
    TASK: Analyze the CURRENT MESSAGE sent by "${userName}". Determine who the user is talking to and what their intent is.

    --- PREVIOUS MESSAGE FOR CONTEXT ---
    Last Speaker: "${context.previousSender || 'None'}"
    Last Message: "${context.previousMessage || 'None'}"
    ---------------

    CURRENT MESSAGE:
    User: "${userName}"
    Text: "${text}"

    GUIDELINES:
    1. TARGET DETECTION ("Who is 'you'?"):
       - If the text does not address anyone specifically, it usually refers to "${context.previousSender}".
       - If the text tags @${context.botName}, "you" refers to 'bot'.
       - If the text is a direct reply to the bot's previous roast, "you" refers to 'bot'.
       - If the user says something like "You didn't need to roast me", the Target is 'bot'.

    2. CONTEXTUAL AWARENESS (CRITICAL):
       - If Last Message was a ROAST from the Bot, and the user says "You are mean", "Stop it", or "That hurt":
         -> This is NOT 'sadness'. This is 'banter_defense'. The user is just whining because they lost.
       - 'sadness' is RESERVED for Real Life problems (job loss, breakups, bad days, depression). 
    
    3. INTENT CLASSIFICATION:
       - 'flex': Bragging (gym, money, code).
       - 'roast': Insulting/Mocking.
       - 'sadness': ONLY for serious real-life tragedy or depression.
       - 'banter_defense': User is complaining about being roasted or is playfully offended.
       - 'question': Asking for help.
       - 'joke': Banter.
       - 'memorize': User wants Bonfire to remember something.
       - 'noise': User is just spamming or talking nonsense.
       
    CRUCIAL: FOLLOW OUTPUT JSON FORMAT **VERY STRICTLY**

    OUTPUT JSON:
    {
      "intensity": 1 <= number <= 10,
      "sentiment": "positive" | "negative" | "neutral",
      "intent": "flex" | "roast" | "sadness" | "banter_defense" | "question" | "joke" | "memorize" | "noise",
      "target": "self" | "other_user" | "bot" | "general",
      "reasoning": "brief explanation"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text()) as MessageAnalysis;
  } catch (error) {
    console.error('⚠️ Analyzer Error:', error);
    return {
      intensity: 0,
      sentiment: 'neutral',
      intent: 'noise',
      target: 'general',
      reasoning: 'Error',
    };
  }
}
