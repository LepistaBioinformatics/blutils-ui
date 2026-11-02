import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WrapCharacterControl } from "./WrapCharacterControl";

// Zymo-like read names: "<run>.<read>_size_<n>"
const ZYMO_LIKE = [
  "SRR20752596.1_size_54",
  "SRR20752596.2_size_12",
  "SRR20752596.3_size_7",
  "SRR20752597.1_size_33",
  "SRR20752597.2_size_3",
];

function renderControl(value: string | undefined, queries = ZYMO_LIKE) {
  const onChange = jest.fn();
  const utils = render(<WrapCharacterControl value={value} onChange={onChange} queries={queries} />);
  return { ...utils, onChange };
}

// Owns the value like Results does.
function Stateful({ queries = ZYMO_LIKE }: { queries?: string[] }) {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <>
      <WrapCharacterControl value={value} onChange={setValue} queries={queries} />
      <output data-testid="value">{value === undefined ? "<none>" : value}</output>
    </>
  );
}

function input() {
  return screen.getByLabelText("Wrap character") as HTMLInputElement;
}

function suggestions() {
  return screen
    .queryAllByRole("button", { name: /as wrap character/ })
    .map((b) => b.getAttribute("aria-label"));
}

function current() {
  return screen.getByTestId("value").textContent;
}

describe("WrapCharacterControl", () => {
  test("labels the input 'Wrap' and explains it", () => {
    renderControl(undefined);
    expect(input()).toHaveValue("");
    expect(input()).toHaveAttribute("title", expect.stringContaining("SRR20752596"));
  });

  test("suggests '.' for zymo-like read names, with its group count", () => {
    renderControl(undefined);
    expect(screen.getByText("Suggested")).toBeInTheDocument();
    // "." groups by run (2 groups); "_" keeps every read apart, so it is not offered
    expect(suggestions()).toEqual(['Use "." as wrap character (2 groups)']);
    expect(screen.getByRole("button", { name: /"\."/ })).toHaveTextContent(".2 groups");
  });

  test("explains its purpose and previews the grouping on a real query", () => {
    renderControl(undefined);
    expect(screen.getByText("Group by prefix")).toBeInTheDocument();
    expect(screen.getByLabelText("Wrap character")).toBeInTheDocument();
    // Before a choice, the preview uses the best suggestion.
    const preview = screen.getByTestId("wrap-preview");
    const [before, after] = within(preview).getAllByRole("definition").map((d) => d.textContent);
    expect(within(preview).getAllByRole("term").map((t) => t.textContent)).toEqual(["Before", "After"]);
    expect(before).toMatch(/^SRR\d+\.\d+_size_\d+$/);
    expect(after).toMatch(/^SRR\d+$/);
  });

  test("the preview follows the chosen character", () => {
    renderControl("_");
    const after = within(screen.getByTestId("wrap-preview")).getAllByRole("definition")[1];
    expect(after.textContent).toMatch(/^SRR\d+\.\d+$/);
  });

  test("orders several suggestions by fewest groups", () => {
    renderControl(undefined, ["A_1.x", "A_2.x", "B_1.y", "B_1.z"]);
    expect(suggestions()).toEqual([
      'Use "_" as wrap character (2 groups)',
      'Use "." as wrap character (3 groups)',
    ]);
  });

  test("a space suggestion is labelled 'space'", () => {
    renderControl(undefined, ["A x", "A y", "B z"]);
    expect(screen.getByRole("button", { name: 'Use " " as wrap character (2 groups)' })).toHaveTextContent(
      /^space/
    );
  });

  test("no suggestions without a separator that groups the queries", () => {
    renderControl(undefined, ["single"]);
    expect(screen.queryByText("Suggested")).not.toBeInTheDocument();
    expect(suggestions()).toEqual([]);
  });

  test("clicking a suggestion applies it; clicking it again removes it", () => {
    render(<Stateful />);
    const dot = () => screen.getByRole("button", { name: 'Use "." as wrap character (2 groups)' });
    expect(dot()).toHaveAttribute("aria-pressed", "false");

    userEvent.click(dot());
    expect(current()).toBe(".");
    expect(dot()).toHaveAttribute("aria-pressed", "true");
    expect(input()).toHaveValue(".");

    userEvent.click(dot());
    expect(current()).toBe("<none>");
    expect(dot()).toHaveAttribute("aria-pressed", "false");
    expect(input()).toHaveValue("");
  });

  test("Enter applies a custom character", () => {
    const { onChange } = renderControl(undefined);
    userEvent.type(input(), "_{enter}");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("_");
  });

  test("typing alone does not apply the character", () => {
    const { onChange } = renderControl(undefined);
    userEvent.type(input(), "_");
    expect(onChange).not.toHaveBeenCalled();
  });

  test("Enter on an empty input clears the character", () => {
    const { onChange } = renderControl(".");
    userEvent.clear(input());
    userEvent.type(input(), "{enter}");
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  test("'Clear wrap character' shows only when a character is set and clears it", () => {
    render(<Stateful />);
    expect(screen.queryByRole("button", { name: "Clear wrap character" })).not.toBeInTheDocument();
    userEvent.type(input(), "_{enter}");
    expect(current()).toBe("_");

    userEvent.click(screen.getByRole("button", { name: "Clear wrap character" }));
    expect(current()).toBe("<none>");
    expect(input()).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear wrap character" })).not.toBeInTheDocument();
  });

  test("the input follows the value prop", () => {
    const { rerender, onChange } = renderControl(undefined);
    rerender(<WrapCharacterControl value="." onChange={onChange} queries={ZYMO_LIKE} />);
    expect(input()).toHaveValue(".");
    rerender(<WrapCharacterControl value={undefined} onChange={onChange} queries={ZYMO_LIKE} />);
    expect(input()).toHaveValue("");
  });

  test("two copies get distinct input ids", () => {
    render(
      <>
        <WrapCharacterControl value={undefined} onChange={jest.fn()} queries={ZYMO_LIKE} />
        <WrapCharacterControl value={undefined} onChange={jest.fn()} queries={ZYMO_LIKE} />
      </>
    );
    const [a, b] = screen.getAllByLabelText("Wrap character");
    expect(a.id).not.toBe(b.id);
  });
});
