import { db, ensureUserId, RLS_VIOLATION, UserFacingError } from './session';
import { type Suggestion, SUGGESTION_LIMITS, suggestionProblem } from './suggestion-form';

export type { Suggestion } from './suggestion-form';

const orNull = (text: string, max: number) => text.trim().slice(0, max) || null;

/** Sends a suggestion to the admins. Nothing appears in the app until they add it. */
export async function sendSuggestion(s: Suggestion): Promise<void> {
  const problem = suggestionProblem(s);
  if (problem) throw new UserFacingError(problem);
  await ensureUserId();
  const { error } = await db()
    .from('suggestions')
    .insert({
      venue_id: s.venueId,
      venue_name: s.venueId ? null : orNull(s.venueName, SUGGESTION_LIMITS.venueName),
      venue_area: s.venueId ? null : orNull(s.venueArea, SUGGESTION_LIMITS.venueArea),
      deal: s.deal.trim().slice(0, SUGGESTION_LIMITS.deal),
      when_text: orNull(s.when, SUGGESTION_LIMITS.when),
      note: orNull(s.note, SUGGESTION_LIMITS.note),
    });
  if (!error) return;
  // The only policy a valid suggestion can fail is the daily limit.
  if (error.code === RLS_VIOLATION) throw new UserFacingError('That’s 5 suggestions today, thank you! Send more tomorrow.');
  throw new UserFacingError('Couldn’t send that. Check your connection and try again.');
}
