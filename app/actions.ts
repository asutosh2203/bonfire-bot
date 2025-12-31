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
