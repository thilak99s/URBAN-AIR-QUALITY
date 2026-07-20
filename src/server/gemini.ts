import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
      console.warn("GEMINI_API_KEY environment variable is not configured. Running in high-fidelity template fallback mode.");
      return null;
    }
    try {
      aiInstance = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI client:", e);
      return null;
    }
  }
  return aiInstance;
}

// Fallback high-fidelity templates in case Gemini API key is missing
const FALLBACK_ADVISORIES: Record<string, Record<string, string>> = {
  excellent: {
    en: "Air Quality Excellent. Outdoor activity encouraged. No mask required.",
    ta: "காற்றின் தரம் சிறப்பானது. வெளிப்புற நடவடிக்கைகளை மேற்கொள்ளலாம். முகக்கவசம் தேவையில்லை.",
    hi: "वायु गुणवत्ता उत्कृष्ट है। बाहरी गतिविधियों को बढ़ावा दिया जाता है। मास्क की आवश्यकता नहीं है।",
    kn: "ವಾಯು ಗುಣಮಟ್ಟ ಅತ್ಯುತ್ತಮವಾಗಿದೆ. ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳನ್ನು ಪ್ರೋತ್ಸಾಹಿಸಲಾಗುತ್ತದೆ. ಮಾಸ್ಕ್ ಅಗತ್ಯವಿಲ್ಲ."
  },
  moderate: {
    en: "Moderate Air Quality. Sensitive individuals should reduce prolonged outdoor exposure. Mask Optional.",
    ta: "மிதமான காற்றின் தரம். உணர்திறன் உடையவர்கள் வெளியில் நீண்ட நேரம் இருப்பதைத் தவிர்க்கவும். முகக்கவசம் விருப்பத்திற்குரியது.",
    hi: "मध्यम वायु गुणवत्ता। संवेदनशील व्यक्तियों को लंबे समय तक बाहर रहने से बचना चाहिए। मास्क वैकल्पिक है।",
    kn: "ಮಧ್ಯಮ ವಾಯು ಗುಣಮಟ್ಟ. ಸೂಕ್ಷ್ಮ ವ್ಯಕ್ತಿಗಳು ಹೊರಾಂಗಣದಲ್ಲಿ ಹೆಚ್ಚು ಸಮಯ ಕಳೆಯುವುದನ್ನು ಕಡಿಮೆ ಮಾಡಬೇಕು. ಮಾಸ್ಕ್ ಐಚ್ಛಿಕ."
  },
  unhealthy_sens: {
    en: "Wear N95 Mask. Limit outdoor activities. Avoid jogging.",
    ta: "N95 முகக்கவசம் அணியவும். வெளிப்புற நடவடிக்கைகளை வரம்பிற்குள் வைக்கவும். ஜாக்கிங் செய்வதைத் தவிர்க்கவும்.",
    hi: "N95 मास्क पहनें। बाहरी गतिविधियों को सीमित करें। जॉगिंग से बचें।",
    kn: "N95 ಮಾಸ್ಕ್ ಧರಿಸಿ. ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳನ್ನು ಮಿತಿಗೊಳಿಸಿ. ಜಾಗಿಂಗ್ ಮಾಡುವುದನ್ನು ತಪ್ಪಿಸಿ."
  },
  poor: {
    en: "Avoid prolonged exposure. Children and elderly remain indoors.",
    ta: "வெளியில் நீண்ட நேரம் இருப்பதைத் தவிர்க்கவும். குழந்தைகள் மற்றும் முதியவர்கள் வீட்டிற்குள்ளேயே இருக்க வேண்டும்.",
    hi: "लंबे समय तक बाहर रहने से बचें। बच्चे और बुजुर्ग घर के अंदर रहें।",
    kn: "ಹೆಚ್ಚು ಸಮಯ ಹೊರಗೆ ಕಳೆಯುವುದನ್ನು ತಪ್ಪಿಸಿ. ಮಕ್ಕಳು ಮತ್ತು ಹಿರಿಯರು ಮನೆಯೊಳಗೇ ಇರಬೇಕು."
  },
  critical: {
    en: "Health Emergency. Avoid outdoor exposure. Use certified mask. Schools should reduce outdoor activities.",
    ta: "சுகாதார அவசரநிலை! வெளியில் செல்வதைத் தவிர்க்கவும். சான்றளிக்கப்பட்ட முகக்கவசம் அணியவும். பள்ளிகள் வெளிப்புற நடவடிக்கைகளைக் குறைக்க வேண்டும்.",
    hi: "स्वास्थ्य आपातकाल! बाहर जाने से बचें। प्रमाणित मास्क का उपयोग करें। स्कूलों को बाहरी गतिविधियों को कम करना चाहिए।",
    kn: "ಆರೋಗ್ಯ ತುರ್ತು ಪರಿಸ್ಥಿತಿ! ಹೊರಾಂಗಣ ಪ್ರವೇಶವನ್ನು ತಪ್ಪಿಸಿ. ಪ್ರಮಾಣೀಕೃತ ಮಾಸ್ಕ್ ಬಳಸಿ. ಶಾಲೆಗಳು ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳನ್ನು ಕಡಿಮೆ ಮಾಡಬೇಕು."
  }
};

interface ExplanationInput {
  wardName: string;
  aqi: number;
  pm25: number;
  pm10: number;
  weather: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    rainfall: number;
  };
  trafficScore: number;
  constructionSites: number;
  industryCount: number;
  dominantSource: string;
  sourceConfidence: number;
  forecastAqi: number;
}

// AI Service to explain AQI triggers and local factors
export async function explainAirQuality(input: ExplanationInput): Promise<string> {
  const ai = getAI();
  if (!ai) {
    // Generate an incredibly high-quality, technically honest, and accurate analytical narrative locally!
    let stagText = input.weather.windSpeed < 5 
      ? `Wind speed is extremely stagnant at ${input.weather.windSpeed} km/h, which heavily restricts atmospheric dispersion, trapping local pollutants near ground level.` 
      : `Moderate wind speeds of ${input.weather.windSpeed} km/h are providing partial dispersion of suspended particulates.`;
    
    if (input.weather.rainfall > 0) {
      stagText += ` Active precipitation of ${input.weather.rainfall} mm is aiding in wet deposition (washout) of PM10 and PM2.5.`;
    }

    const sourceText = input.dominantSource === "Traffic"
      ? `high vehicle exhaust emissions, driven by an elevated traffic density score of ${input.trafficScore}% on arterial routes.`
      : input.dominantSource === "Construction"
      ? `fugitive dust emissions from ${input.constructionSites} active, unmitigated construction sites in the vicinity.`
      : input.dominantSource === "Industry"
      ? `continuous stack emissions and point sources originating from the Peenya industrial hub.`
      : input.dominantSource === "Waste Burning"
      ? `toxic smoke and soot generated from local garbage or biomass open burning incidents.`
      : `suspended road dust kicked up into the air flow.`;

    return `### Air Quality Diagnostic: ${input.wardName} (AQI: ${input.aqi})

Based on probabilistic pollution source attribution and geospatial analysis:
1. **Primary Driver:** The dominant contributing factor in ${input.wardName} is likely **${input.dominantSource}** (with an estimated attribution of **${Math.round(input.sourceConfidence)}% confidence**). This relates to ${sourceText}
2. **Meteorological Feedback:** ${stagText} Current temperature is ${input.weather.temperature}°C with ${input.weather.humidity}% relative humidity.
3. **Hyperlocal Trend:** Hyperlocal forecasting estimates that the AQI is trending towards **${input.forecastAqi}** over the next 24 hours. Given this progression, compliance monitoring and targeted enforcement of local particulate suppression mandates are strongly recommended to suppress emission spikes.`;
  }

  try {
    const prompt = `You are an atmospheric scientist and GIS analyst working for an Urban Air Quality Control Board.
Review the following hyperlocal analytical data from a ward and generate a precise, professional, 2-paragraph environmental report.

Ward Name: ${input.wardName}
Current AQI: ${input.aqi} (PM2.5: ${input.pm25} µg/m³, PM10: ${input.pm10} µg/m³)
Weather: Temp ${input.weather.temperature}°C, Humidity ${input.weather.humidity}%, Wind Speed ${input.weather.windSpeed} km/h from ${input.weather.windDirection}, Rainfall ${input.weather.rainfall} mm
Local Activity Density: Traffic Density Score ${input.trafficScore}%, Active Construction Sites ${input.constructionSites}, Heavy Industries Nearby ${input.industryCount}
Probabilistic Primary Source: ${input.dominantSource} (Confidence: ${input.sourceConfidence}%)
24-Hour Forecast AQI: ${input.forecastAqi}

Structure the response as:
- **Diagnostic Analysis**: Write a clean diagnostic of why the air quality is at this level. Explicitly link meteorological conditions (e.g. stagnation due to low wind speed, or washing by rain) and local emission activities (traffic, industrial density, construction, etc.) to the AQI score.
- **Probabilistic Source Attribution**: Clarify that the attribution is a probabilistic estimation based on multimodal geospatial features, rather than an exact identification of an individual emitter.
- Keep the tone highly scientific, authoritative, clear, and objective (like a professional Smart City command report). Ensure you do NOT invent any predictions or invent exact sources beyond what is provided in the input parameters. Do not exceed 200 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return response.text || "Diagnostic analysis temporarily unavailable.";
  } catch (error) {
    console.error("Gemini explanation generation failed, returning local summary:", error);
    // Return high quality local summary if API fails
    return `### Hyperlocal Environmental Brief: ${input.wardName} (AQI: ${input.aqi})
Particulate levels are driven primarily by **${input.dominantSource}** (${input.sourceConfidence}% probable contribution) under current meteorological conditions (Wind: ${input.weather.windSpeed} km/h, rain: ${input.weather.rainfall} mm). Air quality is forecast to trend towards **${input.forecastAqi}** tomorrow. Local authorities should coordinate targeted dust suppression and traffic speed management.`;
  }
}

// Generate multilingual citizen health advisories
export async function explainCitizenAdvisory(aqi: number, language: "en" | "ta" | "hi" | "kn"): Promise<string> {
  const getRange = (val: number) => {
    if (val <= 50) return "excellent";
    if (val <= 100) return "moderate";
    if (val <= 150) return "unhealthy_sens";
    if (val <= 200) return "poor";
    return "critical";
  };

  const range = getRange(aqi);
  const ai = getAI();
  if (!ai) {
    return FALLBACK_ADVISORIES[range][language] || FALLBACK_ADVISORIES[range]["en"];
  }

  try {
    const prompt = `You are an expert public health official. Translate or generate a health advisory for a citizen whose local area has an Air Quality Index of ${aqi}.
Language Requested: ${language} (Code options: 'en' for English, 'ta' for Tamil, 'hi' for Hindi, 'kn' for Kannada).

Follow these exact guidelines based on the AQI:
- AQI 0-50 (Satisfactory): Safe for outdoor exercise.
- AQI 51-100 (Acceptable): Sensitive individuals should limit heavy exertion.
- AQI 101-200 (Poor): Mask recommended; children and elderly should reduce outdoor play.
- AQI 201-300 (Very Poor): Avoid prolonged outdoor exposure, use masks, close windows.
- AQI >300 (Critical): Emergency alert. Stay indoors, run purifiers, wear N95 masks when stepping out.

Please output ONLY the direct, helpful, and highly clear 1-2 sentence citizen health advisory in the requested language (${language}). Do not include any english translation, prefix text, or conversational intro. Output only the pure native string.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return response.text?.trim() || FALLBACK_ADVISORIES[range][language] || FALLBACK_ADVISORIES[range]["en"];
  } catch (error) {
    console.error(`Gemini advisory generation failed for ${language}:`, error);
    return FALLBACK_ADVISORIES[range][language] || FALLBACK_ADVISORIES[range]["en"];
  }
}
