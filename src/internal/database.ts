import Dexie from 'dexie';
import { PlaybackStatus } from '../enums';
import {
  Podcast,
  Episode,
  EpisodeFilterId,
  ApiPodcast,
  ApiEpisode,
} from '../types';
import { NotFoundError } from '../utils/errors';
import { fromApiEpisode } from '../utils/formatEpisode';

class FoxcastsDB extends Dexie {
  podcasts: Dexie.Table<Podcast, number>;
  episodes: Dexie.Table<Episode, number>;

  constructor(name: string) {
    super(name);

    this.version(1).stores({
      podcasts: '++id, &feedUrl, &podexId, itunesId',
      episodes: '++id, &podexId, &guid, podcastId, date, progress',
    });
    this.version(2)
      .stores({
        podcasts: '++id, &feedUrl, &podexId, itunesId, isFavorite',
        episodes:
          '++id, &podexId, &guid, podcastId, date, playbackStatus, isDownloaded, isFavorite',
      })
      .upgrade((tx) => {
        tx.table<Podcast, number>('podcasts')
          .toCollection()
          .modify((episode) => {
            episode.isFavorite = false;
          });
        tx.table<Episode, number>('episodes')
          .toCollection()
          .modify((episode) => {
            episode.isDownloaded = false;
            episode.isFavorite = false;
            episode.playbackStatus =
              episode.progress > 0 && episode.progress === episode.duration
                ? PlaybackStatus.Played
                : PlaybackStatus.Unplayed;
          });
      });

    this.podcasts = this.table('podcasts');
    this.episodes = this.table('episodes');
  }
}

type DatabaseConfig = {
  dbName: string;
};

export class Database {
  private config: DatabaseConfig;
  private db: FoxcastsDB;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.db = new FoxcastsDB(this.config.dbName);
  }

  //#region Podcasts

  public async addPodcast(
    podcast: ApiPodcast,
    episodes: ApiEpisode[],
    artwork: string
  ): Promise<void> {
    const dbPodcast: Podcast = {
      podexId: podcast.podexId || null,
      itunesId: podcast.itunesId || null,
      title: podcast.title,
      author: podcast.author,
      description: podcast.description,
      feedUrl: podcast.feedUrl,
      artworkUrl: podcast.artworkUrl,
      artwork,
      categories: podcast.categories,
    } as Podcast;

    await this.db.transaction(
      'rw',
      this.db.podcasts,
      this.db.episodes,
      async () => {
        const podcastId = (await this.db.podcasts.add(dbPodcast)) as number;
        const dbEpisodes: Omit<Episode, 'id'>[] = episodes.map((ep) => ({
          ...fromApiEpisode(ep),
          podcastId,
        }));
        await this.db.episodes.bulkAdd(dbEpisodes as Episode[]);
      }
    );
  }

  public async updatePodcast(
    podcastId: number,
    changes: Partial<Podcast>
  ): Promise<Podcast> {
    delete changes.id;
    await this.db.podcasts.update(podcastId, changes);
    const result = await this.db.podcasts.get(podcastId);
    return result as Podcast;
  }

  public async deletePodcast(podcastId: number): Promise<void> {
    if (typeof podcastId === 'string') {
      podcastId = parseInt(podcastId, 10);
    }

    await this.db.transaction(
      'rw',
      this.db.podcasts,
      this.db.episodes,
      async () => {
        const episodes = await this.db.episodes.where({ podcastId }).toArray();
        const episodeIds = episodes.map((episode) => episode.id);

        await this.db.podcasts.delete(podcastId);
        await this.db.episodes.bulkDelete(episodeIds);
      }
    );
  }

  public async getPodcastById(podcastId: number): Promise<Podcast> {
    if (typeof podcastId === 'string') {
      podcastId = parseInt(podcastId, 10);
    }

    const podcast = await this.db.podcasts.get({
      id: podcastId,
    });

    if (!podcast) {
      throw new NotFoundError(`No podcast found for id ${podcastId}`);
    }

    return podcast;
  }

  public async getPodcastByPodexId(podexId: number): Promise<Podcast> {
    if (typeof podexId === 'string') {
      podexId = parseInt(podexId, 10);
    }

    const podcast = await this.db.podcasts.get({
      podexId,
    });

    if (!podcast) {
      throw new NotFoundError(`No podcast found for podex id ${podexId}`);
    }

    return podcast;
  }

  public async getPodcastByFeed(feedUrl: string): Promise<Podcast> {
    const podcast = await this.db.podcasts.get({
      feedUrl,
    });

    if (!podcast) {
      throw new NotFoundError(`No podcast found for feed url ${feedUrl}`);
    }

    return podcast;
  }

  public async getPodcasts(): Promise<Podcast[]> {
    return await this.db.podcasts.toCollection().sortBy('title');
  }

  //#endregion

  //#region Episodes

  public async addEpisode(
    podcastId: number,
    episode: ApiEpisode
  ): Promise<void> {
    const existingEpisode = await this.getEpisodeByGuid(episode.guid).catch(
      (err) => {
        if (err instanceof NotFoundError) return null;
        throw err;
      }
    );
    if (existingEpisode) {
      console.log(
        `Episode ${episode.guid} (${episode.title}) already exists in database.`
      );
      return;
    }
    await this.db.episodes.add({
      ...fromApiEpisode(episode),
      podcastId,
    } as Episode);
  }

  public async addEpisodes(
    podcastId: number,
    episodes: ApiEpisode[]
  ): Promise<void> {
    for (const episode of episodes) {
      await this.addEpisode(podcastId, episode);
    }
  }

  public async getEpisodesByPodcastId(
    podcastId: number,
    limit = 30,
    offset = 0
  ): Promise<Episode[]> {
    const result = await this.db.episodes
      .where({ podcastId })
      .toArray()
      .then((episodes) =>
        episodes.sort((a, b) => {
          if (a.date > b.date) {
            return -1;
          }
          if (b.date > a.date) {
            return 1;
          }
          return 0;
        })
      )
      .then((episodes) => episodes.slice(offset, limit));

    return result;
  }

  public async getEpisodesByFilter(
    filterId: EpisodeFilterId,
    limit = 30
  ): Promise<Episode[]> {
    let episodes = [];

    switch (filterId) {
      case 'recent':
        episodes = await this.db.episodes
          .orderBy('date')
          .reverse()
          .limit(limit)
          .toArray();
        break;
      case 'inProgress':
        episodes = await this.db.episodes
          .where('playbackStatus')
          .equals(PlaybackStatus.InProgress)
          .reverse()
          .sortBy('date')
          .then((results) => results.filter((e) => e.progress < e.duration));
        break;
    }

    return episodes;
  }

  public async updateEpisode(
    episodeId: number,
    changes: Partial<Episode>
  ): Promise<Episode> {
    delete changes.id;
    await this.db.episodes.update(episodeId, changes);
    const result = await this.db.episodes.get(episodeId);
    return result as Episode;
  }

  public async getEpisodeById(episodeId: number): Promise<Episode> {
    if (typeof episodeId === 'string') {
      episodeId = parseInt(episodeId, 10);
    }

    const episode = await this.db.episodes.get({ id: episodeId });

    if (!episode) {
      throw new NotFoundError(`No episode found for id ${episodeId}`);
    }

    return episode;
  }

  public async getEpisodeByGuid(guid: string): Promise<Episode> {
    const episode = await this.db.episodes.get({ guid });

    if (!episode) {
      throw new NotFoundError(`No episode found for guid ${guid}`);
    }

    return episode;
  }

  public async getEpisodeByPodexId(podexId: number): Promise<Episode> {
    const episode = await this.db.episodes.get({ podexId });

    if (!episode) {
      throw new NotFoundError(`No episode found for podexId ${podexId}`);
    }

    return episode;
  }

  //#endregion

  public async health() {
    let healthy = true;
    const podcastsCount = await this.db.podcasts.count().catch(() => {
      healthy = false;
    });
    const episodesCount = await this.db.episodes.count().catch(() => {
      healthy = false;
    });

    return {
      healthy,
      name: this.db.name,
      version: this.db.verno,
      podcastsCount,
      episodesCount,
    };
  }
}