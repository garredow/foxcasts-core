import { EpisodeExtended, Playlist } from '.';

export type PlaylistExtended = Playlist & {
  episodes: EpisodeExtended[];
};
