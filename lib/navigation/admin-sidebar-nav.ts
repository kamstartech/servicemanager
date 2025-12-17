import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeftRight,
  Database,
  FileText,
  Key,
  Landmark,
  Layers,
  LayoutDashboard,
  Receipt,
  Save,
  Settings,
  Shield,
  ShieldAlert,
  Smartphone,
  Tag,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  Wrench,
  Workflow,
} from "lucide-react";

export type SidebarSectionId =
  | "mobileBanking"
  | "wallet"
  | "configuration"
  | "system"
  | "administration";

export type SidebarLinkItem = {
  kind: "link";
  href: string;
  icon: LucideIcon;
  labelKey: string;
};

export type SidebarItem =
  | SidebarLinkItem
  | {
    kind: "checkbookRequests";
    labelKey: string;
  };

export type SidebarSection = {
  id: SidebarSectionId;
  icon: LucideIcon;
  labelKey: string;
  activePrefixes: string[];
  items: SidebarItem[];
};

export const SIDEBAR_DASHBOARD: SidebarLinkItem = {
  kind: "link",
  href: "/",
  icon: LayoutDashboard,
  labelKey: "sidebar.dashboard",
};

export const SIDEBAR_PROFILE: SidebarLinkItem = {
  kind: "link",
  href: "/profile",
  icon: UserCog,
  labelKey: "sidebar.profile",
};

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: "mobileBanking",
    icon: Smartphone,
    labelKey: "sidebar.mobileBanking",
    activePrefixes: ["/mobile-banking"],
    items: [
      {
        kind: "link",
        href: "/mobile-banking/users",
        icon: Users,
        labelKey: "sidebar.users",
      },
      {
        kind: "link",
        href: "/mobile-banking/accounts",
        icon: Landmark,
        labelKey: "sidebar.accounts",
      },
      {
        kind: "link",
        href: "/mobile-banking/transactions",
        icon: ArrowLeftRight,
        labelKey: "sidebar.transactions",
      },
      {
        kind: "link",
        href: "/mobile-banking/account-categories",
        icon: Tag,
        labelKey: "sidebar.accountCategories",
      },
      {
        kind: "link",
        href: "/mobile-banking/registration-requests",
        icon: UserPlus,
        labelKey: "sidebar.registrationRequests",
      },
      {
        kind: "checkbookRequests",
        labelKey: "sidebar.checkbookRequests",
      },
      {
        kind: "link",
        href: "/mobile-banking/billers",
        icon: Receipt,
        labelKey: "sidebar.billers",
      },
    ],
  },
  {
    id: "wallet",
    icon: Wallet,
    labelKey: "sidebar.wallet",
    activePrefixes: ["/wallet"],
    items: [
      {
        kind: "link",
        href: "/wallet/users",
        icon: Users,
        labelKey: "sidebar.users",
      },
      {
        kind: "link",
        href: "/wallet/tiers",
        icon: Layers,
        labelKey: "sidebar.tiers",
      },
    ],
  },
  {
    id: "configuration",
    icon: Settings,
    labelKey: "sidebar.configuration",
    activePrefixes: [
      "/system/forms",
      "/system/workflows",
      "/system/app-screens",
    ],
    items: [
      {
        kind: "link",
        href: "/system/forms",
        icon: FileText,
        labelKey: "sidebar.forms",
      },
      {
        kind: "link",
        href: "/system/workflows",
        icon: Workflow,
        labelKey: "sidebar.workflows",
      },
      {
        kind: "link",
        href: "/system/app-screens",
        icon: Smartphone,
        labelKey: "sidebar.appScreens",
      },
    ],
  },
  {
    id: "system",
    icon: Wrench,
    labelKey: "sidebar.system",
    activePrefixes: [
      "/system/databases",
      "/system/core-banking",
      "/system/migrations",
      "/system/backups",
    ],
    items: [
      {
        kind: "link",
        href: "/system/databases",
        icon: Database,
        labelKey: "sidebar.databaseManagement",
      },
      {
        kind: "link",
        href: "/system/core-banking",
        icon: Database,
        labelKey: "sidebar.coreBanking",
      },
      {
        kind: "link",
        href: "/system/migrations",
        icon: ArrowLeftRight,
        labelKey: "sidebar.migrations",
      },
      {
        kind: "link",
        href: "/system/backups",
        icon: Save,
        labelKey: "sidebar.backups",
      },
    ],
  },
  {
    id: "administration",
    icon: Shield,
    labelKey: "sidebar.administration",
    activePrefixes: [
      "/admin-users",
      "/system/login-attempts",
      "/system/third-party",
      "/services",
    ],
    items: [
      {
        kind: "link",
        href: "/admin-users",
        icon: Users,
        labelKey: "sidebar.adminUsers",
      },
      {
        kind: "link",
        href: "/system/login-attempts",
        icon: ShieldAlert,
        labelKey: "sidebar.loginAttempts",
      },
      {
        kind: "link",
        href: "/system/third-party",
        icon: Key,
        labelKey: "sidebar.thirdPartyApi",
      },
      {
        kind: "link",
        href: "/services",
        icon: Activity,
        labelKey: "sidebar.servicesMonitor",
      },
    ],
  },
];
