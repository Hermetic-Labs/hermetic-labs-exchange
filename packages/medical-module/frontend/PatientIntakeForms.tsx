/// <reference path="../../_shared/externals.d.ts" />
/**
 * EVE OS Patient Intake Forms
 *
 * HIPAA-compliant patient data entry forms with hospital branding customization.
 * Preloaded with common medical forms that hospitals can customize.
 *
 * Features:
 * - Hospital branding (colors, logo, quotes)
 * - Common intake forms (demographics, medical history, consent)
 * - HIPAA-compliant data handling
 * - Multi-language support ready
 * - Accessibility compliant (WCAG 2.1)
 * - Local-first storage with sync
 */

import React, { useState, useCallback } from 'react';
import {
  User, Heart, Pill, AlertTriangle, FileText, Shield,
  Check, ChevronRight, ChevronLeft, Save, Upload,
  Building2, Palette, Quote
} from 'lucide-react';
import { medicalDataPersistence } from './services/MedicalDataPersistence';

// ============================================================================
// Types
// ============================================================================

export interface HospitalBranding {
  hospitalName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  welcomeMessage: string;
  privacyNotice: string;
  footerText: string;
  customCss?: string;
}

export interface PatientDemographics {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  ssn?: string; // Last 4 only for verification
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phone: string;
  email?: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  preferredLanguage: string;
  interpreterNeeded: boolean;
}

export interface MedicalHistory {
  allergies: Array<{
    allergen: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  }>;
  currentMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    prescribedBy?: string;
  }>;
  pastSurgeries: Array<{
    procedure: string;
    date: string;
    hospital?: string;
  }>;
  chronicConditions: string[];
  familyHistory: Array<{
    condition: string;
    relationship: string;
  }>;
  immunizations: Array<{
    vaccine: string;
    date: string;
  }>;
  smokingStatus: 'never' | 'former' | 'current' | 'unknown';
  alcoholUse: 'none' | 'occasional' | 'moderate' | 'heavy' | 'unknown';
}

export interface ConsentForm {
  treatmentConsent: boolean;
  hipaaAcknowledgment: boolean;
  releaseOfInformation: boolean;
  financialResponsibility: boolean;
  advanceDirectives: boolean;
  researchParticipation?: boolean;
  photoVideoConsent?: boolean;
  signatureData?: string; // Base64 signature image
  signedAt?: string;
  witnessName?: string;
}

export interface InsuranceInfo {
  primaryInsurance: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
    subscriberName: string;
    subscriberDob: string;
    relationship: 'self' | 'spouse' | 'child' | 'other';
  };
  secondaryInsurance?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
    subscriberName: string;
    subscriberDob: string;
    relationship: 'self' | 'spouse' | 'child' | 'other';
  };
}

type FormStep = 'demographics' | 'medical_history' | 'insurance' | 'consent' | 'review';

interface PatientIntakeFormsProps {
  patientId?: string;
  branding?: Partial<HospitalBranding>;
  onComplete?: (data: PatientIntakeData) => void;
  onSave?: (data: Partial<PatientIntakeData>) => void;
}

export interface PatientIntakeData {
  demographics: PatientDemographics;
  medicalHistory: MedicalHistory;
  insurance: InsuranceInfo;
  consent: ConsentForm;
  completedAt: string;
  version: string;
}

// ============================================================================
// Default Branding
// ============================================================================

const DEFAULT_BRANDING: HospitalBranding = {
  hospitalName: 'Medical Center',
  primaryColor: '#0f766e', // Teal
  secondaryColor: '#134e4a',
  accentColor: '#14b8a6',
  welcomeMessage: 'Welcome to our facility. Your health and privacy are our top priorities.',
  privacyNotice: 'Your information is protected under HIPAA regulations. We will never share your personal health information without your explicit consent.',
  footerText: '© 2025 EVE OS Medical Systems. HIPAA Compliant.',
};

// ============================================================================
// Common Conditions & Allergies (Preloaded)
// ============================================================================

const COMMON_CONDITIONS = [
  'Diabetes Type 1', 'Diabetes Type 2', 'Hypertension', 'Asthma',
  'COPD', 'Heart Disease', 'Arthritis', 'Cancer', 'Depression',
  'Anxiety', 'Thyroid Disorder', 'Kidney Disease', 'Liver Disease',
  'Stroke', 'Epilepsy', 'Alzheimer\'s', 'Parkinson\'s'
];

const COMMON_ALLERGIES = [
  'Penicillin', 'Sulfa Drugs', 'Aspirin', 'Ibuprofen', 'Codeine',
  'Morphine', 'Latex', 'Iodine', 'Shellfish', 'Peanuts',
  'Tree Nuts', 'Eggs', 'Milk', 'Soy', 'Wheat', 'Bee Stings'
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'zh', name: 'Chinese' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'ko', name: 'Korean' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'hi', name: 'Hindi' },
];

// ============================================================================
// Main Component
// ============================================================================

export const PatientIntakeForms: React.FC<PatientIntakeFormsProps> = ({
  patientId,
  branding: customBranding,
  onComplete,
  onSave
}) => {
  const branding = { ...DEFAULT_BRANDING, ...customBranding };

  const [currentStep, setCurrentStep] = useState<FormStep>('demographics');
  const [isSaving, setIsSaving] = useState(false);
  const [savedDraft, setSavedDraft] = useState(false);

  // Form state
  const [demographics, setDemographics] = useState<Partial<PatientDemographics>>({
    preferredLanguage: 'en',
    interpreterNeeded: false,
    address: { street: '', city: '', state: '', zipCode: '', country: 'USA' },
    emergencyContact: { name: '', relationship: '', phone: '' }
  });

  const [medicalHistory, setMedicalHistory] = useState<Partial<MedicalHistory>>({
    allergies: [],
    currentMedications: [],
    pastSurgeries: [],
    chronicConditions: [],
    familyHistory: [],
    immunizations: [],
    smokingStatus: 'unknown',
    alcoholUse: 'unknown'
  });

  const [insurance, setInsurance] = useState<Partial<InsuranceInfo>>({
    primaryInsurance: {
      provider: '',
      policyNumber: '',
      subscriberName: '',
      subscriberDob: '',
      relationship: 'self'
    }
  });

  const [consent, setConsent] = useState<Partial<ConsentForm>>({
    treatmentConsent: false,
    hipaaAcknowledgment: false,
    releaseOfInformation: false,
    financialResponsibility: false,
    advanceDirectives: false
  });

  // Steps configuration
  const steps: { key: FormStep; label: string; icon: React.ReactNode }[] = [
    { key: 'demographics', label: 'Demographics', icon: <User className="w-5 h-5" /> },
    { key: 'medical_history', label: 'Medical History', icon: <Heart className="w-5 h-5" /> },
    { key: 'insurance', label: 'Insurance', icon: <FileText className="w-5 h-5" /> },
    { key: 'consent', label: 'Consent', icon: <Shield className="w-5 h-5" /> },
    { key: 'review', label: 'Review', icon: <Check className="w-5 h-5" /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  // Auto-save draft
  const saveDraft = useCallback(async () => {
    if (!patientId) return;

    setIsSaving(true);
    try {
      await medicalDataPersistence.saveRecord('note', {
        type: 'intake_draft',
        demographics,
        medicalHistory,
        insurance,
        consent,
        lastStep: currentStep
      }, {
        patientId,
        priority: 'low'
      });
      setSavedDraft(true);
      setTimeout(() => setSavedDraft(false), 2000);
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [patientId, demographics, medicalHistory, insurance, consent, currentStep]);

  // Handle form completion
  const handleComplete = async () => {
    const intakeData: PatientIntakeData = {
      demographics: demographics as PatientDemographics,
      medicalHistory: medicalHistory as MedicalHistory,
      insurance: insurance as InsuranceInfo,
      consent: {
        ...consent as ConsentForm,
        signedAt: new Date().toISOString()
      },
      completedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    // Save to persistence
    if (patientId) {
      await medicalDataPersistence.saveRecord('procedure', {
        type: 'patient_intake',
        ...intakeData
      }, {
        patientId,
        priority: 'high'
      });
    }

    onComplete?.(intakeData);
  };

  // Dynamic styles based on branding
  const brandStyles = {
    '--primary': branding.primaryColor,
    '--secondary': branding.secondaryColor,
    '--accent': branding.accentColor,
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={brandStyles}
    >
      {/* Header with Hospital Branding */}
      <header
        className="text-white py-6 px-8"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.hospitalName}
                className="h-12 w-auto"
              />
            ) : (
              <Building2 className="w-12 h-12" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{branding.hospitalName}</h1>
              <p className="text-sm opacity-90">Patient Intake Forms</p>
            </div>
          </div>
          {savedDraft && (
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              ✓ Draft Saved
            </span>
          )}
        </div>
      </header>

      {/* Welcome Message */}
      <div className="bg-white border-b border-slate-200 py-4 px-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-slate-600">{branding.welcomeMessage}</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-slate-200 py-4 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.key}>
                <button
                  onClick={() => setCurrentStep(step.key)}
                  className={`flex flex-col items-center gap-1 transition-colors ${index <= currentStepIndex
                      ? 'text-teal-600'
                      : 'text-slate-400'
                    }`}
                  style={index <= currentStepIndex ? { color: branding.primaryColor } : undefined}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${index < currentStepIndex
                      ? 'bg-teal-600 text-white'
                      : index === currentStepIndex
                        ? 'border-2 border-teal-600 text-teal-600'
                        : 'border-2 border-slate-300 text-slate-400'
                    }`}
                    style={index <= currentStepIndex ? {
                      backgroundColor: index < currentStepIndex ? branding.primaryColor : undefined,
                      borderColor: branding.primaryColor,
                      color: index < currentStepIndex ? 'white' : branding.primaryColor
                    } : undefined}
                  >
                    {index < currentStepIndex ? <Check className="w-5 h-5" /> : step.icon}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${index < currentStepIndex ? 'bg-teal-600' : 'bg-slate-200'
                    }`}
                    style={index < currentStepIndex ? { backgroundColor: branding.primaryColor } : undefined}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="py-8 px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          {currentStep === 'demographics' && (
            <DemographicsForm
              data={demographics}
              onChange={setDemographics}
              branding={branding}
            />
          )}

          {currentStep === 'medical_history' && (
            <MedicalHistoryForm
              data={medicalHistory}
              onChange={setMedicalHistory}
              branding={branding}
            />
          )}

          {currentStep === 'insurance' && (
            <InsuranceForm
              data={insurance}
              onChange={setInsurance}
              branding={branding}
            />
          )}

          {currentStep === 'consent' && (
            <ConsentFormSection
              data={consent}
              onChange={setConsent}
              branding={branding}
              privacyNotice={branding.privacyNotice}
            />
          )}

          {currentStep === 'review' && (
            <ReviewSection
              demographics={demographics}
              medicalHistory={medicalHistory}
              insurance={insurance}
              consent={consent}
              branding={branding}
            />
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
            <button
              onClick={() => {
                const prevIndex = currentStepIndex - 1;
                if (prevIndex >= 0) {
                  setCurrentStep(steps[prevIndex].key);
                }
              }}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex gap-3">
              <button
                onClick={saveDraft}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>

              {currentStepIndex < steps.length - 1 ? (
                <button
                  onClick={() => {
                    const nextIndex = currentStepIndex + 1;
                    if (nextIndex < steps.length) {
                      setCurrentStep(steps[nextIndex].key);
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-2 text-white rounded-lg"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={!consent.treatmentConsent || !consent.hipaaAcknowledgment}
                  className="flex items-center gap-2 px-6 py-2 text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: branding.accentColor }}
                >
                  <Check className="w-4 h-4" />
                  Complete Intake
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-8 text-center text-sm text-slate-500">
        <p>{branding.footerText}</p>
        <p className="mt-1 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          Your information is encrypted and HIPAA protected
        </p>
      </footer>
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

interface FormSectionProps {
  branding: HospitalBranding;
}

const DemographicsForm: React.FC<{
  data: Partial<PatientDemographics>;
  onChange: (data: Partial<PatientDemographics>) => void;
} & FormSectionProps> = ({ data, onChange, branding }) => {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const updateAddress = (field: string, value: string) => {
    onChange({
      ...data,
      address: { ...data.address!, [field]: value }
    });
  };

  const updateEmergencyContact = (field: string, value: string) => {
    onChange({
      ...data,
      emergencyContact: { ...data.emergencyContact!, [field]: value }
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <User className="w-5 h-5" style={{ color: branding.primaryColor }} />
        Patient Demographics
      </h2>

      {/* Name */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.firstName || ''}
            onChange={(e) => updateField('firstName', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Middle Name
          </label>
          <input
            type="text"
            value={data.middleName || ''}
            onChange={(e) => updateField('middleName', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.lastName || ''}
            onChange={(e) => updateField('lastName', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* DOB & Gender */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={data.dateOfBirth || ''}
            onChange={(e) => updateField('dateOfBirth', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Gender <span className="text-red-500">*</span>
          </label>
          <select
            value={data.gender || ''}
            onChange={(e) => updateField('gender', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            required
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="(555) 555-5555"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={data.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-700">Address</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.address?.street || ''}
            onChange={(e) => updateAddress('street', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            required
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.address?.city || ''}
              onChange={(e) => updateAddress('city', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.address?.state || ''}
              onChange={(e) => updateAddress('state', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ZIP Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.address?.zipCode || ''}
              onChange={(e) => updateAddress('zipCode', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Preferred Language
          </label>
          <select
            value={data.preferredLanguage || 'en'}
            onChange={(e) => updateField('preferredLanguage', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.interpreterNeeded || false}
              onChange={(e) => updateField('interpreterNeeded', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">Interpreter needed</span>
          </label>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-700">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.emergencyContact?.name || ''}
              onChange={(e) => updateEmergencyContact('name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Relationship <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.emergencyContact?.relationship || ''}
              onChange={(e) => updateEmergencyContact('relationship', e.target.value)}
              placeholder="Spouse, Parent, etc."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={data.emergencyContact?.phone || ''}
              onChange={(e) => updateEmergencyContact('phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const MedicalHistoryForm: React.FC<{
  data: Partial<MedicalHistory>;
  onChange: (data: Partial<MedicalHistory>) => void;
} & FormSectionProps> = ({ data, onChange, branding }) => {
  const [newAllergy, setNewAllergy] = useState({ allergen: '', reaction: '', severity: 'moderate' as const });
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', frequency: '' });

  const addAllergy = () => {
    if (newAllergy.allergen) {
      onChange({
        ...data,
        allergies: [...(data.allergies || []), newAllergy]
      });
      setNewAllergy({ allergen: '', reaction: '', severity: 'moderate' });
    }
  };

  const addMedication = () => {
    if (newMedication.name) {
      onChange({
        ...data,
        currentMedications: [...(data.currentMedications || []), newMedication]
      });
      setNewMedication({ name: '', dosage: '', frequency: '' });
    }
  };

  const toggleCondition = (condition: string) => {
    const current = data.chronicConditions || [];
    const updated = current.includes(condition)
      ? current.filter(c => c !== condition)
      : [...current, condition];
    onChange({ ...data, chronicConditions: updated });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <Heart className="w-5 h-5" style={{ color: branding.primaryColor }} />
        Medical History
      </h2>

      {/* Allergies */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-slate-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Allergies
        </h3>

        {/* Quick select common allergies */}
        <div className="flex flex-wrap gap-2">
          {COMMON_ALLERGIES.slice(0, 8).map(allergen => (
            <button
              key={allergen}
              onClick={() => {
                if (!data.allergies?.some(a => a.allergen === allergen)) {
                  onChange({
                    ...data,
                    allergies: [...(data.allergies || []), { allergen, reaction: '', severity: 'moderate' }]
                  });
                }
              }}
              className="px-3 py-1 text-sm border border-slate-300 rounded-full hover:bg-slate-50"
            >
              + {allergen}
            </button>
          ))}
        </div>

        {/* Current allergies list */}
        {data.allergies && data.allergies.length > 0 && (
          <div className="space-y-2">
            {data.allergies.map((allergy, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="font-medium">{allergy.allergen}</span>
                {allergy.reaction && <span className="text-sm text-slate-600">- {allergy.reaction}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${allergy.severity === 'life_threatening' ? 'bg-red-500 text-white' :
                    allergy.severity === 'severe' ? 'bg-red-400 text-white' :
                      allergy.severity === 'moderate' ? 'bg-amber-400' : 'bg-yellow-300'
                  }`}>
                  {allergy.severity}
                </span>
                <button
                  onClick={() => {
                    onChange({
                      ...data,
                      allergies: data.allergies?.filter((_, idx) => idx !== i)
                    });
                  }}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add custom allergy */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            value={newAllergy.allergen}
            onChange={(e) => setNewAllergy({ ...newAllergy, allergen: e.target.value })}
            placeholder="Allergen"
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={newAllergy.reaction}
            onChange={(e) => setNewAllergy({ ...newAllergy, reaction: e.target.value })}
            placeholder="Reaction"
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
          <select
            value={newAllergy.severity}
            onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value as any })}
            className="px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
            <option value="life_threatening">Life Threatening</option>
          </select>
          <button
            onClick={addAllergy}
            className="px-4 py-2 text-white rounded-lg"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Current Medications */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-slate-700 flex items-center gap-2">
          <Pill className="w-4 h-4" style={{ color: branding.primaryColor }} />
          Current Medications
        </h3>

        {data.currentMedications && data.currentMedications.length > 0 && (
          <div className="space-y-2">
            {data.currentMedications.map((med, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Pill className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{med.name}</span>
                <span className="text-sm text-slate-600">{med.dosage}</span>
                <span className="text-sm text-slate-500">{med.frequency}</span>
                <button
                  onClick={() => {
                    onChange({
                      ...data,
                      currentMedications: data.currentMedications?.filter((_, idx) => idx !== i)
                    });
                  }}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            value={newMedication.name}
            onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
            placeholder="Medication name"
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={newMedication.dosage}
            onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
            placeholder="Dosage (e.g., 10mg)"
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={newMedication.frequency}
            onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
            placeholder="Frequency (e.g., twice daily)"
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
          <button
            onClick={addMedication}
            className="px-4 py-2 text-white rounded-lg"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Chronic Conditions */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-slate-700">Chronic Conditions</h3>
        <p className="text-sm text-slate-500">Select all that apply:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {COMMON_CONDITIONS.map(condition => (
            <label
              key={condition}
              className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${data.chronicConditions?.includes(condition)
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-300 hover:bg-slate-50'
                }`}
            >
              <input
                type="checkbox"
                checked={data.chronicConditions?.includes(condition) || false}
                onChange={() => toggleCondition(condition)}
                className="sr-only"
              />
              <span className="text-sm">{condition}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Smoking & Alcohol */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Smoking Status
          </label>
          <select
            value={data.smokingStatus || 'unknown'}
            onChange={(e) => onChange({ ...data, smokingStatus: e.target.value as any })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="unknown">Select...</option>
            <option value="never">Never smoked</option>
            <option value="former">Former smoker</option>
            <option value="current">Current smoker</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Alcohol Use
          </label>
          <select
            value={data.alcoholUse || 'unknown'}
            onChange={(e) => onChange({ ...data, alcoholUse: e.target.value as any })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="unknown">Select...</option>
            <option value="none">None</option>
            <option value="occasional">Occasional (1-2 drinks/week)</option>
            <option value="moderate">Moderate (3-7 drinks/week)</option>
            <option value="heavy">Heavy (8+ drinks/week)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const InsuranceForm: React.FC<{
  data: Partial<InsuranceInfo>;
  onChange: (data: Partial<InsuranceInfo>) => void;
} & FormSectionProps> = ({ data, onChange, branding }) => {
  const updatePrimary = (field: string, value: string) => {
    onChange({
      ...data,
      primaryInsurance: { ...data.primaryInsurance!, [field]: value }
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <FileText className="w-5 h-5" style={{ color: branding.primaryColor }} />
        Insurance Information
      </h2>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-700">Primary Insurance</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Insurance Provider <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.primaryInsurance?.provider || ''}
              onChange={(e) => updatePrimary('provider', e.target.value)}
              placeholder="e.g., Blue Cross Blue Shield"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Policy Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.primaryInsurance?.policyNumber || ''}
              onChange={(e) => updatePrimary('policyNumber', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Group Number
            </label>
            <input
              type="text"
              value={data.primaryInsurance?.groupNumber || ''}
              onChange={(e) => updatePrimary('groupNumber', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Relationship to Subscriber
            </label>
            <select
              value={data.primaryInsurance?.relationship || 'self'}
              onChange={(e) => updatePrimary('relationship', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="self">Self</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subscriber Name
            </label>
            <input
              type="text"
              value={data.primaryInsurance?.subscriberName || ''}
              onChange={(e) => updatePrimary('subscriberName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subscriber Date of Birth
            </label>
            <input
              type="date"
              value={data.primaryInsurance?.subscriberDob || ''}
              onChange={(e) => updatePrimary('subscriberDob', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Please have your insurance card ready. You can also upload a photo of your card at check-in.
        </p>
      </div>
    </div>
  );
};

const ConsentFormSection: React.FC<{
  data: Partial<ConsentForm>;
  onChange: (data: Partial<ConsentForm>) => void;
  privacyNotice: string;
} & FormSectionProps> = ({ data, onChange, branding, privacyNotice }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <Shield className="w-5 h-5" style={{ color: branding.primaryColor }} />
        Consent & Authorization
      </h2>

      {/* HIPAA Notice */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
        <h3 className="font-medium text-teal-800 mb-2">Notice of Privacy Practices</h3>
        <p className="text-sm text-teal-700">{privacyNotice}</p>
      </div>

      <div className="space-y-4">
        {/* Required Consents */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={data.treatmentConsent || false}
              onChange={(e) => onChange({ ...data, treatmentConsent: e.target.checked })}
              className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600"
            />
            <div>
              <span className="font-medium text-slate-800">
                Consent to Treatment <span className="text-red-500">*</span>
              </span>
              <p className="text-sm text-slate-600 mt-1">
                I consent to receive medical treatment and authorize healthcare providers to perform
                necessary examinations, tests, and procedures.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={data.hipaaAcknowledgment || false}
              onChange={(e) => onChange({ ...data, hipaaAcknowledgment: e.target.checked })}
              className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600"
            />
            <div>
              <span className="font-medium text-slate-800">
                HIPAA Acknowledgment <span className="text-red-500">*</span>
              </span>
              <p className="text-sm text-slate-600 mt-1">
                I acknowledge that I have received and reviewed the Notice of Privacy Practices,
                which describes how my health information may be used and disclosed.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={data.releaseOfInformation || false}
              onChange={(e) => onChange({ ...data, releaseOfInformation: e.target.checked })}
              className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600"
            />
            <div>
              <span className="font-medium text-slate-800">Release of Information</span>
              <p className="text-sm text-slate-600 mt-1">
                I authorize the release of my medical information to my designated emergency contacts
                and referring physicians for continuity of care.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={data.financialResponsibility || false}
              onChange={(e) => onChange({ ...data, financialResponsibility: e.target.checked })}
              className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600"
            />
            <div>
              <span className="font-medium text-slate-800">Financial Responsibility</span>
              <p className="text-sm text-slate-600 mt-1">
                I understand that I am financially responsible for charges not covered by my insurance
                and agree to pay any remaining balance.
              </p>
            </div>
          </label>
        </div>

        {/* Optional Consents */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Optional</h3>

          <label className="flex items-start gap-3 p-4 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={data.researchParticipation || false}
              onChange={(e) => onChange({ ...data, researchParticipation: e.target.checked })}
              className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600"
            />
            <div>
              <span className="font-medium text-slate-800">Research Participation</span>
              <p className="text-sm text-slate-600 mt-1">
                I consent to the use of my de-identified health information for research purposes
                to advance medical knowledge.
              </p>
            </div>
          </label>
        </div>
      </div>

      {(!data.treatmentConsent || !data.hipaaAcknowledgment) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Required:</strong> You must consent to treatment and acknowledge HIPAA to complete intake.
          </p>
        </div>
      )}
    </div>
  );
};

const ReviewSection: React.FC<{
  demographics: Partial<PatientDemographics>;
  medicalHistory: Partial<MedicalHistory>;
  insurance: Partial<InsuranceInfo>;
  consent: Partial<ConsentForm>;
} & FormSectionProps> = ({ demographics, medicalHistory, insurance, consent, branding }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <Check className="w-5 h-5" style={{ color: branding.primaryColor }} />
        Review Your Information
      </h2>

      <p className="text-slate-600">
        Please review all information before submitting. Click on any section to make changes.
      </p>

      {/* Demographics Summary */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <h3 className="font-medium text-slate-800 mb-2">Demographics</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-slate-500">Name:</span> {demographics.firstName} {demographics.lastName}</div>
          <div><span className="text-slate-500">DOB:</span> {demographics.dateOfBirth}</div>
          <div><span className="text-slate-500">Phone:</span> {demographics.phone}</div>
          <div><span className="text-slate-500">Email:</span> {demographics.email || 'Not provided'}</div>
        </div>
      </div>

      {/* Medical History Summary */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <h3 className="font-medium text-slate-800 mb-2">Medical History</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-slate-500">Allergies:</span>{' '}
            {medicalHistory.allergies?.length
              ? medicalHistory.allergies.map(a => a.allergen).join(', ')
              : 'None reported'}
          </div>
          <div>
            <span className="text-slate-500">Medications:</span>{' '}
            {medicalHistory.currentMedications?.length
              ? medicalHistory.currentMedications.map(m => m.name).join(', ')
              : 'None reported'}
          </div>
          <div>
            <span className="text-slate-500">Conditions:</span>{' '}
            {medicalHistory.chronicConditions?.length
              ? medicalHistory.chronicConditions.join(', ')
              : 'None reported'}
          </div>
        </div>
      </div>

      {/* Insurance Summary */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <h3 className="font-medium text-slate-800 mb-2">Insurance</h3>
        <div className="text-sm">
          <div><span className="text-slate-500">Provider:</span> {insurance.primaryInsurance?.provider}</div>
          <div><span className="text-slate-500">Policy #:</span> {insurance.primaryInsurance?.policyNumber}</div>
        </div>
      </div>

      {/* Consent Summary */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <h3 className="font-medium text-slate-800 mb-2">Consents</h3>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            {consent.treatmentConsent ? <Check className="w-4 h-4 text-green-500" /> : <span className="w-4 h-4 text-red-500">✗</span>}
            Treatment Consent
          </div>
          <div className="flex items-center gap-2">
            {consent.hipaaAcknowledgment ? <Check className="w-4 h-4 text-green-500" /> : <span className="w-4 h-4 text-red-500">✗</span>}
            HIPAA Acknowledgment
          </div>
          <div className="flex items-center gap-2">
            {consent.releaseOfInformation ? <Check className="w-4 h-4 text-green-500" /> : <span className="w-4 h-4 text-slate-400">○</span>}
            Release of Information
          </div>
          <div className="flex items-center gap-2">
            {consent.financialResponsibility ? <Check className="w-4 h-4 text-green-500" /> : <span className="w-4 h-4 text-slate-400">○</span>}
            Financial Responsibility
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Hospital Branding Configuration Component
// ============================================================================

export const HospitalBrandingConfig: React.FC<{
  branding: HospitalBranding;
  onChange: (branding: HospitalBranding) => void;
}> = ({ branding, onChange }) => {
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border border-slate-200">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <Palette className="w-5 h-5" />
        Hospital Branding Configuration
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hospital Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Hospital Name
          </label>
          <input
            type="text"
            value={branding.hospitalName}
            onChange={(e) => onChange({ ...branding, hospitalName: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        {/* Logo URL */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Logo URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={branding.logoUrl || ''}
              onChange={(e) => onChange({ ...branding, logoUrl: e.target.value })}
              placeholder="https://..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            />
            <button className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Colors */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Primary Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={branding.primaryColor}
              onChange={(e) => onChange({ ...branding, primaryColor: e.target.value })}
              className="w-12 h-10 border border-slate-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={branding.primaryColor}
              onChange={(e) => onChange({ ...branding, primaryColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Secondary Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={branding.secondaryColor}
              onChange={(e) => onChange({ ...branding, secondaryColor: e.target.value })}
              className="w-12 h-10 border border-slate-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={branding.secondaryColor}
              onChange={(e) => onChange({ ...branding, secondaryColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Accent Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={branding.accentColor}
              onChange={(e) => onChange({ ...branding, accentColor: e.target.value })}
              className="w-12 h-10 border border-slate-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={branding.accentColor}
              onChange={(e) => onChange({ ...branding, accentColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
            <Quote className="w-4 h-4" />
            Welcome Message
          </label>
          <textarea
            value={branding.welcomeMessage}
            onChange={(e) => onChange({ ...branding, welcomeMessage: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Privacy Notice
          </label>
          <textarea
            value={branding.privacyNotice}
            onChange={(e) => onChange({ ...branding, privacyNotice: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Footer Text
          </label>
          <input
            type="text"
            value={branding.footerText}
            onChange={(e) => onChange({ ...branding, footerText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 border border-slate-200 rounded-lg">
        <h3 className="text-sm font-medium text-slate-500 mb-3">Preview</h3>
        <div
          className="p-4 rounded-lg text-white"
          style={{ backgroundColor: branding.primaryColor }}
        >
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="h-8" />
            ) : (
              <Building2 className="w-8 h-8" />
            )}
            <span className="font-semibold">{branding.hospitalName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientIntakeForms;
