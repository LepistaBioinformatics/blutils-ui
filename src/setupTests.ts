// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';
import { TEST_ROW_HEIGHT, TEST_VIEWPORT } from './test-utils/virtual';

// jsdom 16 does not expose TextEncoder/TextDecoder, which react-router v7
// needs at import time.
Object.assign(globalThis, { TextEncoder, TextDecoder });

// jsdom 16 lacks the browser APIs below. CRA runs Jest with `resetMocks: true`,
// so mock implementations are (re)installed before every test.

// jsdom 16 does not implement Blob.prototype.text (used by File uploads).
if (!Blob.prototype.text) {
  Blob.prototype.text = function text(this: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

// jsdom has no layout: every element measures 0, so @tanstack/react-virtual
// would render no rows. Give scroll containers a viewport and give measured
// virtual items (`data-index`) a fixed row height, so windowing really happens.
Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  get() {
    return TEST_VIEWPORT.height;
  },
});
Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  get() {
    return TEST_VIEWPORT.width;
  },
});

// @tanstack/virtual-core measures items with `offsetHeight` when no
// ResizeObserver entry is available (always the case in jsdom).
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get(this: HTMLElement) {
    return this.hasAttribute('data-index') ? TEST_ROW_HEIGHT : 0;
  },
});

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  });

  window.scrollTo = jest.fn();
});
