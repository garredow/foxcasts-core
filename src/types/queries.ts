import { PlaybackStatus } from '../enums';

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

export type PodcastQuery = AtLeastOne<{
  id: number;
  podexId: number;
  feedUrl: string;
}>;

export type PodcastsQuery = {
  podcastIds?: number[];
  offset?: number;
  limit?: number;
};

export type EpisodeQuery = AtLeastOne<{
  id: number;
  podexId: number;
  guid: string;
}>;

export type EpisodesQuery = {
  afterDate?: string;
  beforeDate?: string;
  podcastIds?: number[];
  playbackStatus?: PlaybackStatus;
  isDownloaded?: boolean;
  isFavorite?: boolean;
  longerThan?: number;
  shorterThan?: number;
  offset?: number;
  limit?: number;
};

export type ArtworkQuery = AtLeastOne<{
  id?: number;
  podcastId?: number;
  size?: number;
  blur?: number;
  greyscale?: boolean;
}>;

export type ArtworksQuery = {
  podcastIds: number[];
};
