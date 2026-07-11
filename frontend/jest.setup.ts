import '@testing-library/jest-dom';

// jsdom does not implement scrollIntoView; stub it for components that call it.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}
