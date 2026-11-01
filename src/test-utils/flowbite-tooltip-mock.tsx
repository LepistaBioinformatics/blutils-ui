import type { ReactNode } from "react";

/**
 * Module factory for `flowbite-react` that keeps every real export but renders
 * `Tooltip` inline. Real tooltips make floating-ui position on every update
 * (~2 s per test with many rows), so integration tests use this instead:
 *
 *   jest.mock("flowbite-react", () =>
 *     require("@/test-utils/flowbite-tooltip-mock").withInlineTooltip()
 *   );
 *
 * `require` is used inside the factory because babel-jest hoists `jest.mock`
 * above the imports.
 */
export function withInlineTooltip() {
  const actual = jest.requireActual("flowbite-react");
  return {
    ...actual,
    Tooltip: ({ children, content }: { children: ReactNode; content: ReactNode }) => (
      <>
        <div data-testid="flowbite-tooltip-target">{children}</div>
        <div data-testid="flowbite-tooltip">{content}</div>
      </>
    ),
  };
}
