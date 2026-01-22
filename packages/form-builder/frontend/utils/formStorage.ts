import { FormConfig, FormSubmission } from '../types/form';
import { v4 as uuidv4 } from 'uuid';

const FORMS_KEY = 'form_builder_forms';
const SUBMISSIONS_KEY = 'form_builder_submissions';

export const saveForm = (form: FormConfig): string => {
  const forms = getForms();
  const existingIndex = forms.findIndex(f => f.id === form.id);

  if (existingIndex >= 0) {
    forms[existingIndex] = form;
  } else {
    forms.push(form);
  }

  localStorage.setItem(FORMS_KEY, JSON.stringify(forms));
  return form.id;
};

export const getForms = (): FormConfig[] => {
  const data = localStorage.getItem(FORMS_KEY);
  return data ? JSON.parse(data) : [];
};

// Alias for backwards compatibility
export const getAllForms = getForms;


export const getFormById = (id: string): FormConfig | null => {
  const forms = getForms();
  return forms.find(f => f.id === id) || null;
};

export const deleteForm = (id: string): void => {
  const forms = getForms().filter(f => f.id !== id);
  localStorage.setItem(FORMS_KEY, JSON.stringify(forms));
};

export const createNewForm = (): FormConfig => ({
  id: uuidv4(),
  title: 'Untitled Form',
  description: '',
  fields: [],
  createdAt: new Date().toISOString(),
});

export const saveSubmission = (submission: FormSubmission): void => {
  const submissions = getSubmissions();
  submissions.push(submission);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
};

export const getSubmissions = (): FormSubmission[] => {
  const data = localStorage.getItem(SUBMISSIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getSubmissionsByFormId = (formId: string): FormSubmission[] => {
  return getSubmissions().filter(s => s.formId === formId);
};

export const encodeFormToUrl = (form: FormConfig): string => {
  const encoded = btoa(encodeURIComponent(JSON.stringify(form)));
  return `${window.location.origin}/form/share?data=${encoded}`;
};

export const decodeFormFromUrl = (data: string): FormConfig | null => {
  try {
    return JSON.parse(decodeURIComponent(atob(data)));
  } catch {
    return null;
  }
};
