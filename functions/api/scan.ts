import { GoogleGenAI, Type } from "@google/genai";

interface PagesFunctionContext<Env = Record<string, any>> {
  request: Request;
  env: Env;
}

type PagesFunction<Env = Record<string, any>> = (
  context: PagesFunctionContext<Env>
) => Promise<Response> | Response;

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { ticker } = await context.request.json() as { ticker?: string };
    if (!ticker || typeof ticker !== "string" || ticker.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Stock name/ticker is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const key = context.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured in Cloudflare Pages dashboard settings." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Google Gen AI client with edge runtime settings
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build-cloudflare",
        },
      },
    });

    const uppercaseTicker = ticker.toUpperCase().trim();
    const prompt = `Act as a Senior Technical Research Analyst. Analyze the stock or ticker: "${uppercaseTicker}".
First, use the Google Search tool to find the most recent intraday/daily indicators, trend data, volume patterns, news, and price levels for "${uppercaseTicker}" in its primary exchange (such as NSE/BSE for Indian stocks like RELIANCE, TCS, or NASDAQ/NYSE for US stocks like TSLA, AAPL).

Generate a complete, structured "Technical Analysis Report" conformant to the specified JSON schema.
Ensure immediate support and resistance levels are numerically coherent based on the current price.
If the indicators don't align, or the stock is in consolidation, set the Trade Plan Status to "No-Trade Zone" and advise waiting.

Return a JSON object with EXACTLY the following format:
{
  "ticker": "${uppercaseTicker}",
  "name": "Full Company Name (e.g. Reliance Industries Limited)",
  "currentPrice": "Current stock price with currency symbol (e.g. ₹1,295.40)",
  "action": "BUY or SELL or NO-TRADE based on your analytical calculations",
  "trendDaily": "Daily trend description (e.g. Bearish/Consolidation. Trading below key short-term averages.)",
  "trendHourly": "Hourly trend description (e.g. Neutral. The stock is trapped in a narrow range.)",
  "trend15Min": "15-min trend description (e.g. Bearish. Recent selling pressure persists.)",
  "supportPrimary": "Immediate lower support price (e.g. ₹1,282)",
  "supportSecondary": "Major secondary support price (e.g. ₹1,265)",
  "resistanceImmediate": "Immediate resistance barrier price (e.g. ₹1,318)",
  "resistanceMajor": "Major resistance ceiling price (e.g. ₹1,335)",
  "momentumRsi": "RSI values and current state description",
  "momentumMacd": "MACD crossover status and histogram strength details",
  "volumeAnalysis": "Volume analysis supporting or opposing current price action",
  "tradePlanStatus": "No-Trade Zone OR Buy Zone OR Sell Zone",
  "tradePlanSuggestion": "Actionable suggestion or breakout criteria",
  "tradePlanEntry": "Recommended entry target price, or 'N/A' or 'Wait'",
  "tradePlanStopLoss": "Stop-loss level or 'N/A' or 'Wait'",
  "tradePlanTarget": "Target price (1:2 Risk-to-Reward) or 'N/A' or 'Wait'",
  "confidenceRating": "Low OR Medium OR High based on trend alignments"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ticker: { type: Type.STRING },
            name: { type: Type.STRING },
            currentPrice: { type: Type.STRING },
            action: { type: Type.STRING, description: "BUY, SELL, or NO-TRADE" },
            trendDaily: { type: Type.STRING },
            trendHourly: { type: Type.STRING },
            trend15Min: { type: Type.STRING },
            supportPrimary: { type: Type.STRING },
            supportSecondary: { type: Type.STRING },
            resistanceImmediate: { type: Type.STRING },
            resistanceMajor: { type: Type.STRING },
            momentumRsi: { type: Type.STRING },
            momentumMacd: { type: Type.STRING },
            volumeAnalysis: { type: Type.STRING },
            tradePlanStatus: { type: Type.STRING },
            tradePlanSuggestion: { type: Type.STRING },
            tradePlanEntry: { type: Type.STRING },
            tradePlanStopLoss: { type: Type.STRING },
            tradePlanTarget: { type: Type.STRING },
            confidenceRating: { type: Type.STRING },
          },
          required: [
            "ticker",
            "name",
            "currentPrice",
            "action",
            "trendDaily",
            "trendHourly",
            "trend15Min",
            "supportPrimary",
            "supportSecondary",
            "resistanceImmediate",
            "resistanceMajor",
            "momentumRsi",
            "momentumMacd",
            "volumeAnalysis",
            "tradePlanStatus",
            "tradePlanSuggestion",
            "tradePlanEntry",
            "tradePlanStopLoss",
            "tradePlanTarget",
            "confidenceRating",
          ],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response received from analyzer engine.");
    }

    let cleanText = responseText.trim();
    if (cleanText.includes("```")) {
      cleanText = cleanText.replace(/```json\s*/i, "").replace(/```\s*$/, "").trim();
    }

    return new Response(cleanText, {
      headers: {
        "Content-Type": "application/json",
      },
    });

  } catch (error: any) {
    console.error("Cloudflare Scan API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred while analyzing the stock." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
