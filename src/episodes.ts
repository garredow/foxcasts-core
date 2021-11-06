import { Api } from './internal/api';
import { Database } from './internal/database';
import {
  ApiEpisode,
  Chapter,
  DbReadOnly,
  Episode,
  EpisodeExtended,
  EpisodeQuery,
  EpisodesQuery,
  Podcast,
} from './types';
import { NotFoundError } from './utils';

export class Episodes {
  private api: Api;
  private database: Database;

  constructor(api: Api, database: Database) {
    this.api = api;
    this.database = database;
  }

  public async get(query: EpisodeQuery): Promise<EpisodeExtended> {
    const result = await this.query(query);
    if (!result) {
      throw new NotFoundError(`No results for ${query}`);
    }
    return result;
  }

  public async query(
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

  public async queryAll(query: EpisodesQuery): Promise<EpisodeExtended[]> {
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

  public update(
    episodeId: number,
    data: Omit<Partial<Episode>, DbReadOnly>
  ): Promise<number> {
    return this.database.updateEpisode(episodeId, data);
  }

  public async getChapters(
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

  public fetch(
    podcastId?: number | null,
    feedUrl?: string | null,
    count = 25,
    since?: number
  ): Promise<ApiEpisode[]> {
    return this.api.getEpisodes(podcastId, feedUrl, count, since);
  }
}
