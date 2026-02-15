import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target } from "lucide-react";
import { StarField, NebulaGlows } from "@/components/StarField";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else if (isSignUp) {
      setSuccess("Check your email to confirm your account.");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <StarField />
      <NebulaGlows />

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-[0_0_20px_hsl(270_70%_60%/0.3)]">
            <Target className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Goal OS</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-2">— Your Execution Operating System —</p>
        </div>

        <form onSubmit={handleSubmit} className="backdrop-blur-md bg-card/60 border border-border/30 rounded-xl p-6 space-y-4 shadow-[0_0_40px_hsl(270_70%_60%/0.03)]">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary/50 border-border/40 focus:border-primary/50 placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-secondary/50 border-border/40 focus:border-primary/50 placeholder:text-muted-foreground/50"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-primary">{success}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>

          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}
