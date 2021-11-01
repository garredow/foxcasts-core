import Dexie, { Collection } from 'dexie';
import { PlaybackStatus } from '../enums';
import {
  ApiEpisode,
  ApiPodcast,
  Artwork,
  ArtworkQuery,
  ArtworksQuery,
  Episode,
  EpisodeQuery,
  EpisodesQuery,
  Podcast,
  PodcastQuery,
  PodcastsQuery,
} from '../types';
import { fromApiEpisode } from '../utils/formatEpisode';

class FoxcastsDB extends Dexie {
  podcasts: Dexie.Table<Podcast, number>;
  episodes: Dexie.Table<Episode, number>;
  artwork: Dexie.Table<Artwork, number>;

  constructor(name: string) {
    super(name);

    this.version(1).stores({
      podcasts: '++id, &feedUrl, &podexId, itunesId',
      episodes: '++id, &podexId, &guid, podcastId, date, progress',
    });
    this.version(2)
      .stores({
        podcasts: '++id, &feedUrl, &podexId, itunesId',
        episodes: '++id, &podexId, &guid, podcastId, date, playbackStatus',
      })
      .upgrade((tx) => {
        tx.table<Podcast, number>('podcasts')
          .toCollection()
          .modify((podcast) => {
            podcast.isFavorite = false;
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
    this.version(3)
      .stores({
        podcasts: '++id, &feedUrl, &podexId, itunesId',
        episodes:
          '++id, &podexId, &guid, podcastId, date, playbackStatus, duration',
        artwork: '++id, podcastId, size, blur, greyscale',
      })
      .upgrade((tx) => {
        tx.table<Podcast, number>('podcasts')
          .toCollection()
          .modify((podcast) => {
            (podcast as any).artwork = undefined;
          });
        tx.table<Episode, number>('episodes')
          .toCollection()
          .modify((episode) => {
            episode.remoteFileUrl = (episode as any).fileUrl;
            (episode as any).fileUrl = undefined;
            episode.playbackStatus =
              episode.progress > 0
                ? episode.progress < episode.duration
                  ? PlaybackStatus.InProgress
                  : PlaybackStatus.Played
                : PlaybackStatus.Unplayed;
          });
      });

    this.podcasts = this.table('podcasts');
    this.episodes = this.table('episodes');
    this.artwork = this.table('artwork');
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

  // Podcasts

  public async addPodcast(podcast: ApiPodcast): Promise<number> {
    const dbPodcast: Podcast = {
      podexId: podcast.podexId || null,
      itunesId: podcast.itunesId || null,
      title: podcast.title,
      author: podcast.author,
      description: podcast.description,
      feedUrl: podcast.feedUrl,
      artworkUrl: podcast.artworkUrl,
      categories: podcast.categories,
      isFavorite: false,
    } as Podcast;

    return this.db.podcasts.add(dbPodcast);
  }

  public async updatePodcast(
    podcastId: number,
    changes: Partial<Podcast>
  ): Promise<number> {
    delete changes.id;
    return this.db.podcasts.update(podcastId, changes);
  }

  public async deletePodcast(podcastId: number): Promise<void> {
    return this.db.podcasts.delete(podcastId);
  }

  public async getPodcast(query: PodcastQuery): Promise<Podcast | undefined> {
    if (!query.id) delete query.id;
    if (!query.podexId) delete query.podexId;
    if (!query.feedUrl) delete query.feedUrl;

    return this.db.podcasts.get(query);
  }

  public async getPodcasts({
    podcastIds = undefined,
    offset = 0,
    limit = 50,
  }: PodcastsQuery): Promise<Podcast[]> {
    let query: Collection<Podcast, number>;

    if (podcastIds !== undefined) {
      query = this.db.podcasts.where('id').anyOf(podcastIds);
    } else {
      query = this.db.podcasts.toCollection();
    }

    return await query
      .sortBy('title')
      .then((res) => res.slice(offset, offset + limit));
  }

  // Episodes

  public async addEpisode(
    podcastId: number,
    episode: ApiEpisode
  ): Promise<number | void> {
    const existingEpisode = await this.getEpisode({
      podexId: episode.podexId,
      guid: episode.guid,
    });
    if (existingEpisode) {
      console.log(
        `Episode ${episode.guid} (${episode.title}) already exists in database.`
      );
      return;
    }
    return this.db.episodes.add({
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

  public async deleteEpisode(episodeId: number): Promise<number | void> {
    return this.db.episodes.delete(episodeId);
  }

  public async deleteEpisodes(episodeIds: number[]): Promise<void> {
    return this.db.episodes.bulkDelete(episodeIds);
  }

  public async updateEpisode(
    episodeId: number,
    changes: Partial<Episode>
  ): Promise<number> {
    delete changes.id;
    return this.db.episodes.update(episodeId, changes);
  }

  public async getEpisode(
    episodeKey: EpisodeQuery
  ): Promise<Episode | undefined> {
    const query =
      episodeKey.id !== undefined
        ? { id: episodeKey.id }
        : episodeKey.podexId !== undefined
        ? { podexId: episodeKey.podexId }
        : { guid: episodeKey.guid };

    return this.db.episodes.get(query);
  }

  public async getEpisodes({
    podcastIds,
    afterDate,
    beforeDate,
    playbackStatus,
    isDownloaded,
    isFavorite,
    longerThan,
    shorterThan,
    offset = 0,
    limit = 100,
  }: EpisodesQuery): Promise<Episode[]> {
    let query: Collection<Episode, number>;

    // Try to put together the most efficient query depending on what we get
    if (podcastIds) {
      query = this.db.episodes.where('podcastId').anyOf(podcastIds);
    } else if (afterDate && beforeDate) {
      query = this.db.episodes.where('date').between(afterDate, beforeDate);
    } else if (afterDate) {
      query = this.db.episodes.where('date').aboveOrEqual(afterDate);
    } else if (beforeDate) {
      query = this.db.episodes.where('date').below(beforeDate);
    } else if (playbackStatus) {
      query = this.db.episodes.where('playbackStatus').equals(playbackStatus);
    } else if (shorterThan !== undefined && longerThan !== undefined) {
      query = this.db.episodes
        .where('duration')
        .between(longerThan, shorterThan, true, false);
    } else if (longerThan !== undefined) {
      query = this.db.episodes.where('duration').aboveOrEqual(longerThan);
    } else if (shorterThan !== undefined) {
      query = this.db.episodes.where('duration').below(shorterThan);
    } else {
      query = this.db.episodes.toCollection();
    }

    if (afterDate !== undefined) {
      query = query.and((episode) => episode.date >= afterDate);
    }

    if (beforeDate !== undefined) {
      query = query.and((episode) => episode.date < beforeDate);
    }

    if (playbackStatus !== undefined) {
      query = query.and((episode) => episode.playbackStatus === playbackStatus);
    }

    if (isDownloaded !== undefined) {
      query = query.and((episode) => episode.isDownloaded === isDownloaded);
    }

    if (isFavorite !== undefined) {
      query = query.and((episode) => episode.isFavorite === isFavorite);
    }

    if (longerThan !== undefined) {
      query = query.and((episode) => episode.duration >= longerThan);
    }

    if (shorterThan !== undefined) {
      query = query.and((episode) => episode.duration < shorterThan);
    }

    return await query
      .reverse()
      .sortBy('date')
      .then((res) => res.slice(offset, offset + limit));
  }

  // Artwork

  public async addArtwork(artwork: Omit<Artwork, 'id'>): Promise<number> {
    return this.db.artwork.add(artwork as Artwork);
  }

  public async updateArtwork(
    artworkId: number,
    changes: Partial<Artwork>
  ): Promise<number> {
    delete changes.id;
    return this.db.artwork.update(artworkId, changes);
  }

  public async deleteArtwork(artworkId: number): Promise<void> {
    return this.db.artwork.delete(artworkId);
  }

  public async deleteArtworks(artworkIds: number[]): Promise<void> {
    console.log('delete', artworkIds);

    return this.db.artwork.bulkDelete(artworkIds);
  }

  public async getArtwork(query: ArtworkQuery): Promise<Artwork | undefined> {
    return this.db.artwork.get(query);
  }

  public async getArtworks(query: ArtworksQuery): Promise<Artwork[]> {
    return this.db.artwork.where('podcastId').anyOf(query.podcastIds).toArray();
  }

  // Misc

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
