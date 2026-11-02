// jsdom has no layout; setupTests.ts uses these sizes to fake one for
// @tanstack/react-virtual (scroll containers and measured `data-index` items).
export const TEST_VIEWPORT = { width: 1200, height: 800 };
export const TEST_ROW_HEIGHT = 40;
