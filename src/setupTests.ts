// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';
import { MockIntersectionObserver } from './test-utils/intersection-observer';

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

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  window.IntersectionObserver = MockIntersectionObserver;

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  });

  window.scrollTo = jest.fn();
});
