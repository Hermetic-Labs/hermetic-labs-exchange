/**
 * Medical Dashboard
 * Medical and peer review dashboard for healthcare professionals
 * Part of the medical-module marketplace package
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  BarChart3,
  MessageSquare,
  Shield,
  Stethoscope,
  LogIn
} from 'lucide-react';

// Simple auth hook - will be provided by main app context
const useAuth = () => {
  const [user, setUser] = useState<any>(() => {
    // Initialize from localStorage synchronously to avoid cascading renders
    const stored = localStorage.getItem('eve-user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    // Listen for auth changes from other tabs/windows
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'eve-user') {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { user, isAuthenticated: !!user };
};

// Simple link component for navigation
const Link: React.FC<{ to: string; className?: string; children: React.ReactNode }> =
  ({ to, className, children }) => (
    <a href={to} className={className}>{children}</a>
  );

// Medical module API
const medicalAPI = {
  async getStats() {
    try {
      const res = await fetch('/medical/stats');
      if (res.ok) return res.json();
    } catch (_error) {
      // API not available, return defaults
    }
    return {
      total_patients: 0, active_sessions: 0, completed_reviews: 0,
      pending_alerts: 0, engagement_score: 0, verified_staff: 0
    };
  },
  async getRecentActivity() {
    try {
      const res = await fetch('/medical/activity?limit=5');
      if (res.ok) return res.json();
    } catch (_error) {
      // API not available, return defaults
    }
    return [];
  }
};

interface DashboardStats {
  totalPitches: number;
  activePitches: number;
  expertReviews: number;
  pendingReviews: number;
  userEngagement: number;
  medicalVerifications: number;
}

export const MedicalDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPitches: 0,
    activePitches: 0,
    expertReviews: 0,
    pendingReviews: 0,
    userEngagement: 0,
    medicalVerifications: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load medical module stats
      const stats = await medicalAPI.getStats();

      setStats({
        totalPitches: stats.total_patients || 0,
        activePitches: stats.active_sessions || 0,
        expertReviews: stats.completed_reviews || 0,
        pendingReviews: stats.pending_alerts || 0,
        userEngagement: stats.engagement_score || 0,
        medicalVerifications: stats.verified_staff || 0
      });

      // Load recent activity
      const activity = await medicalAPI.getRecentActivity();
      setRecentActivity(activity);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    if (isAuthenticated && user) {
      const roleName = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      return `Good ${timeOfDay}, ${roleName} ${user.profile.first_name}`;
    }

    return `Good ${timeOfDay}, Welcome to EVE OS`;
  };

  const getRoleSpecificWidget = () => {
    if (!isAuthenticated || !user) {
      // Guest user widget
      return (
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              Guest Mode
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-2">Explore EVE OS</h3>
          <p className="text-green-100 mb-4">
            Browse all features and data freely. Sign up for personalized experience.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Full Access</span>
              <span className="font-bold">Available</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Saved Preferences</span>
              <span className="font-bold">Login Required</span>
            </div>
          </div>
          <Link
            to="/auth"
            className="mt-4 flex items-center justify-center w-full bg-white/20 hover:bg-white/30 text-center py-2 rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Login / Sign Up
          </Link>
        </div>
      );
    }

    // Role-specific widgets for authenticated users
    const roleWidgets: Record<string, React.ReactNode> = {
      admin: (
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <Shield className="w-8 h-8" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              Admin
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-2">System Administration</h3>
          <p className="text-purple-100 mb-4">Full access to all EVE-OS systems</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Total Users</span>
              <span className="font-bold">Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span>System Health</span>
              <span className="font-bold">100%</span>
            </div>
          </div>
        </div>
      ),
      doctor: (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <Stethoscope className="w-8 h-8" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              Medical Professional
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-2">Expert Review Panel</h3>
          <p className="text-blue-100 mb-4">
            Medical verification and expert reviews
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Pending Reviews</span>
              <span className="font-bold">{stats.pendingReviews}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Completed</span>
              <span className="font-bold">{stats.expertReviews}</span>
            </div>
          </div>
          <Link
            to="/social"
            className="mt-4 block w-full bg-white/20 hover:bg-white/30 text-center py-2 rounded-lg transition-colors"
          >
            View Review Queue
          </Link>
        </div>
      ),
      nurse: (
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              Healthcare Staff
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-2">Patient Monitoring</h3>
          <p className="text-teal-100 mb-4">Track patient data and activities</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Active Patients</span>
              <span className="font-bold">Monitoring</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Data Updates</span>
              <span className="font-bold">Real-time</span>
            </div>
          </div>
        </div>
      ),
      patient: (
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              Patient
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-2">Your Health Journey</h3>
          <p className="text-green-100 mb-4">Access your medical records and community</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Records Access</span>
              <span className="font-bold">Enabled</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Privacy Level</span>
              <span className="font-bold">HIPAA</span>
            </div>
          </div>
          <Link
            to="/social"
            className="mt-4 block w-full bg-white/20 hover:bg-white/30 text-center py-2 rounded-lg transition-colors"
          >
            Join Community
          </Link>
        </div>
      ),
      technician: (
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-8 h-8" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              Technician
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-2">Technical Operations</h3>
          <p className="text-orange-100 mb-4">System monitoring and data management</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>System Status</span>
              <span className="font-bold">Operational</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Data Integrity</span>
              <span className="font-bold">100%</span>
            </div>
          </div>
        </div>
      )
    };

    return roleWidgets[user?.role || 'patient'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {getGreeting()}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {isAuthenticated ? 'Your unified EVE-OS dashboard' : 'Explore the EVE-OS ecosystem'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.totalPitches}
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Pitches
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.activePitches}
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Active Pitches
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.expertReviews}
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Expert Reviews
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.userEngagement}
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              User Engagement
            </h3>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role-Specific Widget */}
          <div className="lg:col-span-1">
            {getRoleSpecificWidget()}
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Recent Activity
              </h3>
              <Link
                to="/social"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((pitch: any, index: number) => (
                  <div
                    key={pitch.pitch_id || pitch.id || index}
                    className="flex items-start space-x-4 p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    onClick={() => {
                      window.location.href = '/social';
                    }}
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {pitch.title || 'Untitled Pitch'}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {pitch.company_name || 'Company Name'}
                      </p>
                      <div className="flex items-center mt-2 space-x-4 text-xs text-slate-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {pitch.created_at ? new Date(pitch.created_at).toLocaleDateString() : 'Unknown date'}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full ${pitch.status === 'in_review'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                          {pitch.status || 'draft'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/social"
            className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Social Layer
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Access collaborative features and expert reviews
            </p>
          </Link>

          <Link
            to="/cortex"
            className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <Activity className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Cortex AI
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              AI-powered analysis and insights
            </p>
          </Link>

          <Link
            to="/settings"
            className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <Shield className="w-8 h-8 text-green-600 dark:text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Settings
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage your account and preferences
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MedicalDashboard;
