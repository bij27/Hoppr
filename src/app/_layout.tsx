import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { CrawlProvider } from '@/state/crawl';
import { VenuesProvider } from '@/state/venues';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <VenuesProvider>
        <CrawlProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="venue/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
          </Stack>
        </CrawlProvider>
      </VenuesProvider>
    </ThemeProvider>
  );
}
