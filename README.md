# AI Trip Planner & Interactive Map Explorer

An intelligent, full-featured web application that creates personalized day-by-day travel itineraries using **Gemini AI**, integrates an **interactive Google Map** with numbered stop markers and route paths, provides **Google Places photo previews** and destination details, and features an integrated travel assistance **chatbot**.

## ✨ Key Features

- **Personalized AI Itineraries**: Generates custom day-by-day itineraries tailored to destinations, dates, budgets, pacing, and travel interests.
- **Interactive Map Experience**:
  - Embedded Google Map & Leaflet engine directly in the interface with zero external redirects.
  - Numbered markers corresponding to each day's itinerary stops.
  - In-app route rendering connecting consecutive attractions.
  - Day filters ("All Days", "Day 1", "Day 2", etc.).
  - Search anywhere on map with autocomplete.
- **Destination Photos & Place Details**:
  - Multi-photo carousel with thumbnail preview and fullscreen zoom lightbox.
  - Detailed metadata: star rating, review count, open status, address with one-click copy, category badges.
  - "Get Directions" and "Ask AI Assistant" one-click action buttons.
- **AI Chatbot & Itinerary Synergy**:
  - Interactive clickable place chips in the generated itinerary that fly to and highlight pins on the map.
  - Chatbot mentions of landmarks and cafes include interactive **"📍 View on Map"** buttons.
- **PDF Export**: Download cleanly formatted itineraries as PDFs.
- **Responsive Modern UI**: Built with a sleek split-screen layout on desktop and responsive views on tablets and mobile devices.

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Modern Glassmorphic Design System), JavaScript (ES6+), Google Maps JavaScript API, Leaflet Fallback
- **Backend**: Python Flask 3.x
- **AI**: Gemini 3.6 Flash API
- **Places & Photos**: Google Places API & Curated High-Res Fallbacks
- **PDF Generation**: ReportLab & BeautifulSoup4

## 🚀 Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd aitrip
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables (`.env`):**
   Create a `.env` file in the root directory:
   ```env
   # Required: Gemini API Key from Google AI Studio (https://aistudio.google.com/app/apikey)
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional: Google Maps API Key from Google Cloud Console (https://console.cloud.google.com/)
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

   > **Google Cloud APIs to Enable (Optional for Custom Google Maps Key):**
   > - Maps JavaScript API
   > - Places API
   > - Directions API
   > - Geocoding API
   > *(Note: The application also includes built-in fallback mapping and photo matching if a Google Maps key is not yet set!)*

4. **Run the Application:**
   ```bash
   python app.py
   ```

5. **Open in Browser:**
   Navigate to `http://localhost:5000` or `http://127.0.0.1:5000`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 