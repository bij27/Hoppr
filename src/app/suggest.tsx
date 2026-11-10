import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { backendEnabled, UserFacingError } from '@/data/session';
import { SUGGESTION_LIMITS, suggestionProblem } from '@/data/suggestion-form';
import { sendSuggestion } from '@/data/suggestions';
import { useTheme } from '@/hooks/use-theme';
import { useVenues } from '@/state/venues';

/**
 * "Suggest a bar or deal". Opened from the home list (new bar) or a venue page (deal at that bar).
 * Suggestions go to the admins; nothing shows in the app until they add it.
 */
export default function SuggestScreen() {
  const { venueId: initialVenueId } = useLocalSearchParams<{ venueId?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { byId } = useVenues();

  const [venueId, setVenueId] = useState<string | null>(
    typeof initialVenueId === 'string' && initialVenueId ? initialVenueId : null,
  );
  const [venueName, setVenueName] = useState('');
  const [venueArea, setVenueArea] = useState('');
  const [deal, setDeal] = useState('');
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const venue = venueId ? byId.get(venueId) : undefined;
  const form = { venueId: venue ? venue.id : null, venueName, venueArea, deal, when, note };
  const ready = suggestionProblem(form) === null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendSuggestion(form);
      setSent(true);
    } catch (e) {
      setError(e instanceof UserFacingError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const startOver = () => {
    setDeal('');
    setWhen('');
    setNote('');
    setSent(false);
  };

  if (sent) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.inner, styles.done]}>
          <ThemedText type="title">Thanks!</ThemedText>
          <ThemedText themeColor="textSecondary">
            We check every suggestion before it goes in the app, usually within a few days.
          </ThemedText>
          <View style={styles.row}>
            <Button label="Done" style={styles.flex} onPress={() => router.back()} />
            <Button label="Suggest another" variant="secondary" style={styles.flex} onPress={startOver} />
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View style={styles.inner}>
          <View style={styles.intro}>
            <ThemedText type="title">{venue ? 'Suggest a deal' : 'Suggest a bar or deal'}</ThemedText>
            <ThemedText themeColor="textSecondary">
              Found a happy hour we’re missing? Tell us and we’ll check it out.
            </ThemedText>
          </View>

          {venue ? (
            <View style={[styles.venueCard, { backgroundColor: theme.surfaceMuted }]}>
              <View style={styles.flex}>
                <ThemedText type="overline" themeColor="textSecondary">
                  AT
                </ThemedText>
                <ThemedText type="bodyStrong">{venue.name}</ThemedText>
              </View>
              <Pressable onPress={() => setVenueId(null)} hitSlop={8} accessibilityRole="button">
                <ThemedText type="caption" themeColor="textSecondary" style={styles.underline}>
                  Different bar
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <TextField
                label="Bar name"
                value={venueName}
                onChangeText={setVenueName}
                placeholder="e.g. The Wharf"
                maxLength={SUGGESTION_LIMITS.venueName}
                autoCapitalize="words"
              />
              <TextField
                label="Where is it?"
                hint="optional"
                value={venueArea}
                onChangeText={setVenueArea}
                placeholder="Address, street, or neighborhood"
                maxLength={SUGGESTION_LIMITS.venueArea}
              />
            </>
          )}

          <TextField
            label="The deal"
            value={deal}
            onChangeText={setDeal}
            placeholder="e.g. $5 margaritas and half-off wings"
            maxLength={SUGGESTION_LIMITS.deal}
            multiline
          />
          <TextField
            label="When?"
            hint="optional"
            value={when}
            onChangeText={setWhen}
            placeholder="e.g. Mon–Fri, 4–7 PM"
            maxLength={SUGGESTION_LIMITS.when}
          />
          <TextField
            label="Anything else?"
            hint="optional"
            value={note}
            onChangeText={setNote}
            placeholder="Bar seats only, link to their menu, etc."
            maxLength={SUGGESTION_LIMITS.note}
            multiline
          />

          {error && (
            <ThemedText type="caption" style={{ color: theme.warning }}>
              {error}
            </ThemedText>
          )}
          {!backendEnabled && (
            <ThemedText type="caption" themeColor="textTertiary">
              Suggestions need the database (.env), which this build doesn’t have.
            </ThemedText>
          )}
          <Button
            label={busy ? 'Sending…' : 'Send suggestion'}
            disabled={!ready || busy || !backendEnabled}
            style={(!ready || !backendEnabled) && styles.disabled}
            onPress={submit}
          />
          <ThemedText type="caption" themeColor="textTertiary" style={styles.center}>
            Only the Hoppr team sees suggestions. No account needed.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.six, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.four },
  intro: { gap: Spacing.two },
  done: { alignSelf: 'center', paddingHorizontal: Spacing.four, paddingTop: Spacing.five },
  row: { flexDirection: 'row', gap: Spacing.two },
  venueCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.medium },
  underline: { textDecorationLine: 'underline' },
  disabled: { opacity: 0.4 },
});
