import { Palette } from '.';

export type ArtworkStyle = 'normal' | 'blurred' | 'greyscale';

export type Artwork = {
  id: number;
  podcastId: number;
  image: string;
  size: number;
  blur: number;
  greyscale: boolean;
  palette?: Palette;
};
