import { Episode } from './Episode';

export type EpisodeExtended = Episode & {
  podcastTitle: string;
  artwork?: string;
  accentColor?: string;
};
