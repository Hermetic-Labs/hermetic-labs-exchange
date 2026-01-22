import { useState } from 'react';
import { Header } from './components/Header';
import { VideoPreview } from './components/VideoPreview';
import { ScriptPanel } from './components/ScriptPanel';
import { ChunkEditor } from './components/ChunkEditor';
import { Timeline } from './components/Timeline';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import type { EditorConfig } from './index';

interface VideoNarrationEditorProps {
  config?: EditorConfig;
  className?: string;
}

export default function VideoNarrationEditor({ config, className = '' }: VideoNarrationEditorProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className={`h-screen flex flex-col bg-slate-900 overflow-hidden ${className}`}>
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onExport={() => setExportOpen(true)}
      />

      {/* Main workspace */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Script Panel */}
        <div className="w-[30%] min-w-[280px] p-2 flex flex-col">
          <ScriptPanel />
        </div>

        {/* Center: Video Preview */}
        <div className="w-[45%] p-2 flex flex-col">
          <VideoPreview />
        </div>

        {/* Right: Chunk Properties */}
        <div className="w-[25%] min-w-[240px] p-2 flex flex-col">
          <ChunkEditor />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <div className="h-[280px] shrink-0">
        <Timeline />
      </div>

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
