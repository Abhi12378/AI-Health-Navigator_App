import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, HeartPulse, ArrowRight, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleGuestLogin = async () => {
    // Track guest click
    const currentGuestClicks = parseInt(localStorage.getItem('admin_guest_clicks') || '0');
    localStorage.setItem('admin_guest_clicks', (currentGuestClicks + 1).toString());
    
    await login('guest');
    navigate('/chat');
  };

  const handleGoogleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    // Track login click
    const currentLoginClicks = parseInt(localStorage.getItem('admin_login_clicks') || '0');
    localStorage.setItem('admin_login_clicks', (currentLoginClicks + 1).toString());
    
    await login('google');
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900 selection:bg-blue-100">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 100, 0], 
            y: [0, -50, 0],
            scale: [1, 1.2, 1] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl mix-blend-multiply"
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 0], 
            y: [0, 100, 0],
            scale: [1, 1.5, 1] 
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/2 -right-20 w-[30rem] h-[30rem] bg-sky-400/20 rounded-full blur-3xl mix-blend-multiply"
        />
        <motion.div 
          animate={{ 
            x: [0, 50, 0], 
            y: [0, 50, 0],
            scale: [1, 1.1, 1] 
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute -bottom-20 left-1/3 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl mix-blend-multiply"
        />
      </div>

      <div className="container mx-auto px-6 h-screen relative z-10 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-12">
        
        {/* Left Section: Hero Content */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="lg:w-1/2 space-y-8 text-center lg:text-left pt-10 lg:pt-0"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            AI-Powered Health Assistant
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-tight text-slate-900">
            Navigate your health with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-500">clarity.</span>
          </h1>
          
          <p className="text-xl text-slate-600 max-w-lg mx-auto lg:mx-0 leading-relaxed">
            Understand symptoms. Know when to act. Your personal AI companion for smarter, safer health decisions.
          </p>

          <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
            <div className="flex items-center gap-2 text-slate-500 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-100 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">Private & Secure</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-100 shadow-sm">
              <Activity className="w-5 h-5 text-sky-500" />
              <span className="text-sm font-medium">24/7 Analysis</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-100 shadow-sm">
              <HeartPulse className="w-5 h-5 text-indigo-500" />
              <span className="text-sm font-medium">Medical Insights</span>
            </div>
          </div>
        </motion.div>

        {/* Right Section: Login Card */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="lg:w-5/12 w-full max-w-md"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-sky-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8 lg:p-10">
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-sky-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 transition-transform duration-300 hover:scale-105">
                  <Stethoscope className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
                <p className="text-slate-500 mt-2">Sign in to access your health dashboard</p>
              </div>

              <div className="space-y-4">
                <a 
                  href="/auth/google"
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center w-full px-6 py-3.5 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all duration-200 group/btn"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="font-semibold">Continue with Google</span>
                </a>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase tracking-wider font-medium">Or</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <button 
                  onClick={handleGuestLogin}
                  className="flex items-center justify-center w-full px-6 py-3.5 text-white bg-slate-900 rounded-xl hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <span className="font-semibold">Continue as Guest</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>

              <p className="mt-8 text-center text-xs text-slate-400">
                By continuing, you agree to our <a href="#" className="underline hover:text-blue-600">Terms of Service</a> and <a href="#" className="underline hover:text-blue-600">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
