import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class AIService {
  static async validateSignal(symbol: string, action: string, indicators: any, price: number) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction: "You are a conservative quantitative trading assistant. Your goal is to validate signals from technical indicators. You prioritize capital preservation and only confirm high-probability setups. If uncertain, always prefer REJECT."
      });
      
      const session = new Date().getUTCHours() >= 8 && new Date().getUTCHours() <= 16 ? "London" : 
                      (new Date().getUTCHours() >= 13 || new Date().getUTCHours() <= 21 ? "New York" : "Asia");

      const prompt = `
        Analyze this trading signal for ${symbol}:
        - Action: ${action}
        - Current Price: ${price}
        - Trading Session: ${session}
        - Indicators: ${JSON.stringify(indicators)}
        
        Market Context:
        - RSI is ${indicators.rsi > 70 ? 'Overbought' : (indicators.rsi < 30 ? 'Oversold' : 'Neutral')}
        - EMA 9 is ${indicators.emaFast > indicators.emaSlow ? 'Above' : 'Below'} EMA 21
        - MACD Histogram is ${indicators.macd?.histogram > 0 ? 'Positive' : 'Negative'}

        Provide a JSON response:
        {
          "decision": "CONFIRM" | "REJECT",
          "reason": "short explanation",
          "confidence": 0.0 to 1.0
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { decision: 'REJECT', reason: 'AI parsing failed', confidence: 0 };
    } catch (error) {
      console.error('AI validation failed:', error);
      return { decision: 'REJECT', reason: 'AI service error', confidence: 0 };
    }
  }
}
