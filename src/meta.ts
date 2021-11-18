import { CoreConfig } from '.';
import { Api } from './internal/api';
import { Database } from './internal/database';
import pkg from './pkg.json';
import { Health } from './types';

export class Meta {
  private config: CoreConfig;
  private api: Api;
  private database: Database;

  constructor(config: CoreConfig, api: Api, database: Database) {
    this.config = config;
    this.api = api;
    this.database = database;
  }

  public async getHealth(): Promise<Health> {
    const api = await this.api.health();
    const database = await this.database.health();

    return {
      healthy: [api.healthy, api.authenticated, database.healthy].every((a) => a === true),
      version: pkg.version,
      api,
      database,
      config: this.config,
    };
  }
}
