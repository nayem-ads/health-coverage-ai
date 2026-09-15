import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCalculatorStore } from "@/stores/calculatorStore";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { TrustBadges } from "@/components/TrustBadges";
import { 
  ArrowRight, 
  Lock, 
  BarChart3, 
  DollarSign, 
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMarketplaceResults } from "@/lib/cmsMarketplaceApi";
import { trackEvent } from "@/lib/tracking";

const previewItems = [
  { icon: BarChart3, label: "Coverage paths for your area" },
  { icon: DollarSign, label: "Estimated monthly range" },
  { icon: Sparkles, label: "PPO vs HMO fit" },
];

export default function UnlockPage() {
  const navigate = useNavigate();
  const { runId } = useParams();
  const { unlock, setResults, inputs, updateInputs } = useCalculatorStore();
  const [formData, setFormData] = useState({
    fullName: inputs.fullName || "",
    phone: inputs.phone || "",
    email: inputs.email || "",
    smsConsent: inputs.smsConsent || false,
    callConsent: inputs.callConsent || false,
    tcpaConsent: inputs.tcpaConsent || false,
  });
  
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadId, setLeadId] = useState("");

  const triggerAutoCapture = async (updatedData = formData) => {
    if (!updatedData.tcpaConsent) return;
    if (!updatedData.fullName.trim() && !updatedData.phone.trim() && !updatedData.email.trim()) return;

    try {
      const resp = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: leadId || undefined,
          runId,
          fullName: updatedData.fullName,
          phone: updatedData.phone,
          email: updatedData.email,
          smsConsent: updatedData.smsConsent,
          callConsent: updatedData.callConsent,
          zipCode: inputs.zipCode,
          state: inputs.state,
          incomeRange: inputs.incomeRange,
          householdSize: inputs.householdSize,
          situation: inputs.situation,
          planPreference: inputs.planPreference,
          urgency: inputs.urgency,
          birthYear: inputs.birthYear,
          utmSource: inputs.utmSource,
          utmMedium: inputs.utmMedium,
          utmCampaign: inputs.utmCampaign,
          utmContent: inputs.utmContent,
          utmTerm: inputs.utmTerm,
          autoCapture: true,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok && data.leadId) {
        setLeadId(data.leadId);
      }
    } catch (err) {
      console.error("Failed to auto-capture lead:", err);
    }
  };

  // Debounced typing auto-capture
  useEffect(() => {
    if (!formData.tcpaConsent) return;
    if (!formData.fullName.trim() && !formData.phone.trim() && !formData.email.trim()) return;

    const timer = setTimeout(() => {
      triggerAutoCapture();
    }, 3000);

    return () => clearTimeout(timer);
  }, [formData.fullName, formData.phone, formData.email, formData.tcpaConsent]);

  const getFieldError = (field: string, value: string | boolean): string => {
    if (field === "fullName") {
      const val = typeof value === "string" ? value : "";
      if (!val.trim()) {
        return "Please enter your full name";
      }
    }
    
    if (field === "phone") {
      const val = typeof value === "string" ? value : "";
      if (!val.trim()) {
        return "Please enter your phone number";
      }
      const digits = val.replace(/\D/g, "");
      const phoneDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
      
      if (phoneDigits.length !== 10) {
        return "Please enter a 10-digit phone number";
      }
      const areaCodeFirst = phoneDigits[0];
      const prefixFirst = phoneDigits[3];
      
      if (areaCodeFirst === "0" || areaCodeFirst === "1" || prefixFirst === "0" || prefixFirst === "1") {
        return "Please enter a valid phone number (area code and prefix cannot start with 0 or 1)";
      }
      const allSame = /^(.)\1+$/.test(phoneDigits);
      const isSequential = "01234567890123456789".includes(phoneDigits) || "98765432109876543210".includes(phoneDigits);
      if (allSame || isSequential) {
        return "Please enter a valid, active phone number";
      }
    }
    
    if (field === "email") {
      const val = typeof value === "string" ? value : "";
      if (!val.trim()) {
        return "Please enter your email";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        return "Please enter a valid email address";
      }
      const emailDomain = val.split("@")[1]?.toLowerCase();
      const blocklistedDomains = [
        "test.com", "example.com", "mailinator.com", "yopmail.com", 
        "tempmail.com", "temp-mail.org", "guerrillamail.com", 
        "dispostable.com", "10minutemail.com", "trashmail.com"
      ];
      if (emailDomain && blocklistedDomains.includes(emailDomain)) {
        return "Disposable or invalid email domains are not allowed.";
      }
      const localPart = val.split("@")[0];
      if (localPart && /^(.)\1{3,}$/.test(localPart)) {
        return "Please enter a valid personal email address";
      }
    }

    if (field === "tcpaConsent") {
      if (!value) {
        return "Please provide your consent to continue";
      }
    }
    
    return "";
  };

  const validateField = (field: string, value: string | boolean) => {
    const error = getFieldError(field, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = formData[field as keyof typeof formData];
    validateField(field, value);
  };

  const formatPhone = (value: string) => {
    let cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      cleaned = cleaned.slice(1);
    }
    cleaned = cleaned.slice(0, 10);
    if (cleaned.length >= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length >= 3) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fields = ["fullName", "phone", "email", "tcpaConsent"];
    const newTouched: Record<string, boolean> = {};
    const newErrors: Record<string, string> = {};
    
    fields.forEach((field) => {
      newTouched[field] = true;
      const value = formData[field as keyof typeof formData];
      const error = getFieldError(field, value);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    setTouched(newTouched);
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) return;
    
    setIsSubmitting(true);

    if (honeypot) {
      console.warn("[Spam blocked] Honeypot field was filled by bot.");
      setIsSubmitting(false);
      return;
    }
    
    try {
      // 1. Capture and submit lead immediately
      const resp = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: leadId || undefined,
          runId,
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          smsConsent: formData.smsConsent,
          callConsent: formData.callConsent,
          zipCode: inputs.zipCode,
          state: inputs.state,
          incomeRange: inputs.incomeRange,
          householdSize: inputs.householdSize,
          situation: inputs.situation,
          planPreference: inputs.planPreference,
          urgency: inputs.urgency,
          birthYear: inputs.birthYear,
          utmSource: inputs.utmSource,
          utmMedium: inputs.utmMedium,
          utmCampaign: inputs.utmCampaign,
          utmContent: inputs.utmContent,
          utmTerm: inputs.utmTerm,
          url_website_verification: honeypot,
        }),
      });

      const data = await resp.json();
      const currentLeadId = data.leadId || leadId;

      // 2. Fetch CMS marketplace results
      const results = await getMarketplaceResults(inputs);
      setResults(results);

      // 3. Save contact fields to Zustand store
      updateInputs({
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        smsConsent: formData.smsConsent,
        callConsent: formData.callConsent,
      });

      // 4. Track conversion events
      trackEvent("lead_submitted", {
        leadId: currentLeadId,
        zipCode: inputs.zipCode,
        state: inputs.state,
      });
      trackEvent("lead_verified", {
        leadId: currentLeadId,
        zipCode: inputs.zipCode,
        state: inputs.state,
      });

      // 5. Unlock and navigate to results
      unlock();
      navigate(`/results/${runId}`);
    } catch (err) {
      console.error("Failed to submit lead on unlock:", err);
      const errorMessage = err instanceof Error ? err.message : "System is temporarily unavailable. Please try again.";
      setErrors((prev) => ({
        ...prev,
        submit: errorMessage
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-3 sm:py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            {/* Lock Icon */}
            <div className="hidden sm:flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
                <Lock className="w-8 h-8 text-primary" />
              </div>
            </div>
            
            {/* Headline */}
            <div className="text-center mb-3 sm:mb-8">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-heading mb-1 sm:mb-3">
                Unlock your personalized results
              </h1>
              <p className="text-sm sm:text-base text-body">
                Your results are ready! Enter your info to see them immediately.
              </p>
            </div>
            
            {/* Preview */}
            <div className="hidden sm:block surface-card p-5 mb-6">
              <p className="text-sm font-medium text-heading mb-4">What you will see:</p>
              <div className="space-y-3">
                {previewItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-accent" />
                    </div>
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Lead Form */}
            <form onSubmit={handleSubmit} className="surface-card p-4 sm:p-6 md:p-8">
              <div className="space-y-3 sm:space-y-5">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-heading mb-1 sm:mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="name"
                    autoComplete="name"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, fullName: value });
                      if (touched.fullName || errors.fullName) {
                        validateField("fullName", value);
                      }
                    }}
                    onBlur={() => {
                      handleBlur("fullName");
                      if (formData.tcpaConsent) {
                        triggerAutoCapture();
                      }
                    }}
                    placeholder="John Smith"
                    className={cn(
                      "input-field",
                      errors.fullName && "border-destructive ring-destructive/20"
                    )}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive mt-1.5">{errors.fullName}</p>
                  )}
                </div>
                
                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-heading mb-1 sm:mb-2">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    autoComplete="tel"
                    type="tel"
                    value={isPhoneFocused ? formData.phone.replace(/\D/g, "") : formatPhone(formData.phone)}
                    onChange={(e) => {
                      let raw = e.target.value.replace(/\D/g, "");
                      if (raw.length === 11 && raw.startsWith("1")) {
                        raw = raw.slice(1);
                      }
                      raw = raw.slice(0, 10);
                      setFormData({ ...formData, phone: raw });
                      if (touched.phone || errors.phone) {
                        validateField("phone", raw);
                      }
                    }}
                    onFocus={() => setIsPhoneFocused(true)}
                    onBlur={() => {
                      setIsPhoneFocused(false);
                      const formatted = formatPhone(formData.phone);
                      setFormData(prev => ({ ...prev, phone: formatted }));
                      handleBlur("phone");
                      if (formData.tcpaConsent) {
                        triggerAutoCapture({ ...formData, phone: formatted });
                      }
                    }}
                    placeholder="(555) 123-4567"
                    className={cn(
                      "input-field",
                      errors.phone && "border-destructive ring-destructive/20"
                    )}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive mt-1.5">{errors.phone}</p>
                  )}
                </div>
                
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-heading mb-1 sm:mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    autoComplete="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, email: value });
                      if (touched.email || errors.email) {
                        validateField("email", value);
                      }
                    }}
                    onBlur={() => {
                      handleBlur("email");
                      if (formData.tcpaConsent) {
                        triggerAutoCapture();
                      }
                    }}
                    placeholder="john@example.com"
                    className={cn(
                      "input-field",
                      errors.email && "border-destructive ring-destructive/20"
                    )}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1.5">{errors.email}</p>
                  )}
                </div>
                
                {/* Honeypot field for bot prevention (hidden from users) */}
                <div style={{ display: "none" }} aria-hidden="true">
                  <input
                    type="text"
                    name="url_website_verification"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* TCPA Consent — single checkbox */}
                <div className="pt-1 sm:pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tcpaConsent}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const updated = {
                          ...formData,
                          tcpaConsent: checked,
                          smsConsent: checked,
                          callConsent: checked,
                        };
                        setFormData(updated);
                        if (touched.tcpaConsent || errors.tcpaConsent) {
                          validateField("tcpaConsent", checked);
                        }
                        if (checked) {
                          triggerAutoCapture(updated);
                        }
                      }}
                      onBlur={() => handleBlur("tcpaConsent")}
                      className="w-5 h-5 rounded border-border text-primary focus:ring-primary flex-shrink-0"
                    />
                    <span className="text-sm text-muted-foreground">
                      By clicking I accept{" "}
                      <a href="/consent" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">coverage check</a>
                      {" "}&amp;{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">Privacy Policy</a>.
                    </span>
                  </label>
                  {errors.tcpaConsent && (
                    <p className="text-xs text-destructive mt-1.5 ml-8">{errors.tcpaConsent}</p>
                  )}
                </div>
                
                {/* General Submit Errors */}
                {errors.submit && (
                  <p className="text-sm text-destructive mt-1.5 text-center font-medium">{errors.submit}</p>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full mt-1 sm:mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Unlocking Your Plans...
                    </span>
                  ) : (
                    <>
                      Unlock My Results
                      <ArrowRight className="w-5 h-5 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
            
            {/* Faded policy line */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">Privacy Policy</a>
                {" · "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">Terms &amp; Conditions</a>
                {" · "}
                <a href="/consent" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">Consent</a>
              </p>
            </div>
            
            {/* Trust Badges */}
            <div className="mt-8">
              <TrustBadges variant="compact" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
