import { Settings, Download } from 'lucide-react';
import { useProjectStore } from './useProjectStore';

interface HeaderProps {
  onOpenSettings: () => void;
  onExport: () => void;
}

export function Header({ onOpenSettings, onExport }: HeaderProps) {
  const { projectName, setProjectName } = useProjectStore();

  return (
    <header className="h-14 bg-slate-900/50 border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent text-lg font-semibold text-white border-none outline-none focus:ring-0 w-64"
          placeholder="Project Name"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-md hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </header>
  );
}
