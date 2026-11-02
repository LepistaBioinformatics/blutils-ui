import { lazy } from "react";
import { createPortal } from "react-dom";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useOutletContext } from "react-router-dom";
import { renderWithRouter } from "@/test-utils";
import { Shell, ShellContext } from "./Shell";

// Default flowbite theme (no <Flowbite> wrapper): navbar.link.active.on/off
const ACTIVE_CLASS = "bg-cyan-700";
const INACTIVE_CLASS = "border-b";

// A lazy component whose import never resolves keeps the Suspense fallback up.
const NeverLoads = lazy(() => new Promise<{ default: () => JSX.Element }>(() => {}));

function renderShell(route: string, child = <div>child content</div>) {
  return renderWithRouter(
    <Routes>
      <Route element={<Shell />}>
        <Route path="*" element={child} />
      </Route>
    </Routes>,
    { route }
  );
}

// A child route that toggles fullscreen like the results view does.
function FullscreenChild() {
  const { setFullscreen } = useOutletContext<ShellContext>();
  return (
    <>
      <button onClick={() => setFullscreen(true)}>enter fullscreen</button>
      <button onClick={() => setFullscreen(false)}>leave fullscreen</button>
    </>
  );
}

// A child route that puts a page action into the navbar, like Reset.
function NavbarActionChild() {
  const { navbarActions } = useOutletContext<ShellContext>();
  return navbarActions ? createPortal(<button>page action</button>, navbarActions) : null;
}

function footer() {
  return document.querySelector("footer");
}

function navLink(name: string | RegExp) {
  return within(screen.getByRole("navigation")).getByRole("link", { name });
}

describe("Shell", () => {
  test("renders the brand and the routed page through the Outlet", () => {
    renderShell("/");
    expect(screen.getByText("Blutils UI")).toBeInTheDocument();
    expect(screen.getByAltText("Blutils UI logo")).toHaveAttribute("src", "/favicon-32x32.png");
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  test("on / the Explorer link is active and Docs is not", () => {
    renderShell("/");
    expect(navLink("Explorer")).toHaveClass(ACTIVE_CLASS);
    expect(navLink("Explorer")).toHaveAttribute("href", "/");
    expect(navLink(/Docs/)).toHaveClass(INACTIVE_CLASS);
    expect(navLink(/Docs/)).not.toHaveClass(ACTIVE_CLASS);
  });

  test.each(["/docs", "/docs/run-blast"])("on %s the Docs link is active and Explorer is not", (route) => {
    renderShell(route);
    expect(navLink(/Docs/)).toHaveClass(ACTIVE_CLASS);
    expect(navLink(/Docs/)).toHaveAttribute("href", "/docs");
    expect(navLink("Explorer")).not.toHaveClass(ACTIVE_CLASS);
  });

  test("external links open in a new tab with rel=noreferrer", () => {
    renderShell("/");
    const external = [
      [navLink(/Bioinformatics\s+Tools/), "https://lepista.com.br/#bioinformatics-tools"],
      [navLink(/Blutils$/), "https://github.com/LepistaBioinformatics/blutils"],
      [screen.getByRole("link", { name: "Lepista Bioinformatics Lab" }), "https://lepista.com.br"],
      [screen.getByRole("link", { name: "GitHub" }), "https://github.com/LepistaBioinformatics/blutils"],
    ] as const;
    external.forEach(([link, href]) => {
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    });
  });

  test("the footer Documentation link is internal", () => {
    renderShell("/");
    const link = screen.getByRole("link", { name: "Documentation" });
    expect(link).toHaveAttribute("href", "/docs");
    expect(link).not.toHaveAttribute("target");
  });

  test("the footer shows the current year", () => {
    renderShell("/");
    const year = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`© ${year} Lepista Bioinformatics Lab\\. All rights\\s+reserved\\.`))
    ).toBeInTheDocument();
  });

  test("a suspended page shows the 'Loading…' fallback", () => {
    renderShell("/", <NeverLoads />);
    expect(screen.getByText(/Loading…/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Blutils UI")).toBeInTheDocument();
  });

  test("a child route calling setFullscreen(true) hides the footer; false shows it again", () => {
    renderShell("/", <FullscreenChild />);
    const main = screen.getByRole("main");
    expect(footer()).toBeInTheDocument();
    expect(main).toHaveClass("min-h-screen");

    userEvent.click(screen.getByRole("button", { name: "enter fullscreen" }));
    expect(footer()).not.toBeInTheDocument();
    expect(main).toHaveClass("h-dvh", "overflow-hidden");
    expect(main).not.toHaveClass("min-h-screen");
    // the navbar stays
    expect(screen.getByText("Blutils UI")).toBeInTheDocument();

    userEvent.click(screen.getByRole("button", { name: "leave fullscreen" }));
    expect(footer()).toBeInTheDocument();
    expect(main).toHaveClass("min-h-screen");
  });

  it("child routes can render actions into the navbar slot", () => {
    renderShell("/", <NavbarActionChild />);
    expect(
      within(screen.getByRole("navigation")).getByRole("button", { name: "page action" })
    ).toBeInTheDocument();
  });
});
