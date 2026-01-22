import { useDrag } from 'react-dnd';
import { FIELD_TYPES, FieldType, createField, FormField } from '../types/form';
import {
  Type, AlignLeft, Hash, Mail, Calendar, ChevronDown,
  CheckSquare, Circle, Upload, Camera, FileText, PenTool, MapPin, Clock, Plus
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Type, AlignLeft, Hash, Mail, Calendar, ChevronDown,
  CheckSquare, Circle, Upload, Camera, FileText, PenTool, MapPin, Clock
};

interface FieldPaletteProps {
  onAddField?: (field: FormField) => void;
}

interface DraggableFieldProps {
  type: FieldType;
  label: string;
  icon: string;
  onAdd?: () => void;
}

function DraggableField({ type, label, icon, onAdd }: DraggableFieldProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'FIELD',
    item: { fieldType: type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const Icon = iconMap[icon];

  return (
    <div
      ref={drag}
      className={`flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-blue-400 hover:shadow-sm transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-600" />}
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd?.();
        }}
        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
        title="Click to add"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function FieldPalette({ onAddField }: FieldPaletteProps) {
  const handleAdd = (type: FieldType) => {
    if (onAddField) {
      onAddField(createField(type));
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Form Fields
      </h3>
      <p className="text-xs text-gray-400 mb-4">Drag or click + to add</p>
      <div className="space-y-2">
        {FIELD_TYPES.map((field) => (
          <DraggableField 
            key={field.type} 
            {...field} 
            onAdd={() => handleAdd(field.type)}
          />
        ))}
      </div>
    </div>
  );
}
