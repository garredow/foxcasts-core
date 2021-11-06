import { CoreModule } from './enums';
import { Api } from './internal/api';
import { Database } from './internal/database';
import {
  DbChangeEvent,
  DbReadOnly,
  Download,
  DownloadQuery,
  DownloadsQuery,
  DownloadStatus,
} from './types';
import { NotFoundError } from './utils';

export class Downloads {
  private api: Api;
  private database: Database;

  constructor(api: Api, database: Database) {
    this.api = api;
    this.database = database;
  }

  public async add(
    item: Pick<
      Download,
      | 'episodeId'
      | 'episodeTitle'
      | 'podcastTitle'
      | 'remoteFileUrl'
      | 'localFileUrl'
    >
  ): Promise<number> {
    return this.database.addDownload({
      episodeId: item.episodeId,
      episodeTitle: item.episodeTitle,
      podcastTitle: item.podcastTitle,
      remoteFileUrl: item.remoteFileUrl,
      localFileUrl: item.localFileUrl,
      currentBytes: 0,
      totalBytes: 0,
      status: DownloadStatus.Queued,
    });
  }

  public async update(
    listId: number,
    changes: Omit<Partial<Download>, DbReadOnly>
  ): Promise<number> {
    return this.database.updateDownload(listId, changes);
  }

  public async delete(ids: number[]): Promise<void> {
    return this.database.deleteDownloads(ids);
  }

  public async deleteAll(): Promise<void> {
    return this.database.deleteAllDownloads();
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

  public subscribeToChanges(
    callbackFn: (change: DbChangeEvent<Download>) => void
  ): void {
    return this.database.onChange(CoreModule.Downloads, callbackFn);
  }
}
