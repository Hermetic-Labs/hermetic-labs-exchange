import React, { useState } from 'react';
import { 
  User, 
  Heart, 
  ShoppingCart,BarChart3, 
  Plus, 
  Search,ChevronRight,
  ChevronDown
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  inputs: Array<{ type: string; label: string; required: boolean }>;
  outputs: Array<{ type: string; label: string; required: boolean }>;
  settings: Array<{ key: string; label: string; value: string; options?: string[] }>;
}

interface NodeTemplatesProps {
  templates: {
    social: Template[];
    medical: Template[];
    marketplace: Template[];
    processing: Template[];
  };
  onAddNode: (template: Template) => void;
  currentCortex?: string;
}

const categoryIcons = {
  social: User,
  medical: Heart,
  marketplace: ShoppingCart,
  processing: BarChart3};

const categoryColors = {
  social: '#3b82f6',
  medical: '#ef4444',
  marketplace: '#f59e0b',
  processing: '#10b981'};

export const NodeTemplates: React.FC<NodeTemplatesProps> = ({ 
  templates, 
  onAddNode, 
  currentCortex = 'social' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [_selectedCategory, _setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['social', 'processing']) // Expand social and processing by default
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filterTemplates = (templateList: Template[]) => {
    if (!searchTerm) return templateList;
    return templateList.filter(template =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'social': return 'Social Layer';
      case 'medical': return 'Medical Module';
      case 'marketplace': return 'Marketplace';
      case 'processing': return 'Processing & Analysis';
      default: return category;
    }
  };

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case 'social': return 'User collaboration, peer review, and social workflows';
      case 'medical': return 'Doctor verification, drug reviews, and medical compliance';
      case 'marketplace': return 'Modular extensions and third-party integrations';
      case 'processing': return 'Data processing, AI analysis, and transformations';
      default: return '';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Node Templates</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Current Cortex */}
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-600">Active Cortex:</span>
          <span 
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${categoryColors[currentCortex] || '#6b7280'}20`,
              color: categoryColors[currentCortex] || '#6b7280'
            }}
          >
            {currentCortex?.charAt(0).toUpperCase() + currentCortex?.slice(1) || 'Base'}
          </span>
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(templates).map(([category, templateList]) => {
          const filteredTemplates = filterTemplates(templateList);
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          const color = categoryColors[category as keyof typeof categoryColors];
          const isExpanded = expandedCategories.has(category);

          if (filteredTemplates.length === 0 && searchTerm) {
            return null; // Don't show empty categories when filtering
          }

          return (
            <div key={category} className="border-b border-gray-100">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon size={16} style={{ color }} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {getCategoryTitle(category)}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {filteredTemplates.length} of {templateList.length} templates
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {getCategoryDescription(category)}
                </p>
              </button>

              {/* Templates List */}
              {isExpanded && (
                <div className="pb-2">
                  {filteredTemplates.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500 text-center">
                      No templates found
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="mx-4 mb-2 p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 text-sm mb-1">
                              {template.name}
                            </h4>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                          <button
                            onClick={() => onAddNode(template)}
                            className="ml-2 w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors"
                            title="Add Node"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Template Details */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-3">
                            <span>I/O: {template.inputs.length}/{template.outputs.length}</span>
                            <span>•</span>
                            <span className="capitalize">{template.status}</span>
                          </div>
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${color}20`,
                              color: color
                            }}
                          >
                            {template.type}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          Choose templates to build flows for your specific needs
        </div>
      </div>
    </div>
  );
};

export default NodeTemplates;