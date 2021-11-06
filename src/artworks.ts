import { Api } from './internal/api';
import { Database } from './internal/database';
import { Artwork, ArtworkQuery, ArtworksQuery } from './types';
import { NotFoundError } from './utils';

export class Artworks {
  private api: Api;
  private database: Database;

  constructor(api: Api, database: Database) {
    this.api = api;
    this.database = database;
  }

  public async get(query: ArtworkQuery): Promise<Artwork> {
    const result = await this.query(query);
    if (!result) {
      throw new NotFoundError(`No results for ${query}`);
    }
    return result;
  }

  public async query(query: ArtworkQuery): Promise<Artwork | undefined> {
    if (!query.podcastId) {
      return this.database.getArtwork(query);
    }

    const existing = await this.database.getArtwork(query);
    if (existing) return existing;

    const podcast = await this.database.getPodcast({ id: query.podcastId });
    if (!podcast) return;

    const { imageData, ...palette } = await this.api.getArtworkWithPalette(
      podcast.artworkUrl,
      query.size || 100,
      query.blur,
      !!query.greyscale
    );

    const artwork = {
      podcastId: query.podcastId,
      image: imageData,
      size: query.size || 100,
      blur: query.blur,
      greyscale: query.greyscale,
      palette: palette,
    } as Artwork;
    const id = await this.database.addArtwork(artwork);
    artwork.id = id;

    return artwork;
  }

  public queryAll(query: ArtworksQuery): Promise<Artwork[]> {
    return this.database.getArtworks(query);
  }

  public async delete(query: ArtworkQuery): Promise<void> {
    const artwork = await this.database.getArtwork(query);
    if (!artwork) return;

    return this.database.deleteArtwork(artwork.id);
  }

  public async deleteManyByQuery(query: ArtworksQuery): Promise<void> {
    const artworks = await this.database.getArtworks(query);
    return this.database.deleteArtworks(artworks.map((a) => a.id));
  }

  public fetch(imageUrl: string, size = 100): Promise<string> {
    return this.api.getArtwork(imageUrl, size);
  }
}
