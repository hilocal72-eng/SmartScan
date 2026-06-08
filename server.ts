import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Lazy Initialization of Gemini AI
  let aiClient: GoogleGenAI | null = null;
  function getAiClient(): GoogleGenAI {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
      throw new Error("GEMINI_API_KEY is not configured. Please add it to your Secrets in Settings.");
    }
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // API Endpoint to check secret key presence
  app.get("/api/config-check", (req, res) => {
    const key = process.env.GEMINI_API_KEY;
    const isConfigured = !!key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "";
    res.json({ configured: isConfigured });
  });

  // API Endpoint to scan/analyze a stock name or ticker
  app.post("/api/scan", async (req, res) => {
    const { ticker } = req.body;
    if (!ticker || typeof ticker !== "string" || ticker.trim() === "") {
       res.status(400).json({ error: "Stock name/ticker is required" });
       return;
    }

    try {
      const ai = getAiClient();
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
              confidenceRating: { type: Type.STRING }
            },
            required: [
              "ticker", "name", "currentPrice", "action", "trendDaily", "trendHourly", "trend15Min",
              "supportPrimary", "supportSecondary", "resistanceImmediate", "resistanceMajor",
              "momentumRsi", "momentumMacd", "volumeAnalysis", "tradePlanStatus", "tradePlanSuggestion",
              "tradePlanEntry", "tradePlanStopLoss", "tradePlanTarget", "confidenceRating"
            ]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from analyzer engine.");
      }

      // Safe JSON Parse with markdown wrapper cleaning if needed
      let cleanText = responseText.trim();
      if (cleanText.includes("```")) {
        cleanText = cleanText.replace(/```json\s*/i, "").replace(/```\s*$/, "").trim();
      }

      const analysisData = JSON.parse(cleanText);
      res.json(analysisData);

    } catch (error: any) {
      console.error("Gemini scanning API error:", error);
      res.status(500).json({
        error: error.message || "An unexpected error occurred while analyzing the stock."
      });
    }
  });

  // Serve static assets and frontend index.html
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express dev server safely running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
