import { sub } from 'date-fns';
import Dexie, { Collection } from 'dexie';
import 'dexie-observable';
import { CoreModule, PlaybackStatus } from '../enums';
import {
  ApiEpisode,
  ApiPodcast,
  Artwork,
  ArtworkQuery,
  ArtworksQuery,
  DbChangeEvent,
  DbReadOnly,
  Download,
  DownloadQuery,
  DownloadsQuery,
  Episode,
  EpisodeQuery,
  EpisodesQuery,
  FilterList,
  FilterQuery,
  PlaylistQuery,
  Podcast,
  PodcastQuery,
  PodcastsQuery,
} from '../types';
import { Playlist } from '../types/Playlist';
import { fromApiEpisode } from '../utils/formatEpisode';

export class Database extends Dexie {
  podcasts: Dexie.Table<Podcast, number>;
  episodes: Dexie.Table<Episode, number>;
  artwork: Dexie.Table<Artwork, number>;
  filters: Dexie.Table<FilterList<unknown>, number>;
  playlists: Dexie.Table<Playlist, number>;
  downloads: Dexie.Table<Download, number>;

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
    this.version(4).stores({
      podcasts: '++id, &feedUrl, &podexId, itunesId, isFavorite',
      episodes:
        '++id, &podexId, &guid, podcastId, date, playbackStatus, duration, isFavorite, isDownloaded',
      artwork: '++id, podcastId, size, blur, greyscale',
      filterLists: '++id, isFavorite',
      playlists: '++id, isFavorite',
      downloads: '++id, &episodeId, status',
    });

    this.podcasts = this.table('podcasts');
    this.episodes = this.table('episodes');
    this.artwork = this.table('artwork');
    this.filters = this.table('filterLists');
    this.playlists = this.table('playlists');
    this.downloads = this.table('downloads');
  }

  // Events

  public onChange<T>(
    table: CoreModule,
    callbackFn: (change: DbChangeEvent<T>) => void
  ): void {
    this.on('changes', (changes) => {
      changes.forEach((change) => {
        if (change.table !== table) return;
        switch (change.type) {
          case 1: // CREATED
            callbackFn({
              id: change.key,
              changeType: 'add',
              updatedItem: change.obj,
            });
            break;
          case 2: // UPDATED
            callbackFn({
              id: change.key,
              changeType: 'update',
              updatedItem: change.obj,
            });
            break;
          case 3: // DELETED
            callbackFn({
              id: change.key,
              changeType: 'delete',
              updatedItem: change.oldObj,
            });
            break;
        }
      });
    });
  }

  // Podcasts

  public async addPodcast(podcast: ApiPodcast): Promise<number> {
    return this.podcasts.add({
      podexId: podcast.podexId || null,
      itunesId: podcast.itunesId || null,
      title: podcast.title,
      author: podcast.author,
      description: podcast.description,
      feedUrl: podcast.feedUrl,
      artworkUrl: podcast.artworkUrl,
      categories: podcast.categories,
      isFavorite: 0,
      dateAdded: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
    } as Podcast);
  }

  public async updatePodcast(
    podcastId: number,
    changes: Omit<Partial<Podcast>, DbReadOnly>
  ): Promise<number> {
    return this.podcasts.update(podcastId, {
      ...changes,
      dateUpdated: new Date().toISOString(),
    });
  }

  public async deletePodcast(podcastId: number): Promise<void> {
    return this.podcasts.delete(podcastId);
  }

  public async getPodcast(query: PodcastQuery): Promise<Podcast | undefined> {
    if (!query.id) delete query.id;
    if (!query.podexId) delete query.podexId;
    if (!query.feedUrl) delete query.feedUrl;

    return this.podcasts.get(query);
  }

  public async getPodcasts({
    podcastIds,
    isFavorite,
    offset = 0,
    limit = 50,
  }: PodcastsQuery): Promise<Podcast[]> {
    let query: Collection<Podcast, number>;

    if (podcastIds !== undefined) {
      query = this.podcasts.where('id').anyOf(podcastIds);
    } else {
      query = this.podcasts.toCollection();
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
    return this.episodes.add({
      ...fromApiEpisode(episode),
      podcastId,
      dateAdded: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
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
    return this.episodes.delete(episodeId);
  }

  public async deleteEpisodes(episodeIds: number[]): Promise<void> {
    return this.episodes.bulkDelete(episodeIds);
  }

  public async updateEpisode(
    episodeId: number,
    changes: Omit<Partial<Episode>, DbReadOnly>
  ): Promise<number> {
    return this.episodes.update(episodeId, {
      ...changes,
      dateUpdated: new Date().toISOString(),
    });
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

    return this.episodes.get(query);
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
      query = this.episodes.where('podcastId').anyOf(podcastIds);
    } else if (Array.isArray(episodeIds)) {
      query = this.episodes.where('id').anyOf(episodeIds);
    } else if (afterDate && beforeDate) {
      query = this.episodes.where('date').between(afterDate, beforeDate);
    } else if (afterDate) {
      query = this.episodes.where('date').aboveOrEqual(afterDate);
    } else if (beforeDate) {
      query = this.episodes.where('date').below(beforeDate);
    } else if (playbackStatuses) {
      query = this.episodes.where('playbackStatus').anyOf(playbackStatuses);
    } else if (shorterThan !== undefined && longerThan !== undefined) {
      query = this.episodes
        .where('duration')
        .between(longerThan, shorterThan, true, false);
    } else if (longerThan !== undefined) {
      query = this.episodes.where('duration').aboveOrEqual(longerThan);
    } else if (shorterThan !== undefined) {
      query = this.episodes.where('duration').below(shorterThan);
    } else if (isDownloaded !== undefined) {
      query = this.episodes.where('isDownloaded').equals(isDownloaded);
    } else if (isFavorite !== undefined) {
      query = this.episodes.where('isFavorite').equals(isFavorite);
    } else if (withinDays !== undefined) {
      query = this.episodes
        .where('date')
        .aboveOrEqual(sub(new Date(), { days: withinDays }).toISOString());
    } else {
      query = this.episodes.toCollection();
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

  public async addArtwork(item: Omit<Artwork, DbReadOnly>): Promise<number> {
    return this.artwork.add({
      ...item,
      dateAdded: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
    } as Artwork);
  }

  public async updateArtwork(
    artworkId: number,
    changes: Omit<Partial<Artwork>, DbReadOnly>
  ): Promise<number> {
    return this.artwork.update(artworkId, {
      ...changes,
      dateUpdated: new Date().toISOString(),
    });
  }

  public async deleteArtwork(artworkId: number): Promise<void> {
    return this.artwork.delete(artworkId);
  }

  public async deleteArtworks(artworkIds: number[]): Promise<void> {
    return this.artwork.bulkDelete(artworkIds);
  }

  public async getArtwork(query: ArtworkQuery): Promise<Artwork | undefined> {
    delete query.greyscale;
    return this.artwork.get(query);
  }

  public async getArtworks(query: ArtworksQuery): Promise<Artwork[]> {
    return this.artwork.where('podcastId').anyOf(query.podcastIds).toArray();
  }

  // Filter Lists

  public async addFilter<T>(
    item: Omit<FilterList<T>, DbReadOnly>
  ): Promise<number> {
    return this.filters.add({
      ...item,
      dateAdded: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
    } as FilterList<T>);
  }

  public async updateFilter<T>(
    listId: number,
    changes: Omit<Partial<FilterList<T>>, DbReadOnly>
  ): Promise<number> {
    return this.filters.update(listId, {
      ...changes,
      dateUpdated: new Date().toISOString(),
    });
  }

  public async deleteFilters(listIds: number[]): Promise<void> {
    return this.filters.bulkDelete(listIds);
  }

  public async getFilter<T>(
    query: FilterQuery
  ): Promise<FilterList<T> | undefined> {
    return this.filters.get(query) as Promise<FilterList<T> | undefined>;
  }

  public async getFilters<T>(): Promise<FilterList<T>[]> {
    return this.filters.toArray() as Promise<FilterList<T>[]>;
  }

  // Playlists

  public async addPlaylist(item: Omit<Playlist, DbReadOnly>): Promise<number> {
    return this.playlists.add({
      ...item,
      dateAdded: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
    } as Playlist);
  }

  public async updatePlaylist(
    listId: number,
    changes: Omit<Partial<Playlist>, DbReadOnly>
  ): Promise<number> {
    return this.playlists.update(listId, {
      ...changes,
      dateUpdated: new Date().toISOString(),
    });
  }

  public async deletePlaylists(listIds: number[]): Promise<void> {
    return this.playlists.bulkDelete(listIds);
  }

  public async getPlaylist(
    query: PlaylistQuery
  ): Promise<Playlist | undefined> {
    return this.playlists.get(query) as Promise<Playlist | undefined>;
  }

  public async getPlaylists(): Promise<Playlist[]> {
    return this.playlists.toArray() as Promise<Playlist[]>;
  }

  // Downloads

  public async addDownload(item: Omit<Download, DbReadOnly>): Promise<number> {
    return this.downloads.add({
      ...item,
      dateAdded: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
    } as Download);
  }

  public async updateDownload(
    id: number,
    changes: Omit<Partial<Download>, DbReadOnly>
  ): Promise<number> {
    return this.downloads.update(id, {
      ...changes,
      dateUpdated: new Date().toISOString(),
    });
  }

  public async deleteDownloads(ids: number[]): Promise<void> {
    return this.downloads.bulkDelete(ids);
  }

  public async deleteAllDownloads(): Promise<void> {
    return this.downloads.clear();
  }

  public async getDownload(
    query: DownloadQuery
  ): Promise<Download | undefined> {
    return this.downloads.get(query) as Promise<Download | undefined>;
  }

  public async getDownloads({
    ids,
    episodeIds,
    statuses,
    offset = 0,
    limit = 50,
  }: DownloadsQuery): Promise<Download[]> {
    let query: Collection<Download, number>;

    if (ids !== undefined) {
      query = this.downloads.where('id').anyOf(ids);
    } else if (episodeIds !== undefined) {
      query = this.downloads.where('episodeId').anyOf(episodeIds);
    } else if (statuses !== undefined) {
      query = this.downloads.where('status').anyOf(statuses);
    } else {
      query = this.downloads.toCollection();
    }

    if (episodeIds !== undefined) {
      query.and((a) => episodeIds.includes(a.episodeId));
    }

    if (statuses !== undefined) {
      query.and((a) => statuses.includes(a.status));
    }

    return await query
      .reverse()
      .sortBy('dateUpdated')
      .then((res) => res.slice(offset, offset + limit));
  }

  // Misc

  public async health() {
    let healthy = true;
    const podcastsCount = await this.podcasts.count().catch(() => {
      healthy = false;
    });
    const episodesCount = await this.episodes.count().catch(() => {
      healthy = false;
    });

    return {
      healthy,
      name: this.name,
      version: this.verno,
      podcastsCount,
      episodesCount,
    };
  }
}
