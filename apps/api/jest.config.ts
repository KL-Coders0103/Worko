import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Read TypeScript path aliases from the API tsconfig.
const { config: tsconfig } = ts.readConfigFile(
  './tsconfig.json',
  ts.sys.readFile,
);

const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
  preset: 'ts-jest',

  rootDir: '.',

  testRegex: '.*\\.spec\\.ts$',

  moduleFileExtensions: ['js', 'json', 'ts'],

  extensionsToTreatAsEsm: ['.ts'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          ...tsconfig.compilerOptions,
          module: 'ESNext',
          moduleResolution: 'Bundler',
          target: 'ES2023',
          isolatedModules: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    ],
  },

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    ...pathsToModuleNameMapper(paths, {
      prefix: '<rootDir>/',
      useESM: true,
    }),
  },

  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    'libs/**/*.(t|j)s',
    'apps/**/*.(t|j)s',
  ],

  coverageDirectory: './coverage',

  testEnvironment: 'node',

  clearMocks: true,

  restoreMocks: true,
};

export default config;
