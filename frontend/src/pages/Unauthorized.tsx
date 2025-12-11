import { AlertCircle, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Unauthorized() {
  const navigate = useNavigate();

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
        
        {/* Vignette effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.5)_50%,rgba(2,6,23,0.8)_100%)]"></div>
      </div>

      <div className="w-full max-w-md text-center relative z-10">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 text-white mb-4 shadow-lg shadow-secondary-500/50 animate-glow">
          <Bot className="w-10 h-10" />
        </div>
        
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/50 mb-6 mt-4">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
        
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl shadow-red-500/10 p-8 mb-6">
          <p className="text-gray-300 mb-4">
            You do not have permission to access this application.
          </p>
          <p className="text-gray-400 text-sm">
            You must be a member of the <span className="font-semibold text-gray-300">team_cloud_and_platforms</span> team
            in the <span className="font-semibold text-gray-300">prom-candp</span> organization.
          </p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors border border-slate-600 hover:border-slate-500"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

