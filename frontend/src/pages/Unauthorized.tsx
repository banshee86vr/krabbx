import { AlertCircle, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 krx-auth-page-bg">
      <div className="w-full max-w-md text-center">
        <div className="krx-mark-gradient inline-flex items-center justify-center w-16 h-16 rounded-hds-xl text-white mb-5">
          <Bot className="w-9 h-9" />
        </div>
        
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-critical-50 border-2 border-critical-100 mb-6 mt-2">
          <AlertCircle className="w-7 h-7 text-critical-300" />
        </div>
        
        <h1 className="text-2xl font-bold text-neutral-700 mb-4">Access Denied</h1>
        
        <div
          className="bg-neutral-100/90 backdrop-blur-sm border border-neutral-200 rounded-hds-xl p-8 mb-6"
          style={{ boxShadow: '0 0 0 1px #27272a80, 0 4px 6px -1px #00000050, 0 20px 40px -8px rgba(34, 211, 238, 0.08)' }}
        >
          <p className="text-neutral-600 mb-4">
            You do not have permission to access this application.
          </p>
          <p className="text-neutral-500 text-sm">
            You must be allowed by this deployment&apos;s GitHub access rules (for example, membership in the
            configured organization team, or the organization itself, depending on server configuration).
          </p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="krx-cta-button px-6 py-2.5 text-white rounded-hds-md font-medium transition-all hover:shadow-lg"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
