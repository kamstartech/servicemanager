"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Smartphone,
  Wallet,
  Users,
  ChevronDown,
  PanelLeft,
  Database,
  ArrowLeftRight,
  Save,
  ShieldAlert,
  Tag,
  FileText,
  Activity,
  Landmark,
  UserPlus,
  Workflow,
  Receipt,
  UserCog,
  Settings,
  Shield,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { CheckbookRequestsMenu } from "@/components/checkbook/checkbook-requests-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  const button = (
    <Button
      asChild
      variant={active ? "default" : "ghost"}
      size="sm"
      className={`w-full ${
        collapsed ? "justify-center px-2" : "justify-start gap-2"
      }`}
    >
      <Link href={href}>
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    </Button>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

function SectionHeader({
  icon: Icon,
  label,
  collapsed,
  isOpen,
  onToggle,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  collapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const content = (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center rounded-md px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
        collapsed ? "justify-center" : "justify-between"
      }`}
      aria-expanded={isOpen}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{label}</span>}
      </span>
      {!collapsed && (
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      )}
    </button>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

export function AdminSidebar() {
  const { locale, translate, setLocale } = useI18n();
  const pathname = usePathname();

  const isMobileSectionActive = pathname?.startsWith("/mobile-banking");
  const isWalletSectionActive = pathname?.startsWith("/wallet");
  const isConfigSectionActive =
    pathname?.startsWith("/system/forms") ||
    pathname?.startsWith("/system/workflows") ||
    pathname?.startsWith("/system/app-screens");
  const isSystemSectionActive =
    pathname?.startsWith("/system/databases") ||
    pathname?.startsWith("/system/core-banking") ||
    pathname?.startsWith("/system/migrations") ||
    pathname?.startsWith("/system/backups");
  const isAdminSectionActive =
    pathname?.startsWith("/admin-users") ||
    pathname?.startsWith("/system/login-attempts") ||
    pathname?.startsWith("/services");

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(isMobileSectionActive);
  const [walletOpen, setWalletOpen] = React.useState(isWalletSectionActive);
  const [configOpen, setConfigOpen] = React.useState(isConfigSectionActive);
  const [systemOpen, setSystemOpen] = React.useState(isSystemSectionActive);
  const [adminOpen, setAdminOpen] = React.useState(isAdminSectionActive);

  React.useEffect(() => {
    if (isMobileSectionActive) setMobileOpen(true);
    if (isWalletSectionActive) setWalletOpen(true);
    if (isConfigSectionActive) setConfigOpen(true);
    if (isSystemSectionActive) setSystemOpen(true);
    if (isAdminSectionActive) setAdminOpen(true);
  }, [
    isMobileSectionActive,
    isWalletSectionActive,
    isConfigSectionActive,
    isSystemSectionActive,
    isAdminSectionActive,
  ]);

  return (
    <aside
      className={`flex flex-col gap-3 border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-4">
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

      {/* Scrollable Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
        {/* Language Switcher - Compact */}
        {!collapsed && (
          <div className="mb-2 flex items-center justify-center gap-1 rounded-md bg-sidebar-accent/50 p-1">
            <Button
              type="button"
              variant={locale === "en" ? "default" : "ghost"}
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={() => setLocale("en")}
            >
              EN
            </Button>
            <Button
              type="button"
              variant={locale === "pt" ? "default" : "ghost"}
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={() => setLocale("pt")}
            >
              PT
            </Button>
          </div>
        )}

        {/* Mobile Banking Section */}
        <div className="space-y-1">
          <SectionHeader
            icon={Smartphone}
            label={translate("sidebar.mobileBanking")}
            collapsed={collapsed}
            isOpen={mobileOpen}
            onToggle={() => setMobileOpen((prev) => !prev)}
          />
          {!collapsed && (mobileOpen || isMobileSectionActive) && (
            <div className="space-y-0.5 pl-3">
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
          )}
        </div>

        {/* Wallet Section */}
        <div className="space-y-1">
          <SectionHeader
            icon={Wallet}
            label={translate("sidebar.wallet")}
            collapsed={collapsed}
            isOpen={walletOpen}
            onToggle={() => setWalletOpen((prev) => !prev)}
          />
          {!collapsed && (walletOpen || isWalletSectionActive) && (
            <div className="space-y-0.5 pl-3">
              <NavItem
                href="/wallet/users"
                icon={Users}
                label={translate("sidebar.users")}
                collapsed={collapsed}
              />
            </div>
          )}
        </div>

        {/* Configuration Section - NEW */}
        <div className="space-y-1">
          <SectionHeader
            icon={Settings}
            label="Configuration"
            collapsed={collapsed}
            isOpen={configOpen}
            onToggle={() => setConfigOpen((prev) => !prev)}
          />
          {!collapsed && (configOpen || isConfigSectionActive) && (
            <div className="space-y-0.5 pl-3">
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
            </div>
          )}
        </div>

        {/* System Section - REFINED */}
        <div className="space-y-1">
          <SectionHeader
            icon={Wrench}
            label="System"
            collapsed={collapsed}
            isOpen={systemOpen}
            onToggle={() => setSystemOpen((prev) => !prev)}
          />
          {!collapsed && (systemOpen || isSystemSectionActive) && (
            <div className="space-y-0.5 pl-3">
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
            </div>
          )}
        </div>

        {/* Administration Section - NEW */}
        <div className="space-y-1">
          <SectionHeader
            icon={Shield}
            label="Administration"
            collapsed={collapsed}
            isOpen={adminOpen}
            onToggle={() => setAdminOpen((prev) => !prev)}
          />
          {!collapsed && (adminOpen || isAdminSectionActive) && (
            <div className="space-y-0.5 pl-3">
              <NavItem
                href="/admin-users"
                icon={Users}
                label="Admin Users"
                collapsed={collapsed}
              />
              <NavItem
                href="/system/login-attempts"
                icon={ShieldAlert}
                label="Login Attempts"
                collapsed={collapsed}
              />
              <NavItem
                href="/services"
                icon={Activity}
                label="Services Monitor"
                collapsed={collapsed}
              />
            </div>
          )}
        </div>
      </nav>

      {/* Profile - Sticky Bottom */}
      <div className="border-t px-2 py-3">
        <NavItem
          href="/profile"
          icon={UserCog}
          label="Profile"
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
