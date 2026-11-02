import { useEffect } from "react";
import { useThemeMode } from "flowbite-react";
import {
  HiOutlineDesktopComputer,
  HiOutlineMoon,
  HiOutlineSun,
} from "react-icons/hi";

type ThemeMode = "auto" | "light" | "dark";

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  auto: "light",
  light: "dark",
  dark: "auto",
};

const LABEL: Record<ThemeMode, string> = {
  auto: "System",
  light: "Light",
  dark: "Dark",
};

const ICON: Record<ThemeMode, typeof HiOutlineSun> = {
  auto: HiOutlineDesktopComputer,
  light: HiOutlineSun,
  dark: HiOutlineMoon,
};

const SYSTEM_DARK = "(prefers-color-scheme: dark)";

function asThemeMode(mode: string): ThemeMode {
  return mode === "light" || mode === "dark" ? mode : "auto";
}

/**
 * Cycles the color theme System → Light → Dark. "System" follows the OS
 * preference, including changes made while the app is open.
 */
export function ThemeModeToggle() {
  const { mode: rawMode, setMode } = useThemeMode();
  const mode = asThemeMode(rawMode);

  // flowbite-react resolves "auto" only when the mode is set; re-apply it when
  // the OS preference changes so the page keeps following the system.
  useEffect(() => {
    if (mode !== "auto") return;
    const query = window.matchMedia?.(SYSTEM_DARK);
    if (!query) return;
    const onChange = () => setMode("auto");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode, setMode]);

  const next = NEXT_MODE[mode];
  const Icon = ICON[mode];
  const label = `Theme: ${LABEL[mode]} (switch to ${LABEL[next]})`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setMode(next)}
      className="rounded-lg p-2.5 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
    >
      <Icon aria-hidden className="h-5 w-5" />
    </button>
  );
}
