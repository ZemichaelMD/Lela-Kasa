import {
  BarChart2,
  Beer,
  CreditCard,
  Crown,
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Tag,
  UserCog,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/ui";
import { APP_NAME } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { usePermission } from "@/components/permission-gate";
import { useAuthContext } from "@/lib/auth-context";
import logo from "@/assets/logo.png";

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
          "group relative flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-primary" />
          )}
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { t } = useI18n();
  const { user } = useAuthContext();
  const isOwner = user?.role === "OWNER";
  const canViewSales = usePermission("sales:view");
  const canViewCustomers = usePermission("customers:view");
  const canViewBeverages = usePermission("beverages:view");
  const canViewPriceTiers = usePermission("price-tiers:view");
  const canViewPaymentAccounts = usePermission("payment-accounts:view");
  const canViewOrders = usePermission("orders:view");
  const canViewReports = usePermission("reports:view");
  const canViewSettings = usePermission("settings:view");

  const groups: Array<{ title: string; items: NavItem[] }> = [];

  // Main section
  const mainItems: NavItem[] = [];
  if (canViewSales)
    mainItems.push({ to: "/sales", label: t("sales"), icon: ShoppingCart });
  mainItems.push({
    to: "/dashboard",
    label: t("dashboard"),
    icon: LayoutDashboard,
  });
  if (mainItems.length > 0) groups.push({ title: t("main"), items: mainItems });

  // Master Data section
  const masterItems: NavItem[] = [];
  if (canViewCustomers)
    masterItems.push({ to: "/customers", label: t("customers"), icon: Users });
  if (canViewBeverages)
    masterItems.push({ to: "/beverages", label: t("beverages"), icon: Beer });
  if (canViewPriceTiers)
    masterItems.push({ to: "/price-tiers", label: t("priceTiers"), icon: Tag });
  if (canViewPaymentAccounts)
    masterItems.push({
      to: "/payment-accounts",
      label: t("paymentAccounts"),
      icon: CreditCard,
    });
  if (masterItems.length > 0)
    groups.push({ title: t("masterData"), items: masterItems });

  // Reports
  if (canViewReports)
    groups.push({
      title: t("reports"),
      items: [{ to: "/reports", label: t("reports"), icon: BarChart2 }],
    });

  // Orders
  if (canViewOrders)
    groups.push({
      title: t("orders"),
      items: [{ to: "/orders", label: t("orders"), icon: ClipboardList }],
    });

  // Admin section
  const adminItems: NavItem[] = [];
  if (isOwner) {
    adminItems.push({
      to: "/subscription",
      label: t("Subscription"),
      icon: Crown,
    });
    adminItems.push({ to: "/employees", label: t("employees"), icon: UserCog });
  }
  if (canViewSettings)
    adminItems.push({ to: "/settings", label: t("settings"), icon: Settings });
  if (adminItems.length > 0)
    groups.push({ title: t("admin"), items: adminItems });

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm">
          <img src={logo} alt="Logo" className="h-full w-full object-cover" />
        </span>
        <span className="text-sm font-semibold leading-tight">
          {APP_NAME}
          <span className="block text-xs font-normal text-muted-foreground">
            {t("clientSub")}
          </span>
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu") as string}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </p>
            {group.items.map((item) => (
              <ItemLink key={item.to} item={item} onClose={onClose} />
            ))}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2.5 text-xs text-muted-foreground">
          <Zap className="h-4 w-4 shrink-0 text-accent-strong" />
          <span>{t("kasaPortInProgress")}</span>
        </div>
      </div>
    </div>
  );
}
