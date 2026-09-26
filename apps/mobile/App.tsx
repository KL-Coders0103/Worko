import {StatusBar, StyleSheet, Text, View, useColorScheme} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.brand}>WORKO</Text>
          <Text style={styles.title}>Mobile foundation ready</Text>
          <Text style={styles.subtitle}>
            React Native 0.87.1 · Android + iOS
          </Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    marginBottom: 12,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: {fontSize: 20, fontWeight: '700', textAlign: 'center'},
  subtitle: {marginTop: 8, fontSize: 14, textAlign: 'center', opacity: 0.65},
});

export default App;
