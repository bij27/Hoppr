import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AgeGate } from '@/components/age-gate';
import { LaunchScreen } from '@/components/launch-screen';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CrawlProvider } from '@/state/crawl';
import { FeedbackProvider } from '@/state/feedback';
import { FiltersProvider } from '@/state/filters';
import { useVenues, VenuesProvider } from '@/state/venues';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: c.text, background: c.background, card: c.background, text: c.text, border: c.border },
  };

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navTheme}>
        <VenuesProvider>
          <CrawlProvider>
            <FeedbackProvider>
              <FiltersProvider>
                <Stack
                  screenOptions={{
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerTintColor: c.text,
                    headerStyle: { backgroundColor: c.background },
                  }}>
                  <Stack.Screen name="index" options={{ headerShown: false, title: 'Hoppr' }} />
                  <Stack.Screen name="venue/[id]" options={{ title: '' }} />
                  <Stack.Screen name="crawl" options={{ title: '' }} />
                  <Stack.Screen name="suggest" options={{ title: '' }} />
                  <Stack.Screen name="privacy" options={{ title: '' }} />
                  <Stack.Screen name="filters" options={{ title: '', presentation: 'modal' }} />
                </Stack>
                <AgeGate />
                <LaunchGate />
              </FiltersProvider>
            </FeedbackProvider>
          </CrawlProvider>
        </VenuesProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/** Plays the frog launch animation until the first venues have loaded. */
function LaunchGate() {
  const { loading } = useVenues();
  return <LaunchScreen ready={!loading} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
