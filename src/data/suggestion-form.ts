// Pure helpers for the suggestion form (no Supabase import, so tests can load it).

export type Suggestion = {
  /** A bar already in the app, or null for a new bar (then venueName is required). */
  venueId: string | null;
  venueName: string;
  venueArea: string;
  deal: string;
  when: string;
  note: string;
};

export const SUGGESTION_LIMITS = { venueName: 120, venueArea: 160, deal: 300, when: 160, note: 500 } as const;

/** What's wrong with a suggestion before sending it, or null if it's ready. */
export function suggestionProblem(s: Suggestion): string | null {
  if (!s.venueId && s.venueName.trim().length < 2) return 'Add the bar’s name.';
  if (s.deal.trim().length < 3) return 'Describe the deal.';
  return null;
}
