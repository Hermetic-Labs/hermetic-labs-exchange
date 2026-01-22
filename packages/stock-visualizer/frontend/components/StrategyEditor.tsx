import Editor, { OnMount } from '@monaco-editor/react';
import { useCallback, useRef } from 'react';

interface StrategyEditorProps {
  value: string;
  onChange: (value: string) => void;
  errors: string[];
}

export default function StrategyEditor({ value, onChange, errors }: StrategyEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorChange = useCallback((val: string | undefined) => {
    if (val !== undefined) {
      onChange(val);
    }
  }, [onChange]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    
    // Register custom language if not already registered
    const languages = monaco.languages.getLanguages();
    const hasLang = languages.some(l => l.id === 'pinescript');
    
    if (!hasLang) {
      monaco.languages.register({ id: 'pinescript' });

      // Define tokenizer
      monaco.languages.setMonarchTokensProvider('pinescript', {
        tokenizer: {
          root: [
            [/\/\/.*$/, 'comment'],
            [/\b(sma|ema|rsi|close|open|high|low|volume)\b/, 'keyword'],
            [/\b(buy|sell|when|crosses|above|below)\b/, 'type'],
            [/\b\d+\.?\d*\b/, 'number'],
            [/[<>=!]+/, 'operator'],
            [/[\(\)]/, 'delimiter'],
          ],
        },
      });

      // Add autocomplete
      monaco.languages.registerCompletionItemProvider('pinescript', {
        provideCompletionItems: () => {
          const suggestions = [
            { label: 'sma', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sma(${1:20})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Simple Moving Average' },
            { label: 'ema', kind: monaco.languages.CompletionItemKind.Function, insertText: 'ema(${1:12})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Exponential Moving Average' },
            { label: 'rsi', kind: monaco.languages.CompletionItemKind.Function, insertText: 'rsi(${1:14})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Relative Strength Index' },
            { label: 'buy when', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'buy when ${1:condition}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
            { label: 'sell when', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'sell when ${1:condition}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
            { label: 'crosses above', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'crosses above' },
            { label: 'crosses below', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'crosses below' },
          ];
          return { suggestions };
        },
      });
    }

    // Define and set theme
    monaco.editor.defineTheme('pinescript-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '60a5fa' },
        { token: 'type', foreground: 'f472b6' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'operator', foreground: '10b981' },
        { token: 'delimiter', foreground: '9ca3af' },
      ],
      colors: {
        'editor.background': '#1f2937',
        'editor.foreground': '#e5e7eb',
        'editor.lineHighlightBackground': '#374151',
        'editorCursor.foreground': '#60a5fa',
        'editor.selectionBackground': '#4b5563',
      },
    });

    monaco.editor.setTheme('pinescript-dark');
    
    // Focus editor to ensure it's interactive
    editor.focus();
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-gray-700 border-b border-gray-600">
        <h3 className="text-sm font-medium text-gray-200">Strategy Editor</h3>
        <p className="text-xs text-gray-400 mt-0.5">Pine Script-like syntax - Edit to update chart</p>
      </div>
      
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="pinescript"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            readOnly: false,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 12 },
            cursorStyle: 'line',
            cursorBlinking: 'smooth',
            selectOnLineNumbers: true,
            renderLineHighlight: 'all',
            contextmenu: true,
            folding: false,
            glyphMargin: false,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: 'top',
          }}
        />
      </div>

      {errors.length > 0 && (
        <div className="px-4 py-2 bg-red-900/50 border-t border-red-800">
          {errors.map((error, i) => (
            <p key={i} className="text-xs text-red-400">{error}</p>
          ))}
        </div>
      )}

      <div className="px-4 py-3 bg-gray-700/50 border-t border-gray-600">
        <h4 className="text-xs font-medium text-gray-300 mb-2">Quick Reference</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
          <span>sma(period)</span><span>Simple MA</span>
          <span>ema(period)</span><span>Exponential MA</span>
          <span>rsi</span><span>RSI indicator</span>
          <span>crosses above/below</span><span>Crossover</span>
        </div>
      </div>
    </div>
  );
}
