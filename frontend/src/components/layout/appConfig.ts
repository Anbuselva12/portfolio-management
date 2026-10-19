import { Wallet, Palmtree } from 'lucide-react';

export interface AppDefinition {
  id: 'finfamily' | 'fairshare';
  name: string;
  subtitle: string;
  description: string;
  icon: any;
  color: string;
  activeColor: string;
  route: string;
}

export const APP_CONFIGS: AppDefinition[] = [
  {
    id: 'finfamily',
    name: 'FinFamily',
    subtitle: 'Wealth, Debt & Strategy',
    description: 'Wealth, loans, household expenses, and projects such as construction or a new business.',
    icon: Wallet,
    color: 'bg-cyan-600 text-white',
    activeColor: 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30',
    route: '/dashboard',
  },
  {
    id: 'fairshare',
    name: 'FairShare',
    subtitle: 'Trip & Event Splitter',
    description: 'Group travel expenses, family units, "Who Pays Whom" debt settlement & WhatsApp export.',
    icon: Palmtree,
    color: 'bg-emerald-600 text-white',
    activeColor: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30',
    route: '/fairshare',
  },
];

export const getCurrentApp = (pathname: string): AppDefinition => {
  if (pathname.startsWith('/fairshare')) return APP_CONFIGS[1];
  return APP_CONFIGS[0];
};

