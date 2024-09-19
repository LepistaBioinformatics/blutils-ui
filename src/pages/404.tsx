import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto w-full h-screen flex flex-col align-middle justify-center items-center gap-12">
      <div className="uppercase text-center">
        <p className="text-5xl mb-5">Page not found</p>
        <p className="text-3xl">
          Go back to the
          &nbsp;
          <Link
            className="border rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            to={process.env.PUBLIC_URL}>
            homepage
          </Link>
        </p>
      </div>
      <img
        src={process.env.PUBLIC_URL + "/undraw.co/undraw_page_not_found_re_e9o6.svg"}
        alt="Page not found"
        height={400}
        width={400}
      />
    </div>
  );
}