import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Object.defineProperty(globalThis, "scrollTo", {
  value: vi.fn(),
  writable: true
});
