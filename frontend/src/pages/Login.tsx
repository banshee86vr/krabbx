import { Github, Bot, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function Login() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Check if user came from unauthorized redirect
    const reason = searchParams.get('reason');
    if (reason === 'team') {
      setError('You do not have access to this application. Please contact your administrator.');
    }
  }, [searchParams]);
  
  const handleLogin = () => {
    setIsLoading(true);
    // Redirect to backend OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/login`;
  };
  
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract background pattern with neon glow */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs with random floating movement */}
        <div 
          className="absolute top-0 -left-1/4 w-[900px] h-[900px] bg-gradient-to-br from-primary-500/60 to-primary-600/50 rounded-full blur-[140px]"
          style={{ animation: 'float1 10s ease-in-out infinite' }}
        ></div>
        <div 
          className="absolute bottom-0 -right-1/4 w-[1000px] h-[1000px] bg-gradient-to-tl from-secondary-600/60 to-secondary-700/50 rounded-full blur-[140px]"
          style={{ animation: 'float2 12s ease-in-out infinite' }}
        ></div>
        <div 
          className="absolute top-1/3 left-1/3 w-[800px] h-[800px] bg-gradient-to-r from-primary-500/50 via-cyan-500/50 to-secondary-600/50 rounded-full blur-[140px]"
          style={{ animation: 'float3 14s ease-in-out infinite' }}
        ></div>
        
        {/* Additional smaller orbs for depth */}
        <div 
          className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary-400/35 rounded-full blur-[120px]"
          style={{ animation: 'float2 12s ease-in-out infinite 3s' }}
        ></div>
        <div 
          className="absolute bottom-1/4 left-1/3 w-[550px] h-[550px] bg-secondary-500/35 rounded-full blur-[120px]"
          style={{ animation: 'float1 10s ease-in-out infinite 5s' }}
        ></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(52,203,111,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(52,203,111,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
        
        {/* Radial gradient overlay for vignette effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.5)_50%,rgba(2,6,23,0.8)_100%)]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 text-white mb-4 shadow-lg shadow-primary-500/50 animate-glow">
            <Bot className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">RenovateBot Dashboard</h1>
          <p className="text-gray-400">Monitor and manage Renovate Bot adoption</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl shadow-primary-500/10 p-8">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-300 text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors border border-slate-600 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Github className="w-5 h-5" />
                Sign in with GitHub
              </>
            )}
          </button>
          
          <div className="mt-6 text-center text-sm text-gray-400">
            <p>You need to be a member of the</p>
            <p className="font-semibold text-gray-300 mt-1">
              team_cloud_and_platforms team
            </p>
            <p className="text-xs mt-1">in the prom-candp organization</p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>By signing in, you agree to our terms and conditions</p>
        </div>
      </div>
    </div>
  );
}

