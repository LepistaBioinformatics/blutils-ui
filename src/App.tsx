import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Anonymous } from "./pages";
import NotFound from "./pages/404";
import InternalError from "./pages/5xx";

const HOME = process.env.PUBLIC_URL;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Anonymous />} />
        <Route path={HOME} index element={<Anonymous />} />

        <Route path={`${HOME}/*`} element={<NotFound />} />
        <Route path={`${HOME}/404`} element={<NotFound />} />
        <Route path={`${HOME}/5xx`} element={<InternalError />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
