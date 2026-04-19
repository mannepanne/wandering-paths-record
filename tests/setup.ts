// ABOUT: Global test setup for Vitest
// ABOUT: Configures testing-library and custom matchers

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
process.env.VITE_MAPBOX_TOKEN = 'test-mapbox-token';
process.env.VITE_GOOGLE_MAPS_API_KEY = 'test-google-key';
