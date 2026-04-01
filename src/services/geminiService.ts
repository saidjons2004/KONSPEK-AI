import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type GenerationMode = 'full' | 'summary';

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s?/g, '') // Remove headers
    .replace(/\*\*/g, '')      // Remove bold
    .replace(/\*/g, '')       // Remove italic
    .replace(/_{1,2}/g, '')    // Remove underscores
    .replace(/`{1,3}/g, '')    // Remove code blocks
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
    .trim();
}

export async function analyzeStyle(base64Image: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Ushbu rasmdagi yozuv uslubini tahlil qiling va quyidagi ro'yxatdan eng mosini tanlang:
    Klassik maktab, Tezkor talaba, A’lochi qiz, Erkakcha uslub, Minimalist, Vrach yozuvi, Qalin ruchka, Ingichka layner, Bosh harfli, Badiiy, Caveat, Indie Flower, Gloria Hallelujah, Patrick Hand, Amatic SC, Handlee, Nothing You Could Do, Homemade Apple, Cedarville Cursive, Nanum Pen Script, Waiting for Sunrise, Just Me Again, Delius.
    
    Javobni faqat uslub nomini o'zini qaytaring.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image.split(',')[1] || base64Image
          }
        }
      ],
    });
    return response.text.trim();
  } catch (error) {
    console.error("Style Analysis Error:", error);
    throw error;
  }
}

export async function generateKonspek(
  topic: string, 
  pages: number, 
  date: string, 
  mode: GenerationMode = 'full',
  fileContent?: string,
  templateName?: string,
  docMode?: 'topic' | 'pages',
  docTopic?: string,
  pageRange?: { start: number; end: number },
  plan?: string
) {
  const model = "gemini-3-flash-preview";
  
  const modeInstruction = mode === 'full' 
    ? "Mavzuni to'liq va batafsil yozing, barcha muhim qismlarni qamrab oling." 
    : "Mavzuning faqat eng muhim joylarini, mazmunini va asosiy g'oyalarini qisqacha yozing.";

  let contextInstruction = "";
  if (fileContent) {
    if (docMode === 'topic' && docTopic) {
      contextInstruction = `Quyidagi ma'lumotlardan (kitob yoki hujjatdan) faqat "${docTopic}" mavzusiga oid qismlarni topib, shu asosida konspekt yozing:\n\n${fileContent}\n\n`;
    } else if (docMode === 'pages' && pageRange) {
      contextInstruction = `Quyidagi ma'lumotlarning (kitob yoki hujjatning) ${pageRange.start}-betidan ${pageRange.end}-betigacha bo'lgan qismlarini topib, faqat shu betlar asosida konspekt yozing:\n\n${fileContent}\n\n`;
    } else {
      contextInstruction = `Quyidagi ma'lumotlardan (kitob yoki hujjatdan) foydalanib konspekt yozing:\n\n${fileContent}\n\n`;
    }
  }

  const prompt = `
    Siz o'quvchi yoki talaba uchun konspekt yozib beruvchi yordamchisiz.
    Mavzu: "${topic}"
    Uslub/Shablon: ${templateName || 'Standart'}
    ${plan ? `Reja:\n${plan}\n` : ''}
    Kutilayotgan sahifalar soni: ${pages}
    Rejim: ${mode === 'full' ? "To'liq" : "Mazmuni/Kerakli joylari"}

    Vazifa: ${modeInstruction}
    ${contextInstruction}
    
    MUHIM QOIDALAR (BU QOIDALARGA QAT'IY AMAL QILING):
    1. Konspekt qo'lda yozilgandek ko'rinishi uchun juda rasmiy bo'lmagan, lekin mazmunli bo'lishi kerak.
    2. ${templateName ? `Ushbu shablon uslubiga mos ravishda yozing: ${templateName}.` : ''}
    3. Sahifaning boshida "Sana:", "Mavzu:", "Mavzu nomi:" kabi sarlavhalarni va mavzu nomini o'zini ham MUTLAQO YOZMANNG. Faqat asosiy matnni yozing.
    4. MUTLAQO HECH QANDAY MARKDOWN BELGILARINI ISHLATMANG! 
       - #, ##, ### kabi sarlavha belgilarini ishlatmang.
       - **bold** yoki *italic* belgilarini ishlatmang.
       - Chiziqlar (---), yulduzchalar (*) yoki boshqa maxsus belgilarni matnni bezash uchun ishlatmang.
       - Faqat oddiy, toza matn bo'lsin.
    5. Har bir sahifani OXIRIGACHA TO'LDIRIB YOZING. Har bir sahifa uchun kamida 300-350 so'zdan iborat matn tayyorlang, shunda varaqda bo'sh joy qolmaydi.
    6. Javobni faqat konspekt matni ko'rinishida qaytaring. Har bir sahifa orasiga "---PAGE_BREAK---" belgisini qo'ying.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    return stripMarkdown(response.text);
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}

export async function refineKonspek(content: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Siz konspektni takomillashtirish bo'yicha mutaxassis yordamchisiz.
    Quyidagi matnni ko'rib chiqing va uni yanada professional, chiroyli va qo'lyozma ko'rinishiga mosroq qilib tahrirlang.

    MATN:
    "${content}"

    VAZIFA:
    1. Matnni mantiqiy qismlarga ajrating.
    2. Muhim joylarni (masalan, ta'riflar, formulalar, asosiy g'oyalar) ajratib ko'rsating.
    3. MUTLAQO HECH QANDAY MARKDOWN BELGILARINI ISHLATMANG! 
       - #, ##, ### kabi sarlavha belgilarini ishlatmang.
       - **bold** yoki *italic* belgilarini ishlatmang.
       - Buning o'rniga "DIQQAT:", "TA'RIF:", "XULOSA:" kabi so'zlardan foydalaning.
    4. Gaplarni yanada ravon va tushunarli qiling.
    5. Imlo va tinish belgilarini tekshiring.
    6. Matnni qo'lyozma ko'rinishida yozilgandek, tabiiyroq qiling.
    7. Hech qanday sarlavha yoki kirish so'zlarini qo'shmang, faqat tahrirlangan matnni qaytaring.
    8. Matn uzunligini saqlab qoling yoki biroz ko'paytiring, lekin kamaytirmang.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    return stripMarkdown(response.text);
  } catch (error) {
    console.error("AI Refinement Error:", error);
    throw error;
  }
}

export async function ocrImage(base64Image: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = "Ushbu rasmdagi barcha matnlarni aniqlang va ularni faqat matn ko'rinishida qaytaring. Hech qanday qo'shimcha izoh bermang.";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image.split(',')[1] || base64Image
          }
        }
      ],
    });
    return response.text;
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
}
