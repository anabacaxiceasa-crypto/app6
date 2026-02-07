
import { GoogleGenAI, Type } from "@google/genai";

// Strictly initializing with process.env.API_KEY as per global guidelines
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const editProductImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: 'image/png',
            },
          },
          { text: `Edite esta imagem de produto: ${prompt}. Mantenha o produto centralizado e limpo para um catálogo premium estilo Nike.` },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Edit Error:", error);
    return null;
  }
};

export const getBusinessStrategy = async (data: any): Promise<string | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analise estes dados de vendas e estoque do Ceasa (A.M Abacaxi) e forneça 3 conselhos estratégicos curtos e acionáveis em português. 
      Foque em: Onde investir mais, o que está parado e riscos de estoque.
      Dados: ${JSON.stringify(data)}
      Responda em um tom profissional, motivador e focado em lucro, no estilo 'Nike Strategy'.`,
    });

    return response.text || null;
  } catch (error) {
    console.error("Gemini Business Insight Error:", error);
    return "Não foi possível gerar insights estratégicos no momento.";
  }
};

export const processVoiceSale = async (transcript: string): Promise<any | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Converta este comando de voz de um vendedor em um objeto JSON de itens de venda.
      Comando: "${transcript}"
      Retorne APENAS o JSON no formato: [{"productName": string, "quantity": number}].
      Se não entender a quantidade, assuma 1.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              quantity: { type: Type.NUMBER }
            },
            required: ["productName", "quantity"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Voice Process Error:", error);
    return null;
  }
};
