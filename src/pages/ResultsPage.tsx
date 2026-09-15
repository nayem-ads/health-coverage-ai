import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Info,
  MapPin,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { useCalculatorStore } from '@/stores/calculatorStore';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/tracking';
import type { AgentProfile, MarketplacePlan } from '@/types/calculator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const agents: AgentProfile[] = [
  {
    id: 'michael-thompson',
    name: 'Michael Thompson',
    rating: 5,
    reviews: 124,
    photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'david-rodriguez',
    name: 'David Rodriguez',
    rating: 4.9,
    reviews: 89,
    photoUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'sarah-jenkins',
    name: 'Sarah Jenkins',
    rating: 4.9,
    reviews: 156,
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'james-wilson',
    name: 'James Wilson',
    rating: 4.8,
    reviews: 201,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'emily-davis',
    name: 'Emily Davis',
    rating: 5.0,
    reviews: 112,
    photoUrl: '/images/agents/emily_davis.png',
  },
  {
    id: 'marcus-johnson',
    name: 'Marcus Johnson',
    rating: 4.9,
    reviews: 94,
    photoUrl: '/images/agents/marcus_johnson.png',
  },
  {
    id: 'sophia-garcia',
    name: 'Sophia Garcia',
    rating: 4.9,
    reviews: 143,
    photoUrl: '/images/agents/sophia_garcia.png',
  },
  {
    id: 'william-chen',
    name: 'William Chen',
    rating: 4.8,
    reviews: 87,
    photoUrl: '/images/agents/william_chen.png',
  },
  {
    id: 'olivia-taylor',
    name: 'Olivia Taylor',
    rating: 5.0,
    reviews: 106,
    photoUrl: '/images/agents/olivia_taylor.png',
  },
];

export default function ResultsPage() {
  const navigate = useNavigate();
  const { runId } = useParams();
  const { results, isUnlocked, inputs } = useCalculatorStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState<'bottom' | 'top'>('bottom');
  const [isDismissed, setIsDismissed] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);

  const plans = results?.plans?.slice(0, 7) ?? [];
  const zipCode = results?.zipCode || inputs.zipCode || 'your area';
  const validThrough = results?.validThrough || new Date().getFullYear();

  useEffect(() => {
    if (!isUnlocked || !results) {
      navigate(`/unlock/${runId}`);
      return;
    }

    const timer = window.setTimeout(() => setIsLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, [isUnlocked, navigate, results, runId]);

  useEffect(() => {
    if (isLoading || !results || !runId) return;

    // Check session storage to prevent duplicate firing on page refreshes or re-renders
    const storageKey = `fb_lead_tracked_${runId}`;
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(storageKey)) {
      return;
    }

    const win = window as unknown as { 
      fbq?: (
        action: string, 
        eventName: string, 
        options?: Record<string, unknown>, 
        customData?: { eventID?: string }
      ) => void 
    };

    if (typeof window !== 'undefined' && win.fbq) {
      const matchingData: Record<string, string> = {};

      // Normalize Email
      if (inputs.email) {
        matchingData.em = inputs.email.trim().toLowerCase();
      }

      // Normalize Phone (e.g. 15551234567)
      if (inputs.phone) {
        let phoneDigits = inputs.phone.replace(/\D/g, '');
        if (phoneDigits.length === 10) {
          phoneDigits = '1' + phoneDigits; // Prepend USA country code
        }
        matchingData.ph = phoneDigits;
      }

      // Normalize Name
      if (inputs.fullName) {
        const parts = inputs.fullName.trim().split(/\s+/);
        if (parts.length > 0) {
          matchingData.fn = parts[0].toLowerCase();
        }
        if (parts.length > 1) {
          matchingData.ln = parts.slice(1).join(' ').toLowerCase();
        }
      }

      // Normalize Zip Code
      if (inputs.zipCode) {
        matchingData.zp = inputs.zipCode.trim();
      }

      // Normalize State
      if (inputs.state) {
        matchingData.st = inputs.state.trim().toLowerCase();
      }

      // Default country code
      matchingData.country = 'us';

      // Estimate Date of Birth from birthYear (Format: YYYYMMDD)
      if (inputs.birthYear) {
        matchingData.db = `${inputs.birthYear}0101`;
      }

      // Set External ID
      matchingData.external_id = runId;

      // 1. Re-initialize pixel with user matching data
      win.fbq('init', '1548873839996529', matchingData);

      // 2. Track the Lead event with an eventID for Conversions API (CAPI) deduplication
      win.fbq('track', 'Lead', {
        content_name: 'Health Coverage Quote',
        content_category: 'Insurance',
        value: 1,
        currency: 'USD',
      }, {
        eventID: runId,
      });

      // Mark as tracked
      window.sessionStorage.setItem(storageKey, 'true');
    }
  }, [isLoading, results, runId, inputs]);

  useEffect(() => {
    if (isLoading || isDismissed) return;

    const timer = window.setTimeout(() => {
      setShowPopup(true);
    }, 10000);

    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;

      if (percent >= 10) setShowPopup(true);
      setPopupPosition(percent >= 60 ? 'top' : 'bottom');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isDismissed, isLoading]);

  if (!results) return null;

  const openAgents = () => {
    setShowPopup(false);
    setShowAgentModal(true);
  };

  const handleSelectAgent = async (agent: AgentProfile) => {
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          agent,
          runId,
          resultsSource: results.source,
          selectedAt: new Date().toISOString(),
          // Merge contact info from store
          fullName: inputs.fullName,
          phone: inputs.phone,
          email: inputs.email,
          smsConsent: inputs.smsConsent,
          callConsent: inputs.callConsent,
          // Merge calculator inputs
          zipCode: inputs.zipCode,
          state: inputs.state,
          incomeRange: inputs.incomeRange,
          householdSize: inputs.householdSize,
          situation: inputs.situation,
          planPreference: inputs.planPreference,
          urgency: inputs.urgency,
          birthYear: inputs.birthYear,
        }),
      });
    } catch {
      // The thank-you page is still the right next step if lead storage is temporarily unavailable.
    }

    // Track successful connection with certified agent
    trackEvent('agent_connected', {
      agentName: agent.name,
      agentId: agent.id,
      runId,
      zipCode: inputs.zipCode,
      state: inputs.state,
    });

    navigate(`/thank-you?agent=${encodeURIComponent(agent.name)}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Preparing your results...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={openAgents}
              className="w-full mb-10 rounded-3xl border border-primary/25 bg-primary/10 px-5 py-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/15"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-heading">Urgent: Lower rates may be available</p>
                  <p className="text-body">Agents in {zipCode} have access to unlisted cheaper quotes.</p>
                </div>
                <ArrowRight className="h-6 w-6 text-primary" />
              </div>
            </button>

            <section className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-semibold text-accent mb-5">
                <Shield className="h-4 w-4" />
                <span>Marketplace Summary - Valid through {validThrough}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-heading mb-4">Marketplace Estimates</h1>
              <p className="text-lg text-body">
                Standard public rates found for ZIP <span className="font-bold">{zipCode}</span>.
              </p>
            </section>

            <div className="rounded-2xl border border-border bg-muted/30 p-5 mb-10">
              <div className="flex items-start gap-2 text-sm md:text-base text-body">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
                <p>
                  <span className="font-bold">Disclaimer:</span> Estimates based on public marketplace data for ZIP {zipCode}.
                  Final premiums may vary based on tobacco use, specific provider networks, and verified income subsidies.
                </p>
              </div>
            </div>

            <section className="surface-card p-6 md:p-8 mb-8">
              <div className="flex items-center gap-4 mb-7">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-heading">Your likely coverage paths</h2>
              </div>

              <div className="space-y-5">
                {plans.map((plan, index) => (
                  <PlanCard key={plan.id || `${plan.name}-${index}`} plan={plan} isLowest={index === 0} isCmsSource={results.source === 'cms-marketplace'} />
                ))}
              </div>
            </section>

            <section className="surface-card p-6 md:p-8 mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-heading">Plan fit (PPO vs HMO)</h2>
              </div>
              <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 mb-6">
                <p className="text-xl font-bold text-primary">We recommend: {recommendedPlanName(results.planFit.recommendation, plans)}</p>
                <p className="text-body mt-2">Based on your preferences and local coverage data</p>
              </div>
              <div className="space-y-3">
                {results.planFit.reasons.map((reason) => (
                  <div key={reason} className="flex items-center gap-3 text-body">
                    <span className="h-5 w-5 rounded-full border-2 border-accent text-accent flex items-center justify-center text-xs">✓</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 md:p-8 mb-10 overflow-hidden relative">
              <div className="max-w-xl">
                <h2 className="text-2xl font-bold text-heading mb-3">Eligibility rules changed Jan 1</h2>
                <p className="text-lg text-body mb-6">
                  Public search results don't include all private subsidies. Tap to verify your eligibility.
                </p>
                <Button onClick={openAgents} size="lg" className="w-full sm:w-auto min-w-80 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200">
                  <Users className="h-5 w-5" />
                  Find Nearby Agent
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
              <Users className="absolute right-8 top-8 h-28 w-28 text-muted-foreground/10" />
            </section>

            <div className="text-center">
              <button
                onClick={() => {
                  useCalculatorStore.getState().reset();
                  navigate('/');
                }}
                className="text-base text-muted-foreground hover:text-foreground transition-colors"
              >
                Start over with new information
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {showPopup && !isDismissed && (
        <div
          className={cn(
            'fixed left-0 right-0 z-40 flex justify-center px-4 transition-all duration-500',
            popupPosition === 'bottom' ? 'bottom-6 animate-[slideInBottom_0.35s_ease-out]' : 'top-[92px] animate-[slideInTop_0.35s_ease-out]'
          )}
        >
          <div className="relative w-full max-w-md rounded-3xl border border-primary/20 bg-white p-5 shadow-2xl">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsDismissed(true);
                setShowPopup(false);
              }}
              className="absolute right-3 top-3 h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            <button type="button" onClick={openAgents} className="w-full text-left">
              <div className="flex items-start gap-4 pr-8">
                <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xl font-bold text-heading">Eligibility rules changed Jan 1</p>
                  <p className="text-body mt-1">Public search results don't include all private subsidies. Tap to verify your eligibility.</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-green-500 px-5 py-4 text-center font-bold text-white flex items-center justify-center gap-3 hover:bg-green-600 transition-colors">
                Find Nearby Agent
                <ArrowRight className="h-5 w-5" />
              </div>
            </button>
          </div>
        </div>
      )}

      {showAgentModal && (
        <AgentModal
          zipCode={String(zipCode)}
          onClose={() => setShowAgentModal(false)}
          onSelect={handleSelectAgent}
        />
      )}

      <style>{`
        @keyframes slideInBottom {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInTop {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function ResultFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">{label}</p>
      <p className="text-2xl font-bold text-heading">{value}</p>
    </div>
  );
}

function PlanCard({ plan, isLowest, isCmsSource }: { plan: MarketplacePlan; isLowest: boolean; isCmsSource: boolean }) {
  const hasTaxCredit = isCmsSource && plan.premiumWithCredit !== undefined;
  const taxCredit = hasTaxCredit ? plan.premium - (plan.premiumWithCredit ?? plan.premium) : 0;
  const netPremium = hasTaxCredit ? (plan.premiumWithCredit ?? plan.premium) : plan.premium;

  return (
    <article className={cn('rounded-3xl border p-5 md:p-6', isLowest ? 'border-primary/30 bg-primary/5' : 'border-border bg-background/70')}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge tone="issuer">{plan.issuer}</Badge>
        <Badge tone={plan.metalLevel}>{plan.metalLevel}</Badge>
        {isLowest && <Badge tone="lowest">Lowest price</Badge>}
      </div>
      <h3 className="text-2xl font-bold text-heading mb-5">{plan.issuer} {plan.metalLevel} {plan.type}</h3>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="border-r border-border pr-4">
          <p className="text-xs md:text-sm font-bold uppercase text-muted-foreground mb-1">Monthly</p>
          {hasTaxCredit && taxCredit > 0 ? (
            <>
              <p className="text-4xl md:text-5xl font-bold text-primary">
                ${formatMoney(netPremium)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-through">${formatMoney(plan.premium)}/mo</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-green-600 font-semibold">${formatMoney(taxCredit)}/mo tax credit</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center text-green-600/80 hover:text-green-800 transition-colors" aria-label="Tax credit disclaimer">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px] p-3 text-xs leading-normal bg-popover text-popover-foreground border border-border shadow-lg rounded-xl">
                    It’s a credit provided by the government to lower your monthly premium cost for Health Insurance and is required to be paid back when you file your taxes if your actual income differs from your estimate.
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          ) : (
            <p className="text-4xl md:text-5xl font-bold text-primary">${formatMoney(plan.premium)}</p>
          )}
        </div>
        <PlanMetric label="Deductible" value={`$${formatMoney(plan.deductible)}`} />
        <PlanMetric label="Type" value={plan.type || 'Plan'} />
      </div>
      {hasTaxCredit && taxCredit > 0 && (
        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-2.5 text-sm text-green-700">
          <span className="font-semibold">Estimated savings overview:</span> Based on your income, you may qualify for a premium tax credit — a licensed agent can confirm your eligibility.
        </div>
      )}
    </article>
  );
}

function PlanMetric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="border-r border-border last:border-r-0 pr-4 last:pr-0">
      <p className="text-xs md:text-sm font-bold uppercase text-muted-foreground mb-2">{label}</p>
      <p className={cn('text-xl md:text-2xl font-bold text-heading', highlight && 'text-4xl md:text-5xl text-primary')}>{value}</p>
    </div>
  );
}

function Badge({ tone, children }: { tone: string; children: string }) {
  const normalized = tone.toLowerCase();
  const styles =
    normalized.includes('bronze') ? 'bg-amber-700 text-white' :
    normalized.includes('silver') ? 'bg-slate-400 text-white' :
    normalized.includes('gold') ? 'bg-yellow-500 text-white' :
    normalized.includes('platinum') ? 'bg-slate-700 text-white' :
    normalized === 'lowest' ? 'bg-primary text-primary-foreground' :
    'bg-muted text-muted-foreground';

  return <span className={cn('rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide', styles)}>{children}</span>;
}

function AgentModal({
  zipCode,
  onClose,
  onSelect,
}: {
  zipCode: string;
  onClose: () => void;
  onSelect: (agent: AgentProfile) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border bg-primary/5 px-4 py-5 sm:px-6 md:px-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-heading">Nearby Certified Agents</h2>
            <div className="mt-1.5 flex items-center gap-2 text-lg sm:text-xl text-body">
              <MapPin className="h-5 w-5" />
              <span>Results for ZIP {zipCode}</span>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center" aria-label="Close">
            <X className="h-7 w-7" />
          </button>
        </div>

        <div className="max-h-[58vh] overflow-y-auto px-4 py-5 sm:px-6 md:px-8">
          <div className="mb-5 rounded-3xl border border-accent/30 bg-accent/10 px-5 py-4 text-accent font-bold uppercase tracking-wide flex items-center gap-3 text-xs sm:text-sm">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
            Exclusive unpublished rates available
          </div>

          <div className="space-y-5">
            {agents.map((agent) => (
              <article key={agent.id} className="rounded-3xl border border-border bg-background p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-4 sm:gap-5">
                  <div className="relative">
                    <img src={agent.photoUrl} alt="" className="h-24 w-24 rounded-3xl object-cover ring-4 ring-muted mx-auto" />
                    <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-background bg-green-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-heading">{agent.name}</h3>
                    <div className="mt-1 flex items-center justify-center sm:justify-start gap-3 text-base sm:text-lg text-body">
                      <span className="flex items-center gap-1 font-bold text-heading">
                        <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                        {agent.rating}
                      </span>
                      <span>{agent.reviews} reviews</span>
                    </div>
                  </div>
                  <Button onClick={() => onSelect(agent)} size="lg" className="w-full sm:w-auto min-w-32 shadow-lg shadow-primary/20">
                    Select
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="border-t border-border bg-muted/30 px-4 py-4 text-center text-xs sm:text-sm italic text-body sm:px-6 md:px-8">
          By selecting an agent, you consent to receive a one-time consultation call regarding exclusive plan options.
        </div>
      </div>
    </div>
  );
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('en-US');
}

function formatSituation(value?: string) {
  const labels: Record<string, string> = {
    'lost-job': 'Lost job',
    'turning-26': 'Turning 26',
    moved: 'Moved',
    'life-event': 'Marriage / baby',
    'self-employed': 'Self-employed',
    exploring: 'Exploring',
  };

  return labels[value || ''] || 'Moved';
}

function recommendedPlanName(recommendation: string, plans: MarketplacePlan[]) {
  const preferredType = recommendation?.toUpperCase();
  const matchingPlan = plans.find((plan) => plan.type?.toUpperCase().includes(preferredType));
  const fallbackPlan = plans.find((plan) => plan.metalLevel.toLowerCase().includes('silver')) || plans[0];
  const type = matchingPlan?.type || fallbackPlan?.type || recommendation || 'PPO';
  const metal = matchingPlan?.metalLevel || fallbackPlan?.metalLevel || 'Silver';

  return `${metal} ${type}`.trim();
}
