import { Api } from './internal/api';
import { Database } from './internal/database';
import {
  ApiEpisode,
  ApiPodcast,
  Artwork,
  ArtworkQuery,
  ArtworksQuery,
  Category,
  Chapter,
  Episode,
  EpisodeExtended,
  EpisodeQuery,
  EpisodesQuery,
  FilterList,
  Health,
  PIStats,
  Playlist,
  PlaylistExtended,
  Podcast,
  PodcastQuery,
  PodcastsQuery,
  SearchResult,
  UpdateResult,
} from './types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');

export type CoreConfig = {
  baseUrl: string;
  apiKey?: string;
  dbName: string;
};

export class FoxcastsCore {
  private config: CoreConfig;
  private api: Api;
  private database: Database;
  public static version = pkg.version;

  constructor(options: Partial<CoreConfig>) {
    this.config = {
      apiKey: undefined,
      baseUrl: 'https://api.foxcasts.com/',
      dbName: 'foxcasts',
      ...options,
    };

    this.database = new Database(this.config);
    this.api = new Api(this.config);
  }

  // Podcasts

  public async subscribe(query: PodcastQuery): Promise<number> {
    const exising = await this.database.getPodcast(query);
    if (exising) {
      console.log(`Already subscribed to ${query}`);
      return 0;
    }

    const podcast = await this.api.getPodcast(query.podexId, query.feedUrl);
    const episodes = await this.api.getEpisodes(query.podexId, query.feedUrl);

    const podcastId = await this.database.addPodcast(podcast);
    await this.database.addEpisodes(podcastId, episodes);

    return podcastId;
  }

  public async unsubscribe(query: PodcastQuery): Promise<void> {
    const podcast = await this.database.getPodcast(query);

    if (!podcast) return;

    const artworks = await this.database.getArtworks({
      podcastIds: [podcast.id],
    });
    await this.database.deleteArtworks(artworks.map((a) => a.id));

    const episodes = await this.database.getEpisodes({
      podcastIds: [podcast.id],
    });
    await this.database.deleteEpisodes(episodes.map((a) => a.id));

    await this.database.deletePodcast(podcast.id);
  }

  public async getPodcast(query: PodcastQuery): Promise<Podcast | undefined> {
    return this.database.getPodcast(query);
  }

  public async getPodcasts(query: PodcastsQuery): Promise<Podcast[]> {
    return await this.database.getPodcasts(query);
  }

  public updatePodcast(
    podcastId: number,
    data: Partial<Podcast>
  ): Promise<number> {
    return this.database.updatePodcast(podcastId, data);
  }

  public async checkForUpdates(): Promise<UpdateResult> {
    const podcastIds = (await this.database.getPodcasts({})).map((o) => o.id);
    const count = {
      podcasts: 0,
      episodes: 0,
    };
    for (const podcastId of podcastIds) {
      const podcast = await this.database.getPodcast({ id: podcastId });
      if (!podcast) continue;
      const latestEpisode = (
        await this.database.getEpisodes({
          podcastIds: [podcast.id],
          offset: 0,
          limit: 1,
        })
      )[0];
      if (!latestEpisode) {
        continue;
      }
      const newEpisodes = await this.api.getEpisodes(
        podcast.podexId,
        podcast.feedUrl,
        100,
        new Date(latestEpisode.date).valueOf()
      );
      if (newEpisodes.length === 0) {
        continue;
      }
      await this.database.addEpisodes(podcastId, newEpisodes);
      count.podcasts += 1;
      count.episodes += newEpisodes.length;
    }
    return count;
  }

  // Episodes

  public async getEpisode(
    query: EpisodeQuery
  ): Promise<EpisodeExtended | undefined> {
    const episode = await this.database.getEpisode(query);
    if (!episode) return;

    const podcast = await this.database.getPodcast({ id: episode.podcastId });
    if (!podcast) return;
    return {
      ...episode,
      podcastTitle: podcast.title,
      artwork: podcast.artwork,
      accentColor: podcast.accentColor,
    };
  }

  public async getEpisodes(query: EpisodesQuery): Promise<EpisodeExtended[]> {
    const [podcastMap, episodes] = await Promise.all([
      this.database.getPodcasts({}).then((podcasts) =>
        podcasts.reduce((result, podcast) => {
          result[podcast.id] = podcast;
          return result;
        }, {} as { [podcastId: number]: Podcast })
      ),
      this.database.getEpisodes(query),
    ]);

    return episodes.map((episode) => ({
      ...episode,
      podcastTitle: podcastMap[episode.podcastId].title,
      artwork: podcastMap[episode.podcastId].artwork,
      accentColor: podcastMap[episode.podcastId].accentColor,
    }));
  }

  public updateEpisode(
    episodeId: number,
    data: Partial<Episode>
  ): Promise<number> {
    return this.database.updateEpisode(episodeId, data);
  }

  public async getEpisodeChapters(
    episodeId: number,
    forceRefresh = false
  ): Promise<Chapter[]> {
    const episode = await this.database.getEpisode({ id: episodeId });

    if (!episode) {
      return [];
    } else if (!forceRefresh && Array.isArray(episode.chapters)) {
      return episode.chapters;
    }

    const chapters = await this.api.getChapters(
      episode.podexId,
      episode.remoteFileUrl
    );

    this.database.updateEpisode(episodeId, { chapters });
    return chapters;
  }

  // Artwork

  public async getArtwork(query: ArtworkQuery): Promise<Artwork | undefined> {
    if (!query.podcastId) {
      return this.database.getArtwork(query);
    }

    const existing = await this.database.getArtwork(query);
    if (existing) return existing;

    const podcast = await this.database.getPodcast({ id: query.podcastId });
    if (!podcast) return;

    const { imageData, ...palette } = await this.api.getArtworkWithPalette(
      podcast.artworkUrl,
      query.size || 100,
      query.blur,
      !!query.greyscale
    );

    const artwork = {
      podcastId: query.podcastId,
      image: imageData,
      size: query.size || 100,
      blur: query.blur,
      greyscale: query.greyscale,
      palette: palette,
    } as Artwork;
    const id = await this.database.addArtwork(artwork);
    artwork.id = id;

    return artwork;
  }

  public getArtworks(query: ArtworksQuery): Promise<Artwork[]> {
    return this.database.getArtworks(query);
  }

  public async deleteArtwork(query: ArtworkQuery): Promise<void> {
    const artwork = await this.database.getArtwork(query);
    if (!artwork) return;

    return this.database.deleteArtwork(artwork.id);
  }

  public async deleteArtworks(query: ArtworksQuery): Promise<void> {
    const artworks = await this.database.getArtworks(query);
    return this.database.deleteArtworks(artworks.map((a) => a.id));
  }

  // Filter Lists

  public async addFilterList<T>(
    list: Omit<FilterList<T>, 'id'>
  ): Promise<number> {
    return this.database.addFilterList<T>(list);
  }

  public async updateFilterList<T>(
    listId: number,
    changes: Omit<Partial<FilterList<T>>, 'id'>
  ): Promise<number> {
    return this.database.updateFilterList<T>(listId, changes);
  }

  public async deleteFilterLists(listIds: number[]): Promise<void> {
    return this.database.deleteFilterLists(listIds);
  }

  public async getFilterList<T>(
    id: number
  ): Promise<FilterList<T> | undefined> {
    return this.database.getFilterList<T>(id);
  }

  public async getFilterLists<T>(): Promise<FilterList<T>[]> {
    return this.database.getFilterLists<T>();
  }

  // Playlists

  public async addPlaylist(list: Omit<Playlist, 'id'>): Promise<number> {
    return this.database.addPlaylist(list);
  }

  public async updatePlaylist(
    listId: number,
    changes: Omit<Partial<Playlist>, 'id'>
  ): Promise<number> {
    return this.database.updatePlaylist(listId, changes);
  }

  public async deletePlaylists(listIds: number[]): Promise<void> {
    return this.database.deletePlaylists(listIds);
  }

  public async getPlaylist(
    id: number,
    populateEpisodes = false
  ): Promise<PlaylistExtended | undefined> {
    const playlist = await this.database.getPlaylist(id);
    if (!playlist) return;

    const result: PlaylistExtended = {
      ...playlist,
      episodes: [],
    };

    if (playlist && populateEpisodes) {
      const episodeMap = await this.getEpisodes({
        episodeIds: playlist.episodeIds,
      }).then((res) =>
        res.reduce((acc, episode) => {
          acc[episode.id] = episode;
          return acc;
        }, {} as { [key: number]: EpisodeExtended })
      );

      result.episodes = playlist.episodeIds.map((id) => episodeMap[id]);
    }

    return result;
  }

  public async getPlaylists(): Promise<Playlist[]> {
    return this.database.getPlaylists();
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
    const database = await this.database.health();

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
