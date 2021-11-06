import { DatabaseItem, EpisodesQuery } from '.';

export type FilterList<T = undefined> = DatabaseItem & {
  title: string;
  query: EpisodesQuery;
  isFavorite: 0 | 1;
  viewOptions: T;
};
