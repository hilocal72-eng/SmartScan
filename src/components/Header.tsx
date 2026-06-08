import React from "react";
import { TrendingUp, Smartphone, ShieldCheck } from "lucide-react";

interface HeaderProps {
  isPWAInstallable: boolean;
  onInstallClick: () => void;
  isApiConfigured: boolean;
  theme?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  isPWAInstallable, 
  onInstallClick,
  isApiConfigured
}) => {
  return (
    <header className="border-b border-black bg-white/80 backdrop-blur-md px-4 py-3 md:px-8 sticky top-0 z-50 transition-all">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-black bg-black text-[#00b0ff] shadow-sm">
            <TrendingUp id="logo-icon" className="h-4.5 w-4.5 text-[#00b0ff]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-black uppercase leading-tight font-sans">
              Smart <span className="text-[#00b0ff]">Scan</span>
            </h1>
            <p className="text-[9px] uppercase tracking-wider text-zinc-600 font-semibold font-sans">
              Intraday Technical Analyzer
            </p>
          </div>
        </div>

        {/* Buttons and Badges */}
        <div className="flex items-center space-x-2">
          {/* API Key Indicator */}
          <div className="hidden items-center space-x-1.5 rounded-full border border-black bg-white px-2.5 py-1.5 text-[11px] text-black md:flex shadow-sm">
            <ShieldCheck className={`h-3.5 w-3.5 ${
              isApiConfigured ? "text-emerald-600" : "text-rose-500"
            }`} />
            <span className="font-semibold text-[10px]">
              Connection: {isApiConfigured ? "Active" : "Keys Pending"}
            </span>
          </div>

          {/* PWA Install Button */}
          {isPWAInstallable && (
            <button
              id="install-pwa-btn"
              onClick={onInstallClick}
              className="flex items-center space-x-1.5 rounded-lg border border-black bg-black text-white hover:bg-[#00b0ff] hover:text-black hover:border-black px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all shadow-sm"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[10px]">Add to Device</span>
              <span className="sm:hidden text-[10px]">Add</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
