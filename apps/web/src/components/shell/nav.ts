import {
  LayoutDashboard,
  ShieldCheck,
  Table2,
  Wand2,
  Network,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short description shown on the landing page. */
  blurb?: string;
}

/** Primary navigation shared by the sidebar and the landing page. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/hub', label: 'Проекты', icon: LayoutDashboard, blurb: 'Управление проектами и версиями' },
  { href: '/app', label: 'Аудит', icon: ShieldCheck, blurb: 'Проверка качества КСГ по правилам' },
  { href: '/editor', label: 'Конструктор', icon: Table2, blurb: 'Редактор графика и расчёт МКП' },
  { href: '/wizard', label: 'Мастер', icon: Wand2, blurb: 'Создание графика по шаблону' },
  { href: '/graph', label: 'Сетевой граф', icon: Network, blurb: 'Визуальная логика связей' },
  { href: '/library', label: 'Библиотека', icon: BookOpen, blurb: 'Справочники и нормативы' },
];

/** Routes that render a full-bleed canvas (no content padding / own scroll). */
export const FULL_BLEED_ROUTES = ['/editor', '/graph'];

/** Resolve the active nav item for a pathname. */
export function activeNav(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'));
}
