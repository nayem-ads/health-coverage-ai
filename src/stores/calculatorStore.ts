import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalculatorInputs, ResultsData } from '@/types/calculator';

interface CalculatorState {
  currentStep: number;
  inputs: Partial<CalculatorInputs>;
  runId: string | null;
  results: ResultsData | null;
  isUnlocked: boolean;
  
  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateInputs: (data: Partial<CalculatorInputs>) => void;
  setRunId: (id: string) => void;
  setResults: (results: ResultsData) => void;
  unlock: () => void;
  reset: () => void;
}

const initialInputs: Partial<CalculatorInputs> = {
  zipCode: '',
  state: '',
  birthYear: '',
  currentlyInsured: null,
  householdSize: 1,
  incomeRange: '',
  situation: '',
  planPreference: '',
  urgency: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  utmTerm: '',
};

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set) => ({
      currentStep: 1,
      inputs: initialInputs,
      runId: null,
      results: null,
      isUnlocked: false,

      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
      updateInputs: (data) => set((state) => ({ inputs: { ...state.inputs, ...data } })),
      setRunId: (id) => set({ runId: id }),
      setResults: (results) => set({ results }),
      unlock: () => set({ isUnlocked: true }),
      reset: () => set({ 
        currentStep: 1, 
        inputs: initialInputs, 
        runId: null, 
        results: null, 
        isUnlocked: false 
      }),
    }),
    {
      name: 'calculator-storage',
    }
  )
);
