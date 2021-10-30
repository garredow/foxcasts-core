import { PlaybackStatus } from '../enums';

export type EpisodeFilterOptions = {
  afterDate?: string;
  beforeDate?: string;
  offset?: number;
  limit?: number;
  podcastId?: number;
  playbackStatus?: PlaybackStatus;
  isDownloaded?: boolean;
  isFavorite?: boolean;
};
