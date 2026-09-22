import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2, Lock, ShieldCheck, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { completeRegistration } from "@/lib/fyp.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";
type RoleChoice = "student" | "supervisor" | "admin";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode } => ({
    mode: search["mode"] === "register" ? "register" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or register — FYP-Repository" },
      { name: "description", content: "Student, supervisor and administrator access to the blockchain project repository." },
      { property: "og:title", content: "Sign in — FYP-Repository" },
      { property: "og:description", content: "Access the blockchain-based final year project repository." },
    ],
  }),
  component: AuthPage,
});

const roleCards: { key: RoleChoice; title: string; text: string; icon: typeof GraduationCap }[] = [
  { key: "student", title: "Register as Student", text: "Submit and track your final year project", icon: GraduationCap },
  { key: "supervisor", title: "Register as Supervisor", text: "Review projects assigned to you", icon: Users },
  { key: "admin", title: "Register as Admin", text: "Manage the repository (invite code required)", icon: UserCog },
];

function AuthPage() {
  const { mode: searchMode } = Route.useSearch();
  const navigate = useNavigate();
  const { session, role, refresh } = useAuth();
  const [mode, setMode] = useState<Mode>(searchMode === "register" ? "register" : "login");
  const [roleChoice, setRoleChoice] = useState<RoleChoice | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [matric, setMatric] = useState("");
  const [department, setDepartment] = useState("");
  const [programme, setProgramme] = useState("");
  const [academicSession, setAcademicSession] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    if (session && role) void navigate({ to: "/dashboard", replace: true });
  }, [session, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    await refresh();
    toast.success("Welcome back");
    void navigate({ to: "/dashboard", replace: true });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleChoice) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        toast.error(signInError.message);
        setBusy(false);
        return;
      }
    }
    try {
      await completeRegistration({
        data: {
          role: roleChoice,
          fullName,
          matricNumber: matric,
          department,
          programme,
          academicSession,
          inviteCode,
        },
      });
      await refresh();
      toast.success("Account created");
      void navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      await supabase.auth.signOut();
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero-gradient hidden flex-col justify-between p-10 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <ShieldCheck className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold">FYP-Repository</p>
            <p className="text-[10px] text-white/60">Blockchain Based Project Repository</p>
          </div>
        </Link>
        <div>
          <h2 className="text-3xl font-bold">Verifiable project submissions.</h2>
          <p className="mt-3 max-w-md text-white/70">
            Every document is fingerprinted with SHA-256 and anchored to the Ethereum Sepolia network,
            so provenance can be proven long after graduation.
          </p>
        </div>
        <p className="text-xs text-white/50">Secured with role-based access and row-level security.</p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex rounded-lg bg-secondary p-1">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setRoleChoice(null); }}
                className={cn(
                  "flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                  mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {m === "login" ? "Login" : "Register"}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="surface-card space-y-4 p-6">
              <div>
                <h1 className="text-xl font-bold">Sign in</h1>
                <p className="text-sm text-muted-foreground">Access your repository dashboard.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Lock className="mr-2 size-4" />}
                Sign in
              </Button>
            </form>
          ) : roleChoice === null ? (
            <div className="space-y-3">
              <div className="mb-2">
                <h1 className="text-xl font-bold">Create an account</h1>
                <p className="text-sm text-muted-foreground">Choose how you will use the repository.</p>
              </div>
              {roleCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setRoleChoice(card.key)}
                  className="surface-card flex w-full items-center gap-4 p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <card.icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{card.title}</span>
                    <span className="block text-sm text-muted-foreground">{card.text}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="surface-card space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">{roleCards.find((c) => c.key === roleChoice)!.title}</h1>
                  <p className="text-sm text-muted-foreground">All fields marked * are required.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRoleChoice(null)}>
                  Change
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name *</Label>
                <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="remail">Email *</Label>
                <Input id="remail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rpassword">Password * (min 8 characters)</Label>
                <Input id="rpassword" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              {roleChoice === "student" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="matric">Matriculation number *</Label>
                    <Input id="matric" required placeholder="UG22/SCCS/1001" value={matric} onChange={(e) => setMatric(e.target.value)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="dept">Department</Label>
                      <Input id="dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Computer Science" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="prog">Programme</Label>
                      <Input id="prog" value={programme} onChange={(e) => setProgramme(e.target.value)} placeholder="B.Sc Computer Science" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sess">Academic session</Label>
                    <Input id="sess" value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} placeholder="2024/2025" />
                  </div>
                </>
              ) : null}

              {roleChoice === "supervisor" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="sdept">Department</Label>
                  <Input id="sdept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Computer Science" />
                </div>
              ) : null}

              {roleChoice === "admin" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="invite">Administrator invite code *</Label>
                  <Input id="invite" required value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Issued by the system owner. Admin accounts cannot be self-assigned without it.</p>
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Create account
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
