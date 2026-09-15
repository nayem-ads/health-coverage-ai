import { Link, useLocation } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Phone } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';

export default function ThankYouPage() {
  const location = useLocation();
  const agentName = new URLSearchParams(location.search).get('agent') || 'your selected agent';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="surface-card max-w-xl p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-heading">Thank you</h1>
          <p className="mt-3 text-lg text-body">
            {agentName} has been selected. A certified agent will follow up about lower private rates and plan options.
          </p>
          <div className="mt-6 grid gap-3 text-left">
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
              <Phone className="mt-0.5 h-5 w-5 text-primary" />
              <p className="text-sm text-body">Keep your phone nearby for a one-time consultation call.</p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
              <CalendarCheck className="mt-0.5 h-5 w-5 text-primary" />
              <p className="text-sm text-body">They can verify public marketplace results, subsidies, and network fit.</p>
            </div>
          </div>
          <Button asChild size="lg" className="mt-7 w-full">
            <Link to="/calculator">Run another estimate</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
