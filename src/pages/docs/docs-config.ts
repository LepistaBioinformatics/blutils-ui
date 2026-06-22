// The Blutils documentation lives as Markdown in the public engine repo
// (LepistaBioinformatics/blutils) under docs/book. It is fetched at runtime and
// rendered with react-markdown, so the viewer always reflects the published
// docs. Pin DOCS_REPO_REF to a tag instead of "main" to freeze a version.
export const DOCS_REPO_REF = "main";

export const DOCS_RAW_BASE = `https://raw.githubusercontent.com/LepistaBioinformatics/blutils/${DOCS_REPO_REF}/docs/book/`;

export interface DocPage {
  /** URL segment under /docs */
  slug: string;
  /** Markdown file name in docs/book */
  file: string;
  /** Label shown in the sidebar */
  title: string;
}

// Ordered table of contents — mirrors the numbered files in docs/book.
export const DOC_PAGES: DocPage[] = [
  { slug: "overview", file: "README.md", title: "Overview" },
  {
    slug: "create-database",
    file: "01_create_blutils_database.md",
    title: "Create the database",
  },
  {
    slug: "run-blast",
    file: "02_run_blast_and_generate_consensus_identities.md",
    title: "Run BLAST & consensus",
  },
  {
    slug: "online-viewer",
    file: "03_blutils_online_viewer.md",
    title: "Online viewer",
  },
];

export const DEFAULT_DOC_SLUG = DOC_PAGES[0].slug;

const FILE_TO_SLUG: Record<string, string> = Object.fromEntries(
  DOC_PAGES.map((page) => [page.file, page.slug])
);

export function getDocPage(slug?: string): DocPage | undefined {
  return DOC_PAGES.find((page) => page.slug === (slug ?? DEFAULT_DOC_SLUG));
}

/**
 * Resolve a relative asset reference (e.g. `./images/x.png`) from a doc against
 * the raw docs base so images load from the public repo.
 */
export function resolveDocAsset(src?: string): string | undefined {
  if (!src) return src;
  if (/^(https?:|data:|mailto:)/i.test(src)) return src;
  return DOCS_RAW_BASE + src.replace(/^\.?\//, "");
}

/**
 * Map an in-repo Markdown link (e.g. `./02_run_...md`) to the matching docs
 * slug, so internal links navigate within the viewer. Returns undefined for
 * links that are not part of the book.
 */
export function slugForDocLink(href?: string): string | undefined {
  if (!href) return undefined;
  const file = href.replace(/^\.?\//, "").split(/[#?]/)[0];
  return FILE_TO_SLUG[file];
}
