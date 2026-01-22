import { v4 as uuidv4 } from 'uuid';

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'email' 
  | 'date' 
  | 'dropdown' 
  | 'checkbox' 
  | 'radio' 
  | 'file' 
  | 'camera' 
  | 'document' 
  | 'signature' 
  | 'geolocation' 
  | 'timestamp';

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FieldOption[];
}

export interface FormConfig {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  createdAt: string;
}

export interface FormSubmission {
  formId: string;
  data: Record<string, unknown>;
  submittedAt: string;
}

export const createField = (type: FieldType): FormField => {
  const baseField: FormField = {
    id: uuidv4(),
    type,
    label: getDefaultLabel(type),
    required: false,
  };

  if (type === 'dropdown' || type === 'radio' || type === 'checkbox') {
    baseField.options = [
      { id: uuidv4(), label: 'Option 1', value: 'option1' },
      { id: uuidv4(), label: 'Option 2', value: 'option2' },
    ];
  }

  return baseField;
};

function getDefaultLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    text: 'Text Field',
    textarea: 'Text Area',
    number: 'Number',
    email: 'Email',
    date: 'Date',
    dropdown: 'Dropdown',
    checkbox: 'Checkbox',
    radio: 'Radio Group',
    file: 'File Upload',
    camera: 'Image Capture',
    document: 'Document Upload',
    signature: 'Signature',
    geolocation: 'Location',
    timestamp: 'Timestamp',
  };
  return labels[type];
}

export const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: 'Type' },
  { type: 'textarea', label: 'Text Area', icon: 'AlignLeft' },
  { type: 'number', label: 'Number', icon: 'Hash' },
  { type: 'email', label: 'Email', icon: 'Mail' },
  { type: 'date', label: 'Date', icon: 'Calendar' },
  { type: 'dropdown', label: 'Dropdown', icon: 'ChevronDown' },
  { type: 'checkbox', label: 'Checkbox', icon: 'CheckSquare' },
  { type: 'radio', label: 'Radio', icon: 'Circle' },
  { type: 'file', label: 'File Upload', icon: 'Upload' },
  { type: 'camera', label: 'Camera', icon: 'Camera' },
  { type: 'document', label: 'Document', icon: 'FileText' },
  { type: 'signature', label: 'Signature', icon: 'PenTool' },
  { type: 'geolocation', label: 'Location', icon: 'MapPin' },
  { type: 'timestamp', label: 'Timestamp', icon: 'Clock' },
];
