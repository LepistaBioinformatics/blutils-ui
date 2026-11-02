import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Flowbite } from "flowbite-react";
import { ThemeModeToggle } from "./ThemeModeToggle";

const LS_KEY = "flowbite-theme-mode";

// jsdom has no matchMedia; this one reports a controllable OS preference and
// lets a test fire the `change` event the browser sends when it flips.
function mockSystemTheme(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<() => void>();
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    get matches() {
      return query === "(prefers-color-scheme: dark)" && dark;
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }));
  return {
    setDark(next: boolean) {
      dark = next;
      act(() => listeners.forEach((cb) => cb()));
    },
    listenerCount: () => listeners.size,
  };
}

function renderToggle() {
  return render(
    <Flowbite theme={{ mode: "auto" }}>
      <ThemeModeToggle />
    </Flowbite>
  );
}

const button = () => screen.getByRole("button", { name: /^Theme:/ });
const htmlIsDark = () => document.documentElement.classList.contains("dark");

describe("ThemeModeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to the system theme", () => {
    mockSystemTheme(true);
    renderToggle();
    expect(button()).toHaveAccessibleName("Theme: System (switch to Light)");
    expect(localStorage.getItem(LS_KEY)).toBe("auto");
    expect(htmlIsDark()).toBe(true);
  });

  it("cycles System → Light → Dark → System, persisting each choice", () => {
    mockSystemTheme(true);
    renderToggle();

    userEvent.click(button());
    expect(button()).toHaveAccessibleName("Theme: Light (switch to Dark)");
    expect(localStorage.getItem(LS_KEY)).toBe("light");
    expect(htmlIsDark()).toBe(false);

    userEvent.click(button());
    expect(button()).toHaveAccessibleName("Theme: Dark (switch to System)");
    expect(localStorage.getItem(LS_KEY)).toBe("dark");
    expect(htmlIsDark()).toBe(true);

    userEvent.click(button());
    expect(button()).toHaveAccessibleName("Theme: System (switch to Light)");
    expect(localStorage.getItem(LS_KEY)).toBe("auto");
    expect(htmlIsDark()).toBe(true);
  });

  it("restores a persisted explicit choice", () => {
    mockSystemTheme(true);
    localStorage.setItem(LS_KEY, "light");
    renderToggle();
    expect(button()).toHaveAccessibleName("Theme: Light (switch to Dark)");
    expect(htmlIsDark()).toBe(false);
  });

  it("follows OS theme changes while in system mode", () => {
    const system = mockSystemTheme(false);
    renderToggle();
    expect(htmlIsDark()).toBe(false);

    system.setDark(true);
    expect(htmlIsDark()).toBe(true);

    system.setDark(false);
    expect(htmlIsDark()).toBe(false);
  });

  it("ignores OS theme changes once an explicit mode is chosen", () => {
    const system = mockSystemTheme(false);
    renderToggle();
    userEvent.click(button()); // Light
    expect(system.listenerCount()).toBe(0);

    system.setDark(true);
    expect(htmlIsDark()).toBe(false);
  });
});
