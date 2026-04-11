import '@testing-library/jest-dom/vitest';

class ResizeObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
}

if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserver;
}

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
}
