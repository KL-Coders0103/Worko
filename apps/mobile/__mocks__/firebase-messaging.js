const messaging = {};

module.exports = {
  getMessaging: jest.fn(() => messaging),
  getToken: jest.fn(async () => 'test-device-token'),
  registerDeviceForRemoteMessages: jest.fn(async () => undefined),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(async () => null),
  onTokenRefresh: jest.fn(() => jest.fn()),
};
