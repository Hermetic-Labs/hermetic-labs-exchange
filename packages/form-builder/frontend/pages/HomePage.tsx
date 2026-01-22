import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormConfig } from '../types/form';
import { getForms, deleteForm, createNewForm, saveForm } from '../utils/formStorage';
import { Plus, FileText, Trash2, ExternalLink, Edit3 } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormConfig[]>([]);

  useEffect(() => {
    setForms(getForms());
  }, []);

  const handleCreateNew = () => {
    const newForm = createNewForm();
    saveForm(newForm);
    navigate(`/builder/${newForm.id}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this form?')) {
      deleteForm(id);
      setForms(getForms());
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Form Builder</h1>
              <p className="text-slate-400 mt-1">Create and share custom forms with ease</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              New Form
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {forms.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
              <FileText className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No forms yet</h2>
            <p className="text-slate-400 mb-6">Create your first form to get started</p>
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Create Your First Form
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div
                key={form.id}
                className="bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-slate-600 transition-colors cursor-pointer group"
                onClick={() => navigate(`/builder/${form.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/form/${form.id}`, '_blank');
                      }}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg"
                      title="Open form"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(form.id, e)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg"
                      title="Delete form"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1 truncate">{form.title}</h3>
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                  {form.description || 'No description'}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{form.fields.length} fields</span>
                  <span className="text-slate-500">
                    {new Date(form.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/builder/${form.id}`);
                  }}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Form
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
