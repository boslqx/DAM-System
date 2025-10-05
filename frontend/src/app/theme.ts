"use client";
import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: "#F5EFE6",
      100: "#E8DFCA",
      200: "#6D94C5",
      300: "#CBDCEB",
    },
  },
});
