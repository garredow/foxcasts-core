import { Artworks } from './artworks';
import { Downloads } from './downloads';
import { Episodes } from './episodes';
import { Filters } from './filters';
import { Api } from './internal/api';
import { Database } from './internal/database';
import { Meta } from './meta';
import { Playlists } from './playlists';
import { PodcastIndex } from './podcastIndex';
import { Podcasts } from './podcasts';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');

export type CoreConfig = {
  baseUrl: string;
  apiKey?: string;
  dbName: string;
};

export class FoxcastsCore {
  public static version = pkg.version;
  public artworks: Artworks;
  public episodes: Episodes;
  public filters: Filters;
  public meta: Meta;
  public playlists: Playlists;
  public podcastIndex: PodcastIndex;
  public podcasts: Podcasts;
  public downloads: Downloads;

  constructor(options: Partial<CoreConfig>) {
    const config = {
      apiKey: undefined,
      baseUrl: 'https://api.foxcasts.com/',
      dbName: 'foxcasts',
      ...options,
    };

    const api = new Api(config);
    const database = new Database(config);

    this.artworks = new Artworks(api, database);
    this.episodes = new Episodes(api, database);
    this.filters = new Filters(api, database);
    this.meta = new Meta(config, api, database);
    this.playlists = new Playlists(api, database);
    this.podcastIndex = new PodcastIndex(api, database);
    this.podcasts = new Podcasts(api, database);
    this.downloads = new Downloads(api, database);
  }
}
