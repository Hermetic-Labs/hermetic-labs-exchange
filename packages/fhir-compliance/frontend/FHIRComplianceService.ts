/**
 * FHIR R4 Compliance System
 * Comprehensive FHIR implementation for patient data exchange, clinical data formatting,
 * and hospital EHR interoperability
 * 
 * Features:
 * - FHIR R4 standard implementation
 * - Resource types: Patient, Observation, Encounter, Device, Practitioner
 * - Data validation and schema compliance
 * - RESTful API integration with FHIR servers
 * - Patient identity management and matching
 * - Clinical data formatting and normalization
 * - Hospital EHR interoperability
 * - FHIR validation and error handling
 */



// FHIR R4 Core Types and Interfaces
export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: FHIRMeta;
  implicitRules?: string;
  language?: string;
  text?: FHIRNarrative;
  contained?: FHIRResource[];
  extension?: FHIRExtension[];
  modifierExtension?: FHIRExtension[];
}

export interface FHIRMeta {
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  profile?: string[];
  security?: FHIRCoding[];
  tag?: FHIRCoding[];
}

export interface FHIRNarrative {
  status: 'generated' | 'extensions' | 'additional' | 'empty';
  div: string;
}

export interface FHIRExtension {
  url: string;
  valueString?: string;
  valueInteger?: number;
  valueDecimal?: number;
  valueBoolean?: boolean;
  valueUri?: string;
  valueUrl?: string;
  valueCanonical?: string;
  valueBase64Binary?: string;
  valueInstant?: string;
  valueDate?: string;
  valueDateTime?: string;
  valueTime?: string;
  valueCode?: string;
  valueOid?: string;
  valueUuid?: string;
  valueId?: string;
  valueUnsignedInt?: number;
  valuePositiveInt?: number;
  valueMarkdown?: string;
}

export interface FHIRCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

export interface FHIRCodeableConcept {
  coding?: FHIRCoding[];
  text?: string;
}

export interface FHIRIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FHIRCodeableConcept;
  system?: string;
  value?: string;
  period?: FHIRPeriod;
  assigner?: FHIRReference;
}

export interface FHIRPeriod {
  start?: string;
  end?: string;
}

export interface FHIRReference {
  reference?: string;
  type?: string;
  identifier?: FHIRIdentifier;
  display?: string;
}

export interface FHIRQuantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

export interface FHIRAnnotation {
  authorReference?: FHIRReference;
  authorString?: string;
  time?: string;
  text: string;
}

// FHIR Resource Type Definitions
export interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: FHIRIdentifier[];
  active?: boolean;
  name?: FHIRHumanName[];
  telecom?: FHIRContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: FHIRAddress[];
  maritalStatus?: FHIRCodeableConcept;
  multipleBirthBoolean?: boolean;
  multipleBirthInteger?: number;
  photo?: FHIRAttachment[];
  contact?: FHIRPatientContact[];
  communication?: FHIRPatientCommunication[];
  generalPractitioner?: FHIRReference[];
  managingOrganization?: FHIRReference;
  link?: FHIRPatientLink[];
}

export interface FHIRHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FHIRPeriod;
}

export interface FHIRContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: FHIRPeriod;
}

export interface FHIRAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FHIRPeriod;
}

export interface FHIRAttachment {
  contentType?: string;
  language?: string;
  data?: string;
  url?: string;
  size?: number;
  hash?: string;
  title?: string;
  creation?: string;
}

export interface FHIRPatientContact {
  relationship?: FHIRCodeableConcept[];
  name?: FHIRHumanName;
  telecom?: FHIRContactPoint[];
  address?: FHIRAddress;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  organization?: FHIRReference;
  period?: FHIRPeriod;
}

export interface FHIRPatientCommunication {
  language: FHIRCodeableConcept;
  preferred?: boolean;
}

export interface FHIRPatientLink {
  other: FHIRReference;
  type: 'replaced-by' | 'replaces' | 'refer' | 'seealso';
}

export interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  identifier?: FHIRIdentifier[];
  basedOn?: FHIRReference[];
  partOf?: FHIRReference[];
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject?: FHIRReference;
  focus?: FHIRReference[];
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  effectivePeriod?: FHIRPeriod;
  effectiveTiming?: any; // FHIRTiming
  effectiveInstant?: string;
  issued?: string;
  performer?: FHIRReference[];
  valueQuantity?: FHIRQuantity;
  valueCodeableConcept?: FHIRCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: FHIRRange;
  valueRatio?: FHIRRatio;
  valueSampledData?: FHIRSampledData;
  valueTime?: string;
  valueDateTime?: string;
  valuePeriod?: FHIRPeriod;
  dataAbsentReason?: FHIRCodeableConcept;
  interpretation?: FHIRCodeableConcept[];
  note?: FHIRAnnotation[];
  bodySite?: FHIRCodeableConcept;
  method?: FHIRCodeableConcept;
  specimen?: FHIRReference;
  device?: FHIRReference;
  referenceRange?: FHIRObservationReferenceRange[];
  component?: FHIRObservationComponent[];
}

export interface FHIRRange {
  low?: FHIRQuantity;
  high?: FHIRQuantity;
}

export interface FHIRRatio {
  numerator?: FHIRQuantity;
  denominator?: FHIRQuantity;
}

export interface FHIRSampledData {
  origin: FHIRQuantity;
  period: number;
  factor?: number;
  lowerLimit?: number;
  upperLimit?: number;
  dimensions: number;
  data?: string;
}

export interface FHIRObservationReferenceRange {
  low?: FHIRQuantity;
  high?: FHIRQuantity;
  type?: FHIRCodeableConcept;
  appliesTo?: FHIRCodeableConcept[];
  age?: FHIRRange;
  text?: string;
}

export interface FHIRObservationComponent {
  code: FHIRCodeableConcept;
  valueQuantity?: FHIRQuantity;
  valueCodeableConcept?: FHIRCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: FHIRRange;
  valueRatio?: FHIRRatio;
  valueSampledData?: FHIRSampledData;
  valueTime?: string;
  valueDateTime?: string;
  valuePeriod?: FHIRPeriod;
  dataAbsentReason?: FHIRCodeableConcept;
  interpretation?: FHIRCodeableConcept[];
  referenceRange?: FHIRObservationReferenceRange[];
}

export interface FHIREncounter extends FHIRResource {
  resourceType: 'Encounter';
  identifier?: FHIRIdentifier[];
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  statusHistory?: FHIREncounterStatusHistory[];
  class: FHIRCoding;
  classHistory?: FHIREncounterClassHistory[];
  type?: FHIRCodeableConcept[];
  serviceType?: FHIRCodeableConcept;
  priority?: FHIRCodeableConcept;
  subject?: FHIRReference;
  episodeOfCare?: FHIRReference[];
  basedOn?: FHIRReference[];
  participant?: FHIREncounterParticipant[];
  appointment?: FHIRReference[];
  period?: FHIRPeriod;
  length?: FHIRQuantity;
  reasonCode?: FHIRCodeableConcept[];
  reasonReference?: FHIRReference[];
  diagnosis?: FHIREncounterDiagnosis[];
  account?: FHIRReference[];
  hospitalization?: FHIREncounterHospitalization;
  location?: FHIREncounterLocation[];
  serviceProvider?: FHIRReference;
  partOf?: FHIRReference;
}

export interface FHIREncounterStatusHistory {
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  period: FHIRPeriod;
}

export interface FHIREncounterClassHistory {
  class: FHIRCoding;
  period: FHIRPeriod;
}

export interface FHIREncounterParticipant {
  type?: FHIRCodeableConcept[];
  period?: FHIRPeriod;
  individual?: FHIRReference;
}

export interface FHIREncounterDiagnosis {
  condition: FHIRReference;
  use?: FHIRCodeableConcept;
  rank?: number;
}

export interface FHIREncounterHospitalization {
  preAdmissionIdentifier?: FHIRIdentifier;
  origin?: FHIRReference;
  admitSource?: FHIRCodeableConcept;
  reAdmission?: FHIRCodeableConcept;
  dietPreference?: FHIRCodeableConcept[];
  specialCourtesy?: FHIRCodeableConcept[];
  specialArrangement?: FHIRCodeableConcept[];
  destination?: FHIRReference;
  dischargeDisposition?: FHIRCodeableConcept;
}

export interface FHIREncounterLocation {
  location: FHIRReference;
  status?: 'planned' | 'active' | 'reserved' | 'completed';
  physicalType?: FHIRCodeableConcept;
  period?: FHIRPeriod;
}

export interface FHIRDevice extends FHIRResource {
  resourceType: 'Device';
  identifier?: FHIRIdentifier[];
  definition?: FHIRReference;
  status?: 'active' | 'inactive' | 'entered-in-error' | 'unknown';
  statusReason?: FHIRCodeableConcept[];
  category?: FHIRCodeableConcept[];
  type?: FHIRCodeableConcept;
  manufacturer?: string;
  manufactureDate?: string;
  expirationDate?: string;
  serialNumber?: string;
  deviceName?: FHIRDeviceDeviceName[];
  modelNumber?: string;
  version?: FHIRDeviceVersion[];
  property?: FHIRDeviceProperty[];
  patient?: FHIRReference;
  owner?: FHIRReference;
  contact?: FHIRContactPoint[];
  location?: FHIRReference;
  url?: string;
  safety?: FHIRCodeableConcept[];
  note?: FHIRAnnotation[];
  extension?: FHIRExtension[];
}

export interface FHIRDeviceDeviceName {
  name: string;
  type: 'udi-label-name' | 'user-friendly-name' | 'patient-reported-name' | 'manufacturer-name' | 'model-name' | 'other';
}

export interface FHIRDeviceVersion {
  type?: FHIRCodeableConcept;
  value: string;
  component?: FHIRIdentifier;
}

export interface FHIRDeviceProperty {
  type: FHIRCodeableConcept;
  valueQuantity?: FHIRQuantity;
  valueCode?: FHIRCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
}

export interface FHIRPractitioner extends FHIRResource {
  resourceType: 'Practitioner';
  identifier?: FHIRIdentifier[];
  active?: boolean;
  name?: FHIRHumanName[];
  telecom?: FHIRContactPoint[];
  address?: FHIRAddress[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  photo?: FHIRAttachment[];
  qualification?: FHIRPractitionerQualification[];
  communication?: FHIRCodeableConcept[];
}

export interface FHIRPractitionerQualification {
  identifier?: FHIRIdentifier[];
  code: FHIRCodeableConcept;
  period?: FHIRPeriod;
  issuer?: FHIRReference;
}

export interface FHIRBundle extends FHIRResource {
  resourceType: 'Bundle';
  identifier?: FHIRIdentifier;
  type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';
  timestamp?: string;
  total?: number;
  link?: FHIRBundleLink[];
  entry?: FHIRBundleEntry[];
  signature?: FHIRSignature;
}

export interface FHIRBundleLink {
  relation: string;
  url: string;
}

export interface FHIRBundleEntry {
  link?: FHIRBundleLink[];
  fullUrl?: string;
  resource?: FHIRResource;
  search?: FHIRBundleEntrySearch;
  request?: FHIRBundleEntryRequest;
  response?: FHIRBundleEntryResponse;
}

export interface FHIRBundleEntrySearch {
  mode?: 'match' | 'include' | 'outcome';
  score?: number;
}

export interface FHIRBundleEntryRequest {
  method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  ifNoneMatch?: string;
  ifModifiedSince?: string;
  ifMatch?: string;
  ifNoneExist?: string;
}

export interface FHIRBundleEntryResponse {
  status: string;
  location?: string;
  etag?: string;
  lastModified?: string;
  outcome?: FHIRResource;
}

export interface FHIRSignature {
  type: FHIRCoding[];
  when: string;
  who: FHIRReference;
  onBehalfOf?: FHIRReference;
  targetFormat?: string;
  sigFormat?: string;
  data?: string;
}

// Utility Types
export interface FHIRValidationResult {
  isValid: boolean;
  errors: FHIRValidationError[];
  warnings: FHIRValidationWarning[];
  resource?: any;
}

export interface FHIRValidationError {
  field: string;
  code: string;
  message: string;
  path?: string;
}

export interface FHIRValidationWarning {
  field: string;
  code: string;
  message: string;
  path?: string;
}

export interface FHIRServerConfig {
  baseUrl: string;
  version: 'R4' | 'R5';
  authentication?: {
    type: 'basic' | 'bearer' | 'oauth2';
    credentials: any;
  };
  timeout?: number;
  retryAttempts?: number;
}

export interface PatientIdentityMatch {
  patientId: string;
  confidence: number;
  matchFields: string[];
  source: 'exact' | 'fuzzy' | 'identifier' | 'demographic';
  demographics?: Partial<FHIRPatient>;
}

export interface ClinicalDataMapping {
  sourceField: string;
  targetField: string;
  transformation?: 'none' | 'normalize' | 'convert' | 'calculate';
  validation?: {
    required: boolean;
    type: string;
    constraints?: any;
  };
}

// Main FHIR Compliance Service Class
export class FHIRComplianceService {
  private serverConfigs: Map<string, FHIRServerConfig> = new Map();
  private patientCache: Map<string, FHIRPatient> = new Map();
  private identityMatcher: PatientIdentityMatcher;
  private dataMapper: ClinicalDataMapper;
  private validator: FHIRValidator;
  private httpClient: FHIRHttpClient;

  constructor() {
    this.identityMatcher = new PatientIdentityMatcher();
    this.dataMapper = new ClinicalDataMapper();
    this.validator = new FHIRValidator();
    this.httpClient = new FHIRHttpClient();
  }

  /**
   * Add FHIR server configuration
   */
  public addServerConfig(name: string, config: FHIRServerConfig): void {
    this.serverConfigs.set(name, config);
  }

  /**
   * Create FHIR Patient resource from patient data
   */
  public createFHIRPatient(
    patientData: {
      id?: string;
      mrn?: string;
      firstName: string;
      lastName: string;
      middleName?: string;
      dateOfBirth: string;
      gender: 'male' | 'female' | 'other' | 'unknown';
      phone?: string;
      email?: string;
      address?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country?: string;
      };
      emergencyContact?: {
        name: string;
        relationship: string;
        phone: string;
      };
      allergies?: string[];
      medicalRecordNumber?: string;
    }
  ): FHIRPatient {
    const patient: FHIRPatient = {
      resourceType: 'Patient',
      id: patientData.id,
      active: true,
      name: [{
        use: 'official',
        family: patientData.lastName,
        given: patientData.middleName ?
          [patientData.firstName, patientData.middleName] :
          [patientData.firstName]
      }],
      gender: patientData.gender,
      birthDate: patientData.dateOfBirth,
      telecom: [],
      address: []
    };

    // Add identifier (MRN)
    if (patientData.mrn || patientData.medicalRecordNumber) {
      patient.identifier = [{
        use: 'usual',
        system: 'http://hospital.org/mrn',
        value: patientData.mrn || patientData.medicalRecordNumber!
      }];
    }

    // Add contact information
    if (patientData.phone) {
      patient.telecom!.push({
        system: 'phone',
        value: patientData.phone,
        use: 'home'
      });
    }

    if (patientData.email) {
      patient.telecom!.push({
        system: 'email',
        value: patientData.email,
        use: 'home'
      });
    }

    // Add address
    if (patientData.address) {
      patient.address!.push({
        use: 'home',
        type: 'physical',
        line: [patientData.address.street],
        city: patientData.address.city,
        state: patientData.address.state,
        postalCode: patientData.address.zipCode,
        country: patientData.address.country || 'US'
      });
    }

    // Add emergency contact
    if (patientData.emergencyContact) {
      patient.contact = [{
        relationship: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
            code: 'C',
            display: 'Emergency Contact'
          }]
        }],
        name: {
          text: patientData.emergencyContact.name
        },
        telecom: [{
          system: 'phone',
          value: patientData.emergencyContact.phone
        }]
      }];
    }

    // Add allergies as extensions or as conditions
    if (patientData.allergies && patientData.allergies.length > 0) {
      patient.extension = patientData.allergies.map(allergy => ({
        url: 'http://hl7.org/fhir/StructureDefinition/patient-allergyIntolerance',
        valueString: allergy
      }));
    }

    return patient;
  }

  /**
   * Create FHIR Observation resource for vital signs
   */
  public createFHIRObservation(
    patientId: string,
    vitalType: string,
    value: number,
    unit: string,
    deviceId?: string,
    encounterId?: string
  ): FHIRObservation {
    // Get LOINC code for vital type
    const loincCode = this.getLoincCode(vitalType);

    const observation: FHIRObservation = {
      resourceType: 'Observation',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: loincCode.code,
          display: loincCode.display
        }]
      },
      subject: {
        reference: `Patient/${patientId}`
      },
      effectiveDateTime: new Date().toISOString(),
      valueQuantity: {
        value: value,
        unit: unit,
        system: 'http://unitsofmeasure.org',
        code: unit
      },
      issued: new Date().toISOString()
    };

    // Add reference ranges based on vital type
    const referenceRange = this.getReferenceRange(vitalType);
    if (referenceRange) {
      observation.referenceRange = [{
        low: {
          value: referenceRange.low,
          unit: unit
        },
        high: {
          value: referenceRange.high,
          unit: unit
        }
      }];
    }

    // Add device reference
    if (deviceId) {
      observation.device = {
        reference: `Device/${deviceId}`
      };
    }

    // Add encounter reference
    if (encounterId) {
      observation.encounter = {
        reference: `Encounter/${encounterId}`
      };
    }

    return observation;
  }

  /**
   * Create FHIR Device resource from medical device data
   */
  public createFHIRDevice(
    deviceData: {
      id: string;
      name: string;
      manufacturer: string;
      model: string;
      serialNumber: string;
      type: string;
      category?: string;
      patientId?: string;
      location?: string;
      status?: 'active' | 'inactive';
    }
  ): FHIRDevice {
    const device: FHIRDevice = {
      resourceType: 'Device',
      id: deviceData.id,
      identifier: [{
        system: `http://device.${deviceData.manufacturer}.com`,
        value: deviceData.serialNumber
      }],
      status: deviceData.status || 'active',
      manufacturer: deviceData.manufacturer,
      deviceName: [{
        name: deviceData.name,
        type: 'manufacturer-name'
      }],
      modelNumber: deviceData.model,
      type: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: '462240000', // vital signs monitor
          display: deviceData.type
        }]
      }
    };

    // Add patient reference if provided
    if (deviceData.patientId) {
      device.patient = {
        reference: `Patient/${deviceData.patientId}`
      };
    }

    // Add location if provided
    if (deviceData.location) {
      // Would need a Location resource reference here
      device.extension = [{
        url: 'http://hl7.org/fhir/StructureDefinition/device-location',
        valueString: deviceData.location
      }];
    }

    return device;
  }

  /**
   * Create FHIR Practitioner resource
   */
  public createFHIRPractitioner(
    practitionerData: {
      id: string;
      firstName: string;
      lastName: string;
      middleName?: string;
      phone?: string;
      email?: string;
      title?: string;
      department?: string;
      licenseNumber?: string;
      qualifications?: string[];
    }
  ): FHIRPractitioner {
    const practitioner: FHIRPractitioner = {
      resourceType: 'Practitioner',
      id: practitionerData.id,
      active: true,
      name: [{
        use: 'official',
        family: practitionerData.lastName,
        given: practitionerData.middleName ?
          [practitionerData.firstName, practitionerData.middleName] :
          [practitionerData.firstName],
        prefix: practitionerData.title ? [practitionerData.title] : undefined
      }],
      telecom: []
    };

    // Add contact information
    if (practitionerData.phone) {
      practitioner.telecom!.push({
        system: 'phone',
        value: practitionerData.phone,
        use: 'work'
      });
    }

    if (practitionerData.email) {
      practitioner.telecom!.push({
        system: 'email',
        value: practitionerData.email,
        use: 'work'
      });
    }

    // Add qualifications
    if (practitionerData.qualifications && practitionerData.qualifications.length > 0) {
      practitioner.qualification = practitionerData.qualifications.map(qual => ({
        code: {
          text: qual
        }
      }));
    }

    // Add identifier (license number)
    if (practitionerData.licenseNumber) {
      practitioner.identifier = [{
        use: 'official',
        system: 'http://license.authority.org',
        value: practitionerData.licenseNumber
      }];
    }

    return practitioner;
  }

  /**
   * Create FHIR Encounter resource
   */
  public createFHIREncounter(
    encounterData: {
      id: string;
      patientId: string;
      practitionerId?: string;
      status: 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled';
      class: 'AMB' | 'EMER' | 'FLD' | 'HH' | 'IMP' | 'ACU' | 'CHRON' | 'SNON' | 'OBS' | 'VR' | 'ETH' | 'RTL' | 'MTR';
      type?: string;
      reasonCode?: string[];
      startDateTime: string;
      endDateTime?: string;
      location?: string;
    }
  ): FHIREncounter {
    const encounter: FHIREncounter = {
      resourceType: 'Encounter',
      id: encounterData.id,
      status: encounterData.status,
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: encounterData.class,
        display: this.getEncounterClassDisplay(encounterData.class)
      },
      subject: {
        reference: `Patient/${encounterData.patientId}`
      },
      period: {
        start: encounterData.startDateTime,
        end: encounterData.endDateTime
      }
    };

    // Add participant (practitioner)
    if (encounterData.practitionerId) {
      encounter.participant = [{
        individual: {
          reference: `Practitioner/${encounterData.practitionerId}`
        }
      }];
    }

    // Add type
    if (encounterData.type) {
      encounter.type = [{
        text: encounterData.type
      }];
    }

    // Add reason codes
    if (encounterData.reasonCode && encounterData.reasonCode.length > 0) {
      encounter.reasonCode = encounterData.reasonCode.map(code => ({
        text: code
      }));
    }

    return encounter;
  }

  /**
   * Create FHIR Bundle with multiple resources
   */
  public createFHIRBundle(
    resources: FHIRResource[],
    type: FHIRBundle['type'] = 'collection',
    identifier?: string
  ): FHIRBundle {
    const bundle: FHIRBundle = {
      resourceType: 'Bundle',
      type: type,
      timestamp: new Date().toISOString(),
      id: identifier,
      entry: resources.map(resource => ({
        resource: resource,
        fullUrl: resource.id ? `${resource.resourceType}/${resource.id}` : `urn:uuid:${this.generateUUID()}`
      }))
    };

    bundle.total = bundle.entry?.length || 0;
    return bundle;
  }

  /**
   * Validate FHIR resource against R4 specification
   */
  public validateFHIRResource(resource: FHIRResource): FHIRValidationResult {
    return this.validator.validateResource(resource);
  }

  /**
   * Search for patients using FHIR search parameters
   */
  public async searchPatients(
    serverName: string,
    searchParams: {
      name?: string;
      identifier?: string;
      birthdate?: string;
      gender?: string;
      phone?: string;
      email?: string;
    }
  ): Promise<FHIRPatient[]> {
    const config = this.serverConfigs.get(serverName);
    if (!config) {
      throw new Error(`FHIR server configuration not found: ${serverName}`);
    }

    const searchQuery = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        searchQuery.append(key, value);
      }
    });

    const response = await this.httpClient.get(
      `${config.baseUrl}/Patient?${searchQuery.toString()}`,
      config
    );

    if (response.resourceType === 'Bundle') {
      const bundle = response as FHIRBundle;
      return bundle.entry?.map(entry => entry.resource as FHIRPatient) || [];
    }

    return [];
  }

  /**
   * Get patient by ID from FHIR server
   */
  public async getPatientById(serverName: string, patientId: string): Promise<FHIRPatient | null> {
    const config = this.serverConfigs.get(serverName);
    if (!config) {
      throw new Error(`FHIR server configuration not found: ${serverName}`);
    }

    try {
      const response = await this.httpClient.get(
        `${config.baseUrl}/Patient/${patientId}`,
        config
      );

      if (response.resourceType === 'Patient') {
        const patient = response as FHIRPatient;
        this.patientCache.set(patientId, patient);
        return patient;
      }
    } catch (error) {
      console.warn(`Patient not found: ${patientId}`, error);
    }

    return null;
  }

  /**
   * Create patient in FHIR server
   */
  public async createPatient(serverName: string, patient: FHIRPatient): Promise<FHIRPatient> {
    const config = this.serverConfigs.get(serverName);
    if (!config) {
      throw new Error(`FHIR server configuration not found: ${serverName}`);
    }

    // Validate patient before creation
    const validation = this.validateFHIRResource(patient);
    if (!validation.isValid) {
      throw new Error(`Patient validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const response = await this.httpClient.post(
      `${config.baseUrl}/Patient`,
      patient,
      config
    );

    if (response.resourceType === 'Patient') {
      const createdPatient = response as FHIRPatient;
      if (createdPatient.id) {
        this.patientCache.set(createdPatient.id, createdPatient);
      }
      return createdPatient;
    }

    throw new Error('Failed to create patient');
  }

  /**
   * Update patient in FHIR server
   */
  public async updatePatient(serverName: string, patient: FHIRPatient): Promise<FHIRPatient> {
    const config = this.serverConfigs.get(serverName);
    if (!config) {
      throw new Error(`FHIR server configuration not found: ${serverName}`);
    }

    if (!patient.id) {
      throw new Error('Patient ID is required for update');
    }

    const validation = this.validateFHIRResource(patient);
    if (!validation.isValid) {
      throw new Error(`Patient validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const response = await this.httpClient.put(
      `${config.baseUrl}/Patient/${patient.id}`,
      patient,
      config
    );

    if (response.resourceType === 'Patient') {
      const updatedPatient = response as FHIRPatient;
      this.patientCache.set(updatedPatient.id!, updatedPatient);
      return updatedPatient;
    }

    throw new Error('Failed to update patient');
  }

  /**
   * Get observations for a patient
   */
  public async getPatientObservations(
    serverName: string,
    patientId: string,
    category?: string
  ): Promise<FHIRObservation[]> {
    const config = this.serverConfigs.get(serverName);
    if (!config) {
      throw new Error(`FHIR server configuration not found: ${serverName}`);
    }

    const searchQuery = new URLSearchParams({
      subject: `Patient/${patientId}`
    });

    if (category) {
      searchQuery.append('category', category);
    }

    const response = await this.httpClient.get(
      `${config.baseUrl}/Observation?${searchQuery.toString()}`,
      config
    );

    if (response.resourceType === 'Bundle') {
      const bundle = response as FHIRBundle;
      return bundle.entry?.map(entry => entry.resource as FHIRObservation) || [];
    }

    return [];
  }

  /**
   * Create observation in FHIR server
   */
  public async createObservation(serverName: string, observation: FHIRObservation): Promise<FHIRObservation> {
    const config = this.serverConfigs.get(serverName);
    if (!config) {
      throw new Error(`FHIR server configuration not found: ${serverName}`);
    }

    const validation = this.validateFHIRResource(observation);
    if (!validation.isValid) {
      throw new Error(`Observation validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const response = await this.httpClient.post(
      `${config.baseUrl}/Observation`,
      observation,
      config
    );

    if (response.resourceType === 'Observation') {
      return response as FHIRObservation;
    }

    throw new Error('Failed to create observation');
  }

  /**
   * Get encounters for a patient
   */
  public async getPatientEncounters(serverName: string, patientId: string): Promise<FHIREncounter[]> {
    const config = this.serverConfigs.get(serverName);
    if (!config) {
      throw new Error(`FHIR server configuration not found: ${serverName}`);
    }

    const response = await this.httpClient.get(
      `${config.baseUrl}/Encounter?subject=Patient/${patientId}`,
      config
    );

    if (response.resourceType === 'Bundle') {
      const bundle = response as FHIRBundle;
      return bundle.entry?.map(entry => entry.resource as FHIREncounter) || [];
    }

    return [];
  }

  /**
   * Get devices for a patient
   */
  public async getPatientDevices(serverName: string, patientId: string): Promise<FHIRDevice[]> {
    const config = this.serverConfigs.get(serverName);
    if (!config) {
      throw new Error(`FHIR server configuration not found: ${serverName}`);
    }

    const response = await this.httpClient.get(
      `${config.baseUrl}/Device?patient=Patient/${patientId}`,
      config
    );

    if (response.resourceType === 'Bundle') {
      const bundle = response as FHIRBundle;
      return bundle.entry?.map(entry => entry.resource as FHIRDevice) || [];
    }

    return [];
  }

  /**
   * Patient identity matching and merging
   */
  public async matchPatientIdentity(
    searchCriteria: {
      name?: string;
      dateOfBirth?: string;
      mrn?: string;
      ssn?: string;
      phone?: string;
      email?: string;
    }
  ): Promise<PatientIdentityMatch[]> {
    return this.identityMatcher.findMatches(searchCriteria);
  }

  /**
   * Map clinical data from one format to FHIR
   */
  public mapClinicalDataToFHIR(
    sourceData: any,
    mapping: ClinicalDataMapping[]
  ): any {
    return this.dataMapper.mapData(sourceData, mapping);
  }

  /**
   * Normalize clinical data values
   */
  public normalizeClinicalData(
    data: any,
    dataType: 'vital-signs' | 'laboratory' | 'medication' | 'procedure'
  ): any {
    return this.dataMapper.normalizeData(data, dataType);
  }

  /**
   * Export patient data as FHIR Bundle
   */
  public async exportPatientData(
    serverName: string,
    patientId: string,
    includeHistory: boolean = false
  ): Promise<FHIRBundle> {
    const config = this.serverConfigs.get(serverName);
    if (!config) {
      throw new Error(`FHIR server configuration not found: ${serverName}`);
    }

    // Get patient
    const patient = await this.getPatientById(serverName, patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    const resources: FHIRResource[] = [patient];

    // Get patient observations
    const observations = await this.getPatientObservations(serverName, patientId);
    resources.push(...observations);

    // Get patient encounters
    const encounters = await this.getPatientEncounters(serverName, patientId);
    resources.push(...encounters);

    // Get patient devices
    const devices = await this.getPatientDevices(serverName, patientId);
    resources.push(...devices);

    return this.createFHIRBundle(resources, 'document', `patient-export-${patientId}`);
  }

  /**
   * Get LOINC code for vital sign type
   */
  private getLoincCode(vitalType: string): { code: string; display: string } {
    const codes: Record<string, { code: string; display: string }> = {
      'heart_rate': { code: '8867-4', display: 'Heart rate' },
      'blood_pressure_systolic': { code: '8480-6', display: 'Systolic blood pressure' },
      'blood_pressure_diastolic': { code: '8462-4', display: 'Diastolic blood pressure' },
      'blood_pressure': { code: '85354-9', display: 'Blood pressure panel' },
      'temperature': { code: '8310-5', display: 'Body temperature' },
      'oxygen_saturation': { code: '59408-5', display: 'Oxygen saturation in Arterial blood' },
      'respiratory_rate': { code: '9279-1', display: 'Respiratory rate' },
      'pain_score': { code: '72514-3', display: 'Pain severity - Reported' },
      'glucose': { code: '33747-0', display: 'Glucose [Mass/volume] in Blood' },
      'weight': { code: '29463-7', display: 'Body weight' },
      'height': { code: '8302-2', display: 'Body height' },
      'bmi': { code: '39156-5', display: 'Body mass index (BMI) [Ratio]' }
    };

    return codes[vitalType] || { code: '00000-0', display: 'Unknown vital sign' };
  }

  /**
   * Get reference range for vital sign
   */
  private getReferenceRange(vitalType: string): { low: number; high: number } | null {
    const ranges: Record<string, { low: number; high: number }> = {
      'heart_rate': { low: 60, high: 100 },
      'blood_pressure_systolic': { low: 90, high: 140 },
      'blood_pressure_diastolic': { low: 60, high: 90 },
      'temperature': { low: 36.1, high: 37.2 },
      'oxygen_saturation': { low: 95, high: 100 },
      'respiratory_rate': { low: 12, high: 20 },
      'pain_score': { low: 0, high: 10 },
      'glucose': { low: 70, high: 140 }
    };

    return ranges[vitalType] || null;
  }

  /**
   * Get display text for encounter class
   */
  private getEncounterClassDisplay(code: string): string {
    const displays: Record<string, string> = {
      'AMB': 'Ambulatory',
      'EMER': 'Emergency',
      'FLD': 'Field',
      'HH': 'Home Health',
      'IMP': 'Inpatient Encounter',
      'ACU': 'Acute',
      'CHRON': 'Chronic',
      'SNON': 'Special Non-inpatient',
      'OBS': 'Observation',
      'VR': 'Virtual',
      'ETH': 'Encounter for Healthcare Services',
      'RTL': 'Encounter for Routine Care',
      'MTR': 'Encounter for Medical Treatment'
    };

    return displays[code] || 'Unknown';
  }

  /**
   * Generate UUID for temporary resources
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get service statistics
   */
  public getStatistics(): any {
    return {
      configuredServers: this.serverConfigs.size,
      cachedPatients: this.patientCache.size,
      supportedResources: ['Patient', 'Observation', 'Encounter', 'Device', 'Practitioner', 'Bundle'],
      version: '1.0.0',
      fhirVersion: 'R4'
    };
  }
}

// Supporting Classes

/**
 * Patient Identity Matcher for finding duplicate patients
 */
class PatientIdentityMatcher {
  private searchAlgorithms = {
    exact: (criteria: any, patient: FHIRPatient) => this.exactMatch(criteria, patient),
    fuzzy: (criteria: any, patient: FHIRPatient) => this.fuzzyMatch(criteria, patient),
    demographic: (criteria: any, patient: FHIRPatient) => this.demographicMatch(criteria, patient)
  };

  async findMatches(criteria: any): Promise<PatientIdentityMatch[]> {
    const matches: PatientIdentityMatch[] = [];

    // This would integrate with actual patient databases
    // For demo purposes, returning empty array
    // In production, this would query multiple patient sources

    return matches;
  }

  private exactMatch(criteria: any, patient: FHIRPatient): number {
    let score = 0;
    const maxScore = Object.keys(criteria).length;

    if (criteria.name && patient.name?.[0]) {
      const fullName = `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`;
      if (fullName.toLowerCase().includes(criteria.name.toLowerCase())) {
        score += 1;
      }
    }

    if (criteria.dateOfBirth && patient.birthDate) {
      if (patient.birthDate === criteria.dateOfBirth) {
        score += 1;
      }
    }

    return score / maxScore;
  }

  private fuzzyMatch(criteria: any, patient: FHIRPatient): number {
    // Implement fuzzy matching logic
    return 0.0;
  }

  private demographicMatch(criteria: any, patient: FHIRPatient): number {
    let score = 0;
    let factors = 0;

    if (criteria.gender && patient.gender) {
      factors++;
      if (patient.gender === criteria.gender) {
        score += 1;
      }
    }

    if (criteria.phone && patient.telecom) {
      factors++;
      const phone = patient.telecom.find(t => t.system === 'phone');
      if (phone && phone.value?.includes(criteria.phone.slice(-4))) {
        score += 1;
      }
    }

    return factors > 0 ? score / factors : 0;
  }
}

/**
 * Clinical Data Mapper for transforming data formats
 */
class ClinicalDataMapper {
  mapData(sourceData: any, mappings: ClinicalDataMapping[]): any {
    const result: any = {};

    mappings.forEach(mapping => {
      if (Object.prototype.hasOwnProperty.call(sourceData, mapping.sourceField)) {
        let value = sourceData[mapping.sourceField];

        // Apply transformation
        switch (mapping.transformation) {
          case 'normalize':
            value = this.normalizeValue(value, mapping.validation?.type);
            break;
          case 'convert':
            value = this.convertValue(value, mapping.validation?.type);
            break;
          case 'calculate':
            value = this.calculateValue(value, sourceData);
            break;
          default:
            break;
        }

        result[mapping.targetField] = value;
      }
    });

    return result;
  }

  normalizeData(data: any, dataType: 'vital-signs' | 'laboratory' | 'medication' | 'procedure'): any {
    switch (dataType) {
      case 'vital-signs':
        return this.normalizeVitalSigns(data);
      case 'laboratory':
        return this.normalizeLaboratoryData(data);
      default:
        return data;
    }
  }

  private normalizeValue(value: any, type?: string): any {
    if (type === 'date') {
      return new Date(value).toISOString().split('T')[0];
    }
    if (type === 'string') {
      return String(value).trim();
    }
    if (type === 'number') {
      return Number(value);
    }
    return value;
  }

  private convertValue(value: any, type?: string): any {
    // Implement type conversion logic
    return value;
  }

  private calculateValue(value: any, context: any): any {
    // Implement calculation logic
    return value;
  }

  private normalizeVitalSigns(data: any): any {
    const normalized = { ...data };

    // Normalize heart rate
    if (normalized.heartRate) {
      normalized.heartRate = Math.round(normalized.heartRate);
    }

    // Normalize blood pressure
    if (normalized.bloodPressure) {
      const [systolic, diastolic] = normalized.bloodPressure.split('/');
      normalized.systolicBP = Number(systolic);
      normalized.diastolicBP = Number(diastolic);
      delete normalized.bloodPressure;
    }

    // Normalize temperature
    if (normalized.temperature) {
      // Convert Fahrenheit to Celsius if needed
      const temp = Number(normalized.temperature);
      if (temp > 100) {
        normalized.temperatureCelsius = Math.round(((temp - 32) * 5 / 9) * 10) / 10;
      } else {
        normalized.temperatureCelsius = temp;
      }
    }

    return normalized;
  }

  private normalizeLaboratoryData(data: any): any {
    // Normalize lab results
    return data;
  }
}

/**
 * FHIR Validator for resource validation
 */
class FHIRValidator {
  validateResource(resource: FHIRResource): FHIRValidationResult {
    const errors: FHIRValidationError[] = [];
    const warnings: FHIRValidationWarning[] = [];

    // Basic validation
    if (!resource.resourceType) {
      errors.push({
        field: 'resourceType',
        code: 'required',
        message: 'Resource type is required'
      });
    }

    // Resource-specific validation
    switch (resource.resourceType) {
      case 'Patient':
        this.validatePatient(resource as FHIRPatient, errors, warnings);
        break;
      case 'Observation':
        this.validateObservation(resource as FHIRObservation, errors, warnings);
        break;
      case 'Encounter':
        this.validateEncounter(resource as FHIREncounter, errors, warnings);
        break;
      case 'Device':
        this.validateDevice(resource as FHIRDevice, errors, warnings);
        break;
      case 'Practitioner':
        this.validatePractitioner(resource as FHIRPractitioner, errors, warnings);
        break;
      default:
        warnings.push({
          field: 'resourceType',
          code: 'unsupported',
          message: `Validation not implemented for ${resource.resourceType}`
        });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      resource
    };
  }

  private validatePatient(patient: FHIRPatient, errors: FHIRValidationError[], warnings: FHIRValidationWarning[]): void {
    if (!patient.name || patient.name.length === 0) {
      errors.push({
        field: 'name',
        code: 'required',
        message: 'Patient must have at least one name'
      });
    }

    if (!patient.birthDate) {
      warnings.push({
        field: 'birthDate',
        code: 'recommended',
        message: 'Birth date is recommended for patient matching'
      });
    }

    if (!patient.gender) {
      warnings.push({
        field: 'gender',
        code: 'recommended',
        message: 'Gender is recommended for patient matching'
      });
    }
  }

  private validateObservation(observation: FHIRObservation, errors: FHIRValidationError[], warnings: FHIRValidationWarning[]): void {
    if (!observation.code) {
      errors.push({
        field: 'code',
        code: 'required',
        message: 'Observation must have a code'
      });
    }

    if (!observation.status) {
      errors.push({
        field: 'status',
        code: 'required',
        message: 'Observation must have a status'
      });
    }

    if (!observation.subject) {
      errors.push({
        field: 'subject',
        code: 'required',
        message: 'Observation must have a subject reference'
      });
    }
  }

  private validateEncounter(encounter: FHIREncounter, errors: FHIRValidationError[], warnings: FHIRValidationWarning[]): void {
    if (!encounter.status) {
      errors.push({
        field: 'status',
        code: 'required',
        message: 'Encounter must have a status'
      });
    }

    if (!encounter.class) {
      errors.push({
        field: 'class',
        code: 'required',
        message: 'Encounter must have a class'
      });
    }

    if (!encounter.subject) {
      errors.push({
        field: 'subject',
        code: 'required',
        message: 'Encounter must have a subject reference'
      });
    }
  }

  private validateDevice(device: FHIRDevice, errors: FHIRValidationError[], warnings: FHIRValidationWarning[]): void {
    if (!device.type) {
      errors.push({
        field: 'type',
        code: 'required',
        message: 'Device must have a type'
      });
    }

    if (!device.manufacturer) {
      warnings.push({
        field: 'manufacturer',
        code: 'recommended',
        message: 'Manufacturer is recommended for device identification'
      });
    }
  }

  private validatePractitioner(practitioner: FHIRPractitioner, errors: FHIRValidationError[], warnings: FHIRValidationWarning[]): void {
    if (!practitioner.name || practitioner.name.length === 0) {
      errors.push({
        field: 'name',
        code: 'required',
        message: 'Practitioner must have at least one name'
      });
    }
  }
}

/**
 * FHIR HTTP Client for server communication
 */
class FHIRHttpClient {
  private defaultTimeout = 30000;
  private defaultRetryAttempts = 3;

  async get(url: string, config: FHIRServerConfig): Promise<any> {
    return this.makeRequest('GET', url, null, config);
  }

  async post(url: string, data: any, config: FHIRServerConfig): Promise<any> {
    return this.makeRequest('POST', url, data, config);
  }

  async put(url: string, data: any, config: FHIRServerConfig): Promise<any> {
    return this.makeRequest('PUT', url, data, config);
  }

  async delete(url: string, config: FHIRServerConfig): Promise<any> {
    return this.makeRequest('DELETE', url, null, config);
  }

  private async makeRequest(method: string, url: string, data: any, config: FHIRServerConfig): Promise<any> {
    const timeout = config.timeout || this.defaultTimeout;
    const maxAttempts = config.retryAttempts || this.defaultRetryAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const headers: Record<string, string> = {
          'Content-Type': 'application/fhir+json',
          'Accept': 'application/fhir+json'
        };

        // Add authentication headers
        if (config.authentication) {
          this.addAuthHeaders(headers, config.authentication);
        }

        const response = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;

      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  private addAuthHeaders(headers: Record<string, string>, auth: any): void {
    switch (auth.type) {
      case 'basic':
        const credentials = btoa(`${auth.credentials.username}:${auth.credentials.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.credentials.token}`;
        break;
      case 'oauth2':
        headers['Authorization'] = `Bearer ${auth.credentials.accessToken}`;
        break;
    }
  }
}

// Export singleton instance
export const fhirComplianceService = new FHIRComplianceService();

// Export utility functions
export const createFHIRPatient = (patientData: any) =>
  fhirComplianceService.createFHIRPatient(patientData);

export const createFHIRObservation = (patientId: string, vitalType: string, value: number, unit: string) =>
  fhirComplianceService.createFHIRObservation(patientId, vitalType, value, unit);

export const createFHIRDevice = (deviceData: any) =>
  fhirComplianceService.createFHIRDevice(deviceData);

export const createFHIRBundle = (resources: FHIRResource[], type?: FHIRBundle['type']) =>
  fhirComplianceService.createFHIRBundle(resources, type);

export const validateFHIRResource = (resource: FHIRResource) =>
  fhirComplianceService.validateFHIRResource(resource);

export const searchPatients = (serverName: string, searchParams: any) =>
  fhirComplianceService.searchPatients(serverName, searchParams);

export const exportPatientData = (serverName: string, patientId: string, includeHistory?: boolean) =>
  fhirComplianceService.exportPatientData(serverName, patientId, includeHistory);