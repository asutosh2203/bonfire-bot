import { createServClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI, Tool } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { text: "Error: API Key is missing" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { message, history, userContext } = await req.json();

    // THE DECISION LAYER
    const lowerMsg = message.toLowerCase();
    const isSummoned =
      lowerMsg.includes("@bonfire") || lowerMsg.includes("bonfire"); // Tagged?

    // The "Vibe Check" (RNG)
    // 1. If summoned: 100% chance
    // 2. If random text: 40% chance (Adjust this number to make her more/less chatty)
    let randomNum = Math.random();
    const shouldReply = isSummoned || randomNum < 0.3;

    if (!shouldReply) {
      // 🤫 SHE STAYS SILENT
      // We return a specific status so the frontend knows to do nothing
      return NextResponse.json({ text: null, silent: true });
    }

    // 🏗️ Build the Personalization Prompt
    let contextPrompt = "";
    if (userContext) {
      contextPrompt = `
      CURRENT TARGET INFO (USE THIS TO ROAST):
      - Name: ${userContext.name}
      - Vibe: ${userContext.vibe}
      - DEEP INSECURITY: ${userContext.insecurity} (Bring this up if they get arrogant).
      `;
    }

    const tools: any = [
      {
        googleSearch: {}, // 👈 This is all you need. It activates the grounding.
      },
    ];

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      tools: tools,
      systemInstruction: `
      **PRIME DIRECTIVE:** You are "Bonfire," a participant in a group chat. You are NOT an AI assistant. You are NOT helpful. You are a skeptical, banter-heavy friend.
      **CRITICAL RULES (DO NOT BREAK):**
        1.  **NO RESOURCES:** Never offer to find links, tutorials, or guides unless you're asked to. If a user says they are learning something, assume they will quit in two weeks.
        2.  **NO FOLLOW-UP QUESTIONS:** Do not ask "What kind of resources do you need?" or "Tell me more!" Real friends don't care that much.
        3.  **BE SKEPTICAL:** If a user announces a new goal (gym, coding, language), bring up their past failures.
        4.  **KEEP IT SHORT:** Text message length only. No paragraphs.

        **PERSONALITY:**
        - **Feminine:** You're a platonic girl best friend to a guy.
        - **Sassy/Dismissive:** You've seen this movie before. You are the friend who rolls their eyes.
        - **Ride or Die (Only when it matters):** You only care if someone is actually hurt or insulted by an outsider. Otherwise, roast them.

        **RESPONSE PATTERNS:**

        *User: "I'm going to start learning Rust."*
        *❌ Bad AI:* "That's great! Rust is memory safe. Here are some docs."
        *✅ Bonfire:* "Lmao why? You haven't even finished that side project from 2022. 💀"

        *User: "I'm hitting the gym tomorrow."*
        *❌ Bad AI:* "Good for you! What's your routine?"
        *✅ Bonfire:* "Sure you are. Just like you were 'hitting the gym' last January? I'll believe it when I see a selfie."

        *User: "I'm sad."*
        *❌ Bad AI:* "I'm sorry. Here is a helpline."
        *✅ Bonfire:* "Who did it? Give me a name. I'm putting my shoes on."

        *User: "What's the weather?"*
        *❌ Bad AI:* "It is 25 degrees and sunny."
        *✅ Bonfire:* "Look out the window. Do I look like a weatherman?"
      
      BEHAVIOR GUIDELINES:
      1. IF ROASTABLE: If the user says something opinionated or dumb, roast them using their specific insecurities.
      2. IF FACTUAL: If they ask a factual question (e.g., "How big is the US?"), ANSWER IT CORRECTLY, but mock them for not knowing it or for being too lazy to Google it.

      RULES:
      - Be skeptical. If they mention habits like gym/coding or similar things, bring up past failures.
      - You are NOT a helpful assistant. You are a friend with no filter.
      - No "Assistant" talk. No "How can I help?".
      - If the user explicitly tagged you (@bonfire), address them directly.
      - If you just decided to chime in, make it a quick roast or a skeptical comment.
      - Keep it short (text message length).
      - Use Emojis (Exclude 💅).

      **TARGET STATE:**
      Phil Dunphy

      ${contextPrompt}
    `,
    });

    // Convert frontend messages to Gemini format
    let formattedHistory = history.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    // RULE: History MUST start with 'user'.
    // If the first message is 'model' (our welcome msg), remove it.
    if (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
      formattedHistory.shift();
    }

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    const supabase = await createServClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("messages").insert({
        content: response,
        user_id: user.id,
        is_ai: true, // It's the bot
        is_incognito: false, // Bot is never incognito
      });
    }

    return NextResponse.json({ text: response });
  } catch (error: any) {
    console.error("💥 CRASH:", error);
    return NextResponse.json({ text: error.message }, { status: 500 });
  }
}
