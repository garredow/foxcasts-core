import {
  Podcast,
  EpisodeExtended,
  EpisodeFilterId,
  Chapter,
  SearchResult,
  ApiPodcast,
  ApiEpisode,
  Health,
  Category,
  PIStats,
  Episode,
  UpdateResult,
} from './types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');
import { Podcasts } from './internal/podcasts';
import { Episodes } from './internal/episodes';
import { Api } from './internal/api';
import { Database } from './internal/database';

export type CoreConfig = {
  baseUrl: string;
  apiKey?: string;
  dbName: string;
};

export class FoxcastsCore {
  private config: CoreConfig;
  private podcasts: Podcasts;
  private episodes: Episodes;
  private api: Api;
  private db: Database;
  public static version = pkg.version;

  constructor(options: Partial<CoreConfig>) {
    this.config = {
      apiKey: undefined,
      baseUrl: 'https://api.foxcasts.com/',
      dbName: 'foxcasts',
      ...options,
    };

    this.db = new Database(this.config);
    this.podcasts = new Podcasts(this.config, this.db);
    this.episodes = new Episodes(this.config, this.db);
    this.api = new Api(this.config);
  }

  // Podcasts

  public subscribeByPodexId(podexId: number): Promise<void> {
    return this.podcasts.subscribeByPodexId(podexId);
  }

  public subscribeByFeedUrl(feedUrl: string): Promise<void> {
    return this.podcasts.subscribeByFeed(feedUrl);
  }

  public unsubscribe(podcastId: number): Promise<void> {
    return this.podcasts.unsubscribe(podcastId);
  }

  public unsubscribeByPodexId(podexId: number): Promise<void> {
    return this.podcasts.unsubscribeByPodexId(podexId);
  }

  public unsubscribeByFeedUrl(feedUrl: string): Promise<void> {
    return this.podcasts.unsubscribeByFeed(feedUrl);
  }

  public getPodcasts(): Promise<Podcast[]> {
    return this.podcasts.getAllPodcasts();
  }

  public getPodcastById(podcastId: number): Promise<Podcast> {
    return this.podcasts.getPodcastById(podcastId);
  }

  public getPodcastByPodexId(podexId: number): Promise<Podcast> {
    return this.podcasts.getPodcastByPodexId(podexId);
  }

  public getPodcastByFeedUrl(feedUrl: string): Promise<Podcast> {
    return this.podcasts.getPodcastByFeed(feedUrl);
  }

  public checkForUpdates(): Promise<UpdateResult> {
    return this.podcasts.checkForUpdates();
  }

  // Episodes

  public getEpisodeById(episodeId: number): Promise<EpisodeExtended> {
    return this.episodes.getEpisodeById(episodeId);
  }

  public getEpisodesByPodcastId(
    podcastId: number,
    limit = 30,
    offset = 0
  ): Promise<EpisodeExtended[]> {
    return this.episodes.getEpisodesByPodcastId(podcastId, limit, offset);
  }

  public getEpisodesByFilter(
    filterId: EpisodeFilterId,
    limit = 30
  ): Promise<EpisodeExtended[]> {
    return this.episodes.getEpisodesByFilter(filterId, limit);
  }

  public updateEpisode(
    episodeId: number,
    data: Partial<Episode>
  ): Promise<Episode> {
    // Make sure no ID is passed in
    delete data.id;

    return this.episodes.updateEpisode(episodeId, data);
  }

  public getEpisodeChapters(
    episodeId: number,
    podexId: number | null,
    fileUrl?: string,
    forceRefresh = false
  ): Promise<Chapter[]> {
    return this.episodes.getEpisodeChapters(
      episodeId,
      podexId,
      fileUrl,
      forceRefresh
    );
  }

  // Fetch remote data

  public searchPodcasts(query: string): Promise<SearchResult[]> {
    return this.api.search(query);
  }

  public fetchTrendingPodcasts(
    since: number,
    categories?: number[]
  ): Promise<ApiPodcast[]> {
    return this.api.getTrendingPodcasts(since, categories);
  }

  public fetchPodcast(
    id?: number | null,
    feedUrl?: string | null
  ): Promise<ApiPodcast> {
    return this.api.getPodcast(id, feedUrl);
  }

  public fetchEpisodes(
    podcastId?: number | null,
    feedUrl?: string | null,
    count = 25,
    since?: number
  ): Promise<ApiEpisode[]> {
    return this.api.getEpisodes(podcastId, feedUrl, count, since);
  }

  public fetchArtwork(imageUrl: string, size = 100): Promise<string> {
    return this.api.getArtwork(imageUrl, size);
  }

  public fetchCategories(): Promise<Category[]> {
    return this.api.getCategories();
  }

  public fetchPIStats(): Promise<PIStats> {
    return this.api.getStats();
  }

  // Meta

  public async health(): Promise<Health> {
    const api = await this.api.health();
    const database = await this.db.health();

    return {
      healthy: [api.healthy, api.authenticated, database.healthy].every(
        (a) => a === true
      ),
      version: pkg.version,
      api,
      database,
      config: this.config,
    };
  }
}
