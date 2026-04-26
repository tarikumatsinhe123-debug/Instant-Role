import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateResumeAndCoverLetter(jobTitle: string) {
  const prompt = `
    Generate a professional resume and a tailored cover letter for the job title: "${jobTitle}".
    
    The response MUST be in JSON format with the following structure:
    {
      "resume": {
        "summary": "Professional summary...",
        "experience": [
          { "title": "Job Title", "company": "Example Corp", "period": "2020 - Present", "bullets": ["bullet 1", "bullet 2"] }
        ],
        "skills": ["Skill 1", "Skill 2"]
      },
      "coverLetter": "Full cover letter text..."
    }
    
    Ensure the content is high-quality, professional, and includes industry-standard keywords.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("No response from AI");
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}
