import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as mm from "music-metadata";
import cors from "cors";

// Pour remplacer __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const MUSIC_DIR = path.join(__dirname, "assets", "songs");

app.use(cors());
app.use("/songs", express.static(MUSIC_DIR));

// Fonction pour scanner les musiques
async function scanMusicFiles() {
  const files = fs
    .readdirSync(MUSIC_DIR) 
    .filter((file) =>
      [".mp3", ".wav", ".m4a"].includes(
        path.extname(file).toLowerCase()
      )
    );

  const library = [];

  for (const file of files) {
    const filePath = path.join(MUSIC_DIR, file);
    try {
      const metadata = await mm.parseFile(filePath);
      const picture = metadata.common.picture?.[0]; // Récupère la première image disponible

      let pictureData = null;
      function isValidBase64Image(data) {
        // Vérifie le format de base
        if (!data || typeof data !== "string") return false;

        // Vérifie l'en-tête
        if (!data.startsWith("data:image/")) return false;

        // Extrait la partie base64
        const [header, base64Data] = data.split("base64,");
        if (!base64Data) return false;

        // Vérifie les caractères valides
        const base64Regex = /^[A-Za-z0-9+/=]+$/;
        return base64Regex.test(base64Data);
      }

      if (picture) {
        try {
          const base64 = Buffer.from(picture.data).toString("base64");
          pictureData = `data:${picture.format};base64,${base64}`;

          if (!isValidBase64Image(pictureData)) {
            console.warn("Image invalide détectée:", file);
            pictureData = null;
          }
        } catch (error) {
          console.error("Erreur de conversion d'image:", error);
          pictureData = null;
        }
      }

      library.push({
        id: file,
        file,
        title: metadata.common.title || path.basename(file),
        artist: metadata.common.artist || "Inconnu",
        album: metadata.common.album || "Inconnu",
        year: metadata.common.year || null,
        duration: metadata.format.duration || 0,
        picture: pictureData,
      });
    } catch (error) {
      console.warn(
        `⚠️ Impossible de lire les métadonnées pour ${file}: ${error.message}`
      );
    }
  }

  return library;
}

app.get("/spotify-music", async (req, res) => {
  try {
    const library = await scanMusicFiles();
    res.json(library);
  } catch (error) {
    console.error("Erreur lors du scan:", error);
    res.status(500).json({ error: "Erreur lors du scan de la musique." });
  }
});

app.listen(PORT, () => {
  console.log(`🎧 Serveur démarré sur http://localhost:${PORT}`);
});
