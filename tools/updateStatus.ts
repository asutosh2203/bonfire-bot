import { tool } from 'ai';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import search_the_web from './search';

export const buildBonfireTools = (
  supabase: SupabaseClient,
  userId: string,
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
  // Future tools (like kick_user or clear_chat) will snap right in here
});
