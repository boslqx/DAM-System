"use client";
import { createSystem, defaultConfig } from "@chakra-ui/react";

export const theme = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#F5EFE6" },
          100: { value: "#E8DFCA" },
          200: { value: "#6D94C5" },
          300: { value: "#CBDCEB" },
        },
      },
    },
    semanticTokens: {
      colors: {
        bg: { value: "{colors.brand.50}" },
        text: { value: "{colors.gray.800}" },
      },
    },
  },
});
