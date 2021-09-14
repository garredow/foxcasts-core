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

export class FoxcastsCore {
  public static version = pkg.version;

  constructor(options: Partial<Config>) {
    setConfig(options);
  }

  // Podcasts

  public static subscribeByPodexId(podexId: number): Promise<void> {
    return podcastService.subscribeByPodexId(podexId);
  }

  public subscribeByFeedUrl(feedUrl: string): Promise<void> {
    return podcastService.subscribeByFeed(feedUrl);
  }

  public unsubscribe(podcastId: number): Promise<void> {
    return podcastService.unsubscribe(podcastId);
  }

  public unsubscribeByPodexId(podexId: number): Promise<void> {
    return podcastService.unsubscribeByPodexId(podexId);
  }

  public unsubscribeByFeedUrl(feedUrl: string): Promise<void> {
    return podcastService.unsubscribeByFeed(feedUrl);
  }

  public getPodcasts(): Promise<Podcast[]> {
    return podcastService.getAllPodcasts();
  }

  public getPodcastById(podcastId: number): Promise<Podcast> {
    return podcastService.getPodcastById(podcastId);
  }

  public getPodcastByPodexId(podexId: number): Promise<Podcast> {
    return podcastService.getPodcastByPodexId(podexId);
  }

  public getPodcastByFeedUrl(feedUrl: string): Promise<Podcast> {
    return podcastService.getPodcastByFeed(feedUrl);
  }

  public checkForUpdates(): Promise<void> {
    return podcastService.checkForUpdates();
  }

  // Episodes

  public getEpisodeById(episodeId: number): Promise<EpisodeExtended> {
    return podcastService.getEpisodeById(episodeId);
  }

  public getEpisodesByPodcastId(
    podcastId: number,
    limit = 30,
    offset = 0
  ): Promise<EpisodeExtended[]> {
    return podcastService.getEpisodesByPodcastId(podcastId, limit, offset);
  }

  public getEpisodesByFilter(
    filterId: EpisodeFilterId,
    limit = 30
  ): Promise<EpisodeExtended[]> {
    return podcastService.getEpisodesByFilter(filterId, limit);
  }

  public getEpisodeChapters(
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

  public searchPodcasts(query: string): Promise<SearchResult[]> {
    return apiService.search(query);
  }

  public fetchPodcast(
    id?: number | null,
    feedUrl?: string | null
  ): Promise<ApiPodcast> {
    return apiService.getPodcast(id, feedUrl);
  }

  public fetchEpisodes(
    podcastId?: number | null,
    feedUrl?: string | null,
    count = 25,
    since?: string
  ): Promise<ApiEpisode[]> {
    return apiService.getEpisodes(podcastId, feedUrl, count, since);
  }

  public fetchArtwork(imageUrl: string, size = 100): Promise<string> {
    return apiService.getArtwork(imageUrl, size);
  }

  // Meta

  public async getStatus(): Promise<Status> {
    const apiHealth = await apiService.getHealth().catch(() => null);

    return {
      version: pkg.version,
      apiStatus: apiHealth ? 'ok' : 'error',
      apiVersion: apiHealth?.version,
      databaseVersion,
    };
  }
}
