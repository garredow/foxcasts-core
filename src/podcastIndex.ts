import { Api } from './internal/api';
import { Database } from './internal/database';
import { Category, PIStats } from './types';

export class PodcastIndex {
  private api: Api;
  private database: Database;

  constructor(api: Api, database: Database) {
    this.api = api;
    this.database = database;
  }

  public fetchCategories(): Promise<Category[]> {
    return this.api.getCategories();
  }

  public fetchStats(): Promise<PIStats> {
    return this.api.getStats();
  }
}
