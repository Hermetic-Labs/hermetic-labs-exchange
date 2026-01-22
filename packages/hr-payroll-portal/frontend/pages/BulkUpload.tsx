import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { Employee } from '../types';

interface BulkUploadProps {
  setEmployees: (fn: (employees: Employee[]) => Employee[]) => void;
}

export default function BulkUpload({ setEmployees }: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [status, setStatus] = useState<'idle' | 'preview' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const data = lines.map(line => line.split(',').map(cell => cell.trim()));
      setPreview(data);
      setStatus('preview');
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (preview.length < 2) return;

    const headers = preview[0];
    const rows = preview.slice(1);

    const newEmployees: Employee[] = rows.map((row, index) => ({
      id: `imported-${Date.now()}-${index}`,
      name: row[headers.indexOf('name')] || row[0] || '',
      email: row[headers.indexOf('email')] || row[1] || '',
      department: row[headers.indexOf('department')] || row[2] || '',
      position: row[headers.indexOf('position')] || row[3] || '',
      salary: parseFloat(row[headers.indexOf('salary')] || row[4] || '0'),
      hourlyRate: parseFloat(row[headers.indexOf('hourlyRate')] || row[5] || '0'),
      startDate: row[headers.indexOf('startDate')] || row[6] || '',
      status: 'active',
    }));

    setEmployees(prev => [...prev, ...newEmployees]);
    setStatus('success');
  };

  const downloadTemplate = () => {
    const csv = 'name,email,department,position,salary,hourlyRate,startDate\nJohn Doe,john@example.com,Engineering,Developer,75000,36.06,2024-01-15';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_template.csv';
    a.click();
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bulk Employee Upload</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Upload CSV/Excel File</h2>
          <button onClick={downloadTemplate} className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
            <Download size={18} /> Download Template
          </button>
        </div>

        {status === 'idle' && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
            <p className="text-sm text-gray-400">CSV or Excel files supported</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {status === 'preview' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet size={20} className="text-green-600" />
              <span className="font-medium">{file?.name}</span>
              <span className="text-gray-500">({preview.length - 1} rows)</span>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {preview[0]?.map((header, i) => (
                      <th key={i} className="px-4 py-2 text-left font-medium text-gray-600">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(1, 6).map((row, i) => (
                    <tr key={i} className="border-b">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 6 && (
                <p className="text-sm text-gray-500 mt-2">...and {preview.length - 6} more rows</p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleImport} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
                Import {preview.length - 1} Employees
              </button>
              <button onClick={reset} className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-green-700">Import Successful!</h3>
            <p className="text-gray-600 mt-2">{preview.length - 1} employees have been added.</p>
            <button onClick={reset} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Upload Another File
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-8">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-700">Import Failed</h3>
            <p className="text-gray-600 mt-2">Please check your file format and try again.</p>
            <button onClick={reset} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">File Format Requirements</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>First row must contain column headers</li>
          <li>Required columns: name, email, department, position, salary, hourlyRate, startDate</li>
          <li>Dates should be in YYYY-MM-DD format</li>
          <li>Salary and hourlyRate should be numeric values</li>
        </ul>
      </div>
    </div>
  );
}
