import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MapPin,
  ClipboardCheck,
  LogOut,
  LogIn,
  Menu,
  X,
  Toilet,
  Search,
} from "lucide-react";
import { useState } from "react";

const publicLinks = [
  { to: "/", label: "Toilets", icon: Toilet },
  { to: "/nearby", label: "Find Nearby", icon: Search },
];

const authLinks = [
  { to: "/inspect", label: "Inspect", icon: ClipboardCheck },
];

const adminLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    ...publicLinks,
    ...(user ? authLinks : []),
    ...(role === "admin" ? adminLinks : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline">Smart Sanitation AI</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link key={l.to} to={l.to}>
                <Button
                  variant={location.pathname === l.to ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-t md:hidden animate-fade-in">
            <nav className="container flex flex-col gap-1 py-3">
              {links.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}>
                  <Button
                    variant={location.pathname === l.to ? "default" : "ghost"}
                    className="w-full justify-start gap-2"
                  >
                    <l.icon className="h-4 w-4" />
                    {l.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="container py-6">{children}</main>
    </div>
  );
}
