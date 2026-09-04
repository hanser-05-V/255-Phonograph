import type {LibraryResponse, PublicSong, TaxonomyItem} from '../../../../shared/contracts';

export const liveCategory: TaxonomyItem = {
  id: 'live',
  name: '现场',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

export const studioCategory: TaxonomyItem = {
  id: 'studio',
  name: '录音室',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

export const gentleTag: TaxonomyItem = {
  id: 'gentle',
  name: '轻柔',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

export const cosmicTag: TaxonomyItem = {
  id: 'cosmic',
  name: '星空',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

export const firstLightSong: PublicSong = {
  id: 'first-light',
  title: '初光',
  artist: 'Hanser',
  durationSeconds: 120,
  audioUrl: '/api/media/first-light',
  category: studioCategory,
  tags: [gentleTag],
  isFeatured: true,
  isLiveCover: false,
  publishedAt: '2026-09-03T12:00:00.000Z',
};

export const planetSong: PublicSong = {
  id: 'volcano-planet',
  title: '等火山喷发的小星球',
  artist: 'Hanser',
  durationSeconds: 180,
  audioUrl: '/api/media/volcano-planet',
  category: liveCategory,
  tags: [cosmicTag],
  isFeatured: true,
  isLiveCover: true,
  publishedAt: '2026-09-02T12:00:00.000Z',
};

export const liveGentleSong: PublicSong = {
  id: 'night-walk',
  title: '夜行',
  artist: 'Hanser',
  durationSeconds: 150,
  audioUrl: '/api/media/night-walk',
  category: liveCategory,
  tags: [gentleTag],
  isFeatured: false,
  isLiveCover: true,
  publishedAt: '2026-09-01T12:00:00.000Z',
};

export const allPublishedIds = [
  'first-light',
  'volcano-planet',
  'night-walk',
] as const;

export const libraryFixture: LibraryResponse = {
  songs: [firstLightSong, planetSong, liveGentleSong],
  categories: [liveCategory, studioCategory],
  tags: [gentleTag, cosmicTag],
  sections: {
    recent: [],
    featured: [],
    liveCovers: [],
  },
};

export const libraryWithSections: LibraryResponse = {
  ...libraryFixture,
  sections: {
    recent: ['first-light', 'volcano-planet', 'night-walk'],
    featured: ['first-light', 'volcano-planet'],
    liveCovers: ['volcano-planet', 'night-walk'],
  },
};
