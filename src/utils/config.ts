export type Config = {
  baseUrl: string;
  apiKey?: string;
};

const defaultConfig: Config = {
  apiKey: undefined,
  baseUrl: 'https://api.foxcasts.com/',
};

let config: Config = {
  ...defaultConfig,
};

export function getConfig(): Config {
  return config;
}

export function setConfig(newConfig: Partial<Config>): Config {
  config = {
    ...defaultConfig,
    ...newConfig,
  };

  return config;
}
