import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookMarked,
  Boxes,
  ClipboardCheck,
  FileCheck2,
  FilePlus2,
  FileStack,
  Gauge,
  History,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Upload,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, roleLabel, type AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: LucideIcon };

const navByRole: Record<AppRole, NavItem[]> = {
  student: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "My Project", icon: BookMarked },
    { to: "/submissions", label: "Submissions", icon: Upload },
    { to: "/verification", label: "Verification", icon: ShieldCheck },
    { to: "/profile", label: "Profile", icon: UserCog },
  ],
  supervisor: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "Assigned Projects", icon: FileStack },
    { to: "/reviews", label: "Reviews", icon: ClipboardCheck },
    { to: "/verification", label: "Verification", icon: ShieldCheck },
    { to: "/profile", label: "Profile", icon: UserCog },
  ],
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "Manage Projects", icon: Boxes },
    { to: "/submissions", label: "Manage Submissions", icon: FileCheck2 },
    { to: "/reviews", label: "Reviews", icon: ClipboardCheck },
    { to: "/verification", label: "Verification", icon: ShieldCheck },
    { to: "/admin", label: "Admin", icon: Users },
    { to: "/profile", label: "Profile", icon: UserCog },
  ],
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, role, signOut, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notices, setNotices] = useState<
    { id: string; title: string; body: string; created_at: string }[]
  >([]);

  const items = navByRole[role ?? "student"];
  const displayName = profile?.full_name || user?.email || "Account";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, created_at, is_read")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (cancelled) return;
      setNotices(data ?? []);
      setUnread((data ?? []).filter((n) => !n.is_read).length);
    };
    void load();
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const markRead = async () => {
    if (!user || unread === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnread(0);
  };

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Gauge className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">FYP-Repository</p>
            <p className="text-[10px] text-sidebar-foreground/60">Blockchain Project Repository</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </nav>
      </aside>

      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-navy-deep/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 hover:bg-sidebar-accent lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden text-sm font-semibold text-white lg:block">
            Final Year Project Repository
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu onOpenChange={(o) => o && void markRead()}>
              <DropdownMenuTrigger
                className="relative rounded-md p-2 hover:bg-sidebar-accent"
                aria-label="Notifications"
              >
                <Bell className="size-5" />
                {unread > 0 ? (
                  <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unread}
                  </span>
                ) : null}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notices.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">Nothing yet</p>
                ) : (
                  notices.map((n) => (
                    <div key={n.id} className="border-b px-2 py-2 last:border-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                    </div>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initials(displayName)}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-xs font-semibold text-white">{displayName}</span>
                  <span className="block text-[10px] text-sidebar-foreground/60">
                    {role ? roleLabel[role] : ""}
                  </span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void navigate({ to: "/profile" })}>
                  <UserCog className="mr-2 size-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon = FilePlus2,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="hidden size-10 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
          <Icon className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileStack className="size-6" />
      </span>
      <p className="font-semibold">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
