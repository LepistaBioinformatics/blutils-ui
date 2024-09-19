import { Results } from "./Results";
import { Navbar } from "flowbite-react";
import { FaGithub } from "react-icons/fa";

function Layout() {
  return (
    <main className="dark bg-gray-900">
      <Navbar fluid rounded>
        <Navbar.Brand href={process.env.PUBLIC_URL}>
          <img
            src={process.env.PUBLIC_URL + "/favicon-32x32.png"}
            className="mr-3 h-6 sm:h-9"
            alt="Blutils UI logo"
          />
          <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
            Blutils UI
          </span>
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Navbar.Link
            href="https://github.com/LepistaBioinformatics/blutils"
            target="_blank"
            className="text-lg"
          >
            <FaGithub className="inline mr-2" /> Blutils
          </Navbar.Link>
        </Navbar.Collapse>
      </Navbar>
      <Results />
    </main>
  );
}

export const Anonymous = Object.assign(Layout, {
  displayName: "Anonymous",
});
