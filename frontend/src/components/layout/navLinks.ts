import {
  Home,
  Briefcase,
  TrendingUp,
  CreditCard,
  Receipt,
  ArrowLeftRight,
  Shield,
  Settings,
  Zap,
  Clock,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

interface NavOptions {
  isAdmin: boolean;
  isFamily: boolean;
  /** Pending family join requests, shown as a badge on "Members & Access". */
  pendingCount: number;
}

/** Single source of truth for app navigation, shared by the sidebar and the phone "More" sheet. */
export const getNavLinks = ({ isAdmin, isFamily, pendingCount }: NavOptions): NavItem[] => [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/assets', icon: Briefcase, label: 'Assets' },
  { to: '/income', icon: TrendingUp, label: 'Income' },
  { to: '/loans', icon: CreditCard, label: 'Loans' },
  { to: '/strategies', icon: Zap, label: 'Debt Strategies' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/insurance', icon: Shield, label: 'Insurance' },
  ...(isAdmin && isFamily
    ? [{ to: '/settings/members', icon: Users, label: 'Members & Access', badge: pendingCount }]
    : []),
  { to: '/settings/audit', icon: Clock, label: 'Audit Trail' },
  { to: '/settings/profile', icon: Settings, label: 'Settings' },
];
