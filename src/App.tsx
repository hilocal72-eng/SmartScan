import React, { useState, useEffect } from "react";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Activity, 
  BarChart3, 
  Gauge, 
  Target, 
  ShieldCheck, 
  ShieldAlert
} from "lucide-react";
import { Header } from "./components/Header";
import { StockAnalysis } from "./types";

export default function App() {
  const [tickerInput, setTickerInput] = useState("");
  const [history, setHistory] = useState<StockAnalysis[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isApiConfigured, setIsApiConfigured] = useState(true);
  
  // Outer stock item accordions: { TICKER: boolean }
  const [expandedStocks, setExpandedStocks] = useState<Record<string, boolean>>({});
  
  // Inner technical details accordions: { TICKER: { subKey: boolean } }
  // By default all tabs (subsections) should be in closed (collapsed) state.
  const [subsections, setSubsections] = useState<Record<string, Record<string, boolean>>>({});

  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // 1. Fetch saved scans
    const saved = localStorage.getItem("g_scanner_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
        if (parsed.length > 0) {
          // Open the main header where it shows stock name
          setExpandedStocks({ [parsed[0].ticker]: true });
          // Ensure all inner tabs are closed state
          setSubsections({});
        }
      } catch (e) {
        console.error("Failed to parse stock history cache", e);
      }
    } else {
      // Initialize with Reliance Industries as default sample
      const relianceSample: StockAnalysis = {
        ticker: "RELIANCE",
        name: "Reliance Industries Limited",
        currentPrice: "₹1,295.40",
        action: "NO-TRADE",
        trendDaily: "Price consolidated below standard moving limits.",
        trendHourly: "Range bound action with horizontal resistance.",
        trend15Min: "Short-term momentum signals local consolidation.",
        supportPrimary: "₹1,282",
        supportSecondary: "₹1,265",
        resistanceImmediate: "₹1,318",
        resistanceMajor: "₹1,335",
        momentumRsi: "Neutral conditions registered around 48.5 level.",
        momentumMacd: "MACD lines display flat crossover behavior.",
        volumeAnalysis: "Inconsistent daily quantities failing to breach average criteria.",
        tradePlanStatus: "No-Trade Zone",
        tradePlanSuggestion: "Stand aside until a structured candle closes outside ₹1,282 - ₹1,318 channel.",
        tradePlanEntry: "Wait",
        tradePlanStopLoss: "Wait",
        tradePlanTarget: "Wait",
        confidenceRating: "Low",
        scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setHistory([relianceSample]);
      setExpandedStocks({ [relianceSample.ticker]: true });
      // Keep all inner tabs closed by default
      setSubsections({});
    }

    // 2. Scan API settings confirmation check
    fetch("/api/config-check")
      .then((res) => res.json())
      .then((data) => {
        setIsApiConfigured(data.configured);
      })
      .catch((err) => {
        console.error("API check failure", err);
        setIsApiConfigured(false);
      });

    // 3. Register PWA
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    });

    window.addEventListener("appinstalled", () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });
  }, []);

  const saveHistory = (newHistory: StockAnalysis[]) => {
    setHistory(newHistory);
    localStorage.setItem("g_scanner_history", JSON.stringify(newHistory));
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("PWA Installation succeeded");
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const executeScan = async (ticker: string) => {
    if (!ticker || ticker.trim() === "") return;
    setIsScanning(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `System responded with status ${response.status}`);
      }

      const result: StockAnalysis = await response.json();
      result.scannedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Action normalized validation
      if (!result.action || !["BUY", "SELL", "NO-TRADE"].includes(result.action.toUpperCase())) {
        result.action = "NO-TRADE";
      }

      // Prepend to history, max 10 elements
      const freshHistory = [
        result,
        ...history.filter((item) => item.ticker.toUpperCase() !== result.ticker.toUpperCase())
      ].slice(0, 10);

      saveHistory(freshHistory);
      setTickerInput("");
      
      // Auto expand stock item header
      setExpandedStocks((prev) => ({ ...prev, [result.ticker]: true }));
      // Ensure all inner accordions/tabs are thoroughly closed/collapsed state by default
      setSubsections((prev) => ({
        ...prev,
        [result.ticker]: {} // Empty means all collapsed
      }));

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to scan stock. Please verify parameters or API key, and retry.");
    } finally {
      setIsScanning(false);
    }
  };

  const toggleStockMain = (ticker: string) => {
    setExpandedStocks((prev) => ({
      ...prev,
      [ticker]: !prev[ticker]
    }));
  };

  const toggleSub = (ticker: string, subKey: string) => {
    setSubsections((prev) => {
      const currentVal = prev[ticker] || {};
      return {
        ...prev,
        [ticker]: {
          ...currentVal,
          [subKey]: !currentVal[subKey]
        }
      };
    });
  };

  const removeStock = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = history.filter((x) => x.ticker !== ticker);
    saveHistory(filtered);
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to reset the current scan list?")) {
      saveHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#e6f6ff] via-[#ffffff] to-[#efffec] text-black font-sans selection:bg-[#00b0ff]/30 antialiased flex flex-col transition-all">
      {/* Pristine modern header */}
      <Header 
        isPWAInstallable={isInstallable} 
        onInstallClick={handleInstallClick} 
        isApiConfigured={isApiConfigured}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 md:py-7 flex flex-col gap-5">
        
        {/* Connection keys notification banner */}
        {!isApiConfigured && (
          <div className="rounded-xl border-2 border-black bg-white p-3.5 text-xs text-black flex items-start gap-3 shadow-[4px_4px_0px_#000000]">
            <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
            <div>
              <p className="font-bold text-black uppercase tracking-wide text-[11px]">System Warning: API connection pending</p>
              <p className="mt-0.5 leading-relaxed text-zinc-800 text-[10.5px]">
                Please register your <code className="bg-zinc-150 border border-zinc-300 px-1 py-0.5 rounded text-black font-mono font-bold">GEMINI_API_KEY</code> within the 
                <strong> Secrets Panel</strong> in Google AI Studio to enable live stock data integration. Currently showing cached mock items.
              </p>
            </div>
          </div>
        )}

        {/* Intraday Technical Analyzer Input Panel */}
        <section className="bg-white border-2 border-black rounded-xl p-4 md:p-5 relative shadow-[4px_4px_0px_#000000]">
          <h2 className="font-bold text-xs tracking-wider text-black uppercase mb-2 flex items-center gap-2">
            <Search className="h-4.5 w-4.5 text-[#00b0ff]" /> Technical Analysis Scan
          </h2>
          <p className="text-[11px] text-zinc-650 mb-3.5 font-medium leading-normal">
            Enter a domestic or global stock ticker to perform live structural scans and trace breakout configurations:
          </p>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              executeScan(tickerInput);
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <input
                id="search-ticker"
                type="text"
                placeholder="Enter stock ticker or company name (e.g., RELIANCE, TCS, AAPL, TSLA)"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value)}
                disabled={isScanning}
                className="w-full bg-white border border-zinc-400 hover:border-black focus:border-[#00b0ff] rounded-lg pl-4.5 pr-4 py-2 text-xs text-black font-semibold focus:outline-none focus:ring-1 focus:ring-[#00b0ff] placeholder-zinc-400 transition-all cursor-text disabled:opacity-50"
              />
            </div>
            <button
              id="submit-scan"
              type="submit"
              disabled={isScanning || !tickerInput.trim()}
              className="px-5 py-2.5 font-bold rounded-lg text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-black text-white hover:bg-[#00b0ff] hover:text-black hover:border-black border border-black flex items-center justify-center gap-1.5 shadow-sm shrink-0"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <span>Technical Scan</span>
              )}
            </button>
          </form>
        </section>

        {/* Loading Progress indicator */}
        {isScanning && (
          <div className="rounded-xl border-2 border-black bg-white p-6 flex flex-col items-center justify-center text-center gap-3.5 shadow-[4px_4px_0px_#000000]">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-2 border-zinc-200 border-t-black animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-3.5 w-3.5 rounded-full bg-[#00b0ff]" />
              </div>
            </div>
            <div>
              <p className="font-bold text-black tracking-wider text-[11px] uppercase">Retrieving Market Signals</p>
              <p className="text-[10.5px] text-zinc-600 mt-1 max-w-xs mx-auto leading-relaxed">
                Assembling price intervals, analyzing support buffers, and resolving relative momentum indices...
              </p>
            </div>
          </div>
        )}

        {/* Diagnostic Error Banner */}
        {errorMsg && (
          <div className="rounded-lg border border-rose-400 bg-rose-50 p-3 text-xs text-rose-950 flex items-start gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-[11px] font-semibold">
              <span className="font-bold text-rose-900 uppercase">System Error:</span> {errorMsg}
            </div>
            <button 
              onClick={() => setErrorMsg(null)}
              className="text-rose-800 hover:text-rose-950 px-1 pointer-events-auto cursor-pointer font-bold text-[10.5px]"
            >
              Close
            </button>
          </div>
        )}

        {/* Scanned Stock Workspace Area */}
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-black uppercase">
                Active Scans
              </span>
              <span className="bg-black text-white px-2 py-0.5 text-[10px] rounded-full border border-black font-bold">
                {history.length}
              </span>
            </div>
            {history.length > 0 && (
              <button
                id="clear-all-btn"
                onClick={clearAll}
                className="text-zinc-700 hover:text-rose-600 transition-all text-xs flex items-center gap-1 font-bold pointer-events-auto cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> <span className="text-[11px] uppercase tracking-wider">Reset List</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-zinc-400 bg-white/40 p-10 text-center flex flex-col items-center justify-center gap-2">
              <Layers className="h-7 w-7 text-zinc-500" />
              <p className="text-xs font-bold text-zinc-800 uppercase tracking-wider">No active scans</p>
              <p className="text-[11px] text-zinc-500 max-w-xs leading-normal">
                Enter a global/NSE stock ticker above or trigger a custom check to populate technical analysis elements.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {history.map((stock) => {
                const isExpanded = !!expandedStocks[stock.ticker];
                const stockSubs = subsections[stock.ticker] || {};

                // Action Color mapping - strict Orange, Green, Red formatting
                // NO-TRADE: Orange, BUY: Green, SELL: Red
                const actionBadgeStyle = stock.action === "BUY"
                  ? "bg-emerald-100 border-2 border-emerald-600 text-emerald-800"
                  : stock.action === "SELL"
                  ? "bg-rose-100 border-2 border-rose-600 text-rose-800"
                  : "bg-amber-100 border-2 border-amber-500 text-amber-700";

                const leftRibbonStyle = stock.action === "BUY"
                  ? "bg-emerald-600"
                  : stock.action === "SELL"
                  ? "bg-rose-600"
                  : "bg-amber-500";

                return (
                  <article 
                    key={stock.ticker}
                    className={`rounded-xl bg-white border-2 border-black transition-all overflow-hidden shadow-[4px_4px_0px_#000000]`}
                  >
                    {/* Visual left ribbon accent */}
                    <div className="absolute top-0 left-0 w-1.5 h-full relative" />

                    {/* Expandable Header block */}
                    <div className="relative flex">
                      {/* Accent color bar */}
                      <div className={`w-1.5 shrink-0 ${leftRibbonStyle}`} />
                      
                      <header 
                        onClick={() => toggleStockMain(stock.ticker)}
                        className="p-3.5 md:p-4.5 flex-1 flex items-center justify-between cursor-pointer select-none relative z-10"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="text-black shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="h-4.5 w-4.5 text-black" />
                            ) : (
                              <ChevronDown className="h-4.5 w-4.5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-bold text-black">
                                ${stock.ticker}
                              </span>
                              <span className="text-[11px] text-zinc-700 font-bold truncate max-w-[150px] md:max-w-xs">
                                {stock.name || stock.ticker}
                              </span>
                            </div>
                            
                            {/* Feed timestamp check */}
                            <div className="flex items-center gap-1 text-[10px] text-zinc-600 mt-0.5 font-bold">
                              <Clock className="h-3.5 w-3.5 text-zinc-500" />
                              <span>Checked: {stock.scannedAt || "Now"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Visual statistics and actions badges */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-xs md:text-sm font-bold font-mono text-black">
                            {stock.currentPrice}
                          </div>

                          <span className={`text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded leading-none shrink-0 uppercase font-sans ${actionBadgeStyle}`}>
                            {stock.action}
                          </span>

                          <button
                            onClick={(e) => removeStock(stock.ticker, e)}
                            className="p-1 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded border border-transparent hover:border-black cursor-pointer transition-all shrink-0"
                            title="Remove stock analysis"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </header>
                    </div>

                    {/* Section Accordions grid */}
                    {isExpanded && (
                      <div className="border-t border-black bg-zinc-50 p-3.5 space-y-2 text-xs relative">
                        
                        <div className="text-[10px] font-bold tracking-wider uppercase text-zinc-700 mb-1 pb-1 border-b border-zinc-200">
                          Intraday Technical Metrics
                        </div>

                        {/* Accordion 1: Trend Identification */}
                        <div className="border border-black rounded-lg bg-white overflow-hidden">
                          <button
                            id={`trend-btn-${stock.ticker}`}
                            onClick={() => toggleSub(stock.ticker, "trend")}
                            className="w-full flex items-center justify-between p-2.5 text-left cursor-pointer hover:bg-zinc-50 transition-all font-bold text-black"
                          >
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-[#00b0ff] shrink-0" />
                              <span className="text-[11px] uppercase tracking-wider text-black">Trend Identification</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-zinc-600 hidden md:inline truncate max-w-[180px] font-normal">
                                {stock.trendDaily}
                              </span>
                              {stockSubs.trend ? (
                                <ChevronUp className="h-3.5 w-3.5 text-black" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                              )}
                            </div>
                          </button>
                          
                          {stockSubs.trend && (
                            <div className="px-3 pb-3 pt-1 border-t border-zinc-300 bg-zinc-50 text-[11px] space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div className="bg-white border border-zinc-350 p-2 rounded-lg">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-0.5">Daily Frame</span>
                                  <p className="text-black font-semibold">{stock.trendDaily}</p>
                                </div>
                                <div className="bg-white border border-zinc-350 p-2 rounded-lg">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-0.5">Hourly Frame</span>
                                  <p className="text-black font-semibold">{stock.trendHourly}</p>
                                </div>
                                <div className="bg-white border border-zinc-350 p-2 rounded-lg">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-0.5">15-Min Frame</span>
                                  <p className="text-black font-semibold">{stock.trend15Min}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Accordion 2: Key Price Levels */}
                        <div className="border border-black rounded-lg bg-white overflow-hidden">
                          <button
                            id={`levels-btn-${stock.ticker}`}
                            onClick={() => toggleSub(stock.ticker, "levels")}
                            className="w-full flex items-center justify-between p-2.5 text-left cursor-pointer hover:bg-zinc-50 transition-all font-bold text-black"
                          >
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 text-[#00b0ff] shrink-0" />
                              <span className="text-[11px] uppercase tracking-wider text-black">Support & Resistance Levels</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-zinc-600 hidden md:inline font-normal">
                                S: {stock.supportPrimary} | R: {stock.resistanceImmediate}
                              </span>
                              {stockSubs.levels ? (
                                <ChevronUp className="h-3.5 w-3.5 text-black" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                              )}
                            </div>
                          </button>

                          {stockSubs.levels && (
                            <div className="px-3 pb-3 pt-1 border-t border-zinc-300 bg-zinc-50 text-[11px]">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                <div className="bg-white border border-zinc-350 p-2.5 rounded-lg">
                                  <span className="text-[9px] text-lime-700 font-bold uppercase tracking-wider block mb-1">Support Buffers</span>
                                  <div className="space-y-1 font-mono text-[11px]">
                                    <div className="flex justify-between items-center bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
                                      <span className="text-zinc-600 font-sans font-bold">Primary:</span>
                                      <span className="text-emerald-800 font-bold">{stock.supportPrimary}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
                                      <span className="text-zinc-600 font-sans font-bold">Secondary:</span>
                                      <span className="text-neutral-900 font-bold">{stock.supportSecondary}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-white border border-zinc-350 p-2.5 rounded-lg">
                                  <span className="text-[9px] text-rose-700 font-bold uppercase tracking-wider block mb-1">Resistance Ceilings</span>
                                  <div className="space-y-1 font-mono text-[11px]">
                                    <div className="flex justify-between items-center bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
                                      <span className="text-zinc-600 font-sans font-bold">Immediate:</span>
                                      <span className="text-rose-700 font-bold">{stock.resistanceImmediate}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
                                      <span className="text-zinc-600 font-sans font-bold">Major Resistance:</span>
                                      <span className="text-neutral-900 font-bold">{stock.resistanceMajor}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Accordion 3: Momentum Indicators */}
                        <div className="border border-black rounded-lg bg-white overflow-hidden">
                          <button
                            id={`momentum-btn-${stock.ticker}`}
                            onClick={() => toggleSub(stock.ticker, "momentum")}
                            className="w-full flex items-center justify-between p-2.5 text-left cursor-pointer hover:bg-zinc-50 transition-all font-bold text-black"
                          >
                            <div className="flex items-center gap-2">
                              <Gauge className="h-4 w-4 text-[#00b0ff] shrink-0" />
                              <span className="text-[11px] uppercase tracking-wider text-black">Momentum Technicals</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-zinc-600 hidden md:inline font-normal">
                                RSI & MACD Metrics
                              </span>
                              {stockSubs.momentum ? (
                                <ChevronUp className="h-3.5 w-3.5 text-black" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                              )}
                            </div>
                          </button>

                          {stockSubs.momentum && (
                            <div className="px-3 pb-3 pt-1 border-t border-zinc-300 bg-zinc-50 text-[11px] space-y-2">
                              <div className="space-y-1">
                                <span className="text-[9px] text-[#00b0ff] font-bold uppercase tracking-wider block">Relative Strength Index (RSI)</span>
                                <p className="text-black bg-white p-2 rounded border border-zinc-350 font-semibold">
                                  {stock.momentumRsi}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] text-[#00b0ff] font-bold uppercase tracking-wider block">MACD Indicator Crossover</span>
                                <p className="text-black bg-white p-2 rounded border border-zinc-350 font-semibold">
                                  {stock.momentumMacd}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Accordion 4: Volume Analysis */}
                        <div className="border border-black rounded-lg bg-white overflow-hidden">
                          <button
                            id={`volume-btn-${stock.ticker}`}
                            onClick={() => toggleSub(stock.ticker, "volume")}
                            className="w-full flex items-center justify-between p-2.5 text-left cursor-pointer hover:bg-zinc-50 transition-all font-bold text-black"
                          >
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-[#00b0ff] shrink-0" />
                              <span className="text-[11px] uppercase tracking-wider text-black">Volume Analysis</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {stockSubs.volume ? (
                                <ChevronUp className="h-3.5 w-3.5 text-black" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                              )}
                            </div>
                          </button>

                          {stockSubs.volume && (
                            <div className="px-3 pb-3 pt-1 border-t border-zinc-300 bg-zinc-50 text-[11px]">
                              <div className="bg-white p-2 rounded border border-zinc-350 text-black font-semibold leading-relaxed">
                                {stock.volumeAnalysis}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Accordion 5: Actionable Trade Plan */}
                        <div className="border border-black rounded-lg bg-white overflow-hidden">
                          <button
                            id={`plan-btn-${stock.ticker}`}
                            onClick={() => toggleSub(stock.ticker, "plan")}
                            className="w-full flex items-center justify-between p-2.5 text-left cursor-pointer hover:bg-zinc-50 transition-all font-bold text-black"
                          >
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-[#00b0ff] shrink-0" />
                              <span className="text-[11px] uppercase tracking-wider text-black">Technical Trade Strategy</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border leading-none uppercase ${
                                stock.tradePlanStatus && stock.tradePlanStatus.toLowerCase().includes("buy")
                                  ? "border-emerald-600 bg-emerald-100 text-emerald-800"
                                  : stock.tradePlanStatus && stock.tradePlanStatus.toLowerCase().includes("sell")
                                  ? "border-rose-600 bg-rose-100 text-rose-800"
                                  : "border-amber-500 bg-amber-100 text-amber-700"
                              }`}>
                                {stock.tradePlanStatus}
                              </span>
                              {stockSubs.plan ? (
                                <ChevronUp className="h-3.5 w-3.5 text-black" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                              )}
                            </div>
                          </button>

                          {stockSubs.plan && (
                            <div className="px-3 pb-3 pt-1 border-t border-zinc-300 bg-zinc-50 text-[11px] space-y-2">
                              <div className="bg-white p-2 rounded border border-zinc-350 text-black font-semibold">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-0.5">Strategic Execution Tactic</span>
                                <p>{stock.tradePlanSuggestion}</p>
                              </div>

                              {/* Only displays numerical limits if not rangebound waitzone */}
                              {stock.tradePlanStatus && !stock.tradePlanStatus.toLowerCase().includes("no-trade") && (
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="bg-white p-2 rounded border border-zinc-350">
                                    <span className="text-[9px] text-[#00b0ff] uppercase font-bold tracking-wider block">Entry range</span>
                                    <span className="text-xs font-mono font-bold text-neutral-950 block select-all">{stock.tradePlanEntry}</span>
                                  </div>
                                  <div className="bg-white p-2 rounded border border-zinc-350">
                                    <span className="text-[9px] text-rose-700 uppercase font-bold tracking-wider block">Stop Loss</span>
                                    <span className="text-xs font-mono font-bold text-rose-700 block select-all">{stock.tradePlanStopLoss}</span>
                                  </div>
                                  <div className="bg-white p-2 rounded border border-zinc-350">
                                    <span className="text-[9px] text-emerald-700 uppercase font-bold tracking-wider block">Exit Target</span>
                                    <span className="text-xs font-mono font-bold text-emerald-700 block select-all">{stock.tradePlanTarget}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Accordion 6: Confidence Verification */}
                        <div className="border border-black rounded-lg bg-white overflow-hidden">
                          <button
                            id={`confidence-btn-${stock.ticker}`}
                            onClick={() => toggleSub(stock.ticker, "confidence")}
                            className="w-full flex items-center justify-between p-2.5 text-left cursor-pointer hover:bg-zinc-50 transition-all font-bold text-black"
                          >
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-[#00b0ff] shrink-0" />
                              <span className="text-[11px] uppercase tracking-wider text-black">Signal Conviction</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                stock.confidenceRating.toUpperCase() === "HIGH"
                                  ? "bg-emerald-100 border-emerald-500 text-emerald-800"
                                  : stock.confidenceRating.toUpperCase() === "MEDIUM"
                                  ? "bg-amber-100 border-amber-500 text-amber-700"
                                  : "bg-zinc-100 border-zinc-400 text-zinc-800"
                              }`}>
                                {stock.confidenceRating} Conviction
                              </span>
                              {stockSubs.confidence ? (
                                <ChevronUp className="h-3.5 w-3.5 text-black" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                              )}
                            </div>
                          </button>

                          {stockSubs.confidence && (
                            <div className="px-3 pb-3 pt-1 border-t border-zinc-300 bg-zinc-50 text-[11px]">
                              <p className="bg-white p-2 rounded.5 border border-zinc-350 leading-relaxed text-zinc-950 font-semibold text-xs">
                                {stock.confidenceRating.toUpperCase() === "HIGH" 
                                  ? "High validation alignment verified across multi-timeframe trends (Daily, Hourly, and 15-minute intervals) backed by volume indicators and supporting price structure levels."
                                  : stock.confidenceRating.toUpperCase() === "MEDIUM"
                                  ? "Medium validation score. Selective timeframe divergence registered during recent analysis intervals. Enter trades carefully utilizing appropriate position limits."
                                  : "Low conviction technical score. Indicators are range-bound, conflict with market trends, or display insufficient volume parameters. Awaiting structural breakouts before commitment."
                                }
                              </p>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Tactical Intraday Trading Guidelines Panel */}
        <section className="bg-white border-2 border-black rounded-xl p-4 md:p-5 text-[11px] space-y-3 relative shadow-[4px_4px_0px_#000000]">
          <h3 className="font-bold text-black tracking-widest uppercase flex items-center gap-1.5 text-xs">
            <Target className="h-4.5 w-4.5 text-[#00b0ff]" /> Strategy Execution Guidelines
          </h3>
          <p className="text-zinc-800 leading-normal font-medium text-[11px]">
            Please review standard configuration checklists and structural rules before committing intraday positions:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0.5">
            <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-300">
              <span className="font-bold text-[#00b0ff] block mb-0.5 uppercase text-[10px]">Timeframe Synchronization</span>
              Evaluate trends in the direction where short-interval trends align with broader macro timeframe bounds.
            </div>
            <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-300">
              <span className="font-bold text-[#00b0ff] block mb-0.5 uppercase text-[10px]">Breakout Validation</span>
              Confirm support buffers and immediate resistance ceilings trigger proper breakouts before entry flags.
            </div>
            <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-300">
              <span className="font-bold text-[#00b0ff] block mb-0.5 uppercase text-[10px]">Volume Checks</span>
              Ensure structural intervals receive corresponding volume backing to filter flash liquidity sweeps.
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
