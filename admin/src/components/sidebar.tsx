import {
  BarChart2, Beer, CreditCard, Crown, LayoutDashboard, Settings,
  ShoppingCart, Tag, UserCog, Users, X, Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/ui";
import { APP_NAME } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { useAuthContext } from "@/lib/auth-context";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
}

function ItemLink({ item, onClose }: { item: NavItem; onClose?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/dashboard"}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
          {item.badge}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { t } = useI18n();
  const { user } = useAuthContext();

  const superAdminGroups: Array<{ title: string; items: NavItem[] }> = [
    { title: "Platform", items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/shops", label: "Shops", icon: ShoppingCart },
      { to: "/users", label: "Users", icon: Users },
    ]},
    { title: "Sales", items: [{ to: "/sales", label: "Sales", icon: BarChart2 }] },
    { title: "System", items: [
      { to: "/audit-logs", label: "Audit Logs", icon: Tag },
      { to: "/system", label: "Administration", icon: Settings },
      { to: "/subscriptions", label: "Subscriptions", icon: CreditCard },
    ]},
  ];

  const standardGroups: Array<{ title: string; items: NavItem[] }> = [
    { title: t("main"), items: [
      { to: "/sales", label: t("sales"), icon: ShoppingCart },
      { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    ]},
    { title: t("masterData"), items: [
      { to: "/customers", label: t("customers"), icon: Users },
      { to: "/beverages", label: t("beverages"), icon: Beer },
      { to: "/price-tiers", label: t("priceTiers"), icon: Tag },
      { to: "/payment-accounts", label: t("paymentAccounts"), icon: CreditCard },
    ]},
    { title: t("admin"), items: [
      { to: "/employees", label: t("employees"), icon: UserCog },
      { to: "/settings", label: t("settings"), icon: Settings },
    ]},
  ];

  const groups = user?.role === "SUPER_ADMIN" ? superAdminGroups : standardGroups;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2.5 px-4 h-14 border-b border-border/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-sm">
          <Beer className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-foreground">{APP_NAME}</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("adminSub")}</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label={t("closeMenu") as string}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto space-y-6 px-3 py-4">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </p>
            {group.items.map((item) => (
              <ItemLink key={item.to} item={item} onClose={onClose} />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-border/50 p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>Admin Panel v1.0</span>
        </div>
      </div>
    </div>
  );
}
