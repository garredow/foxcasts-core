import { sub } from 'date-fns';
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
  FilterList,
  Podcast,
  PodcastQuery,
  PodcastsQuery,
} from '../types';
import { Playlist } from '../types/Playlist';
import { fromApiEpisode } from '../utils/formatEpisode';

class FoxcastsDB extends Dexie {
  podcasts: Dexie.Table<Podcast, number>;
  episodes: Dexie.Table<Episode, number>;
  artwork: Dexie.Table<Artwork, number>;
  filterLists: Dexie.Table<FilterList<unknown>, number>;
  playlists: Dexie.Table<Playlist, number>;

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
            podcast.isFavorite = 0;
          });
        tx.table<Episode, number>('episodes')
          .toCollection()
          .modify((episode) => {
            episode.isDownloaded = 0;
            episode.isFavorite = 0;
            episode.playbackStatus =
              episode.progress > 0 && episode.progress === episode.duration
                ? PlaybackStatus.Played
                : PlaybackStatus.Unplayed;
          });
      });
    this.version(3)
      .stores({
        podcasts: '++id, &feedUrl, &podexId, itunesId, isFavorite',
        episodes:
          '++id, &podexId, &guid, podcastId, date, playbackStatus, duration, isFavorite, isDownloaded',
        artwork: '++id, podcastId, size, blur, greyscale',
        filterLists: '++id, isFavorite',
        playlists: '++id, isFavorite',
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
    this.filterLists = this.table('filterLists');
    this.playlists = this.table('playlists');
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
      isFavorite: 0,
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
    podcastIds,
    isFavorite,
    offset = 0,
    limit = 50,
  }: PodcastsQuery): Promise<Podcast[]> {
    let query: Collection<Podcast, number>;

    if (podcastIds !== undefined) {
      query = this.db.podcasts.where('id').anyOf(podcastIds);
    } else {
      query = this.db.podcasts.toCollection();
    }

    if (isFavorite !== undefined) {
      query.and((podcast) => podcast.isFavorite === isFavorite);
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
    episodeIds,
    afterDate,
    beforeDate,
    withinDays,
    playbackStatuses,
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
    } else if (Array.isArray(episodeIds)) {
      query = this.db.episodes.where('id').anyOf(episodeIds);
    } else if (afterDate && beforeDate) {
      query = this.db.episodes.where('date').between(afterDate, beforeDate);
    } else if (afterDate) {
      query = this.db.episodes.where('date').aboveOrEqual(afterDate);
    } else if (beforeDate) {
      query = this.db.episodes.where('date').below(beforeDate);
    } else if (playbackStatuses) {
      query = this.db.episodes.where('playbackStatus').anyOf(playbackStatuses);
    } else if (shorterThan !== undefined && longerThan !== undefined) {
      query = this.db.episodes
        .where('duration')
        .between(longerThan, shorterThan, true, false);
    } else if (longerThan !== undefined) {
      query = this.db.episodes.where('duration').aboveOrEqual(longerThan);
    } else if (shorterThan !== undefined) {
      query = this.db.episodes.where('duration').below(shorterThan);
    } else if (isDownloaded !== undefined) {
      query = this.db.episodes.where('isDownloaded').equals(isDownloaded);
    } else if (isFavorite !== undefined) {
      query = this.db.episodes.where('isFavorite').equals(isFavorite);
    } else if (withinDays !== undefined) {
      query = this.db.episodes
        .where('date')
        .aboveOrEqual(sub(new Date(), { days: withinDays }).toISOString());
    } else {
      query = this.db.episodes.toCollection();
    }

    if (Array.isArray(episodeIds)) {
      query = query.and((episode) => episodeIds.includes(episode.id));
    }

    if (afterDate !== undefined) {
      query = query.and((episode) => episode.date >= afterDate);
    }

    if (beforeDate !== undefined) {
      query = query.and((episode) => episode.date < beforeDate);
    }

    if (playbackStatuses !== undefined) {
      query = query.and((episode) =>
        playbackStatuses.includes(episode.playbackStatus)
      );
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

    if (withinDays !== undefined) {
      query = query.and(
        (episode) =>
          episode.date > sub(new Date(), { days: withinDays }).toISOString()
      );
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

  // Filter Lists

  public async addFilterList<T>(
    list: Omit<FilterList<T>, 'id'>
  ): Promise<number> {
    return this.db.filterLists.add(list as FilterList<T>);
  }

  public async updateFilterList<T>(
    listId: number,
    changes: Omit<Partial<FilterList<T>>, 'id'>
  ): Promise<number> {
    return this.db.filterLists.update(listId, changes);
  }

  public async deleteFilterLists(listIds: number[]): Promise<void> {
    return this.db.filterLists.bulkDelete(listIds);
  }

  public async getFilterList<T>(
    id: number
  ): Promise<FilterList<T> | undefined> {
    return this.db.filterLists.get(id) as Promise<FilterList<T> | undefined>;
  }

  public async getFilterLists<T>(): Promise<FilterList<T>[]> {
    return this.db.filterLists.toArray() as Promise<FilterList<T>[]>;
  }

  // Playlists

  public async addPlaylist(list: Omit<Playlist, 'id'>): Promise<number> {
    return this.db.playlists.add(list as Playlist);
  }

  public async updatePlaylist(
    listId: number,
    changes: Omit<Partial<Playlist>, 'id'>
  ): Promise<number> {
    return this.db.playlists.update(listId, changes);
  }

  public async deletePlaylists(listIds: number[]): Promise<void> {
    return this.db.playlists.bulkDelete(listIds);
  }

  public async getPlaylist(id: number): Promise<Playlist | undefined> {
    return this.db.playlists.get(id) as Promise<Playlist | undefined>;
  }

  public async getPlaylists(): Promise<Playlist[]> {
    return this.db.playlists.toArray() as Promise<Playlist[]>;
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
