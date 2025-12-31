"use server"; // 👈 This magic string makes it a Server Action

import { createServClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

type UserContext = {
  name: string;
  vibe: string;
  insecurity: string;
};

export async function saveUserProfile(formData: UserContext) {
  const supabase = await createServClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 2. Upsert (Insert or Update) into 'profiles' table
  const { error } = await supabase.from("profiles").upsert({
    id: user.id, // Matches Auth ID
    email: user.email,
    name: formData.name,
    vibe: formData.vibe,
    insecurity: formData.insecurity,
  });

  if (error) {
    console.error("Supabase Error:", error);
    throw new Error("Failed to save profile");
  }

  // 3. Purge the cache so the UI updates immediately
  revalidatePath("/");

  return { success: true };
}

// FETCH HISTORY
export async function getChatHistory() {
  const supabase = await createServClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("user_id", user.id) // Only get MY chat with the bot
    .order("created_at", { ascending: true });

  return data || [];
}

// SAVE MESSAGE (User or AI)
export async function saveMessage(
  content: string,
  role: "user" | "bonfire",
  isIncognito: boolean = false
) {
  const supabase = await createServClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // AI messages are also stored under the USER'S ID so we know whose chat it belongs to.
  // We distinguish them using the 'is_ai' flag.
  const { error } = await supabase.from("messages").insert({
    content,
    user_id: user.id,
    is_ai: role === "bonfire",
    is_incognito: isIncognito,
  });

  if (error) console.error("Error saving message:", error);
}
