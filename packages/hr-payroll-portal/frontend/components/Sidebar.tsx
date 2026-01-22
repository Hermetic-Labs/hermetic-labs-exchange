import { 
  LayoutDashboard, Users, Building2, Briefcase, Landmark, 
  Link2, Calculator, Upload, FileText, Settings 
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'job-postings', label: 'Job Postings', icon: Briefcase },
  { id: 'banking', label: 'Banking', icon: Landmark },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'payroll-calculator', label: 'Payroll Calculator', icon: Calculator },
  { id: 'bulk-upload', label: 'Bulk Upload', icon: Upload },
  { id: 'pay-stubs', label: 'Pay Stubs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ currentPage, setCurrentPage }: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold">HR Portal</h1>
        <p className="text-slate-400 text-sm mt-1">Payroll Administration</p>
      </div>
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-700 text-slate-400 text-xs">
        v1.0.0 - HR/Payroll System
      </div>
    </aside>
  );
}
