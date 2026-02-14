import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateEmbedding, sanitizeMemory } from './embedding';

export interface Memory {
  id: number;
  content: string;
  similarity: number;
  created_at: string;
}

/**
 * STAGE 1: SAVE (The "Journalist")
 * Takes a raw event, turns it into a vector, and saves it to the vault.
 */
export async function storeMemory(
  userId: string,
  userName: string,
  roomId: string,
  content: string,
) {
  try {
    console.log(`💾 Storing Memory: "${content}"`);

    const sanitizedContent = await sanitizeMemory(content, userName);

    if (!sanitizedContent) {
      console.log('🚫 Skipping empty sanitized content.');
      return false;
    }

    // 1. Convert text to vector
    const vector = await generateEmbedding(sanitizedContent);

    // 2. Insert into Supabase (Bypassing RLS with Admin Client)
    const { error } = await supabaseAdmin.from('memories').insert({
      user_id: userId,
      room_id: roomId,
      content: content,
      embedding: vector,
    });

    if (error) throw error;
    console.log('✅ Memory Stored Successfully.');
    return true;
  } catch (error) {
    console.error('❌ Failed to store memory:', error);
    return false;
  }
}

/**
 * STAGE 2: RECALL (The "Grudge")
 * Searches the vector database for memories semantically related to the query.
 */
export async function recallMemories(
  query: string,
  threshold = 0.1, // Adjust this: Higher = more strict, Lower = more loose matches
  limit = 3,
): Promise<string> {
  try {
    // 1. Convert the query (e.g., "Why is he sad?") into a vector
    if (!query || !query.trim()) {
      console.warn('⚠️ Empty query passed to recallMemories. Skipping.');
      return '';
    }

    console.log(`Recalling memories for: "${query}"`);

    const queryVector = await generateEmbedding(query);

    // 2. Call the Postgres RPC function we wrote
    const { data: memories, error } = await supabaseAdmin.rpc(
      'match_memories',
      {
        query_embedding: queryVector,
        match_threshold: threshold,
        match_count: limit,
      },
    );

    if (error) throw error;

    if (!memories || memories.length === 0) {
      return '';
    }

    // 3. Format the output for the System Prompt
    // Returns: "- User crashed his car (Similarity: 0.89)"
    const formattedMemories = memories
      .map((mem: Memory) => `- ${mem.content}`)
      .join('\n');

    console.log(
      `🧠 Recalled ${memories.length} memories for query: "${query}". Core memories: ${formattedMemories}`,
    );
    return formattedMemories;
  } catch (error) {
    console.error('❌ Failed to recall memories:', error);
    return '';
  }
}
