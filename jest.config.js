module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts', // Exclude server entry point
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  maxWorkers: 1, // Run tests in serial to avoid race conditions
  
  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    'extra-googletts': '<rootDir>/tests/__mocks__/extra-googletts.js',
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(extra-googletts|music-metadata)/)',
  ],
  
  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
};