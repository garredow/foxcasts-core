import { CoreConfig } from '..';
import { Artwork } from '../types';
import { Api } from './api';
import { Database } from './database';

export class Artworks {
  private config: CoreConfig;
  private api: Api;
  private database: Database;

  constructor(config: CoreConfig, database?: Database) {
    this.config = config;
    this.api = new Api(config);
    this.database = database || new Database(this.config);
  }

  public async getArtworkById(artworkId: number): Promise<Artwork | undefined> {
    return this.database.getArtworkById(artworkId);
  }

  public async deleteArtworkById(artworkId: number): Promise<void> {
    return this.database.deleteArtwork(artworkId);
  }

  public async deleteArtworksByPodcastId(podcastId: number): Promise<void> {
    return this.database.deleteArtworksByPodcastId(podcastId);
  }

  public async getArtwork(
    podcastId: number,
    {
      size,
      blur = 0,
      greyscale = false,
    }: { size: number; blur?: number; greyscale?: boolean }
  ): Promise<Artwork> {
    const existing = await this.database.getArtwork(podcastId, {
      size,
      blur,
      greyscale,
    });
    if (existing) return existing;

    const podcast = await this.database.getPodcastById(podcastId);

    const [image, palette] = await Promise.all([
      this.api.getArtwork(podcast.artworkUrl, size, blur, greyscale),
      this.api.getPalette(podcast.artworkUrl),
    ]);
    const id = await this.database.addArtwork({
      podcastId,
      image,
      size,
      blur,
      greyscale,
      palette,
    });

    return (await this.database.getArtworkById(id)) as Artwork;
  }

  public async getArtworksByPodcastId(podcastId: number): Promise<Artwork[]> {
    return this.database.getArtworksByPodcastId(podcastId);
  }
}
