import { CoreConfig } from '..';
import {
  Podcast,
  Episode,
  EpisodeExtended,
  EpisodeFilterId,
  Chapter,
} from '../types';
import { NotFoundError } from '../utils/errors';
import { Api } from './api';
import { Database } from './database';

export class Episodes {
  private config: CoreConfig;
  private api: Api;
  private database: Database;

  constructor(config: CoreConfig, database?: Database) {
    this.config = config;
    this.api = new Api(config);
    this.database = database || new Database(this.config);
  }

  private addPodcastInfoToEpisode(
    podcast: Podcast,
    episode: Episode
  ): EpisodeExtended {
    return {
      ...episode,
      podcastTitle: podcast.title,
    };
  }

  public async getEpisodeById(episodeId: number): Promise<EpisodeExtended> {
    const episode = await this.database.getEpisodeById(episodeId);

    const podcast = await this.database.getPodcastById(episode.podcastId);

    return this.addPodcastInfoToEpisode(podcast, episode);
  }

  public async getEpisodesByPodcastId(
    podcastId: number,
    limit = 30,
    offset = 0
  ): Promise<EpisodeExtended[]> {
    const podcast = await this.database.getPodcastById(podcastId);
    const episodes = await this.database.getEpisodesByPodcastId(
      podcastId,
      limit,
      offset
    );

    return episodes.map((episode) =>
      this.addPodcastInfoToEpisode(podcast, episode)
    );
  }

  public async getEpisodesByFilter(
    filterId: EpisodeFilterId,
    limit = 30
  ): Promise<EpisodeExtended[]> {
    const [podcasts, episodes] = await Promise.all([
      this.database.getPodcasts(),
      this.database.getEpisodesByFilter(filterId, limit),
    ]);

    const podcastMap = podcasts.reduce((result, podcast) => {
      result[podcast.id] = podcast;
      return result;
    }, {} as { [podcastId: number]: Podcast });

    return episodes.map((episode) =>
      this.addPodcastInfoToEpisode(podcastMap[episode.podcastId], episode)
    );
  }

  public updateEpisode(
    episodeId: number,
    data: Partial<Episode>
  ): Promise<Episode> {
    return this.database.updateEpisode(episodeId, data);
  }

  public async getEpisodeChapters(
    episodeId: number,
    podexId: number | null,
    fileUrl?: string,
    forceRefresh = false
  ): Promise<Chapter[]> {
    if (!podexId && !fileUrl) {
      throw new Error('Must provide podexId or fileUrl');
    }

    const episode = await this.database
      .getEpisodeById(episodeId)
      .catch((err: Error) => {
        if (err instanceof NotFoundError) {
          return null;
        }
        throw err;
      });

    if (!episode) {
      return [];
    } else if (!forceRefresh && Array.isArray(episode.chapters)) {
      return episode.chapters;
    }

    const chapters = await this.api.getChapters(podexId, fileUrl);

    this.database.updateEpisode(episodeId, { chapters });
    return chapters;
  }
}
