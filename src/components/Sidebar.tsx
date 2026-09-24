import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  PackagePlus,
  ShoppingCart,
  Users,
  CreditCard,
  TrendingUp,
  Settings,
  DatabaseBackup,
  UserCheck,
  Zap,
  PlusCircle,
  HardDrive,
  Sparkles,
  Cloud
} from 'lucide-react';
import { ScreenType } from '../types';

interface SidebarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate
}) => {
  const menuItems = [
    {
      id: 'dashboard' as ScreenType,
      label: 'الرئيسية',
      icon: LayoutDashboard,
      shortcut: 'F1'
    },
    {
      id: 'sales' as ScreenType,
      label: 'نقطة البيع (POS)',
      icon: ShoppingCart,
      shortcut: 'F2',
      highlight: true
    },
    {
      id: 'inventory' as ScreenType,
      label: 'المخزن',
      icon: Boxes,
      shortcut: 'F3'
    },
    {
      id: 'products' as ScreenType,
      label: 'المنتجات',
      icon: PackagePlus,
      shortcut: 'F4'
    },
    {
      id: 'customers' as ScreenType,
      label: 'العملاء',
      icon: Users,
      shortcut: 'F5'
    },
    {
      id: 'debts' as ScreenType,
      label: 'الديون والدفعات',
      icon: CreditCard,
      shortcut: 'F6'
    },
    {
      id: 'reports' as ScreenType,
      label: 'التقارير والأرباح',
      icon: TrendingUp,
      shortcut: 'F7'
    },
    {
      id: 'settings' as ScreenType,
      label: 'الإعدادات والطباعة',
      icon: Settings
    },
    {
      id: 'cloud_database_setup' as ScreenType,
      label: 'ربط السحابة المستقلة',
      icon: Cloud,
      highlight: true
    },
    {
      id: 'backup' as ScreenType,
      label: 'النسخ والإنقاذ',
      icon: DatabaseBackup
    },
    {
      id: 'account' as ScreenType,
      label: 'ترخيص الجهاز',
      icon: UserCheck
    },
    {
      id: 'updates' as ScreenType,
      label: 'تحديثات البرنامج',
      icon: Sparkles
    }
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#1A1A1A] border-l border-gray-200 dark:border-gray-800 flex flex-col justify-between shrink-0 h-[calc(100vh-80px)] select-none">
      {/* Top Fast POS Action */}
      <div className="p-3 pb-1">
        <button
          onClick={() => onNavigate('sales')}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] hover:from-[#17521c] hover:to-[#256629] text-white py-2.5 px-3 rounded-xl font-black text-xs shadow-md shadow-emerald-800/20 active:scale-95 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>فاتورة كاشير جديدة [F2]</span>
        </button>
      </div>

      {/* Navigation List */}
      <div className="py-2 px-3 space-y-1 overflow-y-auto flex-1">
        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 px-3 py-1 uppercase tracking-wider">
          الوحدات الأساسية
        </div>

        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#2E7D32] text-white shadow-xs font-bold'
                  : item.highlight
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#2E7D32] dark:text-[#66BB6A] hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.shortcut && (
                <span
                  className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom info tile */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 px-1">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-emerald-500" />
            <span>نظام سحابي & محلي</span>
          </span>
          <span>v1.0 نشط</span>
        </div>
      </div>
    </aside>
  );
};
