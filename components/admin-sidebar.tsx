"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, PanelLeft, LogOut, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { CheckbookRequestsMenu } from "@/components/checkbook/checkbook-requests-menu";
import {
  SIDEBAR_DASHBOARD,
  SIDEBAR_PROFILE,
  SIDEBAR_SECTIONS,
  type SidebarSectionId,
} from "@/lib/navigation/admin-sidebar-nav";
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
  icon: LucideIcon;
  label: string;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  const button = (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={`w-full text-white transition-all duration-300 ${collapsed ? "justify-center px-2" : "justify-start gap-2"
        } ${active
          ? "bg-fdh-light-blue"
          : "hover:bg-white/20 hover:translate-x-1"
        }`}
    >
      <Link href={href}>
        <Icon className="h-4 w-4 shrink-0 text-fdh-orange" />
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
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const content = (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center rounded-md px-2 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/20 hover:text-white ${collapsed ? "justify-center" : "justify-between"
        }`}
      aria-expanded={isOpen}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-fdh-orange" />
        {!collapsed && <span>{label}</span>}
      </span>
      {!collapsed && (
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"
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
  const { logout } = useAuth();

  const activeSectionById = React.useMemo(() => {
    const result = {} as Record<SidebarSectionId, boolean>;
    for (const section of SIDEBAR_SECTIONS) {
      result[section.id] = section.activePrefixes.some((prefix) =>
        pathname?.startsWith(prefix)
      );
    }
    return result;
  }, [pathname]);

  const [collapsed, setCollapsed] = React.useState(false);

  const [openSections, setOpenSections] = React.useState<
    Record<SidebarSectionId, boolean>
  >(() => {
    const initial = {} as Record<SidebarSectionId, boolean>;
    for (const section of SIDEBAR_SECTIONS) {
      initial[section.id] = section.activePrefixes.some((prefix) =>
        pathname?.startsWith(prefix)
      );
    }
    return initial;
  });

  React.useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const section of SIDEBAR_SECTIONS) {
        if (activeSectionById[section.id]) {
          next[section.id] = true;
        }
      }
      return next;
    });
  }, [activeSectionById]);

  function toggleSection(id: SidebarSectionId) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function renderSection(id: SidebarSectionId) {
    const section = SIDEBAR_SECTIONS.find((s) => s.id === id);
    if (!section) return null;

    const isActive = activeSectionById[id];
    const isOpen = openSections[id];

    return (
      <div className="space-y-1">
        <SectionHeader
          icon={section.icon}
          label={translate(section.labelKey)}
          collapsed={collapsed}
          isOpen={isOpen}
          onToggle={() => toggleSection(id)}
        />
        {!collapsed && (isOpen || isActive) && (
          <div className="space-y-0.5 pl-3">
            {section.items.map((item) => {
              if (item.kind === "checkbookRequests") {
                return (
                  <CheckbookRequestsMenu
                    key={item.kind}
                    collapsed={collapsed}
                    label={translate(item.labelKey)}
                  />
                );
              }

              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={translate(item.labelKey)}
                  collapsed={collapsed}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col gap-3 bg-fdh-blue text-white transition-[width] duration-200 rounded-tr-3xl rounded-br-3xl ${collapsed ? "w-16" : "w-64"
        }`}
    >
      {/* Header with Logo */}
      <div className="flex flex-col items-center px-4 pt-6">
        {!collapsed ? (
          <>
            <img
              src="/images/logo/whitelogo.svg"
              alt={translate("sidebar.logoAlt")}
              className="w-3/4 max-w-[150px] mb-6"
            />
            <div className="w-full h-0.5 bg-fdh-orange mb-4"></div>
          </>
        ) : (
          <div className="mb-4">
            <img
              src="/images/logo/whitelogo.svg"
              alt={translate("sidebar.logoAlt")}
              className="w-8 h-8 object-contain"
            />
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-white hover:bg-fdh-light-blue"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={
            collapsed
              ? translate("sidebar.actions.expand")
              : translate("sidebar.actions.collapse")
          }
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2 sidebar-scroll">
        {/* Language Switcher - Compact */}
        {!collapsed && (
          <div className="mb-2 flex items-center justify-center gap-1 rounded-md bg-white/10 p-1">
            <Button
              type="button"
              variant={locale === "en" ? "default" : "ghost"}
              size="sm"
              className={`h-7 flex-1 text-xs ${locale === "en"
                  ? "bg-fdh-orange text-white hover:bg-fdh-orange/90"
                  : "text-white hover:bg-white/20"
                }`}
              onClick={() => setLocale("en")}
            >
              EN
            </Button>
            <Button
              type="button"
              variant={locale === "pt" ? "default" : "ghost"}
              size="sm"
              className={`h-7 flex-1 text-xs ${locale === "pt"
                  ? "bg-fdh-orange text-white hover:bg-fdh-orange/90"
                  : "text-white hover:bg-white/20"
                }`}
              onClick={() => setLocale("pt")}
            >
              PT
            </Button>
          </div>
        )}

        {/* Dashboard Link */}
        <div className="mb-2">
          <NavItem
            href={SIDEBAR_DASHBOARD.href}
            icon={SIDEBAR_DASHBOARD.icon}
            label={translate(SIDEBAR_DASHBOARD.labelKey)}
            collapsed={collapsed}
          />
        </div>

        {/* Mobile Banking Section */}
        {renderSection("mobileBanking")}

        {/* Wallet Section */}
        {renderSection("wallet")}

        {/* Configuration Section - NEW */}
        {renderSection("configuration")}

        {/* System Section - REFINED */}
        {renderSection("customerCare")}
        {renderSection("system")}

        {/* Administration Section - NEW */}
        {renderSection("administration")}
      </nav>

      {/* Profile - Sticky Bottom */}
      <div className="border-t border-white/20 px-2 py-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={`w-full text-white transition-all duration-300 hover:bg-white/20 hover:translate-x-1 ${collapsed ? "justify-center px-2" : "justify-start gap-2"
            }`}
        >
          <Link href={SIDEBAR_PROFILE.href}>
            <SIDEBAR_PROFILE.icon className="h-4 w-4 shrink-0 text-fdh-orange" />
            {!collapsed && (
              <span className="truncate">{translate(SIDEBAR_PROFILE.labelKey)}</span>
            )}
          </Link>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={logout}
          className={`mt-1 w-full text-white transition-all duration-300 hover:bg-white/20 hover:translate-x-1 ${collapsed ? "justify-center px-2" : "justify-start gap-2"
            }`}
        >
          <LogOut className="h-4 w-4 shrink-0 text-fdh-orange" />
          {!collapsed && <span className="truncate">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
