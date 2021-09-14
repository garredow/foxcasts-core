import podcastService from './services/podcasts';
import apiService from './services/api';
import {
  Podcast,
  EpisodeExtended,
  EpisodeFilterId,
  Chapter,
  SearchResult,
  ApiPodcast,
  ApiEpisode,
  Status,
} from './types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');
import { databaseVersion } from './services/database';
import { Config, setConfig } from './utils/config';

// Meta

function configure(config: Partial<Config>): Config {
  return setConfig(config);
}

async function getStatus(): Promise<Status> {
  const apiHealth = await apiService.getHealth().catch(() => null);

  return {
    version: pkg.version,
    apiStatus: apiHealth ? 'ok' : 'error',
    apiVersion: apiHealth?.version,
    databaseVersion,
  };
}

// Podcasts

function subscribeByPodexId(podexId: number): Promise<void> {
  return podcastService.subscribeByPodexId(podexId);
}

function subscribeByFeedUrl(feedUrl: string): Promise<void> {
  return podcastService.subscribeByFeed(feedUrl);
}

function unsubscribe(podcastId: number): Promise<void> {
  return podcastService.unsubscribe(podcastId);
}

function unsubscribeByPodexId(podexId: number): Promise<void> {
  return podcastService.unsubscribeByPodexId(podexId);
}

function unsubscribeByFeedUrl(feedUrl: string): Promise<void> {
  return podcastService.unsubscribeByFeed(feedUrl);
}

function getPodcasts(): Promise<Podcast[]> {
  return podcastService.getAllPodcasts();
}

function getPodcastById(podcastId: number): Promise<Podcast> {
  return podcastService.getPodcastById(podcastId);
}

function getPodcastByPodexId(podexId: number): Promise<Podcast> {
  return podcastService.getPodcastByPodexId(podexId);
}

function getPodcastByFeedUrl(feedUrl: string): Promise<Podcast> {
  return podcastService.getPodcastByFeed(feedUrl);
}

function checkForUpdates(): Promise<void> {
  return podcastService.checkForUpdates();
}

// Episodes

function getEpisodeById(episodeId: number): Promise<EpisodeExtended> {
  return podcastService.getEpisodeById(episodeId);
}

function getEpisodesByPodcastId(
  podcastId: number,
  limit = 30,
  offset = 0
): Promise<EpisodeExtended[]> {
  return podcastService.getEpisodesByPodcastId(podcastId, limit, offset);
}

function getEpisodesByFilter(
  filterId: EpisodeFilterId,
  limit = 30
): Promise<EpisodeExtended[]> {
  return podcastService.getEpisodesByFilter(filterId, limit);
}

function getEpisodeChapters(
  episodeId: number,
  podexId: number | null,
  fileUrl?: string,
  forceRefresh = false
): Promise<Chapter[]> {
  return podcastService.getEpisodeChapters(
    episodeId,
    podexId,
    fileUrl,
    forceRefresh
  );
}

// Fetch remote data

function searchPodcasts(query: string): Promise<SearchResult[]> {
  return apiService.search(query);
}

function fetchPodcast(
  id?: number | null,
  feedUrl?: string | null
): Promise<ApiPodcast> {
  return apiService.getPodcast(id, feedUrl);
}

function fetchEpisodes(
  podcastId?: number | null,
  feedUrl?: string | null,
  count = 25,
  since?: string
): Promise<ApiEpisode[]> {
  return apiService.getEpisodes(podcastId, feedUrl, count, since);
}

function fetchArtwork(imageUrl: string, size = 100): Promise<string> {
  return apiService.getArtwork(imageUrl, size);
}

export default {
  configure,
  getStatus,
  subscribeByPodexId,
  subscribeByFeedUrl,
  unsubscribe,
  unsubscribeByPodexId,
  unsubscribeByFeedUrl,
  getPodcasts,
  getPodcastById,
  getPodcastByPodexId,
  getPodcastByFeedUrl,
  checkForUpdates,
  getEpisodeById,
  getEpisodesByPodcastId,
  getEpisodesByFilter,
  getEpisodeChapters,
  searchPodcasts,
  fetchPodcast,
  fetchEpisodes,
  fetchArtwork,
};
