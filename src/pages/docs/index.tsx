import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Spinner } from "flowbite-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  DEFAULT_DOC_SLUG,
  DOCS_RAW_BASE,
  DOC_PAGES,
  getDocPage,
  resolveDocAsset,
  slugForDocLink,
} from "./docs-config";

const HOME = process.env.PUBLIC_URL;
const docPath = (slug: string) => `${HOME}/docs/${slug}`;

// Render Markdown images/links against the public repo: relative images point
// back to docs/book, and in-book links navigate inside the viewer.
const markdownComponents: Components = {
  img: ({ node, src, alt, ...props }) => (
    <img src={resolveDocAsset(src as string)} alt={alt ?? ""} loading="lazy" {...props} />
  ),
  a: ({ node, href, children, ...props }) => {
    const internalSlug = slugForDocLink(href);
    if (internalSlug) {
      return <Link to={docPath(internalSlug)}>{children}</Link>;
    }
    const isExternal = !!href && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
        {...props}
      >
        {children}
      </a>
    );
  },
};

export function Docs() {
  const { page } = useParams<{ page: string }>();
  const slug = page ?? DEFAULT_DOC_SLUG;
  const doc = getDocPage(slug);

  const [content, setContent] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  useEffect(() => {
    if (!doc) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    fetch(`${DOCS_RAW_BASE}${doc.file}`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((text) => {
        if (cancelled) return;
        setContent(text);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [doc]);

  // Scroll back to the top whenever the page changes.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row">
      <aside className="shrink-0 md:w-64">
        <nav className="md:sticky md:top-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-science-700 dark:text-science-400">
            Documentation
          </p>
          <ul className="flex flex-col gap-1">
            {DOC_PAGES.map((item) => {
              const active = item.slug === slug;
              return (
                <li key={item.slug}>
                  <Link
                    to={docPath(item.slug)}
                    aria-current={active ? "page" : undefined}
                    className={
                      "block rounded-md border-l-2 px-3 py-2 text-sm transition-colors " +
                      (active
                        ? "border-science-400 bg-science-50 font-medium text-ink dark:bg-science-900/30 dark:text-gray-100"
                        : "border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800")
                    }
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <article className="min-w-0 grow">
        {status === "loading" && (
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <Spinner /> Loading documentation…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-lg border border-gray-200 bg-surface p-6 dark:border-gray-700 dark:bg-surface-dark">
            <h2 className="mb-2 text-lg font-semibold">
              This page couldn't be loaded
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The documentation is fetched from the public Blutils repository.
              Check your connection and try again, or browse it on{" "}
              <a
                href="https://github.com/LepistaBioinformatics/blutils/tree/main/docs/book"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                GitHub
              </a>
              .
            </p>
          </div>
        )}

        {status === "ready" && (
          <div className="prose prose-slate max-w-none dark:prose-invert prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-brand-400 prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg prose-img:border prose-img:border-gray-200 dark:prose-img:border-gray-700">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </article>
    </div>
  );
}
