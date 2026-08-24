module.exports = {
  displayName: 'api',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          target: 'es2021',
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
        module: { type: 'commonjs', lazy: true },
      },
    ],
  },
  moduleNameMapper: {
    '^@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data$':
      '<rootDir>/../../libs/data/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../coverage/api',
};
