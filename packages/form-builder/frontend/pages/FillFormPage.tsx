import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import FormRenderer from '../components/FormRenderer';
import { FormConfig, FormSubmission } from '../types/form';
import { decodeFormFromUrl, getFormById, saveSubmission } from '../utils/formStorage';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function FillFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormConfig | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get form from URL-encoded data first
    const data = searchParams.get('data');
    if (data) {
      const decoded = decodeFormFromUrl(data);
      if (decoded) {
        setForm(decoded);
        return;
      }
    }
    
    // Try to get form from localStorage by ID
    if (id) {
      const stored = getFormById(id);
      if (stored) {
        setForm(stored);
        return;
      }
    }
    
    setError('Form not found. The link may be invalid or expired.');
  }, [id, searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form) return;

    // Validate required fields
    const missingFields = form.fields
      .filter(f => f.required && !values[f.id])
      .map(f => f.label);

    if (missingFields.length > 0) {
      alert(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    const submission: FormSubmission = {
      formId: form.id,
      data: values,
      submittedAt: new Date().toISOString(),
    };

    saveSubmission(submission);
    setSubmitted(true);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Form Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Form Builder
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">Your response has been submitted successfully.</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setValues({});
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{form.title}</h1>
          {form.description && (
            <p className="text-gray-600 mb-6">{form.description}</p>
          )}
          
          <form onSubmit={handleSubmit}>
            <FormRenderer
              fields={form.fields}
              values={values}
              onChange={(fieldId, value) =>
                setValues(prev => ({ ...prev, [fieldId]: value }))
              }
            />
            
            {form.fields.length > 0 && (
              <button
                type="submit"
                className="w-full mt-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Submit
              </button>
            )}
          </form>
        </div>
        
        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by Form Builder
        </p>
      </div>
    </div>
  );
}
