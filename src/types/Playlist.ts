import { DatabaseItem } from '.';

export type Playlist = DatabaseItem & {
  title: string;
  episodeIds: number[];
  isFavorite: 0 | 1;
  removeEpisodeAfterListening: boolean;
};
