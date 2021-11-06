import { DatabaseItem } from '.';

export enum DownloadStatus {
  Queued = 'queued',
  Downloading = 'downloading',
  Complete = 'complete',
  Error = 'error',
  Cancelled = 'cacelled',
}

export type Download = DatabaseItem & {
  episodeId: number;
  episodeTitle: string;
  podcastTitle: string;
  remoteFileUrl: string;
  localFileUrl: string;
  currentBytes: number;
  totalBytes: number;
  status: DownloadStatus;
};
