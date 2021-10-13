import { PlaybackStatus } from '../enums';
import { ApiEpisode, Episode } from '../types';

export function fromApiEpisode(source: ApiEpisode): Omit<Episode, 'id'> {
  return {
    podexId: source.podexId || null,
    guid: source.guid,
    podcastId: 0,
    date: source.date, // ISO 8601
    title: source.title,
    description: source.description || '',
    duration: source.duration,
    progress: 0,
    fileSize: source.fileSize,
    fileType: source.fileType,
    fileUrl: source.fileUrl,
    localFileUrl: undefined,
    chapters: undefined,
    chaptersUrl: source.chaptersUrl,
    transcriptUrl: source.transcriptUrl,
    playbackStatus: PlaybackStatus.Unplayed,
    isDownloaded: false,
    isFavorite: false,
  };
}
