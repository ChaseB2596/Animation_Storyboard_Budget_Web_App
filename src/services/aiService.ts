import { GoogleGenAI, Type } from "@google/genai";
import { Project, AssetStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateProjectScope(description: string, artisticStyle?: string): Promise<Partial<Project>> {
  const prompt = `
    Generate a detailed 3D animation project scope based on this description: "${description}".
    Artistic Style: ${artisticStyle || "Professional 3D Animation"}.
    
    CRITICAL: If the user specified a number of scenes in their description (e.g. "5 scenes", "break it into 10 scenes"), you MUST generate exactly that many scenes in the 'scenes' array. If no number is specified, infer a logical breakdown based on the project complexity.
    
    The response must be a JSON object with the following structure:
    {
      "name": "Project Name",
      "description": "Comprehensive project summary",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "scenes": [
        {
          "title": "Scene Name",
          "description": "Detailed visual and technical description",
          "textOverlayStyle": "Style (e.g., Lower Thirds, Minimal Subtitles, Kinetic Typography, None)",
          "textOverlayContent": "The actual text overlay or title to be displayed on screen",
          "audioTracks": [
            { "name": "Track Name", "type": "VO/SFX/Music" }
          ],
          "baseSceneCost": number (est. cost based on complexity),
          "assets": [
            {
              "name": "Asset Name",
              "status": "purchased" | "provided" | "created" | "existing",
              "cost": number,
              "description": "Brief asset description"
            }
          ]
        }
      ],
      "milestones": [
        { "name": "Milestone Name", "date": "YYYY-MM-DD" }
      ]
    }
    
    Ensure realistic industry pricing. Simple scenes should be $500-$2000, complex ones $3000-$10000+. 
    Assets should also have realistic costs (e.g. creative character models $500+, simple props $50+).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            startDate: { type: Type.STRING },
            endDate: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  textOverlayStyle: { type: Type.STRING },
                  textOverlayContent: { type: Type.STRING },
                  audioTracks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING }
                      }
                    }
                  },
                  baseSceneCost: { type: Type.NUMBER },
                  assets: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        status: { type: Type.STRING },
                        cost: { type: Type.NUMBER },
                        description: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            },
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  date: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}
