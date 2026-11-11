// Relative import: unit tests run without the app's @/ path alias.
import data from '../constants/tags.json';

export type TagGroup = 'events' | 'features';
export type Tag = { slug: string; label: string; group: TagGroup };

/** All known tags, in display order. */
export const TAGS: readonly Tag[] = data.tags.map(({ slug, label, group }) => ({
  slug,
  label,
  group: group === 'features' ? 'features' : 'events',
}));

const BY_SLUG = new Map(TAGS.map((t) => [t.slug, t]));

export function tagLabel(slug: string): string | null {
  return BY_SLUG.get(slug)?.label ?? null;
}

export function tagGroup(slug: string): TagGroup | null {
  return BY_SLUG.get(slug)?.group ?? null;
}

/** Short name for an event: its first known tag ("Live music"), else its title. */
export function eventLabel(e: { title: string; tags?: readonly string[] }): string {
  for (const t of e.tags ?? []) {
    const label = tagLabel(t);
    if (label) return label;
  }
  return e.title;
}
