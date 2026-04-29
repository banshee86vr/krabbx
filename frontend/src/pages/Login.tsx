import { GitBranch, Bot, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function Login() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const error = searchParams.get('reason') === 'team'
    ? 'You do not have access to this application. Please contact your administrator.'
    : null;
  
  const handleLogin = () => {
    setIsLoading(true);
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/login`;
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 krx-auth-page-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="krx-mark-gradient inline-flex items-center justify-center w-16 h-16 rounded-hds-xl text-white mb-5">
            <Bot className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-700 mb-2">RenovateBot Dashboard</h1>
          <p className="text-neutral-500">Monitor Renovate Bot adoption and outdated dependencies</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-hds-xl p-8" style={{ boxShadow: '0 0 0 1px #e2e8f020, 0 4px 6px -1px #64748b10, 0 20px 40px -8px #6366f115' }}>
          {error && (
            <div className="mb-6 p-4 rounded-hds-md text-sm bg-critical-50 text-critical-400 border border-critical-100">
              {error}
            </div>
          )}
          
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="krx-cta-button w-full flex items-center justify-center gap-3 px-6 py-3 text-white rounded-hds-md font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <GitBranch className="w-5 h-5" />
                Sign in with GitHub
              </>
            )}
          </button>
          
          <div className="mt-6 text-center text-sm text-neutral-500">
            <p>You need to be a member of the</p>
            <p className="font-semibold text-neutral-700 mt-1">
              team_cloud_and_platforms team
            </p>
            <p className="text-xs mt-1">in the prom-candp organization</p>
          </div>
        </div>
        
        <div className="mt-8 text-center text-xs text-neutral-400">
          <p>By signing in, you agree to our terms and conditions</p>
        </div>
      </div>
    </div>
  );
}
