const React = require('react');
const { View } = require('react-native');

function NavigationContainer({ children }) {
  return React.createElement(View, { testID: 'mock-navigation-container' }, children);
}

function createBottomTabNavigator() {
  const Screen = () => null;
  const Navigator = () => null;
  return { Navigator, Screen };
}

function createNativeStackNavigator() {
  const Screen = () => null;
  const Navigator = ({ children }) => {
    const screens = React.Children.toArray(children);
    const initial = screens.find((screen) => screen.props.name === 'Auth') || screens[0];
    if (!initial || !initial.props.component) return null;
    const Component = initial.props.component;
    return React.createElement(Component);
  };
  return { Navigator, Screen };
}

module.exports = {
  __esModule: true,
  NavigationContainer,
  DefaultTheme: {},
  createNativeStackNavigator,
  createBottomTabNavigator,
};
