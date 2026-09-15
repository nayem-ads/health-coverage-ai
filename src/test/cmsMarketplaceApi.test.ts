import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMarketplaceResults } from "../lib/cmsMarketplaceApi";

describe("CMS Marketplace API Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return formatted marketplace results when API succeeds", async () => {
    const mockApiResponse = {
      source: "cms-marketplace",
      zipCode: "33101",
      countyName: "Miami-Dade County",
      validThrough: 2025,
      plans: [
        { id: "cms-1", issuer: "Ambetter", name: "Ambetter Essential Care", metalLevel: "Bronze", type: "HMO", premium: 285, deductible: 7000 },
        { id: "cms-2", issuer: "Florida Blue", name: "BlueSelect Silver", metalLevel: "Silver", type: "PPO", premium: 395, deductible: 3500 },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const results = await getMarketplaceResults({
      zipCode: "33101",
      householdSize: 2,
      planPreference: "ppo",
    });

    expect(results.source).toBe("cms-marketplace");
    expect(results.zipCode).toBe("33101");
    expect(results.countyName).toBe("Miami-Dade County");
    expect(results.plans).toHaveLength(2);
    expect(results.monthlyRange.min).toBe(285);
    expect(results.monthlyRange.max).toBe(395);
    expect(results.planFit.recommendation).toBe("PPO");
  });

  it("should gracefully return fallback plans if fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection failed"));

    const results = await getMarketplaceResults({
      zipCode: "90210",
      planPreference: "hmo",
    });

    expect(results.source).toBe("fallback");
    expect(results.plans && results.plans.length).toBeGreaterThan(0);
    expect(results.monthlyRange.min).toBe(180);
    expect(results.planFit.recommendation).toBe("HMO");
  });
});
