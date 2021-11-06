import { Api } from './internal/api';
import { Database } from './internal/database';
import { Download, DownloadQuery, DownloadsQuery } from './types';
import { NotFoundError } from './utils';

export class Downloads {
  private api: Api;
  private database: Database;

  constructor(api: Api, database: Database) {
    this.api = api;
    this.database = database;
  }

  public async add(item: Omit<Download, 'id'>): Promise<number> {
    return this.database.addDownload(item);
  }

  public async update(
    listId: number,
    changes: Omit<Partial<Download>, 'id'>
  ): Promise<number> {
    return this.database.updateDownload(listId, changes);
  }

  public async delete(ids: number[]): Promise<void> {
    return this.database.deleteDownloads(ids);
  }

  public async get(query: DownloadQuery): Promise<Download> {
    const result = await this.query(query);
    if (!result) {
      throw new NotFoundError(`No results for ${query}`);
    }
    return result;
  }

  public async query(query: DownloadQuery): Promise<Download | undefined> {
    return this.database.getDownload(query);
  }

  public async queryAll(query: DownloadsQuery): Promise<Download[]> {
    return this.database.getDownloads(query);
  }
}
