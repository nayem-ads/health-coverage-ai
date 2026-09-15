import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Shield, Lock, Heart, Eye, FileCheck, Users } from 'lucide-react';

const trustPoints = [
  {
    icon: Shield,
    title: 'Privacy-First Design',
    description: 'We collect only what is needed to generate your estimate. Your data is never sold.',
  },
  {
    icon: Lock,
    title: 'Bank-Level Security',
    description: 'All data is encrypted in transit and at rest using industry-standard protocols.',
  },
  {
    icon: Eye,
    title: 'Transparent Process',
    description: 'We clearly explain what this tool is and is not. No hidden agendas.',
  },
  {
    icon: Heart,
    title: 'No Spam Promise',
    description: 'We only contact you if you explicitly consent. Unsubscribe anytime.',
  },
  {
    icon: FileCheck,
    title: 'Educational Purpose',
    description: 'This calculator provides estimates to help you understand options, not official quotes.',
  },
  {
    icon: Users,
    title: 'Licensed Agents',
    description: 'If you choose to connect, you will speak with properly licensed professionals.',
  },
];

export default function TrustCenterPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold text-heading mb-4">
                Trust Center
              </h1>
              <p className="text-lg text-body max-w-xl mx-auto">
                We believe in complete transparency. Here is everything you need to know about how this tool works and how we protect your information.
              </p>
            </div>
            
            {/* What This Tool Is */}
            <div className="surface-card p-6 md:p-8 mb-8">
              <h2 className="text-xl font-semibold text-heading mb-4">What this tool is</h2>
              <ul className="space-y-3 text-body">
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">✓</span>
                  An educational calculator that estimates your likely coverage options
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">✓</span>
                  A quick way to understand approximate monthly costs
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">✓</span>
                  A starting point for your health coverage research
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">✓</span>
                  Optional connection to licensed agents who can help
                </li>
              </ul>
            </div>
            
            {/* What This Tool Is Not */}
            <div className="surface-card p-6 md:p-8 mb-8">
              <h2 className="text-xl font-semibold text-heading mb-4">What this tool is NOT</h2>
              <ul className="space-y-3 text-body">
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">✗</span>
                  An official insurance quote or guarantee of coverage
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">✗</span>
                  A government-affiliated service
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">✗</span>
                  A replacement for professional insurance advice
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">✗</span>
                  A service that sells your data
                </li>
              </ul>
            </div>
            
            {/* Trust Points */}
            <div className="grid md:grid-cols-2 gap-5 mb-8">
              {trustPoints.map((point) => (
                <div key={point.title} className="surface-card p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <point.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-heading">{point.title}</h3>
                  </div>
                  <p className="text-sm text-body">{point.description}</p>
                </div>
              ))}
            </div>
            
            {/* How Results Are Generated */}
            <div className="surface-card p-6 md:p-8">
              <h2 className="text-xl font-semibold text-heading mb-4">How results are generated</h2>
              <p className="text-body mb-4">
                Our AI analyzes your answers against current market data, eligibility guidelines, and plan options in your area. We consider factors like:
              </p>
              <ul className="space-y-2 text-body">
                <li>• Your age and household composition</li>
                <li>• Your ZIP code and available plans in your region</li>
                <li>• Your estimated income (if provided) for subsidy calculations</li>
                <li>• Your current situation and coverage needs</li>
                <li>• Your stated preferences for plan types</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Results are estimates only. Actual eligibility, costs, and options depend on many factors and may differ from our projections.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
