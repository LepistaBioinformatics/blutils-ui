import { Suspense, useState } from "react";
import { Badge, Navbar, Spinner } from "flowbite-react";
import { ThemeModeToggle } from "./ThemeModeToggle";
import { FaGithub } from "react-icons/fa";
import { HiOutlineBookOpen, HiOutlineExternalLink } from "react-icons/hi";
import { Link, Outlet, useLocation } from "react-router-dom";

const HOME = process.env.PUBLIC_URL;
const LAB_URL = "https://lepista.com.br";
const BIOINFORMATICS_TOOLS_URL = `${LAB_URL}/#bioinformatics-tools`;
const BLUTILS_GITHUB_URL = "https://github.com/LepistaBioinformatics/blutils";

export interface ShellContext {
  fullscreen: boolean;
  setFullscreen: (fullscreen: boolean) => void;
  /** Navbar element child routes may portal page actions into (e.g. Reset). */
  navbarActions: HTMLElement | null;
}

export function Shell() {
  const { pathname } = useLocation();
  const onDocs = pathname.startsWith(`${HOME}/docs`);
  // Set by a child route (the results view) that fills the viewport and
  // scrolls its own content: the page itself must not scroll.
  const [fullscreen, setFullscreen] = useState(false);
  const [navbarActions, setNavbarActions] = useState<HTMLElement | null>(null);
  const outletContext: ShellContext = { fullscreen, setFullscreen, navbarActions };

  return (
    <main
      className={`flex flex-col bg-canvas text-ink dark:bg-canvas-dark dark:text-gray-100 ${
        fullscreen ? "h-dvh overflow-hidden" : "min-h-screen"
      }`}
    >
      <Navbar
        fluid
        rounded
        // Transparent over the page; the surface only appears on hover.
        className="bg-transparent transition-colors duration-200 hover:bg-white dark:bg-transparent dark:hover:bg-gray-800"
      >
        <Navbar.Brand as={Link} to={HOME || "/"}>
          <img
            src={HOME + "/favicon-32x32.png"}
            className="mr-3 h-6 sm:h-9"
            alt="Blutils UI logo"
          />
          <span className="self-center whitespace-nowrap text-xl font-semibold text-gray-900 dark:text-white">
            Blutils UI
          </span>
          <span className="ml-3 hidden gap-2 sm:flex">
            <Badge color="gray">In production</Badge>
            <Badge color="gray">Active research</Badge>
          </span>
        </Navbar.Brand>
        <div className="flex items-center gap-1 md:order-2">
          <div ref={setNavbarActions} className="flex items-center" />
          <ThemeModeToggle />
          <Navbar.Toggle />
        </div>
        <Navbar.Collapse>
          <Navbar.Link as={Link} to={HOME || "/"} active={!onDocs} className="text-lg">
            Explorer
          </Navbar.Link>
          <Navbar.Link
            as={Link}
            to={`${HOME}/docs`}
            active={onDocs}
            className="text-lg"
          >
            <HiOutlineBookOpen className="mr-2 inline" /> Docs
          </Navbar.Link>
          <Navbar.Link
            href={BIOINFORMATICS_TOOLS_URL}
            target="_blank"
            rel="noreferrer"
            className="text-lg hover:text-gray-900 dark:hover:text-white"
          >
            <HiOutlineExternalLink className="mr-2 inline" /> Bioinformatics
            Tools
          </Navbar.Link>
          <Navbar.Link
            href={BLUTILS_GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="text-lg hover:text-gray-900 dark:hover:text-white"
          >
            <FaGithub className="mr-2 inline" /> Blutils
          </Navbar.Link>
        </Navbar.Collapse>
      </Navbar>

      <div className={fullscreen ? "flex min-h-0 grow flex-col" : "grow"}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-3 py-20 text-gray-600 dark:text-gray-400">
              <Spinner /> Loading…
            </div>
          }
        >
          <Outlet context={outletContext} />
        </Suspense>
      </div>

      {!fullscreen && (
        <footer className="mt-10 border-t border-gray-200 bg-canvas px-6 py-8 text-sm text-gray-600 dark:border-gray-700 dark:bg-canvas-dark dark:text-gray-400">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <a
                href={LAB_URL}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-gray-900 hover:text-gray-900 dark:text-white dark:hover:text-white"
              >
                Lepista Bioinformatics Lab
              </a>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Part of the Bioinformatics Tools group · blutils result explorer
              </p>
            </div>
            <div className="flex items-center gap-5">
              <Link to={`${HOME}/docs`} className="hover:text-gray-900 dark:hover:text-white">
                Documentation
              </Link>
              <a
                href={BIOINFORMATICS_TOOLS_URL}
                target="_blank"
                rel="noreferrer"
                className="hover:text-gray-900 dark:hover:text-white"
              >
                Bioinformatics Tools
              </a>
              <a
                href={BLUTILS_GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
              >
                <FaGithub className="inline" /> GitHub
              </a>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-600">
            © {new Date().getFullYear()} Lepista Bioinformatics Lab. All rights
            reserved.
          </p>
        </footer>
      )}
    </main>
  );
}
