import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Pill } from '@/components/pill';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { feedbackEnabled } from '@/data/feedback';
import type { Deal, ReportReason } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { formatConfirmations, formatVerified } from '@/lib/format';
import { useFeedback } from '@/state/feedback';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'wrong_price', label: 'Wrong price' },
  { value: 'wrong_time', label: 'Wrong times' },
  { value: 'no_longer_offered', label: 'No longer offered' },
  { value: 'other', label: 'Other' },
];

/**
 * Trust line plus "Still on?" for one deal. Confirming is offered only while the deal is live
 * (you can only vouch for what's in front of you); reporting is always available. Reports go
 * to the admins and never change what other people see on their own.
 */
export function DealFeedback({ deal, live, now }: { deal: Deal; live: boolean; now: Date }) {
  const theme = useTheme();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');

  const { count, lastAt } = feedback.confirmationsFor(deal);
  const proof = formatConfirmations(count, lastAt, now);
  const trustLine = proof ? (
    <ThemedText type="caption" style={{ color: theme.liveText }}>
      ✓ {proof}
    </ThemedText>
  ) : (
    <ThemedText type="caption" themeColor="textTertiary">
      {formatVerified(deal.lastVerifiedAt, now)}
    </ThemedText>
  );
  if (!feedbackEnabled) return trustLine;

  const confirmed = feedback.confirmedToday(deal.id);
  const reported = feedback.reportedToday(deal.id);

  const run = async (action: () => Promise<{ ok: true } | { ok: false; message: string }>) => {
    setBusy(true);
    setError(null);
    const outcome = await action();
    setBusy(false);
    if (!outcome.ok) setError(outcome.message);
    return outcome.ok;
  };
  const onConfirm = () => run(() => feedback.confirm(deal.id));
  const onSendReport = async () => {
    if (!reason) return;
    if (await run(() => feedback.report(deal.id, reason, note))) setReporting(false);
  };
  const cancelReport = () => {
    setReporting(false);
    setReason(null);
    setNote('');
    setError(null);
  };

  return (
    <View style={styles.wrap}>
      {trustLine}

      {reporting ? (
        <View style={[styles.form, { borderColor: theme.border }]}>
          <ThemedText type="captionStrong">What’s off?</ThemedText>
          <View style={styles.reasons}>
            {REASONS.map((r) => (
              <Pill key={r.value} label={r.label} selected={reason === r.value} onPress={() => setReason(r.value)} />
            ))}
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Anything we should know? (optional)"
            placeholderTextColor={theme.textTertiary}
            maxLength={500}
            multiline
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
          />
          <ThemedText type="caption" themeColor="textTertiary">
            Goes to the Hoppr team only. We check every report before changing a listing.
          </ThemedText>
          <View style={styles.row}>
            <Button
              label={busy ? 'Sending…' : 'Send report'}
              size="small"
              disabled={!reason || busy}
              style={!reason && styles.disabled}
              onPress={onSendReport}
            />
            <Button label="Cancel" size="small" variant="quiet" onPress={cancelReport} />
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          {live && !confirmed && (
            <>
              <ThemedText type="caption" themeColor="textSecondary">
                Still on?
              </ThemedText>
              <Button label="✓ Yes" size="small" variant="secondary" disabled={busy} onPress={onConfirm} />
            </>
          )}
          {confirmed && (
            <ThemedText type="caption" style={{ color: theme.liveText }}>
              Thanks for confirming.
            </ThemedText>
          )}
          {reported ? (
            <ThemedText type="caption" themeColor="textTertiary">
              Reported. We’ll check it.
            </ThemedText>
          ) : (
            <Pressable
              onPress={() => setReporting(true)}
              hitSlop={8}
              accessibilityRole="button"
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.underline}>
                Something’s off?
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {error && (
        <ThemedText type="caption" style={{ color: theme.warning }}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  form: { marginTop: Spacing.one, padding: Spacing.three, borderWidth: 1, borderRadius: Radius.medium, gap: Spacing.two },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontFamily: Fonts.sans,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  disabled: { opacity: 0.4 },
  link: { paddingVertical: Spacing.one },
  underline: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.6 },
});
