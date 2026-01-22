import { useState, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams, useNavigate } from 'react-router-dom';
import FieldPalette from '../components/FieldPalette';
import FormCanvas from '../components/FormCanvas';
import FormRenderer from '../components/FormRenderer';
import { FormConfig, FormField } from '../types/form';
import { saveForm, getFormById, createNewForm, encodeFormToUrl } from '../utils/formStorage';
import { Eye, Save, Link, ArrowLeft, Check, Copy } from 'lucide-react';

export default function BuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormConfig>(() => {
    if (id) {
      const existing = getFormById(id);
      if (existing) return existing;
    }
    return createNewForm();
  });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id && !getFormById(id)) {
      navigate('/builder');
    }
  }, [id, navigate]);

  const handleAddField = useCallback((field: FormField) => {
    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, field],
    }));
    setSelectedFieldId(field.id);
  }, []);

  const handleUpdateField = useCallback((updatedField: FormField) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(f => (f.id === updatedField.id ? updatedField : f)),
    }));
  }, []);

  const handleDeleteField = useCallback((fieldId: string) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId),
    }));
    setSelectedFieldId(null);
  }, []);

  const handleReorderFields = useCallback((dragIndex: number, hoverIndex: number) => {
    setForm(prev => {
      const newFields = [...prev.fields];
      const [draggedField] = newFields.splice(dragIndex, 1);
      newFields.splice(hoverIndex, 0, draggedField);
      return { ...prev, fields: newFields };
    });
  }, []);

  const handleSave = () => {
    saveForm(form);
    navigate(`/builder/${form.id}`);
  };

  const shareUrl = encodeFormToUrl(form);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="text-xl font-semibold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                placeholder="Form title"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  previewMode
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Eye className="w-4 h-4" />
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Link className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        {previewMode ? (
          <div className="flex-1 overflow-y-auto bg-gray-100">
            <div className="max-w-2xl mx-auto p-6">
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{form.title}</h1>
                {form.description && (
                  <p className="text-gray-600 mb-6">{form.description}</p>
                )}
                <FormRenderer
                  fields={form.fields}
                  values={previewValues}
                  onChange={(fieldId, value) =>
                    setPreviewValues(prev => ({ ...prev, [fieldId]: value }))
                  }
                />
                {form.fields.length > 0 && (
                  <button className="w-full mt-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                    Submit (Preview Only)
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <FieldPalette onAddField={handleAddField} />
            <FormCanvas
              fields={form.fields}
              onAddField={handleAddField}
              onUpdateField={handleUpdateField}
              onDeleteField={handleDeleteField}
              onReorderFields={handleReorderFields}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
            />
            <div className="w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Form Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description"
                  />
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    {form.fields.length} field{form.fields.length !== 1 ? 's' : ''} added
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Share Form</h2>
              <p className="text-gray-600 mb-4">
                Copy this link to share your form. Anyone with the link can fill it out.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  Note: The form configuration is encoded in the URL. For very large forms, consider saving and sharing the form ID instead.
                </p>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

// Named export for manifest compatibility
export { BuilderPage as FormBuilder };
