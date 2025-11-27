import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Bot as BotIcon, 
  Users, 
  LogOut, 
  Send
} from 'lucide-react';
import { User, UserRole } from '../types';

interface SidebarProps {
  currentUser: User;
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, currentView, onChangeView, onLogout, isOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.OWNER, UserRole.CLIENT] },
    { id: 'scheduler', label: 'Scheduler', icon: Calendar, roles: [UserRole.ADMIN, UserRole.OWNER, UserRole.CLIENT] },
    { id: 'bots', label: 'Bot Manager', icon: BotIcon, roles: [UserRole.ADMIN, UserRole.OWNER] },
    { id: 'users', label: 'Users', icon: Users, roles: [UserRole.ADMIN] },
  ];

  return (
    <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} transform transition-transform duration-300 ease-in-out md:translate-x-0 fixed md:relative z-20 w-64 h-full bg-slate-900 text-white flex flex-col shadow-xl`}>
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-telegram-500 p-2 rounded-lg">
          <Send size={24} className="text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">TeleScheduler</span>
      </div>

      <div className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item) => {
          if (!item.roles.includes(currentUser.role)) return null;
          
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-telegram-600 text-white shadow-lg shadow-telegram-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
             {currentUser.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-500 truncate">{currentUser.role}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-all"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};