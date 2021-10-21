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
  Artwork,
} from './types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');
import { Podcasts } from './internal/podcasts';
import { Episodes } from './internal/episodes';
import { Api } from './internal/api';
import { Database } from './internal/database';
import { Artworks } from './internal/artworks';

export type CoreConfig = {
  baseUrl: string;
  apiKey?: string;
  dbName: string;
};

export class FoxcastsCore {
  private config: CoreConfig;
  private podcasts: Podcasts;
  private episodes: Episodes;
  private artwork: Artworks;
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
    this.artwork = new Artworks(this.config, this.db);
    this.api = new Api(this.config);
  }

  // Podcasts

  public subscribeByPodexId(podexId: number | string): Promise<void> {
    return this.podcasts.subscribeByPodexId(Number(podexId));
  }

  public subscribeByFeedUrl(feedUrl: string): Promise<void> {
    return this.podcasts.subscribeByFeed(feedUrl);
  }

  public unsubscribe(podcastId: number | string): Promise<void> {
    return this.podcasts.unsubscribe(Number(podcastId));
  }

  public unsubscribeByPodexId(podexId: number | string): Promise<void> {
    return this.podcasts.unsubscribeByPodexId(Number(podexId));
  }

  public unsubscribeByFeedUrl(feedUrl: string): Promise<void> {
    return this.podcasts.unsubscribeByFeed(feedUrl);
  }

  public updatePodcast(
    podcastId: number | string,
    data: Partial<Podcast>
  ): Promise<Podcast> {
    return this.podcasts.updatePodcast(Number(podcastId), data);
  }

  public getPodcasts(): Promise<Podcast[]> {
    return this.podcasts.getAllPodcasts();
  }

  public getPodcastById(podcastId: number | string): Promise<Podcast> {
    return this.podcasts.getPodcastById(Number(podcastId));
  }

  public getPodcastByPodexId(podexId: number | string): Promise<Podcast> {
    return this.podcasts.getPodcastByPodexId(Number(podexId));
  }

  public getPodcastByFeedUrl(feedUrl: string): Promise<Podcast> {
    return this.podcasts.getPodcastByFeed(feedUrl);
  }

  public checkForUpdates(): Promise<UpdateResult> {
    return this.podcasts.checkForUpdates();
  }

  // Episodes

  public getEpisodeById(episodeId: number | string): Promise<EpisodeExtended> {
    return this.episodes.getEpisodeById(Number(episodeId));
  }

  public getEpisodesByPodcastId(
    podcastId: number | string,
    limit = 30,
    offset = 0
  ): Promise<EpisodeExtended[]> {
    return this.episodes.getEpisodesByPodcastId(
      Number(podcastId),
      limit,
      offset
    );
  }

  public getEpisodesByFilter(
    filterId: EpisodeFilterId,
    limit = 30
  ): Promise<EpisodeExtended[]> {
    return this.episodes.getEpisodesByFilter(filterId, limit);
  }

  public updateEpisode(
    episodeId: number | string,
    data: Partial<Episode>
  ): Promise<Episode> {
    return this.episodes.updateEpisode(Number(episodeId), data);
  }

  public getEpisodeChapters(
    episodeId: number | string,
    podexId: number | null,
    fileUrl?: string,
    forceRefresh = false
  ): Promise<Chapter[]> {
    return this.episodes.getEpisodeChapters(
      Number(episodeId),
      podexId,
      fileUrl,
      forceRefresh
    );
  }

  // Artwork

  public getArtwork(
    podcastId: number | string,
    options: { size: number; blur?: number; greyscale?: boolean }
  ): Promise<Artwork> {
    return this.artwork.getArtwork(Number(podcastId), options);
  }

  public getArtworkById(
    artworkId: number | string
  ): Promise<Artwork | undefined> {
    return this.artwork.getArtworkById(Number(artworkId));
  }

  public getArtworksByPodcastId(
    podcastId: number | string
  ): Promise<Artwork[]> {
    return this.artwork.getArtworksByPodcastId(Number(podcastId));
  }

  public deleteArtworkById(artworkId: number | string): Promise<void> {
    return this.artwork.deleteArtworkById(Number(artworkId));
  }

  public deleteArtworksByPodcastId(podcastId: number | string): Promise<void> {
    return this.artwork.deleteArtworksByPodcastId(Number(podcastId));
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
