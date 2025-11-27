import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generatePostCaption = async (topic: string, tone: string = 'professional'): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Write a short, engaging Telegram post caption about "${topic}". The tone should be ${tone}. Include 1-2 relevant emojis. Keep it under 200 characters.`;
    
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error("Error generating caption:", error);
    return "Could not generate caption at this time. Please try again.";
  }
};

export const analyzePostPerformance = async (postContent: string): Promise<string> => {
   try {
    const model = 'gemini-2.5-flash';
    const prompt = `Analyze this telegram post content and predict its engagement potential (Low, Medium, High) and give one tip to improve it: "${postContent}"`;
    
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error("Error analyzing post:", error);
    return "Analysis unavailable.";
  }
};