import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyToClipboard } from "./CopyToClipBoard";

describe("CopyToClipboard", () => {
  test("clicking the icon writes the text to the clipboard", () => {
    const { container } = render(<CopyToClipboard text="NR000001.1 NR000002.1" />);
    userEvent.click(container.querySelector("svg")!);
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "NR000001.1 NR000002.1"
    );
  });

  test("appends the given className", () => {
    const { container } = render(<CopyToClipboard text="x" className="ml-2" />);
    expect(container.querySelector("svg")!.getAttribute("class")).toBe(
      "inline invisible group-hover:visible hover:cursor-pointer ml-2"
    );
  });

  test("without className the class list ends with the literal 'undefined'", () => {
    const { container } = render(<CopyToClipboard text="x" />);
    expect(container.querySelector("svg")!.getAttribute("class")).toBe(
      "inline invisible group-hover:visible hover:cursor-pointer undefined"
    );
  });
});
