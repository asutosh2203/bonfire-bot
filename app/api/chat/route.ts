import { GoogleGenerativeAI } from "@google/generative-ai";
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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
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
      
      RULES:
      - Be skeptical. If they mention habits like gym/coding or similar things, bring up past failures.
      - No "Assistant" talk. No "How can I help?".
      - Keep it short (text message length).
      - Use Emojis.

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

    return NextResponse.json({ text: response });
  } catch (error: any) {
    console.error("💥 CRASH:", error);
    return NextResponse.json({ text: error.message }, { status: 500 });
  }
}
