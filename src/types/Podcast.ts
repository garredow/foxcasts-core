import { DatabaseItem, Palette } from '.';

export type Podcast = DatabaseItem & {
  podexId: number | null;
  itunesId: number | null;
  title: string;
  author: string;
  description?: string;
  feedUrl: string;
  artworkUrl: string;
  categories: string[];
  lastUpdated?: string;
  isFavorite: 0 | 1;
  artwork?: string;
  accentColor?: string;
  palette?: Palette;
};
