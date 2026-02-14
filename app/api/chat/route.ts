import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { analyzeVibeV2 } from '@/lib/analysis/sentiment';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { recallMemories, storeMemory } from '@/lib/memory/memory';
import { createPrompt } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
    const BONFIRE_ID = '00000000-0000-0000-0000-000000000001';

    if (!apiKey || !supabaseUrl || !supabaseKey || !supabaseSecretKey) {
      return NextResponse.json(
        { text: 'Error: API Key is missing' },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const { message, userContext, summonedBy, roomId } = await req.json();

    // fetch room name using roomId
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('name')
      .eq('id', roomId)
      .single();

    // THE DECISION LAYER
    const lowerMsg = message.toLowerCase();
    const isSummoned = lowerMsg.includes('@bonfire'); // Tagged?

    // Feed Bonfire the last 20 messages
    // 1. Fetch from DB
    const { data: historyData } = await supabaseAdmin
      .from('messages')
      .select(`content, user_id, is_ai, created_at, sender: user_id(name)`)
      .eq('room_id', roomId)
      .eq('is_incognito', false)
      .order('created_at', { ascending: false })
      .limit(20);

    // Check if the chat is dead (no messages in 24h)
    const isDeadChat =
      historyData && historyData.length > 1
        ? checkLastMessageTime(historyData[1].created_at)
        : false;

    // 2. Format for Gemini
    // We need to reverse it so it's chronological (Oldest -> Newest)
    let formattedHistory = (historyData || []).reverse().map((msg: any) => ({
      role: msg.is_ai ? 'model' : 'user', // 'model' = Bot, 'user' = Human
      parts: [{ text: msg.content }],
    }));

    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift();
    }

    // 1. The "Vibe Check"
    const analysis = await analyzeVibeV2(message, userContext.name, {
      previousMessage: historyData?.[historyData.length - 2].content,
      previousSender: historyData?.[historyData.length - 2].sender.name,
      botName: 'Bonfire',
    });

    console.log('🧠 Brain scan:', JSON.stringify(analysis, null, 2));

    if (analysis.intensity > 7 || analysis.intent === 'flex') {
      storeMemory(
        historyData?.[0].user_id,
        userContext.name,
        roomId,
        `User said: ${message}`,
      );
    }

    // If summoned: 100% chance
    // If random text: 45% chance (Adjust this number to make her more/less chatty) based on sentiment
    // 2. The "Logic Gate"
    let shouldReply = false;
    let systemDirectorNote = ''; // This tells the Generator HOW to act

    // CASE A: The "Hard" Triggers (Always Reply)
    if (isSummoned) {
      shouldReply = true;
      systemDirectorNote = 'User explicitly tagged you. Reply directly.';
    } else if (analysis.target === 'bot') {
      shouldReply = true;
      systemDirectorNote = `User is talking directly to you (Intent: ${analysis.intent}). Respond accordingly.`;
    } else if (isDeadChat) {
      shouldReply = true;
      systemDirectorNote =
        'The chat has been dead for over 24 hours. Revive it with a casual, possibly provocative comment.';
    }

    // CASE B: The "Soft" Triggers (Probabilistic)
    else {
      const randomCheck = Math.random();

      if (analysis.intent === 'flex') {
        // 🏋️‍♂️ Flex Detector: 70% chance to roast a brag
        if (randomCheck < 0.7) {
          shouldReply = true;
          systemDirectorNote =
            'CONTEXT: User is bragging/flexing. Humble them. Be skeptical of their claims.';
        }
      } else if (analysis.intent === 'banter_defense') {
        // 🛡️ The "Double Down" Logic
        // If they whine about a roast, roast them HARDER for being soft.
        shouldReply = true;
        systemDirectorNote =
          'CONTEXT: User is whining about your previous roast. Do NOT apologize. Mock them for having thin skin. Double down.';
      } else if (analysis.intent === 'sadness' && analysis.intensity >= 6) {
        // 😢 Sadness Detector: 40% chance (Don't overdo sympathy)
        if (randomCheck < 0.4) {
          shouldReply = true;
          systemDirectorNote =
            'CONTEXT: User is genuinely sad/venting. Drop the roast persona. Be warm and supportive.';
        }
      } else if (
        analysis.intent === 'roast' &&
        analysis.target === 'other_user'
      ) {
        // 🍿 Drama Detector: 50% chance to join the roast
        if (randomCheck < 0.5) {
          shouldReply = true;
          systemDirectorNote =
            'CONTEXT: User is roasting another person. Join the chaos. Agree with the user or mock the drama.';
        }
      } else if (analysis.intensity >= 8) {
        // 📢 High Energy Detector: 60% chance to match the vibe
        if (randomCheck < 0.6) {
          shouldReply = true;
          systemDirectorNote = `CONTEXT: User is being very intense (Score: ${analysis.intensity}/10). Match their energy level.`;
        }
      }
    }

    if (!shouldReply) {
      console.log('Bonfire is silent');
      // 🤫 SHE STAYS SILENT
      // We return a specific status so the frontend knows to do nothing
      return NextResponse.json({ text: null, silent: true });
    }

    // 🏗️ Build the Personalization Prompt

    // 🧠 Fetch relevant memories
    const relevantMemories = await recallMemories(message);

    const tools: any = [
      {
        googleSearch: {},
      },
    ];

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      tools: tools,
      systemInstruction: createPrompt(
        systemDirectorNote,
        relevantMemories,
        userContext,
        room?.name || 'The Chat',
      ),
    });

    const chat = model.startChat({ history: formattedHistory });

    const result = await chat.sendMessage(message);
    const response = result.response.text(); // response text

    // Extract search metadata from Bonfire response
    const candidates = result.response.candidates || [];
    const groundingMetadata = candidates[0]?.groundingMetadata;

    let sources: ({ title: string; url: string } | null)[] = [];

    if (groundingMetadata?.groundingChunks) {
      sources = groundingMetadata.groundingChunks
        .map((chunk: any) => {
          const web = chunk.web;
          if (!web) return null;

          return {
            title: (web.title as string) || 'Source',
            url: (web.uri as string) || (web.url as string),
          };
        })
        .filter((item: any) => item !== null); // Remove empty entries
    }

    await supabaseAdmin.from('messages').insert({
      content: response,
      room_id: roomId,
      user_id: BONFIRE_ID,
      is_ai: true,
      summoned_by: summonedBy,
      metadata: {
        sources: sources,
        searchQuery: groundingMetadata?.webSearchQueries?.[0], // Store what she searched for
      },
    });

    return NextResponse.json({ text: response });
  } catch (error: any) {
    console.error('💥 CRASH:', error);
    return NextResponse.json({ text: error.message }, { status: 500 });
  }
}

function checkLastMessageTime(
  lastMessageDate: string | undefined | null,
): boolean {
  if (!lastMessageDate) return false;
  const lastMsgTime = new Date(lastMessageDate).getTime();
  const now = new Date().getTime();
  const diffInHours = (now - lastMsgTime) / (1000 * 60 * 60);
  return diffInHours > 24;
}
