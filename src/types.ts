export interface StockAnalysis {
  ticker: string;
  name: string;
  currentPrice: string;
  action: 'BUY' | 'SELL' | 'NO-TRADE';
  trendDaily: string;
  trendHourly: string;
  trend15Min: string;
  supportPrimary: string;
  supportSecondary: string;
  resistanceImmediate: string;
  resistanceMajor: string;
  momentumRsi: string;
  momentumMacd: string;
  volumeAnalysis: string;
  tradePlanStatus: string; // "No-Trade Zone", "Buy Zone", "Sell Zone"
  tradePlanSuggestion: string;
  tradePlanEntry: string;
  tradePlanStopLoss: string;
  tradePlanTarget: string;
  confidenceRating: 'Low' | 'Medium' | 'High';
  scannedAt: string; // ISO string or dynamic date string
}

export interface PresetStock {
  ticker: string;
  name: string;
  description: string;
}
