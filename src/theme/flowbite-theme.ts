import type { CustomFlowbiteTheme } from "flowbite-react";

/**
 * Lepista Bioinformatics Lab theme overrides for flowbite-react.
 *
 * The violet lab identity (`brand`) is the primary interactive color, which
 * harmonizes across both light and dark themes. The Bioinformatics group amber
 * (`science`, #FEB326) is kept as a sparing accent (the "Active research" badge)
 * rather than a dominant fill. Every button in this app uses flowbite's default
 * `info` color, so remapping `info` to the brand palette retints all primary
 * controls at once, replacing the flowbite default cyan.
 */
export const lepistaTheme: CustomFlowbiteTheme = {
  button: {
    color: {
      info: "text-white bg-brand-600 border border-transparent enabled:hover:bg-brand-700 focus:ring-4 focus:ring-brand-300 dark:bg-brand-600 dark:enabled:hover:bg-brand-700 dark:focus:ring-brand-900",
    },
  },
};
