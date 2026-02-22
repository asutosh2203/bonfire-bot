import { tool } from 'ai';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import search_the_web from './search';

export const buildBonfireTools = (
  supabase: SupabaseClient,
  userId: string,
  roomId: string,
  botId: string,
) => ({
  update_profile_status: tool({
    description: 'Update the user profile status and activity text.',
    inputSchema: z.object({
      preferred_status: z
        .enum(['online', 'idle', 'dnd', 'invisible'])
        .optional()
        .describe('The presence status.'),
      custom_activity: z
        .string()
        .max(50)
        .optional()
        .describe('A short custom status message.'),
    }),
    execute: async ({ preferred_status, custom_activity }) => {
      const updates: Record<string, any> = {};
      if (preferred_status) updates.preferred_status = preferred_status;
      if (custom_activity) updates.custom_activity = custom_activity;

      if (Object.keys(updates).length === 0) {
        return { success: false, error: 'No fields provided to update.' };
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        console.error('Bonfire fumbled the database update:', error);
        return { success: false, error: error.message };
      }

      console.log(
        'Bonfire updated profile status:',
        preferred_status,
        custom_activity,
      );
      return { success: true, preferred_status, custom_activity };
    },
  }),

  search_the_web,
  create_poll: tool({
    description:
      'Create an interactive voting poll for the chat room. Use this when users are deciding on something or arguing.',
    inputSchema: z.object({
      question: z.string().describe('The main question or topic of the poll.'),
      options: z
        .array(z.string())
        .min(2)
        .max(5) // Keep her in check so she doesn't spam 20 options
        .describe('An array of 2 to 5 short options to vote on.'),
    }),
    execute: async ({ question, options }) => {
      console.log(`Bonfire is creating a poll: ${question}`);

      // 1. Insert directly into the messages stream
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: question, // Fallback text for push notifications
          room_id: roomId,
          user_id: botId, // This message officially belongs to Bonfire
          is_ai: true,
          message_type: 'poll', // 👈 THE ROUTER FLAG
          metadata: {
            question,
            options,
          },
        })
        .select('id')
        .single();

      if (error) {
        console.error('Bonfire fumbled the poll creation:', error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data.id, question };
    },
  }),
});
