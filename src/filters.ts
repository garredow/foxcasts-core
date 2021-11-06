import { Api } from './internal/api';
import { Database } from './internal/database';
import { FilterList, FilterQuery } from './types';
import { NotFoundError } from './utils';

export class Filters {
  private api: Api;
  private database: Database;

  constructor(api: Api, database: Database) {
    this.api = api;
    this.database = database;
  }

  public async add<T>(list: Omit<FilterList<T>, 'id'>): Promise<number> {
    return this.database.addFilterList<T>(list);
  }

  public async update<T>(
    listId: number,
    changes: Omit<Partial<FilterList<T>>, 'id'>
  ): Promise<number> {
    return this.database.updateFilterList<T>(listId, changes);
  }

  public async delete(listIds: number[]): Promise<void> {
    return this.database.deleteFilterLists(listIds);
  }

  public async get<T>(query: FilterQuery): Promise<FilterList<T>> {
    const result = await this.query<T>(query);
    if (!result) {
      throw new NotFoundError(`No results for ${query}`);
    }
    return result;
  }

  public async query<T>(
    query: FilterQuery
  ): Promise<FilterList<T> | undefined> {
    return this.database.getFilterList<T>(query);
  }

  public async queryAll<T>(): Promise<FilterList<T>[]> {
    return this.database.getFilterLists<T>();
  }
}
