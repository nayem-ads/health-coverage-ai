import type { CalculatorInputs, MarketplacePlan, ResultsData } from '@/types/calculator';

function fallbackResults(inputs?: Partial<CalculatorInputs>): ResultsData {
  return {
    source: 'fallback',
    zipCode: inputs?.zipCode || '',
    validThrough: new Date().getFullYear(),
    plans: fallbackPlans(),
    coveragePaths: fallbackPlans().slice(0, 3).map((plan, index) => ({
      name: plan.name,
      match: index === 0 ? 'top' : 'alternative',
      reason: `${plan.issuer} ${plan.metalLevel} ${plan.type} option.`,
    })),
    monthlyRange: {
      min: 180,
      max: 450,
      factors: ['Age', 'Location', 'Household size', 'Income level'],
    },
    planFit: {
      recommendation: inputs?.planPreference === 'hmo' ? 'HMO' : inputs?.planPreference === 'ppo' ? 'PPO' : 'Either',
      reasons: [
        'More flexibility in choosing doctors',
        'No referrals needed for specialists',
        'Helpful if you travel or want more provider options',
      ],
    },
  };
}

export async function getMarketplaceResults(inputs: Partial<CalculatorInputs>): Promise<ResultsData> {
  try {
    const response = await fetch('/api/marketplace/results', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(inputs),
    });

    if (!response.ok) throw new Error('Marketplace lookup failed');
    const data = await response.json();
    const plans = (data.plans?.length ? data.plans : fallbackPlans()) as MarketplacePlan[];
    const premiums = plans.map((plan) => plan.premium).filter((premium) => premium > 0).sort((a, b) => a - b);
    const min = premiums[0] ?? 180;
    const max = premiums[Math.min(premiums.length - 1, 6)] ?? 450;

    return {
      source: data.source,
      zipCode: data.zipCode || inputs.zipCode,
      countyName: data.countyName,
      validThrough: data.validThrough,
      plans,
      coveragePaths: plans.slice(0, 7).map((plan, index) => ({
        name: plan.name,
        match: index === 0 ? 'top' : 'alternative',
        reason: `${plan.issuer} ${plan.metalLevel} ${plan.type} option.`,
      })),
      monthlyRange: {
        min,
        max,
        factors: ['Public plan data', data.zipCode || inputs.zipCode || 'ZIP code', 'Household size', 'Birth year and income estimate'],
      },
      planFit: {
        recommendation: inputs.planPreference === 'hmo' ? 'HMO' : inputs.planPreference === 'ppo' ? 'PPO' : 'Either',
        reasons: [
          `Our calculator found ${plans.length} visible plan${plans.length === 1 ? '' : 's'} for your area.`,
          'Compare deductibles, networks, and prescription coverage before making a final choice.',
          'A licensed agent can verify subsidy and enrollment details.',
        ],
      },
    };
  } catch {
    return fallbackResults(inputs);
  }
}

function fallbackPlans(): MarketplacePlan[] {
  return [
    { id: 'fallback-1', issuer: 'Aetna', metalLevel: 'Bronze', name: 'Bronze HMO Saver', premium: 347, deductible: 6000, type: 'HMO' },
    { id: 'fallback-2', issuer: 'Blue Cross', metalLevel: 'Bronze', name: 'Bronze Standard PPO', premium: 396, deductible: 5500, type: 'PPO' },
    { id: 'fallback-3', issuer: 'UnitedHealth', metalLevel: 'Silver', name: 'Silver HMO Value', premium: 470, deductible: 3500, type: 'HMO' },
    { id: 'fallback-4', issuer: 'Blue Cross', metalLevel: 'Silver', name: 'Silver PPO Choice', premium: 495, deductible: 2500, type: 'PPO' },
    { id: 'fallback-5', issuer: 'Kaiser Permanente', metalLevel: 'Gold', name: 'Gold HMO Premier', premium: 594, deductible: 1000, type: 'HMO' },
    { id: 'fallback-6', issuer: 'Cigna', metalLevel: 'Gold', name: 'Gold PPO Advantage', premium: 668, deductible: 750, type: 'PPO' },
    { id: 'fallback-7', issuer: 'UnitedHealth', metalLevel: 'Platinum', name: 'Platinum HMO Elite', premium: 767, deductible: 250, type: 'HMO' },
  ];
}
