import { screen } from "@testing-library/react";
import { renderWithRouter } from "@/test-utils";
import NotFound from "./404";

describe("NotFound page", () => {
  test("shows the message, a link to the homepage and the illustration", () => {
    renderWithRouter(<NotFound />, { route: "/nope" });
    expect(screen.getByText("Page not found", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(/Go back to the/)).toBeInTheDocument();
    // PUBLIC_URL is "" under test; `to=""` outside a <Route> resolves to "/"
    expect(screen.getByRole("link", { name: "homepage" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Page not found");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/undraw.co/undraw_page_not_found_re_e9o6.svg");
  });
});
