import { act, render, renderHook, screen } from "@testing-library/react";
import { MockIntersectionObserver } from "@/test-utils";
import { useElementInView } from "./use-element-in-view";

function Probe({ options }: { options?: IntersectionObserverInit }) {
  const { ref, inView } = useElementInView(options);
  return (
    <div ref={ref} data-testid="target">
      {String(inView)}
    </div>
  );
}

function lastObserver() {
  return MockIntersectionObserver.instances[
    MockIntersectionObserver.instances.length - 1
  ];
}

describe("useElementInView", () => {
  test("inView starts as false", () => {
    const { result } = renderHook(() => useElementInView());
    expect(result.current.inView).toBe(false);
  });

  test("does not observe anything when ref.current is not attached", () => {
    renderHook(() => useElementInView());
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(lastObserver().observed.size).toBe(0);
  });

  test("observes the element attached to the ref", () => {
    render(<Probe />);
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(lastObserver().observed.has(screen.getByTestId("target"))).toBe(
      true
    );
  });

  test("inView follows the intersection state", () => {
    render(<Probe />);
    expect(screen.getByTestId("target")).toHaveTextContent("false");

    act(() => lastObserver().trigger(true));
    expect(screen.getByTestId("target")).toHaveTextContent("true");

    act(() => lastObserver().trigger(false));
    expect(screen.getByTestId("target")).toHaveTextContent("false");
  });

  test("passes options to the IntersectionObserver constructor", () => {
    const spy = jest.fn(
      (callback: IntersectionObserverCallback) =>
        new MockIntersectionObserver(callback)
    );
    window.IntersectionObserver = spy as unknown as typeof IntersectionObserver;
    const options = { rootMargin: "10px" };
    render(<Probe options={options} />);
    expect(spy).toHaveBeenCalledWith(expect.any(Function), options);
  });

  test("BUG-U15: unmount unobserves the element", () => {
    // BUG-U15: React 18 detaches host refs before passive-effect cleanups run
    // on unmount; reading ref.current in the cleanup skipped `unobserve`.
    const { unmount } = render(<Probe />);
    const observer = lastObserver();
    const target = screen.getByTestId("target");

    unmount();

    expect(observer.observed.has(target)).toBe(false);
  });

  test("stable options keep a single observer across rerenders", () => {
    const options = { threshold: 0.5 };
    const { rerender } = render(<Probe options={options} />);
    rerender(<Probe options={options} />);
    rerender(<Probe />);
    rerender(<Probe />);
    // options changed once (object -> undefined), then stayed undefined
    expect(MockIntersectionObserver.instances).toHaveLength(2);
  });

  // BUG-U13: deps `[options]` used to compare by reference.
  test("BUG-U13: structurally equal options do not recreate the observer", () => {
    const { rerender } = render(<Probe options={{ threshold: 0.5 }} />);
    rerender(<Probe options={{ threshold: 0.5 }} />);
    rerender(<Probe options={{ threshold: 0.5 }} />);
    expect(MockIntersectionObserver.instances).toHaveLength(1);
  });
});
