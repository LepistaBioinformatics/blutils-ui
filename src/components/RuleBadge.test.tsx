import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BeanSelectionRules } from "@/types/BeanSelectionRules";
import { RuleBadge } from "./RuleBadge";

const WORDS: [BeanSelectionRules.RuleKind, string][] = [
  ["unanimous", "Unanimous"],
  ["majority", "Majority"],
  ["ambiguous", "Ambiguous"],
  ["unresolved", "Unresolved"],
];

describe("RuleBadge", () => {
  test.each(WORDS)("%s reads as one word: %s", (kind, word) => {
    render(<RuleBadge rule={kind} />);
    const button = screen.getByRole("button", { name: `Rule: ${word}. Show how rules work` });
    expect(button).toHaveTextContent(new RegExp(`^${word}$`));
    expect(button).toHaveAttribute("title", BeanSelectionRules.RULE_INFO[kind].summary);
  });

  test("no modal is open until the word is clicked", () => {
    render(<RuleBadge rule="majority" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test.each(WORDS)(
    "clicking %s opens the rules modal with every rule and the current one highlighted",
    (kind, word) => {
      render(<RuleBadge rule={kind} />);
      userEvent.click(screen.getByRole("button", { name: /^Rule:/ }));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveTextContent("How the proposed taxon is chosen");
      const items = within(dialog).getAllByRole("listitem");
      expect(items.map((li) => li.querySelector("span")!.textContent)).toEqual([
        "Unanimous",
        "Majority",
        "Ambiguous",
        "Unresolved",
      ]);
      const current = items.filter((li) => li.getAttribute("aria-current") === "true");
      expect(current).toHaveLength(1);
      expect(current[0]).toHaveTextContent(word);
      expect(current[0]).toHaveTextContent(BeanSelectionRules.RULE_INFO[kind].explanation);
    }
  );

  test("the Close button dismisses the modal", async () => {
    render(<RuleBadge rule="unanimous" />);
    userEvent.click(screen.getByRole("button", { name: /^Rule:/ }));
    userEvent.click(within(screen.getByRole("dialog")).getByLabelText("Close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("Escape dismisses the modal", async () => {
    render(<RuleBadge rule="unanimous" />);
    userEvent.click(screen.getByRole("button", { name: /^Rule:/ }));
    userEvent.keyboard("{esc}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
