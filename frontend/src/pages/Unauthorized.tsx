import { AlertCircle, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f0fdfa 30%, #f5f3ff 60%, #fff1f2 100%)' }}>
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-hds-xl text-white mb-5" style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1, #a855f7)', boxShadow: '0 8px 24px -4px #6366f140' }}>
          <Bot className="w-9 h-9" />
        </div>
        
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-critical-50 border-2 border-critical-100 mb-6 mt-2">
          <AlertCircle className="w-7 h-7 text-critical-300" />
        </div>
        
        <h1 className="text-2xl font-bold text-neutral-700 mb-4">Access Denied</h1>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-hds-xl p-8 mb-6" style={{ boxShadow: '0 0 0 1px #e2e8f020, 0 4px 6px -1px #64748b10, 0 20px 40px -8px #6366f115' }}>
          <p className="text-neutral-600 mb-4">
            You do not have permission to access this application.
          </p>
          <p className="text-neutral-500 text-sm">
            You must be a member of the <span className="font-semibold text-neutral-700">team_cloud_and_platforms</span> team
            in the <span className="font-semibold text-neutral-700">prom-candp</span> organization.
          </p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 text-white rounded-hds-md font-medium transition-all hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)', boxShadow: '0 2px 8px -2px #4338ca40' }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
