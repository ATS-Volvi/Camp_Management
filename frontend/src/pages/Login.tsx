import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { ShieldCheck, UserCheck, Utensils, KeyRound, Check, Sparkles } from "lucide-react";

interface DemoAccount {
  role: string;
  badge: string;
  email: string;
  password: string;
  description: string;
  icon: typeof ShieldCheck;
  badgeColor: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "Super Admin",
    badge: "Full System Access",
    email: "admin@example.com",
    password: "admin123",
    description: "Access all modules, users, clients & settings",
    icon: ShieldCheck,
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
  },
  {
    role: "Camp Manager",
    badge: "Camp Operations",
    email: "manager@camp.com",
    password: "admin123",
    description: "Manage rooms, allocations, clients & check-ins",
    icon: UserCheck,
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  },
  {
    role: "Catering Supervisor",
    badge: "Kitchen & Store",
    email: "catering@camp.com",
    password: "admin123",
    description: "Food counts, meal cancellations & kitchen stores",
    icon: Utensils,
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800",
  },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  const handleSelectAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setSelectedPersona(account.role);
    setError("");
    setMessage(`Autofilled credentials for ${account.role}`);
  };

  const handleQuickLogin = async (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setSelectedPersona(account.role);
    setError("");
    setMessage("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (error) {
      setError(error.message || "Failed to sign in. Please verify credentials.");
      setLoading(false);
    } else if (data?.session) {
      navigate("/", { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setError(error.message);
      else setMessage("Check your email for the confirmation link.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message || "Failed to sign in. Please verify your credentials.");
      } else if (data?.session) {
        navigate("/", { replace: true });
        return;
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="p-8 bg-card rounded-2xl border shadow-xl space-y-6 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-primary/25">
              <span className="font-extrabold text-xl tracking-wider">CM</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Camp Management</h1>
            <p className="text-muted-foreground text-sm">
              {isSignUp ? "Create a new account" : "Sign in to your camp administration workspace"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedPersona(null);
                }}
                required
                className="w-full px-3.5 py-2.5 border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedPersona(null);
                }}
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl">
                {error}
              </div>
            )}
            {message && !error && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-xl text-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 shadow-md shadow-primary/20 flex items-center justify-center gap-2"
            >
              {loading ? "Signing in..." : isSignUp ? "Sign Up" : "Sign In to Dashboard"}
            </button>
          </form>

          <div className="pt-2 border-t">
            <p className="text-center text-xs text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Need an account or password reset?"}{" "}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }}
                className="text-primary font-medium hover:underline ml-1"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>

        {/* Demo Credentials card */}
        <div className="p-5 bg-card/80 backdrop-blur-md rounded-2xl border shadow-md space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Demo Credentials
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-amber-500" /> 1-Click Autofill
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              const isSelected = selectedPersona === account.role;
              return (
                <div
                  key={account.role}
                  onClick={() => handleSelectAccount(account)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex items-center justify-between group hover:border-primary/50 hover:bg-accent/40 cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-foreground text-sm">
                          {account.role}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${account.badgeColor}`}>
                          {account.badge}
                        </span>
                      </div>
                      <div className="text-muted-foreground font-mono text-[11px] flex items-center gap-2">
                        <span>{account.email}</span>
                        <span>•</span>
                        <span>{account.password}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-2 shrink-0">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickLogin(account);
                      }}
                      className="px-2.5 py-1.5 bg-primary text-primary-foreground font-medium rounded-lg text-[11px] hover:opacity-90 active:scale-95 transition-all shadow-sm"
                    >
                      Instant Login →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
