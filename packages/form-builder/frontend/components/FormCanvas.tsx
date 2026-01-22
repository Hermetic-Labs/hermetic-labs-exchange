import { useDrop } from 'react-dnd';
import { FormField, FieldType, createField } from '../types/form';
import FieldEditor from './FieldEditor';
import { GripVertical, Trash2 } from 'lucide-react';

interface FormCanvasProps {
  fields: FormField[];
  onAddField: (field: FormField) => void;
  onUpdateField: (field: FormField) => void;
  onDeleteField: (id: string) => void;
  onReorderFields: (dragIndex: number, hoverIndex: number) => void;
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
}

export default function FormCanvas({
  fields,
  onAddField,
  onUpdateField,
  onDeleteField,
  onReorderFields,
  selectedFieldId,
  onSelectField,
}: FormCanvasProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'FIELD',
    drop: (item: { fieldType: FieldType }) => {
      const newField = createField(item.fieldType);
      onAddField(newField);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const moveField = (dragIndex: number, hoverIndex: number) => {
    onReorderFields(dragIndex, hoverIndex);
  };

  return (
    <div
      ref={drop}
      className={`flex-1 p-6 overflow-y-auto ${
        isOver ? 'bg-blue-50' : 'bg-gray-100'
      }`}
    >
      {fields.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
              <GripVertical className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">Drag fields here to build your form</p>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-3">
          {fields.map((field, index) => (
            <FieldCard
              key={field.id}
              field={field}
              index={index}
              isSelected={selectedFieldId === field.id}
              onSelect={() => onSelectField(field.id)}
              onUpdate={onUpdateField}
              onDelete={() => onDeleteField(field.id)}
              moveField={moveField}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FieldCardProps {
  field: FormField;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
  moveField: (dragIndex: number, hoverIndex: number) => void;
}

function FieldCard({
  field,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: FieldCardProps) {
  return (
    <div
      className={`bg-white rounded-lg border-2 transition-all ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
          <div>
            <p className="font-medium text-gray-800">{field.label}</p>
            <p className="text-sm text-gray-500 capitalize">{field.type}</p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {isSelected && (
        <div className="border-t border-gray-200 p-4">
          <FieldEditor field={field} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}
