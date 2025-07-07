import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { writeTextFile, BaseDirectory, createDir } from '@tauri-apps/api/fs';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function saveNoteToFile(title: string, content: string) {
  // Sanitize title for filename
  const safeTitle = title.trim() ? title.replace(/[^a-z0-9\-_ ]/gi, '_') : 'Untitled_Note';
  const fileName = `${safeTitle}.txt`;
  // Ensure notes directory exists
  await createDir('notes', { dir: BaseDirectory.App, recursive: true });
  // Write file
  await writeTextFile(`notes/${fileName}`, content, { dir: BaseDirectory.App });
}

/**
 * Formats a date as:
 * - 'Today HH:MM' if today
 * - 'Yesterday HH:MM' if yesterday
 * - 'X days ago' for 2-5 days ago
 * - 'D MMMM' (e.g., '7 July') for older
 */
export function formatRelativeDate(dateInput: Date | string | number): string {
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const pad = (n: number) => n.toString().padStart(2, '0');
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  if (diffDays >= 2 && diffDays <= 5) return `${diffDays} days ago`;
  return `${date.getDate()} ${date.toLocaleString('default', { month: 'long' })}`;
}
