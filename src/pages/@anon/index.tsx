import { Results } from "./Results";
import { Navbar } from "flowbite-react";

function Layout() {
  return (
    <main className="dark:bg-gray-900">
      <Navbar />
      <Results />
    </main>
  );
}

export const Anonymous = Object.assign(Layout, {
  displayName: "Anonymous",
});
