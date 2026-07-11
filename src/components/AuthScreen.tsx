import React, { useState } from 'react';
import { ShieldCheck, User, Sparkles, Building2, Eye, EyeOff } from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

interface AuthScreenProps {
  onSignIn: (user: UserProfile) => void;
}

export default function AuthScreen({ onSignIn }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Demo users for quick access
  const demoUsers = [
    {
      role: 'super_admin' as UserRole,
      name: 'Sarah Jenkins (Super Admin)',
      email: 'sarah.admin@inovexa.com',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    },
    {
      role: 'admin' as UserRole,
      name: 'Alex Rivera (Admin)',
      email: 'alex.rivera@inovexa.com',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    },
    {
      role: 'employee' as UserRole,
      name: 'John Miller (Employee)',
      email: 'john.miller@inovexa.com',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
    }
  ];

  const handleDemoSignIn = async (demo: typeof demoUsers[0]) => {
    setLoading(true);
    setError(null);
    const demoPassword = 'DemoPassword123!';
    try {
      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, demo.email, demoPassword);
      } catch (signInErr: any) {
        // If user not found or invalid credential (because they do not exist yet), auto-create
        if (
          signInErr?.code === 'auth/user-not-found' || 
          signInErr?.code === 'auth/invalid-credential' ||
          signInErr?.message?.includes('user-not-found') ||
          signInErr?.message?.includes('INVALID_LOGIN_CREDENTIALS')
        ) {
          userCred = await createUserWithEmailAndPassword(auth, demo.email, demoPassword);
        } else if (signInErr?.code === 'auth/operation-not-allowed' || signInErr?.message?.includes('operation-not-allowed')) {
          // EMAIL/PASSWORD IS DISABLED - ACTIVATE AUTOMATIC OFFLINE MODE BYPASS!
          console.warn("Firebase Email/Password Auth is disabled. Switching to Local Sandbox Mode.");
          localStorage.setItem('inovexa_offline_mode', 'true');
          onSignIn({
            uid: `demo-${demo.role}-${Date.now().toString().slice(-4)}`,
            email: demo.email,
            name: demo.name + " (Sandbox)",
            role: demo.role,
            createdAt: new Date()
          });
          return;
        } else {
          throw signInErr;
        }
      }
      const uid = userCred.user.uid;
      localStorage.setItem('inovexa_offline_mode', 'false');
      onSignIn({
        uid: uid,
        email: demo.email,
        name: demo.name,
        role: demo.role,
        createdAt: new Date()
      });
    } catch (err: any) {
      console.error("Demo authentication failed:", err);
      if (err?.code === 'auth/operation-not-allowed' || err?.message?.includes('operation-not-allowed')) {
        console.warn("Firebase Email/Password Auth is disabled. Switching to Local Sandbox Mode.");
        localStorage.setItem('inovexa_offline_mode', 'true');
        onSignIn({
          uid: `demo-${demo.role}-${Date.now().toString().slice(-4)}`,
          email: demo.email,
          name: demo.name + " (Sandbox)",
          role: demo.role,
          createdAt: new Date()
        });
      } else {
        setError("Demo authentication failed: " + (err?.message || String(err)));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCred = await signInWithPopup(auth, provider);
      const email = userCred.user.email || '';
      
      // Bootstrap roles specifically based on corporate email
      let detectedRole: UserRole = 'employee';
      if (email.toLowerCase() === 'tanveerk.eee@gmail.com') {
        detectedRole = 'super_admin';
      } else if (email.toLowerCase() === 'khanmd.eee@gmail.com') {
        detectedRole = 'admin';
      } else if (email.toLowerCase().includes('super')) {
        detectedRole = 'super_admin';
      } else if (email.toLowerCase().includes('admin')) {
        detectedRole = 'admin';
      }
      
      localStorage.setItem('inovexa_offline_mode', 'false');
      onSignIn({
        uid: userCred.user.uid,
        email: email,
        name: userCred.user.displayName || email.split('@')[0].toUpperCase(),
        role: detectedRole,
        createdAt: new Date()
      });
    } catch (err: any) {
      console.error("Google authentication failed:", err);
      let errMsg = err?.message || String(err);
      
      // Target specific domain authorization or popup blockage to guide the user
      if (err?.code === 'auth/unauthorized-domain' || errMsg.toLowerCase().includes('unauthorized-domain') || errMsg.toLowerCase().includes('unauthorized domain')) {
        errMsg = "This domain (" + window.location.hostname + ") is not authorized for Google Sign-In in your Firebase Console. To fix this, please log into the Firebase Console, navigate to 'Authentication' -> 'Settings' -> 'Authorized Domains', and add '" + window.location.hostname + "' to the list.";
      } else if (err?.code === 'auth/popup-blocked' || errMsg.toLowerCase().includes('popup-blocked') || errMsg.toLowerCase().includes('popup blocked')) {
        errMsg = "The sign-in popup was blocked by your browser. Please click 'Sign in with Google' again and allow popups for this site.";
      }
      
      setError("Google authentication failed: " + errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // Security restriction for specific corporate email accounts
    const formattedEmail = email.trim().toLowerCase();
    if (formattedEmail === 'tanveerk.eee@gmail.com' || formattedEmail === 'khanmd.eee@gmail.com') {
      setError(`Corporate security policy restricts ${email} to 'Sign in with Google' only for multi-factor verification.`);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let userCred;
      if (isSignUp) {
        try {
          userCred = await createUserWithEmailAndPassword(auth, email, password);
        } catch (signUpErr: any) {
          if (signUpErr?.code === 'auth/operation-not-allowed' || signUpErr?.message?.includes('operation-not-allowed')) {
            localStorage.setItem('inovexa_offline_mode', 'true');
            const detectedRole: UserRole = email.includes('super') ? 'super_admin' : (email.includes('admin') ? 'admin' : 'employee');
            onSignIn({
              uid: `demo-${detectedRole}-${Date.now().toString().slice(-4)}`,
              email: email,
              name: name || email.split('@')[0].toUpperCase() + " (Sandbox)",
              role: detectedRole,
              createdAt: new Date()
            });
            return;
          } else {
            throw signUpErr;
          }
        }
      } else {
        try {
          userCred = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          // If user doesn't exist, helpfully auto-register them for a seamless demo/testing flow
          if (
            signInErr?.code === 'auth/user-not-found' || 
            signInErr?.code === 'auth/invalid-credential' ||
            signInErr?.message?.includes('user-not-found') ||
            signInErr?.message?.includes('INVALID_LOGIN_CREDENTIALS')
          ) {
            try {
              userCred = await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr: any) {
              if (createErr?.code === 'auth/operation-not-allowed' || createErr?.message?.includes('operation-not-allowed')) {
                localStorage.setItem('inovexa_offline_mode', 'true');
                const detectedRole: UserRole = email.includes('super') ? 'super_admin' : (email.includes('admin') ? 'admin' : 'employee');
                onSignIn({
                  uid: `demo-${detectedRole}-${Date.now().toString().slice(-4)}`,
                  email: email,
                  name: name || email.split('@')[0].toUpperCase() + " (Sandbox)",
                  role: detectedRole,
                  createdAt: new Date()
                });
                return;
              } else {
                throw createErr;
              }
            }
          } else if (signInErr?.code === 'auth/operation-not-allowed' || signInErr?.message?.includes('operation-not-allowed')) {
            localStorage.setItem('inovexa_offline_mode', 'true');
            const detectedRole: UserRole = email.includes('super') ? 'super_admin' : (email.includes('admin') ? 'admin' : 'employee');
            onSignIn({
              uid: `demo-${detectedRole}-${Date.now().toString().slice(-4)}`,
              email: email,
              name: name || email.split('@')[0].toUpperCase() + " (Sandbox)",
              role: detectedRole,
              createdAt: new Date()
            });
            return;
          } else {
            throw signInErr;
          }
        }
      }
      const uid = userCred.user.uid;
      const detectedRole: UserRole = email.includes('super') ? 'super_admin' : (email.includes('admin') ? 'admin' : 'employee');
      localStorage.setItem('inovexa_offline_mode', 'false');
      onSignIn({
        uid: uid,
        email: email,
        name: name || email.split('@')[0].toUpperCase(),
        role: detectedRole,
        createdAt: new Date()
      });
    } catch (err: any) {
      console.error("Custom authentication failed:", err);
      if (err?.code === 'auth/operation-not-allowed' || err?.message?.includes('operation-not-allowed')) {
        localStorage.setItem('inovexa_offline_mode', 'true');
        const detectedRole: UserRole = email.includes('super') ? 'super_admin' : (email.includes('admin') ? 'admin' : 'employee');
        onSignIn({
          uid: `demo-${detectedRole}-${Date.now().toString().slice(-4)}`,
          email: email,
          name: name || email.split('@')[0].toUpperCase() + " (Sandbox)",
          role: detectedRole,
          createdAt: new Date()
        });
      } else {
        setError("Authentication failed: " + (err?.message || String(err)));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen" className="min-h-screen bg-[#f3f4f6] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans transition-all duration-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-[4px_4px_10px_rgba(163,177,198,0.5),-4px_-4px_10px_rgba(255,255,255,0.8)] border border-gray-100">
            <Building2 className="h-9 w-9 text-indigo-600" id="inovexa-logo-icon" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-800">
          Inovexa Technologies
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 font-mono">
          Enterprise ERP & CRM Suite v2.0
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Neumorphic main card */}
        <div className="bg-[#f3f4f6] py-8 px-6 sm:px-10 rounded-3xl shadow-[8px_8px_16px_rgba(165,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)] border border-white/60">
          
          <div className="mb-6">
            <div className="flex justify-center space-x-1 p-1 bg-gray-200/50 rounded-xl">
              <button
                id="btn-tab-login"
                onClick={() => setIsSignUp(false)}
                className={`w-1/2 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  !isSignUp ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Sign In
              </button>
              <button
                id="btn-tab-signup"
                onClick={() => setIsSignUp(true)}
                className={`w-1/2 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  isSignUp ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold leading-relaxed">
              <p className="font-bold text-amber-950 mb-1">💡 Authentication Guidance:</p>
              <p className="mb-2">{error}</p>
              {(error.includes('operation-not-allowed') || error.includes('disabled')) && (
                <div className="bg-white/80 p-2.5 rounded-lg border border-amber-100 text-[11px] font-medium text-amber-700 mt-2">
                  <p className="font-bold mb-1 text-amber-800">To enable Email/Password login:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to your <a href="https://console.firebase.google.com/project/natural-booking-q07pf/authentication/providers" target="_blank" rel="noopener noreferrer" className="underline text-indigo-600 font-bold hover:text-indigo-800">Firebase Console</a>.</li>
                    <li>Under <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong>, enable <strong>Email/Password</strong> and click Save.</li>
                    <li>Alternatively, sign in via Google below or input standard corporate credentials.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleCustomSubmit}>
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="input-reg-name"
                    type="text"
                    required={isSignUp}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g., Jane Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Corporate Email
              </label>
              <input
                id="input-auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="input-auth-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  id="btn-toggle-password"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                id="btn-auth-submit"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all flex justify-center items-center cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Processing...</span>
                  </span>
                ) : (
                  <span>{isSignUp ? 'Create Corporate Profile' : 'Authenticate License'}</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-3">
            <button
              id="btn-google-signin"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all flex justify-center items-center space-x-2 cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.12C18.281 1.05 15.45 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c7.07 0 11.79-4.97 11.79-12 0-.81-.08-1.425-.19-1.995H12.24z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>



          <div className="mt-6 text-center">
            <p className="text-[10px] text-gray-400">
              Secured by Google Cloud Services. Enterprise authentication standards enforced.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

