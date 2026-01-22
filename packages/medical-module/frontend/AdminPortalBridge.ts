/**
 * Admin Portal - Medical Module Export
 * 
 * This bridge provides a way to integrate with the host app's AdminPortal
 * when available. If not available, it exports a fallback placeholder.
 */

import React from 'react';

// Check if host app exposes AdminPortal via globals
declare global {
  interface Window {
    __EVE_ADMIN_PORTAL__?: React.ComponentType<any>;
  }
}

// Fallback component when AdminPortal not available
const AdminPortalFallback: React.FC = () => {
  return React.createElement('div', {
    className: 'flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900'
  }, React.createElement('div', {
    className: 'text-center p-8'
  }, [
    React.createElement('h2', {
      key: 'title',
      className: 'text-xl font-semibold text-gray-700 dark:text-gray-300'
    }, 'Admin Portal'),
    React.createElement('p', {
      key: 'desc',
      className: 'text-gray-500 dark:text-gray-400 mt-2'
    }, 'Admin portal features are available when running in the host application.')
  ]));
};

// Export whichever is available
export const AdminPortal = typeof window !== 'undefined' && window.__EVE_ADMIN_PORTAL__
  ? window.__EVE_ADMIN_PORTAL__
  : AdminPortalFallback;

export default AdminPortal;
