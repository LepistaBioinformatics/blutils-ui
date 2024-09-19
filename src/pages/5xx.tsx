import { Link } from "react-router-dom";

export default function InternalError() {
  return (
    <div className="mx-auto w-full h-screen flex flex-col align-middle justify-center items-center gap-12">
      <div className="uppercase text-center">
        <p className="text-5xl mb-5">Oh no!</p>
        <p className="text-3xl mb-5">We really messed up this time</p>
        <p className="text-3xl">
          Try again later or go back to the
          &nbsp;
          <Link
            className="border rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            to={process.env.PUBLIC_URL}>
            homepage
          </Link>
        </p>
      </div>
      <img
        src={process.env.PUBLIC_URL + "/undraw.co/undraw_bug_fixing_oc-7-a.svg"}
        alt="Page not found"
        height={400}
        width={400}
      />
    </div>
  );
}