import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { analyzeVibeV2 } from '@/lib/analysis/sentiment';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { recallMemories, storeMemory } from '@/lib/memory/memory';
import { createPrompt } from '@/lib/gemini';
import { generateText, ModelMessage, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { buildBonfireTools } from '@/tools/updateStatus';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
    const BONFIRE_ID = '00000000-0000-0000-0000-000000000001';

    if (!apiKey || !supabaseSecretKey) {
      return NextResponse.json(
        { text: 'Error: API Key is missing' },
        { status: 500 },
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });

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
    // Fetch from DB
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

    // 1. The "Vibe Check"
    const lastMessage = historyData?.[1];
    const lastSender = Array.isArray(lastMessage?.sender)
      ? lastMessage.sender[0]
      : lastMessage?.sender;

    const analysis = await analyzeVibeV2(message, userContext.name, {
      previousMessage: lastMessage?.content,
      previousSender: lastSender?.name,
      botName: 'Bonfire',
    });

    console.log('🧠 Brain scan:', JSON.stringify(analysis, null, 2));

    if (
      analysis.intensity > 7 &&
      (analysis.intent === 'flex' || analysis.intent === 'memorize')
    ) {
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

    // Format for Gemini
    // We need to reverse it so it's chronological (Oldest -> Newest)
    let formattedHistory: ModelMessage[] = (historyData || [])
      .reverse()
      .map((msg: any) => ({
        role: msg.is_ai ? 'assistant' : 'user',
        content: msg.content,
      }));

    if (
      formattedHistory.length > 0 &&
      formattedHistory[0].role === 'assistant'
    ) {
      formattedHistory.shift();
    }

    const { text, steps } = await generateText({
      model: google('gemini-2.5-flash'),
      system: createPrompt(
        systemDirectorNote,
        relevantMemories,
        userContext,
        room?.name || 'The Chat',
      ),
      messages: formattedHistory,
      tools: {
        ...buildBonfireTools(
          supabaseAdmin,
          historyData?.[historyData.length - 1].user_id,
        ),
      },
      stopWhen: stepCountIs(3), // 🔥 Allows her to act, observe, and then speak
    });

    // 📝 Log steps to file for debugging
    const logEntry = {
      timestamp: new Date().toISOString(),
      roomId,
      user: userContext.name,
      steps: steps,
    };
    const logPath = path.join(process.cwd(), 'bonfire-steps.log');
    fs.appendFileSync(
      logPath,
      JSON.stringify(logEntry, null, 2) + '\n---\n',
      'utf-8',
    );

    // 2. Dig into the steps array to find the search_the_web results
    const searchToolResults = steps
      .flatMap((step) => step.toolResults)
      .filter((result) => result.toolName === 'search_the_web');

    // 3. Extract your URLs safely
    let sources: { title: string; url: string }[] = [];

    if (searchToolResults.length > 0) {
      console.log(
        '🔍 Search Results:',
        JSON.stringify(searchToolResults, null, 2),
      );
      // Accessing the exact { success, results } object we returned in the tool
      const rawData = searchToolResults[0]?.output as any;

      console.log('🔍 Raw Data:', rawData);

      if (rawData?.success) {
        sources = rawData.results.map((item: any) => ({
          title: item.title,
          url: item.url,
        }));
      }
    }

    await supabaseAdmin.from('messages').insert({
      content: text,
      room_id: roomId,
      user_id: BONFIRE_ID,
      is_ai: true,
      summoned_by: summonedBy,
      metadata: {
        toolCalls: steps.map((s: any) => s.toolCalls),
        sources,
      },
    });

    return NextResponse.json({ text });
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
