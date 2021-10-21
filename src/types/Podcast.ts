export type Podcast = {
  id: number;
  podexId: number | null;
  itunesId: number | null;
  title: string;
  author: string;
  description?: string;
  feedUrl: string;
  artworkUrl: string;
  categories: string[];
  lastUpdated?: string;
  isFavorite: boolean;
};
