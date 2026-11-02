type Callback = IntersectionObserverCallback;

export class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  readonly observed = new Set<Element>();

  constructor(private readonly callback: Callback) {
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(isIntersecting: boolean) {
    const entries = Array.from(this.observed).map(
      (target) => ({ isIntersecting, target } as IntersectionObserverEntry)
    );
    this.callback(entries, this);
  }
}

/**
 * Fires an intersection change on every observer that is watching at least one
 * element (callbacks destructure the first entry). Wrap calls in `act()`.
 */
export function triggerIntersection(isIntersecting: boolean) {
  MockIntersectionObserver.instances
    .filter((observer) => observer.observed.size > 0)
    .forEach((observer) => observer.trigger(isIntersecting));
}
