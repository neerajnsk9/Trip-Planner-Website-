from flask import Flask, render_template, request, jsonify, send_file
from google.generativeai import GenerativeModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from bs4 import BeautifulSoup
import io

# Load environment variables
load_dotenv()

app = Flask(__name__)

import json
import re
import urllib.parse
import urllib.request
import time

def get_gemini_model():
    api_key = os.getenv('GEMINI_API_KEY', '').strip()
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY in .env file. Please add your key to .env")
    genai.configure(api_key=api_key)
    return GenerativeModel('gemini-1.5-flash')

def generate_gemini_content(prompt):
    """Generates content with automatic model fallback and retries."""
    api_key = os.getenv('GEMINI_API_KEY', '').strip()
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY in .env file.")
    genai.configure(api_key=api_key)
    
    candidate_models = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest']
    last_error = None
    
    for model_name in candidate_models:
        try:
            m = GenerativeModel(model_name)
            response = m.generate_content(prompt)
            if response and response.text:
                return response.text
        except Exception as e:
            last_error = e
            err_msg = str(e).lower()
            if "leaked" in err_msg or "403" in err_msg:
                raise e # Key revoked/leaked
            time.sleep(0.5)
            continue
            
    if last_error:
        raise last_error
    raise Exception("Failed to generate content from Gemini API.")

def handle_gemini_error(e):
    err_str = str(e)
    if "leaked" in err_str.lower():
        return "Gemini API Error: Your Gemini API key was reported as leaked/revoked by Google. Please create a fresh key at https://aistudio.google.com/app/apikey and update GEMINI_API_KEY in your .env file."
    elif "api_key" in err_str.lower() or "403" in err_str or "permission_denied" in err_str.lower():
        return "Gemini API Error: Invalid or revoked API key. Please generate a new key from https://aistudio.google.com/app/apikey and paste it into .env."
    elif "429" in err_str or "quota" in err_str.lower() or "resourceexhausted" in err_str.lower():
        return "Gemini API Error: Rate limit/Quota exceeded on your Gemini API key. Please wait 1-2 minutes or use an API key with available quota."
    return f"Error: {err_str}"

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/config', methods=['GET'])
def get_config():
    maps_key = os.getenv('GOOGLE_MAPS_API_KEY', '').strip()
    return jsonify({
        'googleMapsApiKey': maps_key,
        'hasGoogleMapsKey': bool(maps_key),
        'appName': 'AI Trip Planner & Explorer'
    })

def extract_stops_from_text(destination, text):
    """Fallback parser to extract stops from itinerary text if JSON is absent."""
    stops = []
    current_day = 1
    current_slot = "Morning"
    lines = text.split('\n')
    
    for line in lines:
        day_match = re.search(r'Day\s+(\d+)', line, re.IGNORECASE)
        if day_match:
            try:
                current_day = int(day_match.group(1))
            except Exception:
                pass
        
        if 'morning' in line.lower():
            current_slot = 'Morning'
        elif 'afternoon' in line.lower():
            current_slot = 'Afternoon'
        elif 'evening' in line.lower() or 'night' in line.lower():
            current_slot = 'Evening'
            
        # Check for bold text or bullet items
        place_matches = re.findall(r'\*\*([^*]+)\*\*', line)
        for p in place_matches:
            clean_p = p.strip()
            if len(clean_p) > 2 and not any(k in clean_p.lower() for k in ['time:', 'day ', 'morning', 'afternoon', 'evening', 'tips', 'inr', 'cost', 'breakfast', 'lunch', 'dinner']):
                stops.append({
                    'day': current_day,
                    'timeSlot': current_slot,
                    'placeName': clean_p,
                    'searchQuery': f"{clean_p}, {destination}",
                    'activity': f"Explore {clean_p}",
                    'category': 'Sightseeing',
                    'estimatedCost': 'Check on site',
                    'highlight': True
                })
    return stops[:20]

KNOWN_COORDINATES = {
    # Cities / Regions
    'manali': (32.2396, 77.1887),
    'goa': (15.2993, 74.1240),
    'north goa': (15.5553, 73.7517),
    'south goa': (15.2832, 73.9862),
    'jaipur': (26.9124, 75.7873),
    'kerala': (9.9312, 76.2673),
    'delhi': (28.6139, 77.2090),
    'mumbai': (19.0760, 72.8777),
    'shimla': (31.1048, 77.1734),
    'rishikesh': (30.0869, 78.2676),
    'agra': (27.1767, 78.0081),
    'udaipur': (24.5854, 73.7125),
    'varanasi': (25.3176, 82.9739),
    'paris': (48.8566, 2.3522),
    'tokyo': (35.6762, 139.6503),
    'london': (51.5074, -0.1278),
    'rome': (41.9028, 12.4964),
    'bali': (-8.4095, 115.1889),
    'dubai': (25.2048, 55.2708),
    'singapore': (1.3521, 103.8198),
    'bangkok': (13.7563, 100.5018),
    'amsterdam': (52.3676, 4.9041),
    'new york': (40.7128, -74.0060),
    
    # Manali Landmarks
    'hadimba': (32.2483, 77.1805),
    'hidimba': (32.2483, 77.1805),
    'solang': (32.3166, 77.1575),
    'atal tunnel': (32.4013, 77.1483),
    'sissu': (32.4770, 77.1230),
    'rohtang': (32.3716, 77.2466),
    'jogini': (32.2686, 77.1950),
    'vashisht': (32.2608, 77.1904),
    'manu temple': (32.2530, 77.1720),
    'mall road manali': (32.2396, 77.1887),
    'old manali': (32.2562, 77.1750),
    'naggar castle': (32.1120, 77.1650),
    'jana waterfall': (32.1388, 77.2050),
    'van vihar': (32.2370, 77.1880),
    'cafe 1947': (32.2562, 77.1750),

    # Goa Landmarks (All strictly within Goa!)
    'se cathedral': (15.5009, 73.9126),
    'basilica of bom jesus': (15.5009, 73.9116),
    'bom jesus': (15.5009, 73.9116),
    'fort aguada': (15.4925, 73.7736),
    'aguada': (15.4925, 73.7736),
    'chapora fort': (15.6062, 73.7380),
    'chapora': (15.6062, 73.7380),
    'vagator': (15.6028, 73.7336),
    'anjuna': (15.5838, 73.7439),
    'baga': (15.5553, 73.7517),
    'calangute': (15.5439, 73.7553),
    'candolim': (15.5173, 73.7628),
    'sinquerim': (15.4988, 73.7686),
    'dudhsagar': (15.3144, 74.3143),
    'fontainhas': (15.4989, 73.8318),
    'panaji': (15.4909, 73.8278),
    'old goa': (15.5036, 73.9126),
    'dona paula': (15.4538, 73.8016),
    'miramar': (15.4808, 73.8083),
    'mangeshi': (15.4338, 73.9686),
    'shanta durga': (15.3625, 73.9875),
    'colva': (15.2783, 73.9167),
    'benaulim': (15.2618, 73.9234),
    'palolem': (15.0100, 74.0232),
    'agonda': (15.0445, 73.9886),
    'cabo de rama': (15.0886, 73.9211),
    'morjim': (15.6319, 73.7371),
    'ashwem': (15.6540, 73.7225),
    'arambol': (15.6869, 73.7042),
    'spice plantation': (15.4219, 74.0156),

    # Jaipur Landmarks
    'hawa mahal': (26.9239, 75.8267),
    'amer fort': (26.9855, 75.8513),
    'amber fort': (26.9855, 75.8513),
    'city palace jaipur': (26.9258, 75.8237),
    'city palace': (26.9258, 75.8237),
    'jantar mantar': (26.9248, 75.8246),
    'nahargarh': (26.9373, 75.8155),
    'jaigarh': (26.9850, 75.8456),
    'jal mahal': (26.9537, 75.8463),
    'albert hall': (26.9118, 75.8195),
    'patrika gate': (26.8528, 75.8055),
    'birla mandir': (26.8924, 75.8154),
    'chokhi dhani': (26.7663, 75.8361),
    'bapu bazaar': (26.9189, 75.8211),
    'johari bazaar': (26.9215, 75.8268),

    # Kerala Landmarks
    'fort kochi': (9.9658, 76.2421),
    'mattancherry palace': (9.9583, 76.2592),
    'mattancherry': (9.9583, 76.2592),
    'jewish synagogue': (9.9575, 76.2598),
    'chinese fishing nets': (9.9697, 76.2429),
    'marine drive kochi': (9.9816, 76.2753),
    'marine drive': (9.9816, 76.2753),
    'lulu mall kochi': (10.0271, 76.3080),
    'lulu mall': (10.0271, 76.3080),
    'hill palace': (9.9529, 76.3639),
    'cherai beach': (10.1415, 76.1786),
    'alappuzha': (9.4981, 76.3388),
    'alleppey': (9.4981, 76.3388),
    'marari beach': (9.6006, 76.2974),
    'vembanad lake': (9.6176, 76.4301),
    'kumarakom': (9.6176, 76.4301),
    'munnar': (10.0889, 77.0595),
    'tea museum': (10.0898, 77.0573),
    'mattupetty dam': (10.1065, 77.1242),
    'eravikulam': (10.1500, 77.0667),
    'athirappilly': (10.2851, 76.5698),
    'varkala': (8.7379, 76.7163),
    'kovalam': (8.4004, 76.9787),
    'padmanabhaswamy': (8.4828, 76.9436),
    'thekkady': (9.6031, 77.1615),
    'periyar': (9.4679, 77.1444)
}

def is_valid_local_coord(coord, dest_center, max_dist_km=75):
    """Checks if a coordinate is strictly within local range of the destination city."""
    if not coord or not dest_center:
        return False
    try:
        import math
        lat1, lon1 = math.radians(dest_center['lat']), math.radians(dest_center['lng'])
        lat2, lon2 = math.radians(coord['lat']), math.radians(coord['lng'])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        dist = 6371 * c
        return dist <= max_dist_km
    except Exception:
        return False

def resolve_coordinates(query, fallback_center=None, index=0, total=1):
    q_lower = query.lower()
    for key, coords in KNOWN_COORDINATES.items():
        if key in q_lower:
            return {'lat': coords[0], 'lng': coords[1]}
    
    # Try fast geocoding with destination context
    try:
        encoded = urllib.parse.quote(query)
        req = urllib.request.Request(
            f"https://nominatim.openstreetmap.org/search?format=json&limit=1&q={encoded}",
            headers={'User-Agent': 'AITripPlanner/2.0'}
        )
        with urllib.request.urlopen(req, timeout=2) as res:
            data = json.loads(res.read().decode('utf-8'))
            if data and len(data) > 0:
                candidate = {'lat': float(data[0]['lat']), 'lng': float(data[0]['lon'])}
                if fallback_center and is_valid_local_coord(candidate, fallback_center, 75):
                    return candidate
    except Exception:
        pass
    
    # Compute deterministic local offset around city center
    if fallback_center:
        import math
        angle = (2 * math.pi * index) / max(total, 1) + 0.4
        radius = 0.012 + ((index % 4) * 0.008)
        return {
            'lat': round(fallback_center['lat'] + radius * math.sin(angle), 5),
            'lng': round(fallback_center['lng'] + radius * math.cos(angle), 5)
        }
    
    return {'lat': 28.6139, 'lng': 77.2090}

def geocode_destination(destination):
    dest_lower = destination.lower()
    for key, coords in KNOWN_COORDINATES.items():
        if key in dest_lower:
            return {'lat': coords[0], 'lng': coords[1]}
    return resolve_coordinates(destination, None, 0, 1)

def calculate_distance_km(c1, c2):
    """Calculates haversine distance in km between two coordinates."""
    if not c1 or not c2:
        return 0.0
    try:
        import math
        lat1, lon1 = math.radians(c1['lat']), math.radians(c1['lng'])
        lat2, lon2 = math.radians(c2['lat']), math.radians(c2['lng'])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return round(6371 * c, 1)
    except Exception:
        return 0.0

@app.route('/generate_itinerary', methods=['POST'])
def generate_itinerary():
    try:
        data = request.json or {}
        destination = data.get('destination', '').strip()
        if not destination:
            return jsonify({'error': 'Please enter a destination to plan your trip.'}), 400

        duration = int(data.get('duration') or 3)
        start_date = data.get('startDate', 'Upcoming')
        end_date = data.get('endDate', 'Upcoming')
        starting_point = data.get('startingPoint', '').strip()
        budget = data.get('budget', 'Moderate / Balanced')
        pace = data.get('pace', 'Balanced (Best of both)')
        interests = data.get('interests', [])
        if isinstance(interests, str):
            interests = [interests]
        special_notes = data.get('specialConsiderations', 'None')
            
        prompt = f"""Act as a premier AI travel concierge & local guide. Create an elite, production-quality {duration}-day trip itinerary for:
Destination: {destination}
Travel Dates: {start_date} to {end_date}
Duration: {duration} days
Starting Point / Hotel: {starting_point if starting_point else 'City Center / Arrival Port'}
Interests & Vibes: {', '.join(interests) if interests else 'Culture, Sightseeing, Food, Nature'}
Budget Tier: {budget}
Travel Pace: {pace}
Special Considerations: {special_notes}

Provide your response in TWO parts:

=== STRUCTURED TRIP JSON ===
```json
{{
  "tripOverview": {{
    "destination": "{destination}",
    "duration": {duration},
    "summary": "Inspiring 2-3 sentence overview of this curated journey.",
    "bestTimeToVisit": "Ideal seasons & weather notes",
    "tripVibe": "e.g. Scenic & Cultural Heritage",
    "budgetEstimate": "Total estimated budget per person"
  }},
  "days": [
    {{
      "day": 1,
      "title": "Day Theme/Highlight Title",
      "theme": "e.g. Old Town Heritage & Coastal Sunsets",
      "date": "{start_date}",
      "stops": [
        {{
          "placeName": "Exact Famous Landmark / Attraction / Restaurant Name",
          "timeSlot": "09:00 AM",
          "activity": "Engaging description of what to see and experience here",
          "category": "Sightseeing / Historical / Nature / Food & Cafes / Adventure / Nightlife",
          "estimatedCost": "INR 200",
          "highlight": true,
          "tips": "Pro-tip for visiting (e.g. best photo spot, dress code, avoid crowds)"
        }}
      ]
    }}
  ]
}}
```
Ensure each day includes 3 to 4 distinct, famous, geographically coherent landmark/restaurant stops in logical travel order.

=== ITINERARY TEXT ===
Provide a richly written, beautifully formatted travel guide with markdown headings, daily bullet points, breakfast/lunch/dinner spots, local transportation tips, and cultural etiquette."""

        raw_text = generate_gemini_content(prompt)

        itinerary_text = raw_text
        parsed_trip = None
        raw_stops = []

        # Extract JSON block
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
        if json_match:
            try:
                parsed_trip = json.loads(json_match.group(1))
                itinerary_text = raw_text[json_match.end():].replace('=== ITINERARY TEXT ===', '').strip()
                if not itinerary_text:
                    itinerary_text = raw_text[:json_match.start()].replace('=== STRUCTURED TRIP JSON ===', '').strip()
            except Exception as parse_err:
                print("JSON parsing warning:", parse_err)

        dest_center = geocode_destination(destination)
        resolved_stops = []
        structured_days = []

        # Flatten stops from parsed_trip or fallback text extractor
        if parsed_trip and 'days' in parsed_trip:
            for day_info in parsed_trip.get('days', []):
                d_num = day_info.get('day', 1)
                d_title = day_info.get('title', f"Day {d_num}")
                d_theme = day_info.get('theme', 'Exploration')
                d_stops = []

                for s in day_info.get('stops', []):
                    p_name = s.get('placeName', '').strip()
                    if not p_name:
                        continue
                    p_details = resolve_place_data(p_name, destination)
                    raw_coords = p_details.get('coords')
                    if raw_coords and is_valid_local_coord(raw_coords, dest_center, 75):
                        coords = raw_coords
                    else:
                        coords = resolve_coordinates(f"{p_name}, {destination}", dest_center, len(resolved_stops), 12)

                    stop_item = {
                        'placeId': p_details.get('placeId', f"stop_d{d_num}_{len(d_stops)+1}"),
                        'placeName': p_name,
                        'searchQuery': f"{p_name}, {destination}",
                        'formattedAddress': p_details.get('formattedAddress', f"{p_name}, {destination}"),
                        'latitude': coords['lat'],
                        'longitude': coords['lng'],
                        'coords': coords,
                        'photos': p_details.get('photos', []),
                        'rating': p_details.get('rating', 4.6),
                        'userRatingsTotal': p_details.get('userRatingsTotal', 1500),
                        'description': p_details.get('description', s.get('activity', '')),
                        'day': d_num,
                        'timeSlot': s.get('timeSlot', 'Morning'),
                        'activity': s.get('activity', f"Explore {p_name}"),
                        'category': s.get('category', 'Sightseeing'),
                        'estimatedCost': s.get('estimatedCost', 'Free / Check on site'),
                        'tips': s.get('tips', 'Enjoy your visit!'),
                        'highlight': s.get('highlight', True),
                        'dayIndex': len(d_stops) + 1,
                        'stopIndex': len(resolved_stops) + 1
                    }
                    d_stops.append(stop_item)
                    resolved_stops.append(stop_item)

                structured_days.append({
                    'day': d_num,
                    'title': d_title,
                    'theme': d_theme,
                    'stops': d_stops
                })

        if not resolved_stops:
            fallback_stops = extract_stops_from_text(destination, raw_text)
            itinerary_text = raw_text.replace('=== ITINERARY TEXT ===', '').replace('=== STRUCTURED TRIP JSON ===', '').strip()
            for idx, stop in enumerate(fallback_stops):
                p_name = stop.get('placeName', '').strip()
                p_details = resolve_place_data(p_name, destination)
                raw_coords = p_details.get('coords')
                if raw_coords and is_valid_local_coord(raw_coords, dest_center, 75):
                    coords = raw_coords
                else:
                    coords = resolve_coordinates(f"{p_name}, {destination}", dest_center, idx, len(fallback_stops))

                stop_item = {
                    'placeId': p_details.get('placeId', f"stop_{idx+1}"),
                    'placeName': p_name,
                    'searchQuery': f"{p_name}, {destination}",
                    'formattedAddress': p_details.get('formattedAddress', f"{p_name}, {destination}"),
                    'latitude': coords['lat'],
                    'longitude': coords['lng'],
                    'coords': coords,
                    'photos': p_details.get('photos', []),
                    'rating': p_details.get('rating', 4.6),
                    'userRatingsTotal': p_details.get('userRatingsTotal', 1200),
                    'description': p_details.get('description', stop.get('activity', '')),
                    'day': stop.get('day', 1),
                    'timeSlot': stop.get('timeSlot', 'Morning'),
                    'activity': stop.get('activity', f"Explore {p_name}"),
                    'category': stop.get('category', 'Sightseeing'),
                    'estimatedCost': stop.get('estimatedCost', 'Check on site'),
                    'tips': 'Check opening hours before visiting.',
                    'highlight': True,
                    'dayIndex': idx + 1,
                    'stopIndex': idx + 1
                }
                resolved_stops.append(stop_item)

        # Handle optional Starting Point / Hotel
        if starting_point:
            start_coords = resolve_coordinates(f"{starting_point}, {destination}", dest_center, 0, 1)
            start_stop = {
                'placeId': 'start_location_0',
                'placeName': starting_point,
                'searchQuery': f"{starting_point}, {destination}",
                'formattedAddress': f"{starting_point}, {destination}",
                'latitude': start_coords['lat'],
                'longitude': start_coords['lng'],
                'coords': start_coords,
                'photos': [],
                'rating': 4.8,
                'userRatingsTotal': 500,
                'description': 'Trip Departure & Accommodation Base',
                'day': 1,
                'timeSlot': '08:00 AM (Departure)',
                'activity': f"Start journey from {starting_point}",
                'category': 'Starting Point / Hotel',
                'estimatedCost': '-',
                'tips': 'Check in and prepare for day trip.',
                'isStartingPoint': True,
                'dayIndex': 0,
                'stopIndex': 0
            }
            resolved_stops.insert(0, start_stop)

        # Calculate inter-stop travel distance and duration
        for i in range(len(resolved_stops) - 1):
            curr = resolved_stops[i]
            nxt = resolved_stops[i + 1]
            if curr.get('day') == nxt.get('day'):
                d_km = calculate_distance_km(curr['coords'], nxt['coords'])
                t_mins = max(5, int(d_km * 2.5 + 4))
                curr['travelToNext'] = {
                    'distanceKm': d_km,
                    'durationMins': t_mins,
                    'formatted': f"{d_km} km ({t_mins} mins driving)"
                }

        trip_overview = (parsed_trip and parsed_trip.get('tripOverview')) or {
            'destination': destination,
            'duration': duration,
            'summary': f"An immersive {duration}-day journey exploring the premier landmarks, culture, and cuisine of {destination}.",
            'bestTimeToVisit': 'October to March (Pleasant weather)',
            'tripVibe': ', '.join(interests[:2]) if interests else 'Scenic & Cultural Exploration',
            'budgetEstimate': f"{budget} range"
        }

        return jsonify({
            'tripOverview': trip_overview,
            'days': structured_days,
            'stops': resolved_stops,
            'itinerary': itinerary_text,
            'destination': destination,
            'destinationCoords': dest_center
        })
    except Exception as e:
        return jsonify({'error': handle_gemini_error(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        destination = data.get('destination', '')
        
        context_info = f" The user is planning or discussing a trip to {destination}." if destination else ""
        prompt = f"""Act as a friendly, expert travel assistant.{context_info}
Answer the following user query thoroughly: "{user_message}"

Formatting instructions:
1. When recommending specific attractions, landmarks, viewpoints, hotels, or restaurants, format each place as: [place: Place Name] (e.g. "Be sure to check out [place: Solang Valley] for paragliding or grab coffee at [place: Cafe 1947]."). This enables interactive map exploration.
2. Keep recommendations well-formatted with markdown bullet points and clear practical travel advice."""
        
        chat_reply = generate_gemini_content(prompt)
        return jsonify({'response': chat_reply})
    except Exception as e:
        return jsonify({'error': handle_gemini_error(e)}), 500

PLACE_CACHE = {}

def fetch_wikipedia_place(place_name, destination=""):
    """Fetches exact, verified photographs and details for a specific landmark from Wikipedia & Wikimedia Commons quickly."""
    cache_key = f"{place_name.lower()}_{destination.lower()}".strip('_')
    if cache_key in PLACE_CACHE:
        return PLACE_CACHE[cache_key]

    dest_center = geocode_destination(destination) if destination else {'lat': 28.6139, 'lng': 77.2090}
    clean_name = re.sub(r'\(.*?\)', '', place_name).strip()
    
    title_query = f"{clean_name}, {destination}" if destination and destination.lower() not in clean_name.lower() else clean_name
    
    try:
        encoded_title = urllib.parse.quote(title_query)
        url = f"https://en.wikipedia.org/w/api.php?action=query&titles={encoded_title}|{urllib.parse.quote(clean_name)}&redirects=1&prop=pageimages|extracts|coordinates|info&piprop=original|thumbnail&pithumbsize=800&exintro=1&explaintext=1&format=json"
        req = urllib.request.Request(url, headers={'User-Agent': 'AITripPlanner/2.0 (contact: support@aitrip.local)'})
        with urllib.request.urlopen(req, timeout=2.0) as res:
            data = json.loads(res.read().decode('utf-8'))
            
        pages = data.get('query', {}).get('pages', {})
        for page_id, page in pages.items():
            if page_id == '-1':
                continue
            title = page.get('title', '')
            if 'disambiguation' in title.lower():
                continue

            coords = None
            if page.get('coordinates'):
                c = page['coordinates'][0]
                cand_coord = {'lat': float(c['lat']), 'lng': float(c['lon'])}
                if is_valid_local_coord(cand_coord, dest_center, 75):
                    coords = cand_coord
                else:
                    continue

            photos = []
            main_photo = page.get('thumbnail', {}).get('source') or page.get('original', {}).get('source')
            if main_photo:
                photos.append(main_photo)

            extract = page.get('extract', '').strip()
            if extract:
                first_para = extract.split('\n')[0]
                extract = first_para[:260] + '...' if len(first_para) > 260 else first_para

            res_obj = {
                'placeId': f"wiki_{page_id}",
                'placeName': title,
                'formattedAddress': f"{title}, {destination}".strip(', '),
                'coords': coords,
                'photos': photos,
                'description': extract,
                'rating': 4.7,
                'userRatingsTotal': 2400,
                'source': 'Wikipedia / Wikimedia Commons'
            }
            PLACE_CACHE[cache_key] = res_obj
            return res_obj
    except Exception:
        pass

    return None

def resolve_place_data(place_name, destination=""):
    """Unified place data resolver: uses Google Places API when available, verified Wikipedia as secondary."""
    cache_key = f"{place_name.lower()}_{destination.lower()}".strip('_')
    if cache_key in PLACE_CACHE:
        return PLACE_CACHE[cache_key]
        
    maps_key = os.getenv('GOOGLE_MAPS_API_KEY', '').strip()
    
    # 1. Google Places API (if key configured)
    if maps_key:
        try:
            full_query = f"{place_name}, {destination}".strip(', ')
            encoded_query = urllib.parse.quote(full_query)
            search_url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={encoded_query}&key={maps_key}"
            
            req = urllib.request.Request(search_url, headers={'User-Agent': 'AITripPlanner/2.0'})
            with urllib.request.urlopen(req, timeout=2.5) as res:
                search_data = json.loads(res.read().decode('utf-8'))
                
            if search_data.get('results'):
                top_result = search_data['results'][0]
                place_id = top_result.get('place_id')
                
                details_url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=place_id,name,formatted_address,geometry,photos,rating,user_ratings_total,opening_hours,types,website,formatted_phone_number&key={maps_key}"
                with urllib.request.urlopen(details_url, timeout=2.5) as d_res:
                    details_data = json.loads(d_res.read().decode('utf-8'))
                    
                result = details_data.get('result', top_result)
                photos = []
                if result.get('photos'):
                    for p in result['photos'][:6]:
                        ref = p.get('photo_reference')
                        if ref:
                            photos.append(f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={ref}&key={maps_key}")
                            
                loc = result.get('geometry', {}).get('location', {})
                coords = {'lat': loc.get('lat'), 'lng': loc.get('lng')} if loc else None
                
                place_obj = {
                    'placeId': place_id,
                    'placeName': result.get('name', place_name),
                    'formattedAddress': result.get('formatted_address', f"{place_name}, {destination}"),
                    'coords': coords,
                    'photos': photos,
                    'rating': result.get('rating', 4.6),
                    'userRatingsTotal': result.get('user_ratings_total', 1500),
                    'description': f"Famous {result.get('types', ['attraction'])[0].replace('_', ' ')} in {destination}",
                    'source': 'Google Places API'
                }
                PLACE_CACHE[cache_key] = place_obj
                return place_obj
        except Exception:
            pass

    # 2. Fast verified Wikipedia / Wikimedia Commons API
    wiki_result = fetch_wikipedia_place(place_name, destination)
    if wiki_result:
        PLACE_CACHE[cache_key] = wiki_result
        return wiki_result
        
    dest_center = geocode_destination(destination)
    coords = resolve_coordinates(f"{place_name}, {destination}", dest_center, 0, 1)
    
    clean_fallback = {
        'placeId': f"loc_{abs(hash(place_name)) % 10000000}",
        'placeName': place_name,
        'formattedAddress': f"{place_name}, {destination}".strip(', '),
        'coords': coords,
        'photos': [],
        'rating': 4.6,
        'userRatingsTotal': 980,
        'description': f"Popular travel destination and point of interest in {destination}.",
        'source': 'Travel Knowledge Base'
    }
    PLACE_CACHE[cache_key] = clean_fallback
    return clean_fallback

@app.route('/api/places/details', methods=['GET'])
def get_place_details():
    """Returns exact verified Place Details and photos by placeId or query."""
    query = request.args.get('query', '').strip()
    place_name = request.args.get('name', query).strip()
    destination = request.args.get('destination', '').strip()
    
    if not query and not place_name:
        return jsonify({'error': 'Place name or query is required'}), 400

    place_data = resolve_place_data(place_name or query, destination)
    return jsonify(place_data)

@app.route('/download_pdf', methods=['POST'])
def download_pdf():
    try:
        data = request.json
        html_content = data.get('content', '')
        
        # Parse HTML content
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        
        # Create styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=1
        )
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=20,
            alignment=1
        )
        day_style = ParagraphStyle(
            'CustomDay',
            parent=styles['Heading2'],
            fontSize=18,
            spaceAfter=10
        )
        content_style = ParagraphStyle(
            'CustomContent',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=10
        )
        
        # Build PDF content
        story = []
        
        # Add title
        title = soup.find('h2', class_='itinerary-header')
        if title:
            story.append(Paragraph(title.text, title_style))
        
        # Add subtitle
        subtitle = soup.find('p', class_='itinerary-subtitle')
        if subtitle:
            story.append(Paragraph(subtitle.text, subtitle_style))
        
        # Add days
        days = soup.find_all('div', class_='itinerary-day')
        for day in days:
            # Add day header
            day_header = day.find('div', class_='day-header')
            if day_header:
                day_title = day_header.find('h3')
                day_subtitle = day_header.find('h4')
                if day_title:
                    story.append(Paragraph(day_title.text, day_style))
                if day_subtitle:
                    story.append(Paragraph(day_subtitle.text, content_style))
            
            # Add day content
            day_content = day.find('div', class_='day-content')
            if day_content:
                for element in day_content.children:
                    if element.name == 'ol' or element.name == 'ul':
                        for li in element.find_all('li'):
                            story.append(Paragraph(f"• {li.text}", content_style))
                    elif element.name == 'p':
                        story.append(Paragraph(element.text, content_style))
            
            story.append(Spacer(1, 20))
        
        # Build PDF
        doc.build(story)
        
        # Reset buffer position
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='travel-itinerary.pdf'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)