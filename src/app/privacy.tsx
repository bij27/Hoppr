import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MIN_AGE, PRIVACY_CONTACT_EMAIL, PRIVACY_EFFECTIVE_DATE } from '@/constants/app';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Plain-English privacy policy. Keep it true to what the app actually does: update it in the
 * same change whenever data collection changes (accounts, social features, analytics…).
 */
const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: 'The short version',
    body: [
      'Hoppr shows happy hours near you and helps you plan a night out. We collect as little as we can, we never sell your data, and there are no ads or ad trackers.',
    ],
  },
  {
    heading: 'Your location',
    body: [
      'If you allow it, Hoppr uses your location on your phone to show how far away bars are. It is not sent to us or stored on our servers.',
      'The map itself comes from Apple Maps (iPhone), Google Maps (Android) or OpenStreetMap (web), which receive the map area you’re viewing, like any map app.',
    ],
  },
  {
    heading: 'No account needed',
    body: [
      'You can browse without signing up. The first time you confirm a deal, report a problem or suggest a bar, the app creates an anonymous ID for your phone. It isn’t tied to your name, email or phone number. It lets us limit each phone to one confirmation and one report per deal per day, so nobody can flood a listing.',
    ],
  },
  {
    heading: 'What we store',
    body: [
      'Confirmations: which deal you confirmed and when. Others only ever see a total, like “Confirmed by 4 people this week”, never who.',
      'Reports and suggestions: what you choose and type. Only the Hoppr team can read them, and we check every one before changing a listing.',
      'Your crawl plan is saved on your phone only.',
      'Your answer to the age question is saved on your phone only.',
    ],
  },
  {
    heading: 'Who we share it with',
    body: [
      'Nobody, except the services that run the app: Supabase stores the data above for us. We don’t sell or rent your information, and we don’t use it for advertising.',
    ],
  },
  {
    heading: `${MIN_AGE} and over`,
    body: [`Hoppr is about drinks specials and is only for people ${MIN_AGE} and older. Please drink responsibly and never drink and drive.`],
  },
  {
    heading: 'Changes',
    body: [
      'When we add new features (like accounts and sharing crawls with friends), we’ll update this page before they launch and change the date at the top.',
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <View style={styles.block}>
            <ThemedText type="title">Privacy</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Effective {PRIVACY_EFFECTIVE_DATE}
            </ThemedText>
          </View>
          {SECTIONS.map((s) => (
            <View key={s.heading} style={styles.block}>
              <ThemedText type="heading">{s.heading}</ThemedText>
              {s.body.map((p) => (
                <ThemedText key={p} themeColor="textSecondary">
                  {p}
                </ThemedText>
              ))}
            </View>
          ))}
          {PRIVACY_CONTACT_EMAIL && (
            <View style={styles.block}>
              <ThemedText type="heading">Questions or deleting your data</ThemedText>
              <ThemedText themeColor="textSecondary">
                Email{' '}
                <ThemedText
                  type="bodyStrong"
                  style={styles.underline}
                  onPress={() => Linking.openURL(`mailto:${PRIVACY_CONTACT_EMAIL}`)}>
                  {PRIVACY_CONTACT_EMAIL}
                </ThemedText>{' '}
                and we’ll answer, or delete everything tied to your phone’s anonymous ID.
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.six, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.five },
  block: { gap: Spacing.two },
  underline: { textDecorationLine: 'underline' },
});
