import {
  DEFAULT_DOC_SLUG,
  DOC_PAGES,
  DOCS_RAW_BASE,
  getDocPage,
  resolveDocAsset,
  slugForDocLink,
} from "./docs-config";

describe("getDocPage", () => {
  test("no slug returns the default (overview) page", () => {
    expect(DEFAULT_DOC_SLUG).toBe("overview");
    expect(getDocPage()).toEqual({
      slug: "overview",
      file: "README.md",
      title: "Overview",
    });
  });

  test("known slug returns its page", () => {
    expect(getDocPage("run-blast")).toBe(
      DOC_PAGES.find((p) => p.slug === "run-blast")
    );
    expect(getDocPage("run-blast")?.file).toBe(
      "02_run_blast_and_generate_consensus_identities.md"
    );
  });

  test("unknown slug returns undefined", () => {
    expect(getDocPage("nope")).toBeUndefined();
  });
});

describe("resolveDocAsset", () => {
  test.each([undefined, ""])("%p is returned unchanged", (src) => {
    expect(resolveDocAsset(src)).toBe(src);
  });

  test.each([
    "http://example.com/a.png",
    "https://example.com/a.png",
    "HTTPS://EXAMPLE.COM/a.png",
    "data:image/png;base64,AAAA",
    "DATA:image/png;base64,AAAA",
    "mailto:someone@example.com",
    "MailTo:someone@example.com",
  ])("absolute reference %p is returned unchanged", (src) => {
    expect(resolveDocAsset(src)).toBe(src);
  });

  test.each(["./images/x.png", "/images/x.png", "images/x.png"])(
    "relative reference %p resolves against DOCS_RAW_BASE",
    (src) => {
      expect(resolveDocAsset(src)).toBe(DOCS_RAW_BASE + "images/x.png");
    }
  );

  test("DOCS_RAW_BASE points at the blutils docs/book on main", () => {
    expect(DOCS_RAW_BASE).toBe(
      "https://raw.githubusercontent.com/LepistaBioinformatics/blutils/main/docs/book/"
    );
  });
});

describe("slugForDocLink", () => {
  test.each([
    ["./02_run_blast_and_generate_consensus_identities.md#sec", "run-blast"],
    ["README.md?x", "overview"],
    ["/01_create_blutils_database.md", "create-database"],
    ["03_blutils_online_viewer.md", "online-viewer"],
  ])("%p -> %p", (href, slug) => {
    expect(slugForDocLink(href)).toBe(slug);
  });

  test.each([
    undefined,
    "",
    "https://github.com/LepistaBioinformatics/blutils",
    "#section",
    "unknown.md",
  ])("%p -> undefined", (href) => {
    expect(slugForDocLink(href)).toBeUndefined();
  });
});
