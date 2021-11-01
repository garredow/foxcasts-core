import { EpisodesQuery } from '.';

export type FilterList = {
  id: number;
  title: string;
  query: EpisodesQuery;
  isFavorite: 0 | 1;
};
