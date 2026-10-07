import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Button } from '@/components/Button';
import { useHydrated, useReminderSync } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import { colors, space, type } from '@/theme';

void SplashScreen.preventAutoHideAsync();

/**
 * Expo Router renders this instead of the screen if anything below throws.
 * A crash becomes a friendly screen with Retry, never a white screen.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.error}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorBody}>Your progress is saved. Tap retry to pick up where you left off.</Text>
      {__DEV__ && <Text style={styles.errorDev}>{error.message}</Text>}
      <Button label="Retry" onPress={retry} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

export default function RootLayout() {
  const hydrated = useHydrated();
  const hasProfile = useAppStore((s) => s.profile !== null);
  useReminderSync();

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  // Keep the splash up until saved state is loaded, so the onboarding gate never flickers.
  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="quiz" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="result" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!hasProfile}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
    backgroundColor: colors.bg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  errorTitle: { ...type.title, color: colors.text },
  errorBody: { ...type.body, color: colors.muted, textAlign: 'center', marginBottom: space.md },
  errorDev: { ...type.caption, color: colors.error, textAlign: 'center' },
});
