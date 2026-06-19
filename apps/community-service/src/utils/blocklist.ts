const BLOCKLIST = ['spam', 'scam', 'fake', 'prohibited', 'fraud', 'illegal'];

export function containsBlockedWord(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKLIST.some((word) => lower.includes(word));
}
