import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { invoke } from '@tauri-apps/api/core';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

export async function saveData(masterPassword: string, data: string): Promise<void> {
  await invoke('save_data', { masterPassword, data });
}

export async function loadData(masterPassword: string): Promise<string> {
  return await invoke<string>('load_data', { masterPassword });
}

export async function exportData(): Promise<string> {
  return await invoke<string>('export_data');
}

export async function importData(fileContent: string): Promise<void> {
  await invoke('import_data', { fileContent });
}

export async function hasDataFile(): Promise<boolean> {
  return await invoke<boolean>('has_data_file');
}