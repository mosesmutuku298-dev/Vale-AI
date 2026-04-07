import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, gameState } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API Key is not configured in environment variables." });
      }

      const genAI = new GoogleGenAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        You are the "Neon Pulse" Game Master, an AI entity living inside a synthwave 3D game.
        The user is playing a high-speed racing game.
        Current Game State: ${JSON.stringify(gameState)}
        User Message: "${message}"
        
        Respond as a cool, futuristic AI. Keep it brief (1-2 sentences). 
        You can also "hack" the game by returning a command in your JSON response.
        Commands available: "SPEED_UP", "SLOW_DOWN", "EXTRA_POINTS".
        
        Return your response in JSON format:
        {
          "reply": "Your message here",
          "command": "OPTIONAL_COMMAND_HERE"
        }
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean up markdown if present
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: responseText };

      res.json(jsonResponse);
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to process AI request." });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
