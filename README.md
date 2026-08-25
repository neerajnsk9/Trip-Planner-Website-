# 🌍 AI Trip Planner & Interactive Map Explorer

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)](https://aitripplanner-ivory.vercel.app)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-lightgrey?style=for-the-badge&logo=flask&logoColor=black)](https://flask.palletsprojects.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-API-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)

> An AI-powered full-stack travel assistant and itinerary builder that generates personalized day-by-day travel schedules, interactive maps with turn-by-turn road routing, worldwide destination autocompletion, real-time place metadata, and downloadable PDF travel guides.

---

## 🔗 Live Application

**Experience the live deployment on Vercel:**  
👉 **[https://aitripplanner-ivory.vercel.app](https://aitripplanner-ivory.vercel.app)**

---

## ✨ Key Features

- **🤖 AI-Powered Personalized Itineraries**:
  - Contextual day-by-day schedules tailored to starting locations, destinations, durations, travel pace, and personalized interest vibes.
  - Multi-tier model fallback with instant curated knowledge generation for fast, deterministic responses.

- **🗺️ Interactive Map & Sequential Routing**:
  - Dual map engine support (**Leaflet.js + CARTO Voyager** and **Google Maps JavaScript API**).
  - Numbered pin markers (`1`, `2`, `3`, `4`, `5`) corresponding to each day's itinerary stops.
  - Turn-by-turn road polyline rendering connecting consecutive stops with real driving distances and transit durations.
  - Day-wise isolation and automatic bounds zooming on local destination attractions.

- **🌐 Worldwide Place Autocomplete**:
  - Live instant search dropdown covering 300+ curated global cities and states (India, Europe, Americas, Asia, Middle East, Africa, Oceania).
  - OpenStreetMap Photon geocoding fallback for fast worldwide location discovery with country flags and region metadata.

- **📍 Verified Place Details & Photo Carousels**:
  - Multi-photo carousels with thumbnail navigation and full-screen lightbox zoom.
  - Metadata including star ratings, user review counts, categories, address copying, and directional navigation.

- **📄 Automated PDF Itinerary Generation**:
  - One-click export of complete trip itineraries, maps, daily schedules, costs, and travel tips using **ReportLab**.

- **💬 Real-Time AI Travel Concierge**:
  - Integrated interactive chatbot for local cuisine tips, hidden gems, and travel navigation advice.

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | HTML5, Vanilla CSS3 (Custom Glassmorphism Design System), JavaScript (ES6+), Leaflet.js, CARTO Voyager Tiles |
| **Backend** | Python 3, Flask 3.x, Werkzeug |
| **AI / LLM** | Google Gemini API (`gemini-1.5-flash`, `gemini-2.0-flash`) |
| **Mapping & Geocoding** | OpenStreetMap Nominatim, Photon API, OSRM Road Routing, Google Maps & Places APIs |
| **PDF Generation** | ReportLab, BeautifulSoup4 |
| **Deployment** | Vercel (Serverless WSGI Functions via `@vercel/python`) |

---

## 🚀 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/neerajnsk9/Trip-Planner-Website-.git
cd Trip-Planner-Website-
```

### 2. Create and activate a virtual environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Required: Gemini API Key from Google AI Studio (https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Google Maps API Key (Leaflet + CARTO maps are used by default)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Optional: Flask Secret Key
FLASK_SECRET_KEY=your_secret_key_here
```

### 5. Run the Application
```bash
python app.py
```
Open **`http://127.0.0.1:5000`** in your browser.

---

## 📦 Deployment to Vercel

This repository is pre-configured for Vercel deployment with [`vercel.json`](vercel.json) and [`api/index.py`](api/index.py):

1. Import this repository into [Vercel](https://vercel.com).
2. Set `GEMINI_API_KEY` and `FLASK_SECRET_KEY` under **Project Settings $\rightarrow$ Environment Variables**.
3. Click **Deploy**.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).