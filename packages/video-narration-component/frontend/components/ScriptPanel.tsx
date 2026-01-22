import { useState, useRef } from 'react';
import { FileText, Scissors, Upload } from 'lucide-react';
import { useProjectStore } from './useProjectStore';
import type { Chunk } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function ScriptPanel() {
  const { scriptText, setScriptText, chunks, addChunk, selectChunk, settings } = useProjectStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleCreateChunk = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) return;

    const selectedText = scriptText.substring(start, end).trim();
    if (!selectedText) return;

    const newChunk: Chunk = {
      id: generateId(),
      text: selectedText,
      startIndex: start,
      endIndex: end,
      voiceId: settings.defaultVoiceId,
      speed: 1.0,
    };

    addChunk(newChunk);
    selectChunk(newChunk.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const textFile = files.find(f => f.type === 'text/plain' || f.name.endsWith('.txt'));

    if (textFile) {
      const text = await textFile.text();
      setScriptText(text);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      setScriptText(text);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      <div className="h-10 bg-slate-900/50 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-white">Script</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-white">
            <Upload className="w-4 h-4" />
            <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={handleCreateChunk}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            title="Process selection for TTS"
          >
            <Scissors className="w-3 h-3" />
            Process
          </button>
        </div>
      </div>

      <div
        className={`flex-1 p-4 relative ${isDragOver ? 'bg-blue-500/10' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          className="w-full h-full bg-slate-700 text-white text-[15px] leading-relaxed p-4 rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none resize-none"
          placeholder="Enter your script text here, or drag and drop a .txt file..."
        />
        {isDragOver && (
          <div className="absolute inset-4 border-2 border-dashed border-blue-500 rounded-md flex items-center justify-center bg-blue-500/5 pointer-events-none">
            <span className="text-blue-400 font-medium">Drop text file here</span>
          </div>
        )}
      </div>

      {chunks.length > 0 && (
        <div className="border-t border-slate-700 p-3 max-h-32 overflow-y-auto">
          <div className="text-xs text-slate-500 mb-2">Chunks ({chunks.length})</div>
          <div className="flex flex-wrap gap-2">
            {chunks.map((chunk, i) => (
              <button
                key={chunk.id}
                onClick={() => selectChunk(chunk.id)}
                className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors truncate max-w-[120px]"
              >
                {i + 1}. {chunk.text.substring(0, 15)}...
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
