import type {PublicSong} from '../../../shared/contracts';

export type MusicFilters = {
  query: string;
  categoryId: string | null;
  tagId: string | null;
};

export function filterLibrarySongs(
  songs: readonly PublicSong[],
  {query, categoryId, tagId}: MusicFilters,
): PublicSong[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return songs.filter((song) => (
    (normalizedQuery.length === 0 || song.title.toLocaleLowerCase().includes(normalizedQuery))
    && (categoryId === null || song.category?.id === categoryId)
    && (tagId === null || song.tags.some(({id}) => id === tagId))
  ));
}
