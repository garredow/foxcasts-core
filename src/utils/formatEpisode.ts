import { PlaybackStatus } from '../enums';
import { ApiEpisode, DbReadOnly, Episode } from '../types';

export function fromApiEpisode(source: ApiEpisode): Omit<Episode, DbReadOnly> {
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
    remoteFileUrl: source.fileUrl,
    localFileUrl: undefined,
    chapters: undefined,
    chaptersUrl: source.chaptersUrl,
    transcriptUrl: source.transcriptUrl,
    season: source.season,
    episode: source.episode,
    episodeType: source.episodeType,
    soundbite: source.soundbite,
    soundbites: source.soundbites,
    imageUrl: source.imageUrl,
    playbackStatus: PlaybackStatus.Unplayed,
    isDownloaded: 0,
    isFavorite: 0,
  };
}
