import { Episodes } from './episodes';
import { Api } from './internal/api';
import { Database } from './internal/database';
import {
  DbReadOnly,
  EpisodeExtended,
  Playlist,
  PlaylistExtended,
  PlaylistQuery,
} from './types';
import { NotFoundError } from './utils';

export class Playlists {
  private api: Api;
  private database: Database;

  constructor(api: Api, database: Database) {
    this.api = api;
    this.database = database;
  }

  public async add(list: Omit<Playlist, DbReadOnly>): Promise<number> {
    return this.database.addPlaylist(list);
  }

  public async update(
    listId: number,
    changes: Omit<Partial<Playlist>, DbReadOnly>
  ): Promise<number> {
    return this.database.updatePlaylist(listId, changes);
  }

  public async delete(listIds: number[]): Promise<void> {
    return this.database.deletePlaylists(listIds);
  }

  public async get(
    query: PlaylistQuery,
    populateEpisodes = false
  ): Promise<PlaylistExtended> {
    const result = await this.query(query, populateEpisodes);
    if (!result) {
      throw new NotFoundError(`No results for ${query}`);
    }
    return result;
  }

  public async query(
    query: PlaylistQuery,
    populateEpisodes = false
  ): Promise<PlaylistExtended | undefined> {
    const playlist = await this.database.getPlaylist(query);
    if (!playlist) return;

    const result: PlaylistExtended = {
      ...playlist,
      episodes: [],
    };

    if (playlist && populateEpisodes) {
      const episodes = new Episodes(this.api, this.database);
      const episodeMap = await episodes
        .queryAll({
          episodeIds: playlist.episodeIds,
        })
        .then((res) =>
          res.reduce((acc, episode) => {
            acc[episode.id] = episode;
            return acc;
          }, {} as { [key: number]: EpisodeExtended })
        );

      result.episodes = playlist.episodeIds.map((id) => episodeMap[id]);
    }

    return result;
  }

  public async queryAll(): Promise<Playlist[]> {
    return this.database.getPlaylists();
  }
}
