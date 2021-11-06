import { DownloadStatus } from '.';
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
  isFavorite?: 0 | 1;
  offset?: number;
  limit?: number;
};

export type EpisodeQuery = AtLeastOne<{
  id: number;
  podexId: number;
  guid: string;
}>;

export type EpisodesQuery = {
  episodeIds?: number[];
  afterDate?: string;
  beforeDate?: string;
  withinDays?: number;
  podcastIds?: number[];
  playbackStatuses?: PlaybackStatus[];
  isDownloaded?: 0 | 1;
  isFavorite?: 0 | 1;
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
  greyscale?: 0 | 1;
}>;

export type ArtworksQuery = {
  podcastIds: number[];
};

export type FilterQuery = AtLeastOne<{
  id?: number;
}>;

export type FiltersQuery = {
  ids: number[];
};

export type PlaylistQuery = AtLeastOne<{
  id?: number;
}>;

export type PlaylistsQuery = {
  ids: number[];
};

export type DownloadQuery = AtLeastOne<{
  id?: number;
  episodeId?: number;
  status?: DownloadStatus;
}>;

export type DownloadsQuery = {
  ids?: number[];
  episodeIds?: number[];
  statuses?: DownloadStatus[];
  offset?: number;
  limit?: number;
};
