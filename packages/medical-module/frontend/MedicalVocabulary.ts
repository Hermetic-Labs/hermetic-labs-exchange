/**
 * Comprehensive Medical Vocabulary Database System
 * Features: Searchable database with phonetic matching for voice recognition
 * Includes medical devices, vital signs, procedures, identifiers, and emergency terminology
 */

export interface MedicalDevice {
  id: string;
  name: string;
  category: DeviceCategory;
  synonyms: string[];
  phoneticSpellings: string[];
  description: string;
  manufacturer?: string;
  model?: string;
  alertCapabilities?: boolean;
  recordCapabilities?: boolean;
  location?: string[];
}

export interface VitalSign {
  id: string;
  name: string;
  synonyms: string[];
  phoneticSpellings: string[];
  unit: string;
  normalRange: NormalRange;
  criticalLow: number;
  criticalHigh: number;
  measurementMethod?: string;
  frequency?: string;
}

export interface NormalRange {
  adult: Range;
  pediatric?: Range;
  geriatric?: Range;
}

export interface Range {
  min: number;
  max: number;
  description: string;
}

export interface MedicalProcedure {
  id: string;
  name: string;
  synonyms: string[];
  phoneticSpellings: string[];
  category: ProcedureCategory;
  urgency: UrgencyLevel;
  estimatedTime?: string;
  equipment?: string[];
  description: string;
}

export interface PatientIdentifier {
  id: string;
  name: string;
  synonyms: string[];
  phoneticSpellings: string[];
  format: string;
  validation: string;
  example: string;
}

export interface EmergencyTerm {
  id: string;
  name: string;
  synonyms: string[];
  phoneticSpellings: string[];
  category: EmergencyCategory;
  urgency: UrgencyLevel;
  severity: SeverityLevel;
  responseTime: string;
  description: string;
}

export interface MedicalUnit {
  id: string;
  name: string;
  abbreviation: string;
  fullName: string;
  category: UnitCategory;
  conversion?: {
    toBase: number;
    fromBase: number;
    baseUnit: string;
  };
}

export interface PhoneticMatch {
  term: string;
  similarity: number;
  category: string;
  id: string;
}

export type DeviceCategory = 
  | 'monitoring'
  | 'therapeutic'
  | 'diagnostic'
  | 'surgical'
  | 'respiratory'
  | 'cardiac'
  | 'laboratory'
  | 'imaging';

export type ProcedureCategory = 
  | 'assessment'
  | 'intervention'
  | 'monitoring'
  | 'emergency'
  | 'routine'
  | 'surgical'
  | 'diagnostic';

export type UrgencyLevel = 'routine' | 'urgent' | 'emergency' | 'critical';

export type EmergencyCategory = 
  | 'cardiac'
  | 'respiratory'
  | 'neurological'
  | 'trauma'
  | 'allergic'
  | 'sepsis'
  | 'drug'
  | 'environmental';

export type SeverityLevel = 'mild' | 'moderate' | 'severe' | 'critical';

export type UnitCategory = 
  | 'volume'
  | 'pressure'
  | 'temperature'
  | 'frequency'
  | 'concentration'
  | 'length'
  | 'mass'
  | 'time'
  | 'electrical';

export class MedicalVocabularyDatabase {
  private devices: MedicalDevice[] = [];
  private vitalSigns: VitalSign[] = [];
  private procedures: MedicalProcedure[] = [];
  private patientIdentifiers: PatientIdentifier[] = [];
  private emergencyTerms: EmergencyTerm[] = [];
  private medicalUnits: MedicalUnit[] = [];

  constructor() {
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.initializeMedicalDevices();
    this.initializeVitalSigns();
    this.initializeProcedures();
    this.initializePatientIdentifiers();
    this.initializeEmergencyTerms();
    this.initializeMedicalUnits();
  }

  private initializeMedicalDevices(): void {
    this.devices = [
      // Monitoring Devices
      {
        id: 'heart-monitor',
        name: 'Heart Monitor',
        category: 'cardiac',
        synonyms: ['cardiac monitor', 'ECG monitor', 'cardiac telemetry', 'heart rhythm monitor'],
        phoneticSpellings: ['hart mon-i-tor', 'kar-dee-ak mon-i-tor', 'ee-see-gee mon-i-tor'],
        description: 'Continuous monitoring of cardiac rhythm and heart rate',
        manufacturer: 'Philips',
        alertCapabilities: true,
        recordCapabilities: true,
        location: ['ICU', 'CCU', 'Emergency Department', 'Step-down']
      },
      {
        id: 'infusion-pump',
        name: 'Infusion Pump',
        category: 'therapeutic',
        synonyms: ['IV pump', 'intravenous pump', 'syringe pump', 'fluid pump'],
        phoneticSpellings: ['in-fu-zhun pump', 'eye-vee pump', 'in-tra-vee-nus pump'],
        description: 'Automated delivery of intravenous fluids and medications',
        alertCapabilities: true,
        recordCapabilities: true,
        location: ['All patient areas']
      },
      {
        id: 'ventilator',
        name: 'Ventilator',
        category: 'respiratory',
        synonyms: ['mechanical ventilator', 'respirator', 'breathing machine'],
        phoneticSpellings: ['ven-ti-lay-tor', 'mek-uh-ki-kul ven-ti-lay-tor', 'res-pi-ray-tor'],
        description: 'Mechanical support for breathing and oxygenation',
        manufacturer: 'Dräger',
        alertCapabilities: true,
        recordCapabilities: true,
        location: ['ICU', 'Emergency Department', 'Operating Room']
      },
      {
        id: 'ecg-machine',
        name: 'ECG Machine',
        category: 'diagnostic',
        synonyms: ['electrocardiogram', 'EKG machine', 'cardiac rhythm strip'],
        phoneticSpellings: ['ee-see-gee ma-shin', 'elek-tro-kar-dee-o-gram', 'kay-jee ma-shin'],
        description: 'Records electrical activity of the heart',
        alertCapabilities: false,
        recordCapabilities: true,
        location: ['All clinical areas']
      },
      {
        id: 'blood-pressure-monitor',
        name: 'Blood Pressure Monitor',
        category: 'monitoring',
        synonyms: ['BP monitor', 'sphygmomanometer', 'pressure cuff'],
        phoneticSpellings: ['blud presh-ur mon-i-tor', 'sfig-mo-ma-nom-e-ter'],
        description: 'Measures arterial blood pressure',
        alertCapabilities: true,
        recordCapabilities: true,
        location: ['All patient areas']
      },
      {
        id: 'pulse-oximeter',
        name: 'Pulse Oximeter',
        category: 'monitoring',
        synonyms: ['oxygen saturation monitor', 'SpO2 monitor', 'pulse ox'],
        phoneticSpellings: ['puls ok-sim-e-ter', 'ok-si-jen sat-ur-ray-shun mon-i-tor'],
        description: 'Non-invasive measurement of oxygen saturation',
        alertCapabilities: true,
        recordCapabilities: true,
        location: ['All patient areas']
      },
      {
        id: 'defibrillator',
        name: 'Defibrillator',
        category: 'cardiac',
        synonyms: ['AED', 'automated external defibrillator', 'shock machine'],
        phoneticSpellings: ['dee-fib-ri-lay-tor', 'ay-ee-dee', 'aw-to-mat-ed eks-ter-nul def-ib-ri-lay-tor'],
        description: 'Delivers electrical shock to restore normal heart rhythm',
        manufacturer: 'Medtronic',
        alertCapabilities: true,
        recordCapabilities: true,
        location: ['Emergency Department', 'ICU', 'General wards']
      },
      {
        id: 'suction-unit',
        name: 'Suction Unit',
        category: 'therapeutic',
        synonyms: ['suction machine', 'airway suction', 'secretion suction'],
        phoneticSpellings: ['suk-shun yoo-nit', 'suk-shun ma-shin', 'air-way suk-shun'],
        description: 'Removes secretions and fluids from airways',
        alertCapabilities: false,
        recordCapabilities: false,
        location: ['All clinical areas']
      },
      {
        id: 'nebulizer',
        name: 'Nebulizer',
        category: 'respiratory',
        synonyms: ['aerosol therapy', 'inhalation therapy', 'breathing treatment'],
        phoneticSpellings: ['neb-yu-lie-zer', 'air-o-sol ther-uh-pee', 'in-huh-lay-shun ther-uh-pee'],
        description: 'Delivers medication as mist for inhalation',
        alertCapabilities: false,
        recordCapabilities: false,
        location: ['All patient areas']
      },
      {
        id: 'bedside-monitor',
        name: 'Bedside Monitor',
        category: 'monitoring',
        synonyms: ['patient monitor', 'vital signs monitor', 'bedside unit'],
        phoneticSpellings: ['bed-sied mon-i-tor', 'pay-shent mon-i-tor', 'vie-tul sienz mon-i-tor'],
        description: 'Multi-parameter monitoring at patient bedside',
        alertCapabilities: true,
        recordCapabilities: true,
        location: ['All patient rooms', 'ICU', 'Emergency Department']
      }
    ];
  }

  private initializeVitalSigns(): void {
    this.vitalSigns = [
      {
        id: 'blood-pressure',
        name: 'Blood Pressure',
        synonyms: ['BP', 'arterial pressure', 'systolic pressure', 'diastolic pressure'],
        phoneticSpellings: ['blud presh-ur', 'ar-teer-ee-ul presh-ur', 'sis-tol-ik presh-ur', 'die-as-tol-ik presh-ur'],
        unit: 'mmHg',
        normalRange: {
          adult: { min: 90, max: 140, description: '90-140 mmHg (systolic)' },
          pediatric: { min: 80, max: 120, description: '80-120 mmHg (pediatric systolic)' },
          geriatric: { min: 100, max: 150, description: '100-150 mmHg (geriatric systolic)' }
        },
        criticalLow: 70,
        criticalHigh: 180,
        measurementMethod: 'Oscillometric or auscultatory',
        frequency: 'Every 4 hours routine, continuous in critical care'
      },
      {
        id: 'heart-rate',
        name: 'Heart Rate',
        synonyms: ['pulse rate', 'HR', 'beats per minute', 'BPM', 'cardiac rate'],
        phoneticSpellings: ['hart rayt', 'puls rayt', 'bee-ay-em', 'bee-ats per min-yu-it', 'kar-dee-ak rayt'],
        unit: 'bpm',
        normalRange: {
          adult: { min: 60, max: 100, description: '60-100 bpm' },
          pediatric: { min: 80, max: 140, description: '80-140 bpm (child)' },
          geriatric: { min: 50, max: 90, description: '50-90 bpm (elderly)' }
        },
        criticalLow: 40,
        criticalHigh: 150,
        measurementMethod: 'Palpation, ECG, pulse oximetry',
        frequency: 'Every 15 minutes in critical care, every 4 hours routine'
      },
      {
        id: 'temperature',
        name: 'Temperature',
        synonyms: ['core temperature', 'body temperature', 'fever', 'hypothermia'],
        phoneticSpellings: ['tem-per-uh-chur', 'kor tem-per-uh-chur', 'bod-ee tem-per-uh-chur', 'fee-ver', 'hi-po-ther-mee-uh'],
        unit: '°C',
        normalRange: {
          adult: { min: 36.1, max: 37.2, description: '36.1-37.2°C (96.8-99°F)' }
        },
        criticalLow: 32.0,
        criticalHigh: 40.0,
        measurementMethod: 'Oral, axillary, tympanic, rectal, temporal',
        frequency: 'Every 4 hours routine, more frequent if abnormal'
      },
      {
        id: 'oxygen-saturation',
        name: 'Oxygen Saturation',
        synonyms: ['SpO2', 'oxygen saturation', 'O2 sat', 'pulse ox'],
        phoneticSpellings: ['ok-si-jen sat-ur-ray-shun', 'es-pee-oh-too', 'oh-too sat', 'puls ok-sih'],
        unit: '%',
        normalRange: {
          adult: { min: 95, max: 100, description: '95-100%' }
        },
        criticalLow: 85,
        criticalHigh: 100,
        measurementMethod: 'Pulse oximetry, arterial blood gas',
        frequency: 'Continuous in critical care, spot checks routine'
      },
      {
        id: 'respiratory-rate',
        name: 'Respiratory Rate',
        synonyms: ['RR', 'breathing rate', 'respiration', 'breaths per minute'],
        phoneticSpellings: ['res-pi-ray-tor-ee rayt', 'breath-ing rayt', 'res-pi-ray-shun', 'breaths per min-yu-it'],
        unit: 'breaths/min',
        normalRange: {
          adult: { min: 12, max: 20, description: '12-20 breaths/min' },
          pediatric: { min: 20, max: 40, description: '20-40 breaths/min (child)' },
          geriatric: { min: 12, max: 18, description: '12-18 breaths/min (elderly)' }
        },
        criticalLow: 8,
        criticalHigh: 30,
        measurementMethod: 'Observation, capnography, respiratory monitor',
        frequency: 'Every 15 minutes critical care, every 4 hours routine'
      },
      {
        id: 'pain-score',
        name: 'Pain Score',
        synonyms: ['pain level', 'pain assessment', 'VAS', 'pain scale'],
        phoneticSpellings: ['payn skor', 'payn lev-ul', 'payn uh-ses-ment', 'vee-ay-ess', 'payn skayl'],
        unit: 'scale 0-10',
        normalRange: {
          adult: { min: 0, max: 3, description: '0-3 (mild pain)' }
        },
        criticalLow: 0,
        criticalHigh: 10,
        measurementMethod: 'Patient report, observation, behavior scale',
        frequency: 'Every 4 hours routine, before/after interventions'
      },
      {
        id: 'glucose',
        name: 'Blood Glucose',
        synonyms: ['blood sugar', 'blood glucose level', 'BG', 'glycemia'],
        phoneticSpellings: ['blud glu-kohs', 'blud shoo-ger', 'blud glu-kohs lev-ul', 'bee-gee', 'gly-see-mee-uh'],
        unit: 'mg/dL',
        normalRange: {
          adult: { min: 70, max: 140, description: '70-140 mg/dL (fasting)' }
        },
        criticalLow: 50,
        criticalHigh: 400,
        measurementMethod: 'Capillary blood glucose, laboratory test',
        frequency: 'Per protocol (diabetic, critical care, surgical)'
      }
    ];
  }

  private initializeProcedures(): void {
    this.procedures = [
      {
        id: 'monitor-vital-signs',
        name: 'Monitor Vital Signs',
        category: 'monitoring',
        urgency: 'routine',
        synonyms: ['check vitals', 'vital signs check', 'vitals monitoring'],
        phoneticSpellings: ['mon-i-tor vie-tul sienz', 'chek vie-tuls', 'vie-tul sienz chek'],
        equipment: ['blood pressure cuff', 'thermometer', 'pulse oximeter'],
        description: 'Regular assessment of patient vital signs per protocol'
      },
      {
        id: 'measure-blood-pressure',
        name: 'Measure Blood Pressure',
        category: 'assessment',
        urgency: 'routine',
        synonyms: ['BP measurement', 'check blood pressure', 'take BP'],
        phoneticSpellings: ['mezh-ur blud presh-ur', 'bee-pee mezh-ur-ment', 'chek blud presh-ur'],
        equipment: ['sphygmomanometer', 'stethoscope'],
        description: 'Measurement of arterial blood pressure using manual or automated methods'
      },
      {
        id: 'administer-medication',
        name: 'Administer Medication',
        category: 'intervention',
        urgency: 'urgent',
        synonyms: ['give medication', 'drug administration', 'med delivery'],
        phoneticSpellings: ['ad-min-is-ter med-i-kay-shun', 'giv med-i-kay-shun', 'drug ad-min-is-tray-shun'],
        equipment: ['syringe', 'IV pump', 'medication cart'],
        description: 'Delivery of prescribed medication to patient via appropriate route'
      },
      {
        id: 'assess-patient',
        name: 'Assess Patient',
        category: 'assessment',
        urgency: 'routine',
        synonyms: ['patient assessment', 'clinical assessment', 'patient evaluation'],
        phoneticSpellings: ['uh-ses pay-shent', 'pay-shent uh-ses-ment', 'klin-ik-ul uh-ses-ment'],
        equipment: ['stethoscope', 'reflex hammer', 'penlight'],
        description: 'Comprehensive evaluation of patient condition and symptoms'
      },
      {
        id: 'record-vitals',
        name: 'Record Vital Signs',
        category: 'monitoring',
        urgency: 'routine',
        synonyms: ['document vitals', 'chart vital signs', 'log vitals'],
        phoneticSpellings: ['ri-kord vie-tul sienz', 'dok-yooment vie-tuls', 'chart vie-tul sienz'],
        equipment: ['electronic health record', 'vital signs sheet'],
        description: 'Documentation of vital signs measurements in patient record'
      },
      {
        id: 'analyze-ecg',
        name: 'Analyze ECG',
        category: 'diagnostic',
        urgency: 'urgent',
        synonyms: ['interpret ECG', 'ECG analysis', 'heart rhythm analysis'],
        phoneticSpellings: ['an-uh-lize ee-see-gee', 'in-ter-prit ee-see-gee', 'hart rith-m an-uh-lize'],
        equipment: ['ECG machine', 'monitor', 'calipers'],
        description: 'Interpretation of electrocardiogram for cardiac rhythm analysis'
      },
      {
        id: 'respond-to-alert',
        name: 'Respond to Alert',
        category: 'emergency',
        urgency: 'critical',
        synonyms: ['alarm response', 'alert acknowledgment', 'alarm handling'],
        phoneticSpellings: ['ri-spond too uh-lurt', 'uh-larm ri-spons', 'uh-lurt ak-nawl-ij-ment'],
        equipment: ['monitor', 'nurse call system'],
        description: 'Immediate response to patient monitoring system alerts'
      },
      {
        id: 'calibrate-device',
        name: 'Calibrate Device',
        category: 'assessment',
        urgency: 'routine',
        synonyms: ['device calibration', 'equipment calibration', 'device setup'],
        phoneticSpellings: ['kal-i-brate di-vies', 'ek-wip-ment kal-i-bray-shun', 'di-vies set-up'],
        equipment: ['calibration tools', 'test equipment'],
        description: 'Adjustment and verification of medical device accuracy'
      }
    ];
  }

  private initializePatientIdentifiers(): void {
    this.patientIdentifiers = [
      {
        id: 'patient-id',
        name: 'Patient ID',
        synonyms: ['patient identifier', 'medical record number', 'MRN', 'chart number'],
        phoneticSpellings: ['pay-shent eye-dee', 'pay-shent eye-den-ti-fie-er', 'med-i-kul re-kord num-ber'],
        format: 'Numeric or alphanumeric string',
        validation: 'Unique hospital identifier',
        example: 'MRN123456, CH789012'
      },
      {
        id: 'room-number',
        name: 'Room Number',
        synonyms: ['room', 'patient room', 'room assignment'],
        phoneticSpellings: ['room num-ber', 'pay-shent room', 'room uh-sine-ment'],
        format: 'Numeric with letter designation',
        validation: 'Building and floor location',
        example: '301A, 205B, ICU-01'
      },
      {
        id: 'bed-assignment',
        name: 'Bed Assignment',
        synonyms: ['bed', 'bed number', 'bed location'],
        phoneticSpellings: ['bed uh-sine-ment', 'bed', 'bed num-ber', 'bed lo-kay-shun'],
        format: 'Room number with bed letter',
        validation: 'Specific bed within room',
        example: '301A-1, 205B-2, ICU-01-A'
      },
      {
        id: 'patient-name',
        name: 'Patient Name',
        synonyms: ['full name', 'patient identification', 'name'],
        phoneticSpellings: ['pay-shent naym', 'full naym', 'pay-shent eye-den-ti-fi-kay-shun'],
        format: 'First, Middle, Last name',
        validation: 'Official identification',
        example: 'John Michael Smith, Jane A. Doe'
      },
      {
        id: 'date-of-birth',
        name: 'Date of Birth',
        synonyms: ['DOB', 'birth date', 'birthday'],
        phoneticSpellings: ['dayt uv burth', 'dee-oh-bee', 'burth dayt', 'burth-day'],
        format: 'MM/DD/YYYY',
        validation: 'Patient age verification',
        example: '03/15/1985, 07/22/1970'
      },
      {
        id: 'allergies',
        name: 'Allergies',
        synonyms: ['drug allergies', 'allergy list', 'allergy information'],
        phoneticSpellings: ['al-ur-jeez', 'drug al-ur-jeez', 'al-ur-jee list'],
        format: 'Drug name with reaction type',
        validation: 'Critical safety information',
        example: 'Penicillin - rash, Latex - hives'
      }
    ];
  }

  private initializeEmergencyTerms(): void {
    this.emergencyTerms = [
      {
        id: 'cardiac-arrest',
        name: 'Cardiac Arrest',
        category: 'cardiac',
        severity: 'critical',
        urgency: 'emergency',
        synonyms: ['heart attack', 'cardiac emergency', 'code blue'],
        phoneticSpellings: ['kar-dee-ak uh-rest', 'hart uh-tak', 'kar-dee-ak i-mer-jen-see', 'kohd bloo'],
        responseTime: 'Immediate',
        description: 'Sudden cessation of cardiac activity requiring immediate intervention'
      },
      {
        id: 'respiratory-distress',
        name: 'Respiratory Distress',
        category: 'respiratory',
        severity: 'severe',
        urgency: 'urgent',
        synonyms: ['breathing difficulty', 'shortness of breath', 'dyspnea'],
        phoneticSpellings: ['res-pi-ray-tor-ee dis-tres', 'breath-ing dif-i-kul-tee', 'short-ness uv breth', 'dis-pnee-uh'],
        responseTime: 'Within 5 minutes',
        description: 'Difficulty breathing requiring immediate respiratory support'
      },
      {
        id: 'septic-shock',
        name: 'Septic Shock',
        category: 'sepsis',
        severity: 'critical',
        urgency: 'emergency',
        synonyms: ['sepsis', 'blood infection', 'systemic infection'],
        phoneticSpellings: ['sep-tik shok', 'sep-sis', 'blud in-fek-shun', 'sis-tem-ik in-fek-shun'],
        responseTime: 'Immediate',
        description: 'Life-threatening condition caused by bloodstream infection'
      },
      {
        id: 'anaphylaxis',
        name: 'Anaphylaxis',
        category: 'allergic',
        severity: 'critical',
        urgency: 'emergency',
        synonyms: ['severe allergic reaction', 'allergic emergency', 'anaphylactic shock'],
        phoneticSpellings: ['an-uh-fi-lak-sis', 'si-veer al-ur-jik ri-ak-shun', 'al-ur-jik i-mer-jen-see'],
        responseTime: 'Immediate',
        description: 'Severe, potentially life-threatening allergic reaction'
      },
      {
        id: 'stroke',
        name: 'Stroke',
        category: 'neurological',
        severity: 'critical',
        urgency: 'emergency',
        synonyms: ['CVA', 'brain attack', 'cerebrovascular accident'],
        phoneticSpellings: ['strohk', 'see-vee-ay', 'brain uh-tak', 'ser-e-bro-vas-kyoo-lar ak-si-dent'],
        responseTime: 'Within 15 minutes',
        description: 'Sudden neurological deficit due to brain blood flow interruption'
      },
      {
        id: 'trauma',
        name: 'Trauma',
        category: 'trauma',
        severity: 'moderate',
        urgency: 'urgent',
        synonyms: ['injury', 'accident', 'traumatic injury'],
        phoneticSpellings: ['traw-muh', 'in-joo-ree', 'ak-si-dent', 'traw-mat-ik in-joo-ree'],
        responseTime: 'Within 30 minutes',
        description: 'Physical injury requiring medical intervention'
      },
      {
        id: 'hypoglycemia',
        name: 'Hypoglycemia',
        category: 'drug',
        severity: 'moderate',
        urgency: 'urgent',
        synonyms: ['low blood sugar', 'insulin reaction', 'sugar crash'],
        phoneticSpellings: ['hi-po-gly-see-mee-uh', 'lo blud shoo-ger', 'in-soo-lin ri-ak-shun', 'shoo-ger krash'],
        responseTime: 'Within 15 minutes',
        description: 'Dangerously low blood glucose level'
      },
      {
        id: 'hyperthermia',
        name: 'Hyperthermia',
        category: 'environmental',
        severity: 'moderate',
        urgency: 'urgent',
        synonyms: ['heat stroke', 'hyperpyrexia', 'severe fever'],
        phoneticSpellings: ['hi-per-ther-mee-uh', 'heet strohk', 'hi-per-pi-rek-see-uh', 'si-veer feever'],
        responseTime: 'Within 30 minutes',
        description: 'Dangerously elevated body temperature'
      }
    ];
  }

  private initializeMedicalUnits(): void {
    this.medicalUnits = [
      {
        id: 'millimeter-mercury',
        name: 'Millimeter of Mercury',
        abbreviation: 'mmHg',
        fullName: 'Millimeter of Mercury',
        category: 'pressure',
        conversion: {
          toBase: 1,
          fromBase: 1,
          baseUnit: 'mmHg'
        }
      },
      {
        id: 'beats-per-minute',
        name: 'Beats Per Minute',
        abbreviation: 'bpm',
        fullName: 'Beats Per Minute',
        category: 'frequency'
      },
      {
        id: 'degrees-celsius',
        name: 'Degrees Celsius',
        abbreviation: '°C',
        fullName: 'Degrees Celsius',
        category: 'temperature',
        conversion: {
          toBase: 1,
          fromBase: 1,
          baseUnit: '°C'
        }
      },
      {
        id: 'percent',
        name: 'Percent',
        abbreviation: '%',
        fullName: 'Percent',
        category: 'concentration'
      },
      {
        id: 'milligrams-deciliter',
        name: 'Milligrams per Deciliter',
        abbreviation: 'mg/dL',
        fullName: 'Milligrams per Deciliter',
        category: 'concentration'
      },
      {
        id: 'millivolts',
        name: 'Millivolts',
        abbreviation: 'mV',
        fullName: 'Millivolts',
        category: 'electrical'
      },
      {
        id: 'liters-per-minute',
        name: 'Liters per Minute',
        abbreviation: 'L/min',
        fullName: 'Liters per Minute',
        category: 'volume'
      },
      {
        id: 'centimeters-water',
        name: 'Centimeters of Water',
        abbreviation: 'cmH2O',
        fullName: 'Centimeters of Water',
        category: 'pressure',
        conversion: {
          toBase: 0.735,
          fromBase: 1.36,
          baseUnit: 'mmHg'
        }
      }
    ];
  }

  /**
   * Search the database for medical terms
   */
  public search(query: string, category?: string): MedicalDevice[] | VitalSign[] | MedicalProcedure[] | PatientIdentifier[] | EmergencyTerm[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (category) {
      switch (category.toLowerCase()) {
        case 'devices':
        case 'medical-devices':
          return this.devices.filter(device => 
            device.name.toLowerCase().includes(normalizedQuery) ||
            device.synonyms.some(syn => syn.toLowerCase().includes(normalizedQuery))
          );
        case 'vitals':
        case 'vital-signs':
          return this.vitalSigns.filter(vital => 
            vital.name.toLowerCase().includes(normalizedQuery) ||
            vital.synonyms.some(syn => syn.toLowerCase().includes(normalizedQuery))
          );
        case 'procedures':
          return this.procedures.filter(procedure => 
            procedure.name.toLowerCase().includes(normalizedQuery) ||
            procedure.synonyms.some(syn => syn.toLowerCase().includes(normalizedQuery))
          );
        case 'identifiers':
        case 'patient-identifiers':
          return this.patientIdentifiers.filter(identifier => 
            identifier.name.toLowerCase().includes(normalizedQuery) ||
            identifier.synonyms.some(syn => syn.toLowerCase().includes(normalizedQuery))
          );
        case 'emergency':
        case 'emergencies':
          return this.emergencyTerms.filter(emergency => 
            emergency.name.toLowerCase().includes(normalizedQuery) ||
            emergency.synonyms.some(syn => syn.toLowerCase().includes(normalizedQuery))
          );
      }
    }

    // Search all categories
    const allResults: any[] = [];
    allResults.push(...this.devices.filter(device => 
      device.name.toLowerCase().includes(normalizedQuery) ||
      device.synonyms.some(syn => syn.toLowerCase().includes(normalizedQuery))
    ));
    allResults.push(...this.vitalSigns.filter(vital => 
      vital.name.toLowerCase().includes(normalizedQuery) ||
      vital.synonyms.some(syn => syn.toLowerCase().includes(normalizedQuery))
    ));
    allResults.push(...this.procedures.filter(procedure => 
      procedure.name.toLowerCase().includes(normalizedQuery) ||
      procedure.synonyms.some(syn => syn.toLowerCase().includes(normalizedQuery))
    ));
    allResults.push(...this.patientIdentifiers.filter(identifier => 
      identifier.name.toLowerCase().includes(normalizedQuery) ||
      identifier.synonyms.some(syn => syn.toLowerCase().includes(normalizedQuery))
    ));
    allResults.push(...this.emergencyTerms.filter(emergency => 
      emergency.name.toLowerCase().includes(normalizedQuery) ||
      emergency.synonyms.some(syn => syn.toLowerCase().includes(normalizedQuery))
    ));

    return allResults;
  }

  /**
   * Find terms with phonetic matching for voice recognition
   */
  public findPhoneticMatches(input: string, threshold: number = 0.7): PhoneticMatch[] {
    const normalizedInput = input.toLowerCase().trim();
    const matches: PhoneticMatch[] = [];

    // Check medical devices
    this.devices.forEach(device => {
      device.phoneticSpellings.forEach(phonetic => {
        const similarity = this.calculateSimilarity(normalizedInput, phonetic.toLowerCase());
        if (similarity >= threshold) {
          matches.push({
            term: device.name,
            similarity,
            category: 'Medical Device',
            id: device.id
          });
        }
      });
    });

    // Check vital signs
    this.vitalSigns.forEach(vital => {
      vital.phoneticSpellings.forEach(phonetic => {
        const similarity = this.calculateSimilarity(normalizedInput, phonetic.toLowerCase());
        if (similarity >= threshold) {
          matches.push({
            term: vital.name,
            similarity,
            category: 'Vital Sign',
            id: vital.id
          });
        }
      });
    });

    // Check procedures
    this.procedures.forEach(procedure => {
      procedure.phoneticSpellings.forEach(phonetic => {
        const similarity = this.calculateSimilarity(normalizedInput, phonetic.toLowerCase());
        if (similarity >= threshold) {
          matches.push({
            term: procedure.name,
            similarity,
            category: 'Medical Procedure',
            id: procedure.id
          });
        }
      });
    });

    // Sort by similarity (highest first)
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get all categories of medical vocabulary
   */
  public getCategories(): string[] {
    return [
      'Medical Devices',
      'Vital Signs',
      'Medical Procedures',
      'Patient Identifiers',
      'Emergency Terms',
      'Medical Units'
    ];
  }

  /**
   * Get all medical devices by category
   */
  public getDevicesByCategory(category: DeviceCategory): MedicalDevice[] {
    return this.devices.filter(device => device.category === category);
  }

  /**
   * Get vital signs with critical value ranges
   */
  public getCriticalVitalSigns(): VitalSign[] {
    return this.vitalSigns;
  }

  /**
   * Get emergency terms by severity
   */
  public getEmergencyTermsBySeverity(severity: SeverityLevel): EmergencyTerm[] {
    return this.emergencyTerms.filter(emergency => emergency.severity === severity);
  }

  /**
   * Get all terms for export
   */
  public exportAllData(): any {
    return {
      devices: this.devices,
      vitalSigns: this.vitalSigns,
      procedures: this.procedures,
      patientIdentifiers: this.patientIdentifiers,
      emergencyTerms: this.emergencyTerms,
      medicalUnits: this.medicalUnits,
      metadata: {
        totalDevices: this.devices.length,
        totalVitalSigns: this.vitalSigns.length,
        totalProcedures: this.procedures.length,
        totalPatientIdentifiers: this.patientIdentifiers.length,
        totalEmergencyTerms: this.emergencyTerms.length,
        totalMedicalUnits: this.medicalUnits.length,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Get database statistics
   */
  public getStatistics(): any {
    return {
      totalEntries: this.devices.length + this.vitalSigns.length + this.procedures.length + 
                   this.patientIdentifiers.length + this.emergencyTerms.length + this.medicalUnits.length,
      devices: {
        total: this.devices.length,
        categories: this.getDeviceCategoryCount()
      },
      vitalSigns: {
        total: this.vitalSigns.length
      },
      procedures: {
        total: this.procedures.length,
        urgency: this.getProcedureUrgencyCount()
      },
      emergencyTerms: {
        total: this.emergencyTerms.length,
        severity: this.getEmergencySeverityCount()
      }
    };
  }

  private getDeviceCategoryCount(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.devices.forEach(device => {
      counts[device.category] = (counts[device.category] || 0) + 1;
    });
    return counts;
  }

  private getProcedureUrgencyCount(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.procedures.forEach(procedure => {
      counts[procedure.urgency] = (counts[procedure.urgency] || 0) + 1;
    });
    return counts;
  }

  private getEmergencySeverityCount(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.emergencyTerms.forEach(emergency => {
      counts[emergency.severity] = (counts[emergency.severity] || 0) + 1;
    });
    return counts;
  }
}

// Export singleton instance
export const medicalVocabularyDB = new MedicalVocabularyDatabase();

// Export utility functions
export const searchMedicalTerm = (query: string, category?: string) => 
  medicalVocabularyDB.search(query, category);

export const findPhoneticMatches = (input: string, threshold?: number) => 
  medicalVocabularyDB.findPhoneticMatches(input, threshold);

export const getMedicalCategories = () => 
  medicalVocabularyDB.getCategories();

export const exportMedicalVocabulary = () => 
  medicalVocabularyDB.exportAllData();

export const getVocabularyStatistics = () => 
  medicalVocabularyDB.getStatistics();