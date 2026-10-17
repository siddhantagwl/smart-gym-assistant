import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from "react";
import { initDb } from "@/db/schema";
import { setupNotifications } from "@/services/notifications";
import { refreshHomeWidget } from "@/services/homeWidget";
import { AppState } from "react-native";

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDb();
    setDbReady(true);
    setupNotifications();
    refreshHomeWidget();
    // Leaving the app: push the latest training days to the home widget.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") refreshHomeWidget();
    });
    return () => sub.remove();
  }, []);

  if (!dbReady) {
    return null; // DB not ready yet, block rendering
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="session-details" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen
          name="preferences"
          options={{
            title: "Workout preferences",
            headerStyle: { backgroundColor: "#000" },
            headerTintColor: "#fff",
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
