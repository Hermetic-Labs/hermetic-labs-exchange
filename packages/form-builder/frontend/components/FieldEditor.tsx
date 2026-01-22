import { FormField, FieldOption } from '../types/form';
import { Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
}

export default function FieldEditor({ field, onUpdate }: FieldEditorProps) {
  const hasOptions = ['dropdown', 'radio', 'checkbox'].includes(field.type);

  const updateOption = (optionId: string, updates: Partial<FieldOption>) => {
    const newOptions = field.options?.map(opt =>
      opt.id === optionId ? { ...opt, ...updates } : opt
    );
    onUpdate({ ...field, options: newOptions });
  };

  const addOption = () => {
    const newOption: FieldOption = {
      id: uuidv4(),
      label: `Option ${(field.options?.length || 0) + 1}`,
      value: `option${(field.options?.length || 0) + 1}`,
    };
    onUpdate({ ...field, options: [...(field.options || []), newOption] });
  };

  const removeOption = (optionId: string) => {
    onUpdate({
      ...field,
      options: field.options?.filter(opt => opt.id !== optionId),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Label
        </label>
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate({ ...field, label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {['text', 'textarea', 'email', 'number'].includes(field.type) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Placeholder
          </label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`required-${field.id}`}
          checked={field.required}
          onChange={(e) => onUpdate({ ...field, required: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor={`required-${field.id}`} className="text-sm text-gray-700">
          Required field
        </label>
      </div>

      {hasOptions && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Options
          </label>
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={option.label}
                  onChange={(e) => updateOption(option.id, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Option label"
                />
                <button
                  onClick={() => removeOption(option.id)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addOption}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add option
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
