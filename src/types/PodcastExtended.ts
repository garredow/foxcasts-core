import { Artwork, Podcast } from '.';

export type PodcastExtended = Podcast & {
  artwork?: Artwork;
};
