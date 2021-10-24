import { Artwork } from '.';
import { Episode } from './Episode';

export type EpisodeExtended = Episode & {
  artwork?: Artwork;
  podcastTitle: string;
};
