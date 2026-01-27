/**
 * MedicalModulePortal - Main UI Component
 *
 * This component renders in the sidebar when the user clicks on the package tab.
 * It follows the EVE OS design system with iOS Liquid Glass styling.
 */

import { useState } from 'react';

export function MedicalModulePortal() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <span className="text-2xl">📦</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Medical Module</h1>
            <p className="text-slate-400">Your package description here</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-slate-400 text-sm">Total Items</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-green-400">0</p>
            <p className="text-slate-400 text-sm">Active</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-yellow-400">0</p>
            <p className="text-slate-400 text-sm">Pending</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-slate-400 text-sm">Completed</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Welcome to Medical Module</h2>
          <p className="text-slate-300 mb-4">
            This is a template package. Replace this content with your actual functionality.
          </p>
          <button
            onClick={() => setIsLoading(!isLoading)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            {isLoading ? 'Loading...' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MedicalModulePortal;
