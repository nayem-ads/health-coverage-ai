import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStepperProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressStepper({ currentStep, totalSteps }: ProgressStepperProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  
  return (
    <div className="w-full">
      {/* Step indicator text */}
      <div className="text-center mb-4">
        <span className="text-sm font-medium text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="relative">
        {/* Background track */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          {/* Filled progress */}
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        
        {/* Step dots */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-0">
          {steps.map((step) => (
            <div
              key={step}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all duration-300",
                step < currentStep && "bg-primary border-primary",
                step === currentStep && "bg-primary border-primary ring-4 ring-primary/20",
                step > currentStep && "bg-card border-muted"
              )}
            >
              {step < currentStep && (
                <Check className="w-2.5 h-2.5 text-primary-foreground m-auto mt-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
