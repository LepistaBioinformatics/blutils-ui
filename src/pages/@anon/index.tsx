import { Results } from "./Results";
import { Navbar } from "flowbite-react";

function Layout() {
  return (
    <main>
      <Navbar fluid rounded>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Navbar.Link
            href="https://github.com/LepistaBioinformatics/blutils"
            active
          >
            Github
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
