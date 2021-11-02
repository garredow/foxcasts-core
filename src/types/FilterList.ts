import { EpisodesQuery } from '.';

export type FilterList<T = undefined> = {
  id: number;
  title: string;
  query: EpisodesQuery;
  isFavorite: 0 | 1;
  viewOptions: T;
};
