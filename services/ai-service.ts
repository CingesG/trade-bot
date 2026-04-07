import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class AIService {
  static async validateSignal(symbol: string, action: string, indicators: any, price: number) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const prompt = `
        As a professional quantitative trader, analyze this trading signal:
        Symbol: ${symbol}
        Action: ${action}
        Current Price: ${price}
        Indicators: ${JSON.stringify(indicators)}
        
        Provide a JSON response with:
        - decision: "CONFIRM" or "REJECT"
        - reason: Brief explanation
        - confidence: 0 to 1
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
