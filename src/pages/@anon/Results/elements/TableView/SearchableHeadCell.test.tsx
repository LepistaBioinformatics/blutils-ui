import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table } from "flowbite-react";
import { SearchableHeadCell } from "./SearchableHeadCell";

// Table.HeadCell requires flowbite's Table/Table.Head context, which also
// provides the <table><thead><tr> wrapper.
function renderCell(handleSearch: jest.Mock, placeholder?: string) {
  return render(
    <Table>
      <Table.Head>
        <SearchableHeadCell handleSearch={handleSearch} placeholder={placeholder}>
          Query
        </SearchableHeadCell>
      </Table.Head>
    </Table>
  );
}

function openSearch() {
  userEvent.click(screen.getByText("Query"));
  return screen.getByPlaceholderText("Search...") as HTMLInputElement;
}

function clearIcon(container: HTMLElement) {
  const svgs = container.querySelectorAll("th svg");
  // FaFilter is always first; FaTimesCircle is the last svg when present
  return svgs.length > 1 ? (svgs[svgs.length - 1] as SVGElement) : null;
}

describe("SearchableHeadCell", () => {
  test("renders a <th> with the children and no input", () => {
    renderCell(jest.fn());
    expect(screen.getByRole("columnheader")).toHaveTextContent("Query");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("clicking the header shows a focused input with the default placeholder", () => {
    renderCell(jest.fn());
    const input = openSearch();
    expect(input).toHaveFocus();
    expect(screen.queryByText("Query")).not.toBeInTheDocument();
  });

  test("uses a custom placeholder when given", () => {
    renderCell(jest.fn(), "Find subject");
    userEvent.click(screen.getByText("Query"));
    expect(screen.getByPlaceholderText("Find subject")).toBeInTheDocument();
  });

  test("typing calls handleSearch with the trimmed term on every keystroke", async () => {
    const handleSearch = jest.fn();
    renderCell(handleSearch);
    userEvent.type(openSearch(), " ab ");
    await waitFor(() => expect(handleSearch).toHaveBeenCalledTimes(4));
    expect(handleSearch.mock.calls.map(([term]) => term)).toEqual([
      undefined, // BUG-U04: a whitespace-only term is no filter
      "a",
      "ab",
      "ab",
    ]);
  });

  test("clearing the input calls handleSearch(undefined)", async () => {
    const handleSearch = jest.fn();
    renderCell(handleSearch);
    const input = openSearch();
    userEvent.type(input, "x");
    userEvent.clear(input);
    await waitFor(() => expect(handleSearch).toHaveBeenLastCalledWith(undefined));
  });

  // BUG-U04: `term === ""` used to be checked before trimming, emitting "".
  test("BUG-U04: whitespace-only term emits undefined", async () => {
    const handleSearch = jest.fn();
    renderCell(handleSearch);
    userEvent.type(openSearch(), "   ");
    await waitFor(() => expect(handleSearch).toHaveBeenCalledTimes(3));
    expect(handleSearch).toHaveBeenLastCalledWith(undefined);
  });

  test("blur hides the input and shows the term as a badge with a clear icon", async () => {
    const handleSearch = jest.fn();
    const { container } = renderCell(handleSearch);
    const input = openSearch();
    userEvent.type(input, "bac");
    await waitFor(() => expect(handleSearch).toHaveBeenLastCalledWith("bac"));

    fireEvent.blur(input);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader")).toHaveTextContent("Querybac");
    expect(clearIcon(container)).not.toBeNull();
  });

  test("without a term there is no badge and no clear icon", () => {
    const { container } = renderCell(jest.fn());
    fireEvent.blur(openSearch());
    expect(screen.getByRole("columnheader")).toHaveTextContent(/^Query$/);
    expect(clearIcon(container)).toBeNull();
  });

  test("BUG-U16: clear icon calls handleSearch(undefined), removes the badge and keeps the input closed", async () => {
    const handleSearch = jest.fn();
    const { container } = renderCell(handleSearch);
    const input = openSearch();
    userEvent.type(input, "bac");
    await waitFor(() => expect(handleSearch).toHaveBeenLastCalledWith("bac"));
    fireEvent.blur(input);
    handleSearch.mockClear();

    userEvent.click(clearIcon(container)!);

    await waitFor(() => expect(handleSearch).toHaveBeenCalledWith(undefined));
    expect(clearIcon(container)).toBeNull();
    // BUG-U16: the click used to bubble to the header's onClick and reopen the search
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader")).toHaveTextContent(/^Query$/);
  });
});
