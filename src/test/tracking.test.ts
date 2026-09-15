import { describe, it, expect, beforeEach } from "vitest";
import { trackEvent } from "../lib/tracking";

describe("Google Tag Manager dataLayer Tracking", () => {
  beforeEach(() => {
    // Reset window.dataLayer before each test
    window.dataLayer = [];
  });

  it("should push events to window.dataLayer correctly using trackEvent utility", () => {
    trackEvent("test_event", { key: "value" });

    expect(window.dataLayer).toBeDefined();
    expect(window.dataLayer?.length).toBe(1);
    expect(window.dataLayer?.[0]).toEqual({
      event: "test_event",
      key: "value",
    });
  });

  it("should initialize window.dataLayer if not defined", () => {
    // Force undefine window.dataLayer
    delete (window as any).dataLayer;

    trackEvent("init_event", { step: 1 });

    expect(window.dataLayer).toBeDefined();
    expect(window.dataLayer?.length).toBe(1);
    expect(window.dataLayer?.[0]).toEqual({
      event: "init_event",
      step: 1,
    });
  });
});
