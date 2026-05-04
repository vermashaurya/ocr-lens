# OCR Lens

OCR Lens is a static web app that extracts text from images in the browser. It lets you compare different OCR engines:

- **Tesseract.js** — Runs entirely on-device (privacy-friendly, no server needed)
- **OCR.space** — Cloud-based, uses included API key
- **Google Vision** — Enterprise-grade, requires your own API key

## Live Demo

**https://vermashaurya.github.io/ocr-lens/**

<img src="preview-ocr.avif" alt="Preview Page" width="600" />

## Features

- Image upload via file picker
- Mobile camera capture (rear camera opens directly)
- Live camera with "take photo" flow
- Three OCR engine options to compare
- Confidence score display

## OCR Engine Comparison

| Engine | Type | Privacy | Accuracy | Setup |
|--------|------|---------|----------|-------|
| Tesseract.js | On-Device | ✅ 100% private | Moderate | None |
| OCR.space | Cloud | ❌ Sends to server | Good | Included key |
| Google Vision | Cloud | ❌ Sends to server | Excellent | Requires API key |

## Run locally

Because camera access is usually restricted on plain `file://` pages, serve the folder through a local web server.

### Option 1

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

This app is static. You can deploy the folder directly to services such as Netlify, Vercel, GitHub Pages, or any web server.

## API Keys

- **OCR.space**: Pre-configured with a shared API key (rate limited)
- **Google Vision**: Enter your own API key in the input field. Get one free at [console.cloud.google.com](https://console.cloud.google.com) (1,000 requests/month free, requires billing enabled)

## Notes

- OCR accuracy improves with sharp, high-contrast images
- The app uses English recognition (`eng`)
- Tesseract.js is loaded from CDN, so the site needs internet access

## Tech Stack

- **Tesseract.js** — Client-side OCR (CDN)
- **OCR.space API** — Cloud OCR
- **Google Vision API** — Cloud OCR
- **HTML5** — Semantic markup
- **CSS3** — Custom properties, grid layout, responsive design
- **JavaScript** — Vanilla JS, no frameworks

## License

This project is licensed under the [Apache License 2.0](LICENSE). 
<br><br>Copyright © 2026<br>
<img src="name-geo1.avif" alt="Logo" width="600" /> <br>
![License](https://img.shields.io/github/license/vermashaurya/ocr-lens) <br><br>
Feel free to take inspiration. <br>Happy Coding!
