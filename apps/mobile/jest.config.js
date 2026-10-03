module.exports = {
  preset: '@react-native/jest-preset',

  moduleNameMapper: {
    '^react-native-webview$':
      '<rootDir>/__mocks__/react-native-webview.js',

    '^react-native-geolocation-service$':
      '<rootDir>/__mocks__/react-native-geolocation-service.js',
  },

  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|@react-native-community|react-native-.*)/)',
  ],
};
