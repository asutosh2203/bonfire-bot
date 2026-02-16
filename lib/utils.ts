// Class mergers
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const hasPresenceChanged = (
  oldState: Record<string, any>,
  newState: Record<string, any>,
) => {
  const oldKeys = Object.keys(oldState);
  const newKeys = Object.keys(newState);

  // 1. Did someone join or leave? (Fastest check)
  if (oldKeys.length !== newKeys.length) return true;

  // 2. Did someone's specific status or activity change?
  for (const key of newKeys) {
    const oldUser = oldState[key]?.[0];
    const newUser = newState[key]?.[0];

    // Bail out immediately if we spot a difference
    if (
      !oldUser ||
      oldUser.status !== newUser.status ||
      oldUser.activity !== newUser.activity
    ) {
      return true;
    }
  }

  // If we made it here, absolutely nothing changed.
  return false;
};
