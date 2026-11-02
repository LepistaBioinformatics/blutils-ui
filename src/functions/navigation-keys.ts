/** Typing in a field must not navigate, as in mdbook's `book.js`. */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

/**
 * Whether a document-level arrow/Enter key may drive the result navigation:
 * not with a modifier, not while typing in a field and not while a dialog
 * (consensus details, rules, taxonomy tree) is open.
 */
export function isNavigationKey(event: KeyboardEvent): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  if (isTypingTarget(event.target)) return false;
  return !document.querySelector('[role="dialog"]');
}
