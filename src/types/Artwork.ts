import { DatabaseItem, Palette } from '.';

export type ArtworkStyle = 'normal' | 'blurred' | 'greyscale';

export type Artwork = DatabaseItem & {
  podcastId: number;
  image: string;
  size: number;
  blur: number;
  greyscale: 0 | 1;
  palette?: Palette;
};
