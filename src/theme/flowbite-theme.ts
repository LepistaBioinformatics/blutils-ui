import type { CustomFlowbiteTheme } from "flowbite-react";

/**
 * Lepista Bioinformatics Lab theme overrides for flowbite-react.
 *
 * The result viewer is deliberately neutral: controls, navigation and
 * selectors use grays, so color is left to what carries meaning in the data
 * (the rule word and the composition bar). Every primary button uses
 * flowbite's default `info` color, so remapping `info` retints them all; the
 * navbar's active link is remapped from flowbite's cyan for the same reason.
 */
export const lepistaTheme: CustomFlowbiteTheme = {
  button: {
    color: {
      info: "text-white bg-gray-800 border border-transparent enabled:hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 dark:bg-gray-200 dark:text-gray-900 dark:enabled:hover:bg-white dark:focus:ring-gray-600",
    },
  },
  navbar: {
    link: {
      active: {
        on: "bg-gray-100 text-gray-900 font-semibold dark:bg-gray-700 dark:text-white md:bg-transparent md:dark:bg-transparent",
        off: "border-b border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white md:border-0 md:hover:bg-transparent md:dark:hover:bg-transparent",
      },
    },
  },
};
