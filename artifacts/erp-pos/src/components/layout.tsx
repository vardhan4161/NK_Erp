import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  ArrowRightLeft, 
  Tags, 
  Receipt, 
  Banknote, 
  BarChart3, 
  Users, 
  Settings,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS Terminal", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: ArrowRightLeft },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/expenses", label: "Expenses", icon: Banknote },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/users", label: "Users", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe({ query: { retry: false, refetchOnWindowFocus: false }});
  const logoutMut = useLogout();

  const handleLogout = () => {
    logoutMut.mutate({}, {
      onSuccess: () => {
        localStorage.removeItem("erp_token");
        setLocation("/login");
      }
    });
  };

  return (
    <div className="flex h-screen bg-gray-50/50">
      <aside className="w-64 border-r bg-white flex flex-col hidden md:flex">
        <div className="p-4 border-b h-14 flex items-center">
          <h1 className="font-bold text-lg text-primary tracking-tight">Volt ERP</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user?.fullName?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b bg-white flex items-center justify-between px-6 md:hidden">
           <h1 className="font-bold text-lg text-primary tracking-tight">Volt ERP</h1>
           <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}