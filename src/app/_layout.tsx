import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CrawlProvider } from '@/state/crawl';
import { VenuesProvider } from '@/state/venues';

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
            </Stack>
          </CrawlProvider>
        </VenuesProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
