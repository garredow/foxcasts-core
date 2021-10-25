import { CoreConfig } from '..';
import { Podcast, UpdateResult } from '../types';
import { NotFoundError } from '../utils/errors';
import { Api } from './api';
import { Database } from './database';

export class Podcasts {
  private config: CoreConfig;
  private api: Api;
  private database: Database;

  constructor(config: CoreConfig, database?: Database) {
    this.config = config;
    this.api = new Api(config);
    this.database = database || new Database(this.config);
  }

  public async subscribeByPodexId(podexId: number): Promise<number> {
    const existingSubscription = await this.database
      .getPodcastByPodexId(podexId)
      .catch((err: Error) => {
        if (err instanceof NotFoundError) return false;
        throw err;
      });
    if (existingSubscription) {
      console.log(`Already subscribed to ${podexId}`);
      return 0;
    }

    const podcast = await this.api.getPodcast(podexId);
    const episodes = await this.api.getEpisodes(podexId);

    return this.database.addPodcast(podcast, episodes);
  }

  public async subscribeByFeed(feedUrl: string): Promise<number> {
    const existingSubscription = await this.database
      .getPodcastByFeed(feedUrl)
      .catch((err: Error) => {
        if (err instanceof NotFoundError) return false;
        throw err;
      });
    if (existingSubscription) {
      console.log(`Already subscribed to ${feedUrl}`);
      return 0;
    }

    const podcast = await this.api.getPodcast(null, feedUrl);
    const episodes = await this.api.getEpisodes(null, feedUrl);

    return this.database.addPodcast(podcast, episodes);
  }

  public async unsubscribe(podcastId: number): Promise<void> {
    await this.database.deletePodcast(podcastId);
  }

  public async unsubscribeByPodexId(podexId: number): Promise<void> {
    const podcast = await this.database
      .getPodcastByPodexId(podexId)
      .catch((err: Error) => {
        if (err instanceof NotFoundError) return null;
        throw err;
      });

    if (!podcast) return;

    await this.database.deletePodcast(podcast.id);
  }

  public async unsubscribeByFeed(feedUrl: string): Promise<void> {
    const podcast = await this.database
      .getPodcastByFeed(feedUrl)
      .catch((err: Error) => {
        if (err instanceof NotFoundError) return null;
        throw err;
      });

    if (!podcast) return;

    await this.database.deletePodcast(podcast.id);
  }

  public updatePodcast(
    podcastId: number,
    data: Partial<Podcast>
  ): Promise<Podcast> {
    return this.database.updatePodcast(podcastId, data);
  }

  public async getAllPodcasts(): Promise<Podcast[]> {
    return await this.database.getPodcasts();
  }

  public async getPodcastById(podcastId: number): Promise<Podcast> {
    return await this.database.getPodcastById(podcastId);
  }

  public async getPodcastByPodexId(podexId: number): Promise<Podcast> {
    return await this.database.getPodcastByPodexId(podexId);
  }

  public async getPodcastByFeed(feedUrl: string): Promise<Podcast> {
    return await this.database.getPodcastByFeed(feedUrl);
  }

  public async checkForUpdates(): Promise<UpdateResult> {
    const podcastIds = (await this.getAllPodcasts()).map((o) => o.id);

    const count = {
      podcasts: 0,
      episodes: 0,
    };
    for (const podcastId of podcastIds) {
      const podcast = await this.getPodcastById(podcastId);
      if (!podcast) continue;
      const latestEpisode = (
        await this.database.getEpisodesByPodcastId(podcast.id, {
          page: 0,
          numItems: 1,
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
}
