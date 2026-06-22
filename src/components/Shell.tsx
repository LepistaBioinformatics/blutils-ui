import { Suspense } from "react";
import { Badge, DarkThemeToggle, Navbar, Spinner } from "flowbite-react";
import { FaGithub } from "react-icons/fa";
import { HiOutlineBookOpen, HiOutlineExternalLink } from "react-icons/hi";
import { Link, Outlet, useLocation } from "react-router-dom";

const HOME = process.env.PUBLIC_URL;
const LAB_URL = "https://lepista.com.br";
const BIOINFORMATICS_TOOLS_URL = `${LAB_URL}/#bioinformatics-tools`;
const BLUTILS_GITHUB_URL = "https://github.com/LepistaBioinformatics/blutils";

export function Shell() {
  const { pathname } = useLocation();
  const onDocs = pathname.startsWith(`${HOME}/docs`);

  return (
    <main className="flex min-h-screen flex-col bg-canvas text-ink dark:bg-canvas-dark dark:text-gray-100">
      <Navbar fluid rounded>
        <Navbar.Brand as={Link} to={HOME || "/"}>
          <img
            src={HOME + "/favicon-32x32.png"}
            className="mr-3 h-6 sm:h-9"
            alt="Blutils UI logo"
          />
          <span className="self-center whitespace-nowrap text-xl font-semibold text-brand-600 dark:text-brand-400">
            Blutils UI
          </span>
          <span className="ml-3 hidden gap-2 sm:flex">
            <Badge color="success">In production</Badge>
            <Badge color="warning">Active research</Badge>
          </span>
        </Navbar.Brand>
        <div className="flex items-center gap-1 md:order-2">
          <DarkThemeToggle />
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
            className="text-lg hover:text-brand-600 dark:hover:text-brand-400"
          >
            <HiOutlineExternalLink className="mr-2 inline" /> Bioinformatics
            Tools
          </Navbar.Link>
          <Navbar.Link
            href={BLUTILS_GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="text-lg hover:text-brand-600 dark:hover:text-brand-400"
          >
            <FaGithub className="mr-2 inline" /> Blutils
          </Navbar.Link>
        </Navbar.Collapse>
      </Navbar>

      <div className="grow">
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-3 py-20 text-gray-600 dark:text-gray-400">
              <Spinner /> Loading…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>

      <footer className="mt-10 border-t border-gray-200 bg-canvas px-6 py-8 text-sm text-gray-600 dark:border-gray-700 dark:bg-canvas-dark dark:text-gray-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <a
              href={LAB_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Lepista Bioinformatics Lab
            </a>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Part of the Bioinformatics Tools group · blutils result explorer
            </p>
          </div>
          <div className="flex items-center gap-5">
            <Link to={`${HOME}/docs`} className="hover:text-brand-600 dark:hover:text-brand-400">
              Documentation
            </Link>
            <a
              href={BIOINFORMATICS_TOOLS_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand-600 dark:hover:text-brand-400"
            >
              Bioinformatics Tools
            </a>
            <a
              href={BLUTILS_GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-brand-600 dark:hover:text-brand-400"
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
    </main>
  );
}
