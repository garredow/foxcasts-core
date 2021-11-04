export type Playlist = {
  id: number;
  title: string;
  episodeIds: number[];
  isFavorite: 0 | 1;
  removeEpisodeAfterListening: boolean;
};
