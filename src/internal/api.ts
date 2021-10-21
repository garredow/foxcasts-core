import {
  ApiEpisode,
  ApiHealth,
  ApiPodcast,
  Category,
  Chapter,
  Palette,
  PIStats,
  SearchResult,
} from '../types';
import { toBase64 } from '../utils';

type ApiConfig = {
  apiKey?: string;
  baseUrl: string;
};

export class Api {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  private fetch<T>(
    path: string,
    responseType: 'json' | 'text' | 'blob' = 'json'
  ): Promise<T> {
    const fullUrl =
      process.env.NODE_ENV === 'development'
        ? `http://localhost:8100/${this.config.baseUrl}${path}`
        : `${this.config.baseUrl}${path}`;

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const xhr: XMLHttpRequest = new (XMLHttpRequest as any)({
        mozSystem: true,
      });
      if (responseType === 'blob') {
        xhr.responseType = 'blob';
      }
      xhr.addEventListener('load', () => {
        if (xhr.status >= 400) {
          return reject({
            statusCode: xhr.status,
            message: `Failed to GET ${path}`,
          });
        }

        if (responseType === 'json') {
          resolve(JSON.parse(xhr.response));
        } else {
          resolve(xhr.response);
        }
      });
      xhr.addEventListener('error', () =>
        reject({ message: `Failed to GET ${path}` })
      );

      xhr.open('GET', fullUrl, true);
      if (this.config.apiKey) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.config.apiKey}`);
      }
      xhr.send();
    });
  }

  public search(query: string): Promise<SearchResult[]> {
    const url = `podcasts/search?query=${query}`;
    return this.fetch<SearchResult[]>(url).catch((err) => {
      console.log(`Failed to search at ${url}`, err);
      throw new Error('Failed to search.');
    });
  }

  public getTrendingPodcasts(
    since: number,
    categories?: number[]
  ): Promise<ApiPodcast[]> {
    let url = `podcasts/trending?since=${since}`;

    if (categories && categories.length > 0) {
      url = url + `&categories=${categories?.join(',')}`;
    }

    return this.fetch<ApiPodcast[]>(url).catch((err) => {
      console.log(`Failed to get trending podcasts at ${url}`, err);
      throw new Error('Failed to get trending podcasts.');
    });
  }

  public getPodcast(
    id?: number | null,
    feedUrl?: string | null
  ): Promise<ApiPodcast> {
    if (!id && !feedUrl) {
      throw new Error('Must provide an id or feedUrl');
    }
    const queries = [];
    if (id) {
      queries.push(`id=${id}`);
    }
    if (feedUrl) {
      queries.push(`feedUrl=${feedUrl}`);
    }

    const url = `podcasts?${queries.join('&')}`;
    return this.fetch<ApiPodcast>(url).catch((err) => {
      console.log(`Failed to get podcast at ${url}`, err);
      throw new Error('Failed to get podcast.');
    });
  }

  public getEpisodes(
    podcastId?: number | null,
    feedUrl?: string | null,
    count = 25,
    since?: number
  ): Promise<ApiEpisode[]> {
    if (!podcastId && !feedUrl) {
      throw new Error('Must provide a podcastId or feedUrl');
    }
    const queries = [];
    if (podcastId) {
      queries.push(`podcastId=${podcastId}`);
    }
    if (feedUrl) {
      queries.push(`feedUrl=${feedUrl}`);
    }
    if (count !== undefined) {
      queries.push(`count=${count}`);
    }
    if (since) {
      queries.push(`since=${since}`);
    }

    const url = `episodes?${queries.join('&')}`;
    return this.fetch<ApiEpisode[]>(url).catch((err) => {
      console.log(`Failed to get episodes at ${url}`, err);
      throw new Error('Failed to get episodes.');
    });
  }

  public getChapters(
    episodeId?: number | null,
    fileUrl?: string | null
  ): Promise<Chapter[]> {
    if (!episodeId && !fileUrl) {
      throw new Error('Must provide an episodeId or fileUrl');
    }
    const queries = [];
    if (episodeId) {
      queries.push(`episodeId=${episodeId}`);
    }
    if (fileUrl) {
      queries.push(`fileUrl=${fileUrl}`);
    }

    const url = `chapters?${queries.join('&')}`;
    return this.fetch<Chapter[]>(url).catch((err) => {
      console.log(`Failed to get chapters at ${url}`, err);
      throw new Error('Failed to search iTunes catalog.');
    });
  }

  public getArtwork(
    imageUrl: string,
    size: number,
    blur?: number,
    greyscale?: boolean
  ): Promise<string> {
    let url = `artwork?imageUrl=${encodeURIComponent(imageUrl)}&size=${size}`;
    if (blur) {
      url += `&blur=${blur}`;
    }
    if (greyscale) {
      url += `&greyscale=${greyscale}`;
    }
    return this.fetch<Blob>(url, 'blob')
      .then((res: Blob) => toBase64(res))
      .catch((err) => {
        console.log(`Failed to get artwork at ${url}`, err);
        throw new Error('Failed to get artwork.');
      });
  }

  public getPalette(imageUrl: string): Promise<Palette> {
    const url = `artwork/palette?imageUrl=${encodeURIComponent(imageUrl)}`;
    return this.fetch<Palette>(url).catch((err) => {
      console.log(`Failed to get palette at ${url}`, err);
      throw new Error('Failed to get palette.');
    });
  }

  public getCategories(): Promise<Category[]> {
    return this.fetch<Category[]>('categories').catch((err) => {
      console.log(`Failed to get categories`, err);
      throw new Error('Failed to get categories.');
    });
  }

  public getStats(): Promise<PIStats> {
    return this.fetch<PIStats>('pistats').catch((err) => {
      console.log(`Failed to get stats`, err);
      throw new Error('Failed to get stats.');
    });
  }

  public getHealth(): Promise<ApiHealth> {
    return this.fetch<ApiHealth>('health').catch((err) => {
      console.log(`Failed to get health`, err);
      throw new Error('Failed to get health.');
    });
  }

  public async health() {
    const authenticated = await this.fetch<SearchResult[]>(
      'podcasts/search?query=syntax'
    )
      .then(() => true)
      .catch((err) => (err.statusCode === 401 ? false : undefined));
    const health = await this.getHealth().catch(() => null);

    return {
      healthy: !!health,
      authenticated,
      version: health?.version,
    };
  }
}
