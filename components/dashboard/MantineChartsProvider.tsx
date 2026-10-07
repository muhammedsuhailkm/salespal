"use client";

import { MantineProvider, type CSSVariablesResolver } from "@mantine/core";
import { useTheme } from "next-themes";

// Keep Mantine's global surface/text colors on the app tokens in both schemes.
const resolver: CSSVariablesResolver = () => {
  const shared = {
    "--mantine-color-body": "var(--background)",
    "--mantine-color-text": "var(--foreground)",
    "--mantine-color-dimmed": "var(--muted-foreground)",
    "--mantine-color-default-border": "var(--border)",
  };
  return { variables: {}, light: shared, dark: shared };
};

export function MantineChartsProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <MantineProvider
      forceColorScheme={resolvedTheme === "dark" ? "dark" : "light"}
      cssVariablesResolver={resolver}
      theme={{ fontFamily: "var(--font-inter), system-ui, sans-serif", primaryColor: "teal" }}
    >
      {children}
    </MantineProvider>
  );
}
