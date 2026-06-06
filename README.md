# ⛁ PicCrypt // Anonymous Media Optimization Protocol

**PicCrypt** is a client-side, darkweb-themed bulk image compressor, metadata (EXIF) wiper, and WebP converter terminal. It operates entirely inside your browser's local sandbox—ensuring maximum privacy and zero data logs.

## 🚀 Live Demo
🔗 **https://tasbirkabir.github.io/PicCrypt]**

---

## 🛠️ Key Features

*   **Bulk Compression System:** Upload and process up to 20 images simultaneously (PNG, JPG, JPEG).
*   **Dual Input Mechanics:** Supports local drag-and-drop file uploads as well as direct image URL injection (CORS-permissive).
*   **Privacy First (EXIF Wiper):** Automatically strips all tracking data, location tags, and camera metadata from images.
*   **Format Flexibility:** Instantly convert images to highly optimized `.webp` format or retain the original extension.
*   **Visual Split-Slider:** Compare the "Before vs. After" visual quality side-by-side using an interactive visual slider modal.
*   **Bulk Download:** Package all compressed files into a single structured `.zip` archive instantly.
*   **Interactive Cyber UI:** Low contrast, low eye-strain console look featuring audio bleep triggers and modern layouts.

---

## 📁 Project Structure

```text
📁 PicCrypt/
│
├── 📄 index.html      # Main markup structure with integrated CDN services
├── 📄 style.css       # Custom terminal grid themes, scanline layers & sliders
└── 📄 script.js       # Compression algorithms, JSZip engine, and UI handlers
