import { Api } from './internal/api';
import { Database } from './internal/database';
import {
  ApiPodcast,
  Podcast,
  PodcastQuery,
  PodcastsQuery,
  SearchResult,
  UpdateResult,
} from './types';
import { NotFoundError } from './utils';

export class Podcasts {
  private api: Api;
  private database: Database;

  constructor(api: Api, database: Database) {
    this.api = api;
    this.database = database;
  }

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

  public async get(query: PodcastQuery): Promise<Podcast> {
    const result = await this.query(query);
    if (!result) {
      throw new NotFoundError(`No results for ${query}`);
    }
    return result;
  }

  public async query(query: PodcastQuery): Promise<Podcast | undefined> {
    return this.database.getPodcast(query);
  }

  public async queryAll(query: PodcastsQuery): Promise<Podcast[]> {
    return await this.database.getPodcasts(query);
  }

  public update(podcastId: number, data: Partial<Podcast>): Promise<number> {
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

  public search(query: string): Promise<SearchResult[]> {
    return this.api.search(query);
  }

  public fetchTrending(
    since: number,
    categories?: number[]
  ): Promise<ApiPodcast[]> {
    return this.api.getTrendingPodcasts(since, categories);
  }

  public fetch(
    id?: number | null,
    feedUrl?: string | null
  ): Promise<ApiPodcast> {
    return this.api.getPodcast(id, feedUrl);
  }
}
