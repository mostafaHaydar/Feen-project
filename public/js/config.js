const ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
};

const API_ENDPOINTS = {
  [ENV.DEVELOPMENT]: {
    BASE_URL: 'http://127.0.0.1:8787/api',
  },
  [ENV.PRODUCTION]: {
    BASE_URL: 'https://feen-project.mr-haydar-mostafa.workers.dev/api',
  },
};

// Export the API URLs based on current environment
const currentEnv = ENV.DEVELOPMENT;
export const BASE_URL = API_ENDPOINTS[currentEnv].BASE_URL;
