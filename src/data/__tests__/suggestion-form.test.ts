import { describe, expect, it } from 'vitest';

import { type Suggestion, suggestionProblem } from '../suggestion-form';

const base: Suggestion = { venueId: null, venueName: 'Shooters', venueArea: '', deal: '$5 margaritas', when: '', note: '' };

describe('suggestionProblem', () => {
  it('accepts a new bar with a name and a deal', () => {
    expect(suggestionProblem(base)).toBeNull();
  });

  it('needs a bar name for a new bar, but not for an existing one', () => {
    expect(suggestionProblem({ ...base, venueName: ' ' })).toBe('Add the bar’s name.');
    expect(suggestionProblem({ ...base, venueName: '', venueId: 'v1' })).toBeNull();
  });

  it('needs a deal description', () => {
    expect(suggestionProblem({ ...base, deal: '  $5 ' })).toBe('Describe the deal.');
  });
});
