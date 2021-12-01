import { DatabaseItem, Soundbite } from '.';
import { PlaybackStatus } from '../enums';
import { Chapter } from './Chapter';

export type Episode = DatabaseItem & {
  podexId: number | null;
  guid: string;
  podcastId: number;
  date: string; // ISO 8601
  title: string;
  description: string;
  duration: number;
  progress: number;
  fileSize: number;
  fileType: string;
  remoteFileUrl: string;
  localFileUrl?: string;
  chaptersUrl?: string;
  chapters?: Chapter[];
  transcriptUrl?: string;
  season?: number;
  episode?: number;
  episodeType?: 'full' | 'trailer' | 'bonus';
  soundbite?: Soundbite;
  soundbites?: Soundbite[];
  imageUrl?: string;
  playbackStatus: PlaybackStatus;
  isDownloaded: 0 | 1;
  isFavorite: 0 | 1;
};
