"use client";

import { MantineProvider } from "@mantine/core";

export function MantineChartsProvider({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider defaultColorScheme="light" theme={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {children}
    </MantineProvider>
  );
}
