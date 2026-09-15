import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrustBadges } from '@/components/TrustBadges';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Sparkles,
  ChevronRight,
  Shield,
  Zap,
  BarChart3
} from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Coverage Paths',
    description: 'See which options match your situation best',
  },
  {
    icon: FileText,
    title: 'Estimated Range',
    description: 'Get a ballpark monthly cost estimate',
  },
  {
    icon: Sparkles,
    title: 'Plan Fit Analysis',
    description: 'PPO vs HMO recommendation for you',
  },
  {
    icon: CheckCircle2,
    title: 'Next Steps',
    description: 'Clear action items to move forward',
  },
];

const steps = [
  {
    number: '01',
    title: 'Answer 4 Questions',
    description: 'Quick questions about your situation and preferences',
  },
  {
    number: '02',
    title: 'Get Your Results',
    description: 'See your likely coverage paths and estimated costs',
  },
  {
    number: '03',
    title: 'Connect (Optional)',
    description: 'Talk to a licensed agent if you want expert help',
  },
];

const faqs = [
  {
    question: 'Is this an official quote?',
    answer: 'No. This is an educational estimate to help you understand your options. Actual costs depend on many factors.',
  },
  {
    question: 'Is my information secure?',
    answer: 'Yes. We use bank-level encryption and never sell your personal data.',
  },
  {
    question: 'Do I have to talk to anyone?',
    answer: 'No. You can view your results without speaking to an agent. Connecting is always optional.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
          <div className="container mx-auto px-4 py-16 md:py-24 relative">
            <div className="max-w-2xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
                <Zap className="w-4 h-4" />
                <span>AI-Powered Estimates</span>
              </div>
              
              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-heading mb-6 leading-tight animate-slide-up">
                Check your coverage options in{' '}
                <span className="text-primary">60–90 seconds</span>
              </h1>
              
              {/* Subheadline */}
              <p className="text-lg md:text-xl text-body mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Answer 4 quick questions and get your likely options + an estimated monthly range — no commitment required.
              </p>
              
              {/* CTA */}
              <div className="flex flex-col items-center gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <Button 
                  variant="hero" 
                  size="xl" 
                  onClick={() => navigate('/calculator')}
                  className="group"
                >
                  Start Calculator
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Free • No sign-up required</span>
                </div>
              </div>
              
              {/* Trust Badges */}
              <div className="mt-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <TrustBadges variant="compact" />
              </div>
            </div>
          </div>
        </section>

        {/* What You'll Get */}
        <section className="py-16 md:py-20 bg-surface-sunken">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-heading mb-4">
                What you'll get
              </h2>
              <p className="text-body max-w-lg mx-auto">
                Your personalized results dashboard includes everything you need to understand your options.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="surface-card surface-card-hover p-6 text-center"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-heading mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-heading mb-4">
                How it works
              </h2>
              <p className="text-body max-w-lg mx-auto">
                Simple, fast, and completely transparent.
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              {steps.map((step, index) => (
                <div 
                  key={step.number}
                  className="flex items-start gap-5 mb-8 last:mb-0"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shadow-primary">
                    {step.number}
                  </div>
                  <div className="pt-2">
                    <h3 className="text-lg font-semibold text-heading mb-1">{step.title}</h3>
                    <p className="text-body">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Button 
                variant="default" 
                size="lg"
                onClick={() => navigate('/calculator')}
              >
                Get Started
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-20 bg-surface-sunken">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-heading mb-4">
                Common questions
              </h2>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-4">
              {faqs.map((faq) => (
                <div 
                  key={faq.question}
                  className="surface-card p-6"
                >
                  <h3 className="text-base font-semibold text-heading mb-2">{faq.question}</h3>
                  <p className="text-sm text-body">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                <span>100% Free & Private</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-heading mb-6">
                Ready to see your options?
              </h2>
              <Button 
                variant="hero" 
                size="xl"
                onClick={() => navigate('/calculator')}
                className="group"
              >
                Start Calculator
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
