"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Smartphone, Wallet, Users, ChevronDown, PanelLeft, Database, ArrowLeftRight, Save, ShieldAlert, Tag, FileText, Activity, Landmark, UserPlus, BookOpen, Workflow, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { CheckbookRequestsMenu } from "@/components/checkbook/checkbook-requests-menu";

function NavItem({
  href,
  icon: Icon,
  label,
  collapsed = false,
}: {
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Button
      asChild
      variant={active ? "default" : "ghost"}
      size="sm"
      className={`w-full ${collapsed ? "justify-center" : "justify-start gap-2"
        }`}
    >
      <Link href={href}>
        <Icon className="h-4 w-4" />
        {!collapsed && <span>{label}</span>}
      </Link>
    </Button>
  );
}

export function AdminSidebar() {
  const { locale, translate, setLocale } = useI18n();
  const pathname = usePathname();

  const isMobileSectionActive = pathname?.startsWith("/mobile-banking");
  const isWalletSectionActive = pathname?.startsWith("/wallet");

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(
    Boolean(isMobileSectionActive)
  );
  const [walletOpen, setWalletOpen] = React.useState<boolean>(
    Boolean(isWalletSectionActive)
  );

  React.useEffect(() => {
    if (isMobileSectionActive) {
      setMobileOpen(true);
    }
    if (isWalletSectionActive) {
      setWalletOpen(true);
    }
  }, [isMobileSectionActive, isWalletSectionActive]);

  return (
    <aside
      className={`flex flex-col gap-4 border-r bg-sidebar p-4 text-sidebar-foreground transition-[width] duration-200 ${collapsed ? "w-16 items-center" : "w-64"
        }`}
    >
      <div className="flex items-center gap-2">
        {!collapsed && (
          <div className="flex flex-1 flex-col">
            <h1 className="text-lg font-semibold tracking-tight">
              {translate("sidebar.title")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {translate("sidebar.subtitle")}
            </p>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-4 text-sm">
        <div className="flex items-center justify-between gap-2 text-xs">
          {!collapsed && (
            <span className="text-muted-foreground">
              {translate("language.english")} / {translate("language.portuguese")}
            </span>
          )}
          <div className="flex gap-1">
            <Button
              type="button"
              variant={locale === "en" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-9 text-xs"
              onClick={() => setLocale("en")}
            >
              EN
            </Button>
            <Button
              type="button"
              variant={locale === "pt" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-9 text-xs"
              onClick={() => setLocale("pt")}
            >
              PT
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className={`flex w-full items-center rounded-md px-1 py-1 text-xs font-semibold uppercase text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${collapsed ? "justify-center" : "justify-between"
              }`}
            aria-expanded={mobileOpen}
          >
            <span className="flex items-center gap-2">
              <Smartphone className="h-3 w-3" />
              {!collapsed && <span>{translate("sidebar.mobileBanking")}</span>}
            </span>
            {!collapsed && (
              <ChevronDown
                className={`h-3 w-3 transition-transform ${mobileOpen ? "rotate-180" : "rotate-0"
                  }`}
              />
            )}
          </button>

          {!collapsed && (mobileOpen || isMobileSectionActive) ? (
            <div className="space-y-1 pl-4">
              <NavItem
                href="/mobile-banking/users"
                icon={Users}
                label={translate("sidebar.users")}
                collapsed={collapsed}
              />
              <NavItem
                href="/mobile-banking/accounts"
                icon={Landmark}
                label={translate("sidebar.accounts")}
                collapsed={collapsed}
              />
              <NavItem
                href="/mobile-banking/account-categories"
                icon={Tag}
                label={translate("sidebar.accountCategories")}
                collapsed={collapsed}
              />
              <NavItem
                href="/mobile-banking/registration-requests"
                icon={UserPlus}
                label={translate("sidebar.registrationRequests")}
                collapsed={collapsed}
              />
              <CheckbookRequestsMenu collapsed={collapsed} />
              <NavItem
                href="/mobile-banking/billers"
                icon={Receipt}
                label="Billers"
                collapsed={collapsed}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setWalletOpen((prev) => !prev)}
            className={`flex w-full items-center rounded-md px-1 py-1 text-xs font-semibold uppercase text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${collapsed ? "justify-center" : "justify-between"
              }`}
            aria-expanded={walletOpen}
          >
            <span className="flex items-center gap-2">
              <Wallet className="h-3 w-3" />
              {!collapsed && <span>{translate("sidebar.wallet")}</span>}
            </span>
            {!collapsed && (
              <ChevronDown
                className={`h-3 w-3 transition-transform ${walletOpen ? "rotate-180" : "rotate-0"
                  }`}
              />
            )}
          </button>

          {!collapsed && (walletOpen || isWalletSectionActive) ? (
            <div className="space-y-1 pl-4">
              <NavItem
                href="/wallet/users"
                icon={Users}
                label={translate("sidebar.users")}
                collapsed={collapsed}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-1">
          <div
            className={`flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground ${collapsed ? "justify-center" : "justify-start"
              }`}
          >
            <Database className="h-3 w-3" />
            {!collapsed && <span>{translate("sidebar.system")}</span>}
          </div>
          <div className={collapsed ? "space-y-1 flex flex-col items-center" : "pl-4 space-y-1"}>
            <NavItem
              href="/system/databases"
              icon={Database}
              label={translate("sidebar.databaseManagement")}
              collapsed={collapsed}
            />
            <NavItem
              href="/system/core-banking"
              icon={Database}
              label={translate("sidebar.coreBanking")}
              collapsed={collapsed}
            />
            <NavItem
              href="/admin-users"
              icon={Users}
              label={translate("sidebar.users")}
              collapsed={collapsed}
            />
            <NavItem
              href="/system/login-attempts"
              icon={ShieldAlert}
              label="Login Attempts"
              collapsed={collapsed}
            />
            <NavItem
              href="/system/migrations"
              icon={ArrowLeftRight}
              label={translate("sidebar.migrations")}
              collapsed={collapsed}
            />
            <NavItem
              href="/system/backups"
              icon={Save}
              label="Backups"
              collapsed={collapsed}
            />
            <NavItem
              href="/system/forms"
              icon={FileText}
              label="Forms"
              collapsed={collapsed}
            />
            <NavItem
              href="/system/workflows"
              icon={Workflow}
              label="Workflows"
              collapsed={collapsed}
            />
            <NavItem
              href="/system/app-screens"
              icon={Smartphone}
              label="App Screens"
              collapsed={collapsed}
            />
            <NavItem
              href="/services"
              icon={Activity}
              label="Services Monitor"
              collapsed={collapsed}
            />
          </div>
        </div>
      </nav>
    </aside>
  );
}
