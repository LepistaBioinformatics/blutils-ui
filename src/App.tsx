import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Flowbite } from "flowbite-react";
import { Anonymous } from "./pages";
import NotFound from "./pages/404";
import InternalError from "./pages/5xx";
import { lepistaTheme } from "./theme/flowbite-theme";

const HOME = process.env.PUBLIC_URL;

function App() {
  return (
    <Flowbite theme={{ mode: "auto", theme: lepistaTheme }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Anonymous />} />
          <Route path={HOME} index element={<Anonymous />} />

          <Route path={`${HOME}/*`} element={<NotFound />} />
          <Route path={`${HOME}/404`} element={<NotFound />} />
          <Route path={`${HOME}/5xx`} element={<InternalError />} />
        </Routes>
      </BrowserRouter>
    </Flowbite>
  );
}

export default App;
