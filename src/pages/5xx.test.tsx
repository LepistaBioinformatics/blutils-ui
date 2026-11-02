import { screen } from "@testing-library/react";
import { renderWithRouter } from "@/test-utils";
import InternalError from "./5xx";

describe("InternalError page", () => {
  test("shows the messages, a link to the homepage and the illustration", () => {
    renderWithRouter(<InternalError />, { route: "/5xx" });
    expect(screen.getByText("Oh no!")).toBeInTheDocument();
    expect(screen.getByText("We really messed up this time")).toBeInTheDocument();
    expect(screen.getByText(/Try again later or go back to the/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "homepage" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/undraw.co/undraw_bug_fixing_oc-7-a.svg");
  });

  // BUG-U10: the alt text used to be copy-pasted from the 404 page.
  test("BUG-U10: the illustration alt text describes an internal error", () => {
    renderWithRouter(<InternalError />, { route: "/5xx" });
    expect(screen.getByRole("img")).not.toHaveAttribute("alt", "Page not found");
  });
});
