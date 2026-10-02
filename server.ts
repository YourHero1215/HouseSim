import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Server-side Gemini client using modern @google/genai SDK
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

/**
 * AI-Powered Monocular Depth & 3D Geometry Estimation (Compensating for lack of LiDAR)
 * Uses Gemini 3.8 Flash to analyze standard 2D Chromebook webcam frames or video keyframes,
 * inferring physical scale, 16-slice 3D topological silhouette profile, material roughness,
 * and 3D symmetry without requiring a physical LiDAR laser sensor.
 */
app.post('/api/ai-scan-depth', async (req, res) => {
  try {
    const { imageBase64, currentName, currentCategory } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 payload' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key not configured on server',
        fallback: true,
      });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `You are an expert in Computer Vision, Photogrammetry, and 3D Shape Reconstruction.
The user is scanning a real-world object using a standard Chromebook webcam (which lacks hardware LiDAR laser sensors).
Analyze the 2D image of this object and estimate its true 3D spatial geometry, depth relief, physical dimensions, and material properties.

Return a JSON object adhering to this schema:
- objectName: Concise name of the recognized object (e.g. "Ceramic Mug", "Vintage Camera", "Desk Lamp", "Succulent Plant")
- category: One of "Decor", "Electronics", "Kitchenware", "Lighting", "Collectible"
- estimatedWidthCm: Estimated physical width in centimeters (e.g. 10 to 60)
- estimatedHeightCm: Estimated physical height in centimeters (e.g. 10 to 60)
- estimatedDepthCm: Estimated physical front-to-back depth in centimeters (e.g. 10 to 60)
- shapeMode: One of:
  * "lathe" (if the object has rotational symmetry like a mug, vase, bowl, bottle, lamp, bottle)
  * "extrude" (if it is an asymmetric contoured 3D object like a camera, shoe, toy, figurine, iron)
  * "voxel" (if it has detailed surface relief and textured topography)
  * "box" (if it is boxy/rectangular like a speaker, book, console)
- silhouetteProfile: An array of exactly 16 numbers between 0.10 and 1.00 representing the normalized cross-sectional width/radius of the object sliced horizontally from bottom (index 0) to top (index 15).
- roughness: Number from 0.05 to 0.95 for 3D PBR material
- metalness: Number from 0.0 to 1.0 for 3D PBR material
- interactionBehavior: One of "inspect", "toggle_light", "play_sound", "spin_animate"
- lidarCompensationExplanation: A brief 1-2 sentence explanation of how the visual cues (highlights, shadows, silhouette contour, and perspective) allowed estimating the 3D volume without LiDAR.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            objectName: { type: Type.STRING },
            category: {
              type: Type.STRING,
              enum: ['Decor', 'Electronics', 'Kitchenware', 'Lighting', 'Collectible'],
            },
            estimatedWidthCm: { type: Type.NUMBER },
            estimatedHeightCm: { type: Type.NUMBER },
            estimatedDepthCm: { type: Type.NUMBER },
            shapeMode: {
              type: Type.STRING,
              enum: ['lathe', 'extrude', 'voxel', 'box'],
            },
            silhouetteProfile: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
            },
            roughness: { type: Type.NUMBER },
            metalness: { type: Type.NUMBER },
            interactionBehavior: {
              type: Type.STRING,
              enum: ['inspect', 'toggle_light', 'play_sound', 'spin_animate'],
            },
            lidarCompensationExplanation: { type: Type.STRING },
          },
          required: [
            'objectName',
            'category',
            'estimatedWidthCm',
            'estimatedHeightCm',
            'estimatedDepthCm',
            'shapeMode',
            'silhouetteProfile',
            'roughness',
            'metalness',
            'interactionBehavior',
            'lidarCompensationExplanation',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in /api/ai-scan-depth:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze 3D geometry with AI',
      fallback: true,
    });
  }
});

// Vite SSR / middleware in dev mode, static serving in prod
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HouseSim server running on port ${PORT}`);
});
