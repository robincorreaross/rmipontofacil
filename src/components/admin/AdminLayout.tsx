import { ReactNode } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Fingerprint, Users, ClipboardList, BarChart3, LogOut, QrCode } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/employees', label: 'Funcionários', icon: Users },
  { href: '/admin/records', label: 'Registros', icon: ClipboardList },
  { href: '/admin/qrcode', label: 'QR Code', icon: QrCode },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Fingerprint className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground hidden sm:inline">PontoFácil</span>
            <span className="text-xs text-muted-foreground hidden sm:inline ml-1">Admin</span>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = location.pathname === href;
              return (
                <Link key={href} to={href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className={`gap-1.5 text-xs ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-1.5 text-xs">Sair</span>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container px-4 py-6">
        {children}
      </main>
    </div>
  );
}
