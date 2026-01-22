import { useState } from 'react';
import { Plus, ExternalLink, Linkedin } from 'lucide-react';
import { JobPosting } from '../types';

interface JobPostingsProps {
  jobPostings: JobPosting[];
  setJobPostings: (postings: JobPosting[]) => void;
}

export default function JobPostings({ jobPostings, setJobPostings }: JobPostingsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', department: '', location: '', type: 'Full-time', salary: '', status: 'open' as const, postedDate: new Date().toISOString().split('T')[0] });

  const addJob = () => {
    setJobPostings([...jobPostings, { ...newJob, id: Date.now().toString() }]);
    setShowAdd(false);
    setNewJob({ title: '', department: '', location: '', type: 'Full-time', salary: '', status: 'open', postedDate: new Date().toISOString().split('T')[0] });
  };

  const toggleStatus = (id: string) => {
    setJobPostings(jobPostings.map(j => j.id === id ? { ...j, status: j.status === 'open' ? 'closed' : 'open' } : j));
  };

  const postToLinkedIn = (job: JobPosting) => {
    alert(`Mock: Posting "${job.title}" to LinkedIn...`);
  };

  const postToGlassdoor = (job: JobPosting) => {
    alert(`Mock: Posting "${job.title}" to Glassdoor...`);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={20} /> Create Posting
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Job Posting</h2>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Job Title" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} className="border rounded px-3 py-2" />
            <input placeholder="Department" value={newJob.department} onChange={e => setNewJob({...newJob, department: e.target.value})} className="border rounded px-3 py-2" />
            <input placeholder="Location" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} className="border rounded px-3 py-2" />
            <select value={newJob.type} onChange={e => setNewJob({...newJob, type: e.target.value})} className="border rounded px-3 py-2">
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
            </select>
            <input placeholder="Salary Range" value={newJob.salary} onChange={e => setNewJob({...newJob, salary: e.target.value})} className="border rounded px-3 py-2" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addJob} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Create</button>
            <button onClick={() => setShowAdd(false)} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {jobPostings.map((job) => (
          <div key={job.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{job.title}</h3>
                <p className="text-gray-500">{job.department} - {job.location}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span>{job.type}</span>
                  <span>{job.salary}</span>
                  <span>Posted: {job.postedDate}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${job.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {job.status}
              </span>
            </div>
            <div className="flex gap-3 mt-4 pt-4 border-t">
              <button onClick={() => postToLinkedIn(job)} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800">
                <Linkedin size={18} /> Post to LinkedIn
              </button>
              <button onClick={() => postToGlassdoor(job)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                <ExternalLink size={18} /> Post to Glassdoor
              </button>
              <button onClick={() => toggleStatus(job.id)} className="ml-auto text-gray-600 hover:text-gray-800 border px-4 py-2 rounded">
                {job.status === 'open' ? 'Close Posting' : 'Reopen'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
