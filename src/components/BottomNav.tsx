import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  CreditCard,
  MoreHorizontal
} from 'lucide-react';
import { ScreenType } from '../types';

interface BottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenMore: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  onOpenMore
}) => {
  const items = [
    { id: 'dashboard' as ScreenType, label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'sales' as ScreenType, label: 'الكاشير', icon: ShoppingCart, highlight: true },
    { id: 'inventory' as ScreenType, label: 'المخزن', icon: Boxes },
    { id: 'debts' as ScreenType, label: 'الديون', icon: CreditCard }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-2 py-1 select-none safe-area-pb shadow-lg">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id;

        if (item.highlight) {
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center -mt-6 cursor-pointer group active:scale-95 transition-transform"
            >
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#1B5E20] to-[#2E7D32] text-white flex items-center justify-center shadow-lg shadow-emerald-800/30 border-2 border-white dark:border-[#1E1E1E]">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-[#2E7D32] dark:text-[#66BB6A] mt-1">
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-[#2E7D32] dark:text-[#66BB6A] font-bold'
                : 'text-gray-500 dark:text-gray-400 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/50' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}

      <button
        onClick={onOpenMore}
        className="flex flex-col items-center py-1.5 px-3 text-gray-500 dark:text-gray-400 font-medium rounded-xl transition-all cursor-pointer"
      >
        <div className="p-1 rounded-xl">
          <MoreHorizontal className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5">المزيد</span>
      </button>
    </nav>
  );
};
