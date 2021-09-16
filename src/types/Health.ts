import { CoreConfig } from '..';

export type Health = {
  healthy: boolean;
  version: string;
  api: {
    healthy: boolean;
    version?: string;
  };
  database: {
    healthy: boolean;
    version?: number;
  };
  config: CoreConfig;
};
