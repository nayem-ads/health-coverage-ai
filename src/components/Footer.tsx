import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="relative w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4 text-primary-foreground" />
                <Sparkles className="w-2 h-2 text-primary-foreground/90 absolute -top-0.5 -right-0.5" />
              </div>
              <span className="text-sm font-bold text-foreground">Health Coverage AI</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Get your estimated coverage options in 60–90 seconds.
            </p>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/consent" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Consent Policy</Link></li>
              <li><Link to="/disclaimer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Disclaimer</Link></li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-2.5">
              <li><Link to="/trust" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Trust Center</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Contact</h4>
            <p className="text-sm text-muted-foreground">
              Questions? We're here to help.
            </p>
            <Link to="/contact" className="text-sm text-primary font-medium hover:underline mt-2 inline-block">
              Get in touch →
            </Link>
          </div>
        </div>
        
        {/* Disclaimer */}
        <div className="pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
            Estimates are educational and may vary by situation. This tool provides general information and is not a substitute for professional advice. 
            <Link to="/disclaimer" className="text-primary hover:underline ml-1">See full disclaimer.</Link>
          </p>
          <p className="text-xs text-muted-foreground text-center mt-4">
            © {new Date().getFullYear()} Health Coverage AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
