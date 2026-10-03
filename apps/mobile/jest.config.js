module.exports = {
  preset: '@react-native/jest-preset',

  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/async-storage.js',
    '^@react-navigation/native$':
      '<rootDir>/__mocks__/react-navigation.js',
    '^@react-navigation/native-stack$':
      '<rootDir>/__mocks__/react-navigation.js',
    '^@react-navigation/bottom-tabs$':
      '<rootDir>/__mocks__/react-navigation.js',
    '^react-native-webview$':
      '<rootDir>/__mocks__/react-native-webview.js',
    '^react-native-geolocation-service$':
      '<rootDir>/__mocks__/react-native-geolocation-service.js',
  },

  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|@react-native-community|react-native-.*)/)',
  ],
};
