import "./App.css";
import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Flowbite } from "flowbite-react";
import { Shell } from "./components/Shell";
import { Anonymous } from "./pages";
import NotFound from "./pages/404";
import InternalError from "./pages/5xx";
import { lepistaTheme } from "./theme/flowbite-theme";

// The Markdown rendering stack only loads when the docs route is visited,
// keeping the result explorer bundle lean.
const Docs = lazy(() =>
  import("./pages/docs").then((module) => ({ default: module.Docs }))
);

const HOME = process.env.PUBLIC_URL;

function App() {
  return (
    <Flowbite theme={{ mode: "auto", theme: lepistaTheme }}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Anonymous />} />
            <Route path={HOME} index element={<Anonymous />} />
            <Route path={`${HOME}/docs`} element={<Docs />} />
            <Route path={`${HOME}/docs/:page`} element={<Docs />} />
          </Route>

          <Route path={`${HOME}/404`} element={<NotFound />} />
          <Route path={`${HOME}/5xx`} element={<InternalError />} />
          <Route path={`${HOME}/*`} element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </Flowbite>
  );
}

export default App;
