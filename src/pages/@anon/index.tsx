import { Results } from "./Results";

// Page content for the result explorer. The navbar, footer and theming live in
// the shared <Shell> layout (src/components/Shell.tsx).
function Layout() {
  return <Results />;
}

export const Anonymous = Object.assign(Layout, {
  displayName: "Anonymous",
});
