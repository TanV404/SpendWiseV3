import React, { useState } from 'react';
import { UserProfile } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenNotifications: () => void;
  unreadNotifications: boolean;
  currentUser: UserProfile;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenNotifications,
  unreadNotifications,
  currentUser,
  onLogout,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 w-full z-30 flex justify-between items-center px-4 sm:px-8 py-4 h-20 bg-[#051424]/80 backdrop-blur-2xl border-b border-[#464555]/20">
      <div className="flex items-center gap-4 sm:gap-8 flex-1">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3 pr-4 sm:pr-8">
          <div className="w-10 h-10 bg-[#3b82f6] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(77,68,227,0.35)] shrink-0">
            <span className="material-symbols-outlined fill-1 text-white">account_balance_wallet</span>
          </div>
          <div>
            <h1 className="font-bold text-[#d4e4fa] text-xl leading-none tracking-tight">SpendWise</h1>
            <p className="text-[10px] text-[#c7c4d8] uppercase tracking-widest mt-1 font-mono-data font-medium">
              Personal Finance
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">

        {/* Notifications Button */}
        <button
          onClick={onOpenNotifications}
          className="p-2 text-[#c7c4d8] hover:text-[#93c5fd] transition-colors relative rounded-xl hover:bg-[#122131] cursor-pointer"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          {unreadNotifications && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#ffb4ab] rounded-full animate-pulse"></span>
          )}
        </button>

        <div className="h-8 w-[1px] bg-[#464555]/20 mx-1 hidden sm:block"></div>

        {/* Profile / Account Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 cursor-pointer p-1 rounded-xl hover:bg-[#122131] transition-colors focus:outline-none"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs text-[#d4e4fa] font-semibold">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-[#c7c4d8]/70 font-mono-data">
                {currentUser.email}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-[#3b82f6]/40 p-0.5 hover:border-[#3b82f6] transition-colors shadow-lg overflow-hidden shrink-0 bg-[#1e293b] flex items-center justify-center text-[#93c5fd] font-bold text-sm">
              {currentUser.avatar && !currentUser.avatar.includes('unsplash.com') ? (
                <img
                  className="w-full h-full rounded-full object-cover"
                  src={currentUser.avatar}
                  alt={currentUser.name}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#1d4ed8] to-[#3b82f6] flex items-center justify-center text-white text-xs font-semibold shadow-inner">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <span className="material-symbols-outlined text-base">person</span>}
                </div>
              )}
            </div>
          </button>

          {/* Profile Popover Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#0d1c2d] border border-[#464555]/30 rounded-2xl shadow-2xl p-3 z-50 animate-fade">
              <div className="p-2 border-b border-[#464555]/20 mb-2">
                <p className="text-xs font-bold text-white">{currentUser.name}</p>
                <p className="text-[10px] text-[#c7c4d8] truncate">{currentUser.email}</p>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                className="w-full text-left px-3 py-2 text-xs text-[#ffb4ab] hover:bg-[#1c2b3c] rounded-xl flex items-center gap-2 font-semibold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
