/**
 * AI Trip Planner & Interactive Map Explorer
 * Exact Place Photos, Day-wise Marker Isolation, Real Road Routing (OSRM & Google Directions),
 * Day Place Cards, and Full AI Synergy.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // State management
    const state = {
        destination: '',
        destinationCoords: { lat: 28.6139, lng: 77.2090 },
        stops: [],
        activeDay: '1', // Default to Day 1
        activePlaceId: null,
        activePlace: null,
        carouselPhotos: [],
        currentPhotoIndex: 0,
        mapEngine: 'leaflet',
        googleMap: null,
        leafletMap: null,
        markers: [],
        directionsRenderer: null,
        directionsService: null,
        routeLayer: null,
        apiKeyConfig: null,
        isChatbotMinimized: false
    };

    // DOM Elements
    const elements = {
        preferencesForm: document.getElementById('itineraryForm'),
        destinationInput: document.getElementById('destination'),
        startDateInput: document.getElementById('startDate'),
        endDateInput: document.getElementById('endDate'),
        durationInput: document.getElementById('duration'),
        submitButton: document.getElementById('generateBtn'),
        startPlanningBtn: document.getElementById('startPlanning'),
        quickChips: document.querySelectorAll('.quick-chip'),

        tripExplorerSection: document.getElementById('trip-explorer-section'),
        explorerDestTitle: document.getElementById('explorer-destination-title'),
        itineraryContent: document.getElementById('itinerary-content'),
        downloadPdfBtn: document.getElementById('downloadPdf'),
        planAnotherBtn: document.getElementById('planAnother'),
        tripGrid: document.getElementById('tripGrid'),
        viewToggleSplit: document.getElementById('viewToggleSplit'),
        viewToggleItinerary: document.getElementById('viewToggleItinerary'),
        viewToggleMap: document.getElementById('viewToggleMap'),

        mapContainer: document.getElementById('trip-map'),
        mapLoading: document.getElementById('map-loading-indicator'),
        mapPlaceSearch: document.getElementById('mapPlaceSearch'),
        clearMapSearch: document.getElementById('clearMapSearch'),
        mapDayFilters: document.getElementById('mapDayFilters'),
        toggleRouteBtn: document.getElementById('toggleRouteBtn'),
        fitMapBoundsBtn: document.getElementById('fitMapBoundsBtn'),

        dayPlaceCardsSection: document.getElementById('day-place-cards-section'),
        dayCardsTitle: document.getElementById('dayCardsTitle'),
        dayStopsCount: document.getElementById('dayStopsCount'),
        dayPlaceCards: document.getElementById('day-place-cards'),

        placeDetailsCard: document.getElementById('place-details-card'),
        closePlaceDetailsBtn: document.getElementById('closePlaceDetails'),
        placeCategory: document.getElementById('placeCategory'),
        placeName: document.getElementById('placeName'),
        placeRating: document.getElementById('placeRating'),
        placeOpenStatus: document.getElementById('placeOpenStatus'),
        placeDayTag: document.getElementById('placeDayTag'),
        placeAddress: document.getElementById('placeAddress'),
        placeActivity: document.getElementById('placeActivity'),
        copyAddressBtn: document.getElementById('copyAddressBtn'),
        getDirectionsBtn: document.getElementById('getDirectionsBtn'),
        askAiAboutPlaceBtn: document.getElementById('askAiAboutPlaceBtn'),
        carouselMainWrap: document.getElementById('carouselMainWrap'),
        carouselMainImg: document.getElementById('carouselMainImg'),
        noPhotosFallback: document.getElementById('noPhotosFallback'),
        carouselPrev: document.getElementById('carouselPrev'),
        carouselNext: document.getElementById('carouselNext'),
        carouselZoom: document.getElementById('carouselZoom'),
        carouselCounter: document.getElementById('carouselCounter'),
        carouselThumbnails: document.getElementById('carouselThumbnails'),

        imageLightbox: document.getElementById('imageLightbox'),
        lightboxImg: document.getElementById('lightboxImg'),
        closeLightbox: document.getElementById('closeLightbox'),
        lightboxCaption: document.getElementById('lightboxCaption'),

        chatbotContainer: document.getElementById('chatbot-container'),
        chatbotHeader: document.getElementById('chatbot-header'),
        toggleChatbotBtn: document.getElementById('toggleChatbot'),
        chatbotContent: document.getElementById('chatbot-content'),
        chatMessages: document.getElementById('chat-messages'),
        userMessageInput: document.getElementById('user-message'),
        sendMessageBtn: document.getElementById('send-message'),
        chatChips: document.querySelectorAll('.chat-chip'),
        navChatbotBtn: document.getElementById('navChatbotBtn')
    };

    // =========================================================================
    // 1. Initial Setup & Map Engine Initialization
    // =========================================================================
    setDefaultDates();
    await initializeMapEngine();

    function setDefaultDates() {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() + 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 3);

        if (elements.startDateInput && !elements.startDateInput.value) {
            elements.startDateInput.value = start.toISOString().split('T')[0];
        }
        if (elements.endDateInput && !elements.endDateInput.value) {
            elements.endDateInput.value = end.toISOString().split('T')[0];
        }
    }

    async function initializeMapEngine() {
        try {
            const res = await fetch('/api/config');
            state.apiKeyConfig = await res.json();

            if (state.apiKeyConfig.googleMapsApiKey) {
                await loadGoogleMapsScript(state.apiKeyConfig.googleMapsApiKey);
            } else {
                initLeafletMap([28.6139, 77.2090], 6);
            }
        } catch (e) {
            initLeafletMap([28.6139, 77.2090], 6);
        }
    }

    function loadGoogleMapsScript(apiKey) {
        return new Promise((resolve) => {
            if (window.google && window.google.maps) {
                initGoogleMap({ lat: 28.6139, lng: 77.2090 }, 6);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                initGoogleMap({ lat: 28.6139, lng: 77.2090 }, 6);
                setupGoogleAutocomplete();
                resolve();
            };
            script.onerror = () => {
                initLeafletMap([28.6139, 77.2090], 6);
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    function initGoogleMap(center, zoom) {
        state.mapEngine = 'google';
        if (!elements.mapContainer) return;

        state.googleMap = new google.maps.Map(elements.mapContainer, {
            center: center,
            zoom: zoom,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: false,
            zoomControl: true,
            styles: [
                { featureType: "poi", elementType: "labels", stylers: [{ visibility: "on" }] },
                { featureType: "water", stylers: [{ color: "#dbeafe" }] }
            ]
        });

        state.directionsService = new google.maps.DirectionsService();
        state.directionsRenderer = new google.maps.DirectionsRenderer({
            map: state.googleMap,
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#0284c7', strokeWeight: 5, strokeOpacity: 0.9 }
        });
    }

    function initLeafletMap(center, zoom) {
        state.mapEngine = 'leaflet';
        if (!elements.mapContainer || state.leafletMap) return;

        elements.mapContainer.innerHTML = '';
        state.leafletMap = L.map(elements.mapContainer, {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView(center, zoom);

        // High performance CartoDB Voyager tiles (crisp, beautiful, Google Maps-like)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
        }).addTo(state.leafletMap);
    }

    function ensureMapSize() {
        setTimeout(() => {
            if (state.mapEngine === 'leaflet' && state.leafletMap) {
                state.leafletMap.invalidateSize();
            } else if (state.mapEngine === 'google' && state.googleMap && window.google) {
                google.maps.event.trigger(state.googleMap, 'resize');
            }
        }, 80);
        setTimeout(() => {
            if (state.mapEngine === 'leaflet' && state.leafletMap) {
                state.leafletMap.invalidateSize();
            }
        }, 300);
    }

    window.addEventListener('resize', ensureMapSize);

    // =========================================================================
    // 2. Day-Wise Map & Strict Marker Isolation System
    // =========================================================================
    function updateMapWithStops(stops, destination, destinationCoords) {
        state.stops = stops || [];
        state.destination = destination;
        state.destinationCoords = destinationCoords || { lat: 28.6139, lng: 77.2090 };

        // Default to Day 1
        const availableDays = [...new Set(state.stops.map(s => String(s.day || 1)))];
        state.activeDay = availableDays.length > 0 ? availableDays[0] : '1';

        renderDayFilterChips(state.stops);
        ensureMapSize();
        selectDay(state.activeDay);
    }

    function renderDayFilterChips(stops) {
        if (!elements.mapDayFilters) return;

        const days = [...new Set(stops.map(s => s.day || 1))].sort((a, b) => a - b);
        let chipsHtml = `<button class="day-filter-chip ${state.activeDay === 'all' ? 'active' : ''}" data-day="all"><i class="fas fa-globe"></i> All Days</button>`;

        days.forEach(day => {
            chipsHtml += `<button class="day-filter-chip ${state.activeDay === String(day) ? 'active' : ''}" data-day="${day}"><i class="fas fa-calendar-day"></i> Day ${day}</button>`;
        });

        elements.mapDayFilters.innerHTML = chipsHtml;

        elements.mapDayFilters.querySelectorAll('.day-filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const targetDay = chip.dataset.day;
                selectDay(targetDay);
            });
        });
    }

    function selectDay(day) {
        state.activeDay = String(day);

        // Update day chips active state
        if (elements.mapDayFilters) {
            elements.mapDayFilters.querySelectorAll('.day-filter-chip').forEach(chip => {
                chip.classList.toggle('active', chip.dataset.day === state.activeDay);
            });
        }

        // 1. Strict Clear of all previous markers & routes
        clearAllMarkers();
        clearRoute();
        ensureMapSize();

        // 2. Filter stops strictly for the selected day (or all)
        const filteredStops = state.activeDay === 'all'
            ? state.stops
            : state.stops.filter(s => String(s.day) === state.activeDay);

        // 3. Render Day Place Cards list below map
        renderDayPlaceCards(filteredStops, state.activeDay);

        if (!filteredStops || filteredStops.length === 0) {
            if (state.destinationCoords) {
                panToCoordinates(state.destinationCoords.lat, state.destinationCoords.lng, 12);
            }
            return;
        }

        const latLngList = [];

        // 4. Render numbered markers strictly for the filtered stops
        filteredStops.forEach((stop, idx) => {
            const lat = stop.latitude || (stop.coords && stop.coords.lat) || state.destinationCoords.lat;
            const lng = stop.longitude || (stop.coords && stop.coords.lng) || state.destinationCoords.lng;
            
            // Label numbering: 1, 2, 3... for single day; D1-1, D2-1... for all days
            const labelNumber = state.activeDay === 'all' ? `D${stop.day}-${idx + 1}` : String(idx + 1);
            const markerColor = getDayColor(stop.day);

            latLngList.push([lat, lng]);

            if (state.mapEngine === 'google' && state.googleMap) {
                const marker = new google.maps.Marker({
                    position: { lat, lng },
                    map: state.googleMap,
                    title: `${stop.placeName} (Day ${stop.day})`,
                    label: {
                        text: labelNumber,
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: state.activeDay === 'all' ? '10px' : '13px'
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: state.activeDay === 'all' ? 18 : 16,
                        fillColor: markerColor,
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: '#ffffff'
                    }
                });

                marker.addListener('click', () => {
                    displayPlaceDetails(stop);
                    highlightActiveStop(stop.placeId || stop.placeName);
                });

                state.markers.push(marker);
            } else if (state.mapEngine === 'leaflet' && state.leafletMap) {
                const customIcon = L.divIcon({
                    className: 'custom-leaflet-marker',
                    html: `<div class="custom-map-marker" style="background:${markerColor};">${labelNumber}</div>`,
                    iconSize: state.activeDay === 'all' ? [40, 32] : [32, 32],
                    iconAnchor: state.activeDay === 'all' ? [20, 16] : [16, 16],
                    popupAnchor: [0, -16]
                });

                const marker = L.marker([lat, lng], { icon: customIcon }).addTo(state.leafletMap);
                
                const photoSnippet = stop.photos && stop.photos.length > 0 
                    ? `<img src="${stop.photos[0]}" style="width:100%; height:80px; object-fit:cover; border-radius:4px; margin-top:6px;" alt="${stop.placeName}">`
                    : '';

                marker.bindPopup(`
                    <div style="font-family:sans-serif; padding:4px; max-width:200px;">
                        <strong style="color:#0284c7; font-size:14px;">${stop.placeName}</strong>
                        <div style="font-size:12px; color:#475569; margin-top:2px;">${stop.activity || ''}</div>
                        <div style="font-size:11px; color:#f97316; font-weight:bold; margin-top:4px;">Day ${stop.day} • Stop ${labelNumber}</div>
                        ${photoSnippet}
                    </div>
                `);

                marker.on('click', () => {
                    displayPlaceDetails(stop);
                    highlightActiveStop(stop.placeId || stop.placeName);
                });

                state.markers.push(marker);
            }
        });

        // 5. Fit map bounds strictly to the active day's coordinates
        if (latLngList.length > 0) {
            if (state.mapEngine === 'google' && state.googleMap) {
                const bounds = new google.maps.LatLngBounds();
                latLngList.forEach(pt => bounds.extend(new google.maps.LatLng(pt[0], pt[1])));
                state.googleMap.fitBounds(bounds);
            } else if (state.mapEngine === 'leaflet' && state.leafletMap) {
                if (latLngList.length === 1) {
                    state.leafletMap.setView(latLngList[0], 14);
                } else {
                    state.leafletMap.fitBounds(latLngList, { padding: [45, 45], maxZoom: 15 });
                }
            }
        }

        // 6. Draw realistic road route
        if (elements.toggleRouteBtn?.classList.contains('active')) {
            drawRealRoadRoute(filteredStops);
        }

        // 7. Auto preview the 1st stop of the active day
        if (filteredStops.length > 0) {
            displayPlaceDetails(filteredStops[0]);
            highlightActiveStop(filteredStops[0].placeId || filteredStops[0].placeName);
        }
    }

    // =========================================================================
    // 3. Real Road Routing (Google Directions & OSRM API)
    // =========================================================================
    async function drawRealRoadRoute(stops) {
        clearRoute();
        if (!stops || stops.length < 2) return;

        // Route within the same day or day sequence
        const validCoords = stops.map(s => ({
            lat: s.latitude || (s.coords && s.coords.lat),
            lng: s.longitude || (s.coords && s.coords.lng)
        })).filter(c => c.lat && c.lng);

        if (validCoords.length < 2) return;

        // 1. If Google Maps is active and has directionsService
        if (state.mapEngine === 'google' && state.directionsService && state.directionsRenderer) {
            const origin = validCoords[0];
            const destination = validCoords[validCoords.length - 1];
            const waypoints = validCoords.slice(1, -1).map(c => ({
                location: new google.maps.LatLng(c.lat, c.lng),
                stopover: true
            }));

            state.directionsService.route({
                origin: new google.maps.LatLng(origin.lat, origin.lng),
                destination: new google.maps.LatLng(destination.lat, destination.lng),
                waypoints: waypoints,
                travelMode: google.maps.TravelMode.DRIVING
            }, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    state.directionsRenderer.setDirections(result);
                } else {
                    drawOsrmRoadRoute(validCoords);
                }
            });
        } else {
            // 2. Leaflet Engine: Use OSRM for true road-following geometry
            drawOsrmRoadRoute(validCoords);
        }
    }

    async function drawOsrmRoadRoute(coordsList) {
        try {
            // Format: {lng1},{lat1};{lng2},{lat2};{lng3},{lat3}
            const queryPoints = coordsList.map(c => `${c.lng},${c.lat}`).join(';');
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${queryPoints}?overview=full&geometries=geojson`;

            const res = await fetch(osrmUrl);
            const data = await res.json();

            if (data.routes && data.routes.length > 0 && state.leafletMap) {
                const routeGeoJson = data.routes[0].geometry;
                
                // Leaflet GeoJSON expects [lat, lng], OSRM returns [lng, lat]
                const latLngCoordinates = routeGeoJson.coordinates.map(c => [c[1], c[0]]);

                state.routeLayer = L.polyline(latLngCoordinates, {
                    color: '#0284c7',
                    weight: 5,
                    opacity: 0.85,
                    lineJoin: 'round'
                }).addTo(state.leafletMap);
            } else {
                drawSimplePolyline(coordsList);
            }
        } catch (err) {
            console.warn('OSRM routing fallback to direct line:', err);
            drawSimplePolyline(coordsList);
        }
    }

    function drawSimplePolyline(coordsList) {
        if (state.mapEngine === 'leaflet' && state.leafletMap) {
            const points = coordsList.map(c => [c.lat, c.lng]);
            state.routeLayer = L.polyline(points, {
                color: '#0284c7',
                weight: 4,
                opacity: 0.8,
                dashArray: '6, 8'
            }).addTo(state.leafletMap);
        }
    }

    function clearRoute() {
        if (state.directionsRenderer) {
            state.directionsRenderer.set('directions', null);
        }
        if (state.routeLayer && state.leafletMap) {
            state.leafletMap.removeLayer(state.routeLayer);
            state.routeLayer = null;
        }
    }

    function clearAllMarkers() {
        if (state.mapEngine === 'google') {
            state.markers.forEach(m => m.setMap(null));
        } else if (state.mapEngine === 'leaflet' && state.leafletMap) {
            state.markers.forEach(m => state.leafletMap.removeLayer(m));
        }
        state.markers = [];
    }

    function panToCoordinates(lat, lng, zoom = 14) {
        ensureMapSize();
        if (state.mapEngine === 'google' && state.googleMap) {
            state.googleMap.panTo({ lat, lng });
            state.googleMap.setZoom(zoom);
        } else if (state.mapEngine === 'leaflet' && state.leafletMap) {
            state.leafletMap.setView([lat, lng], zoom, { animate: true });
        }
    }

    function getDayColor(day) {
        const colors = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
        return colors[(Number(day || 1) - 1) % colors.length] || '#0284c7';
    }

    // =========================================================================
    // 4. Day Place Cards Rendering (Below Map)
    // =========================================================================
    function renderDayPlaceCards(stops, activeDay) {
        if (!elements.dayPlaceCards) return;

        if (elements.dayCardsTitle) {
            elements.dayCardsTitle.innerHTML = activeDay === 'all' 
                ? `<i class="fas fa-globe"></i> All Planned Stops & Attractions` 
                : `<i class="fas fa-location-arrow"></i> Day ${activeDay} Stops & Landmarks`;
        }

        if (elements.dayStopsCount) {
            elements.dayStopsCount.textContent = `${stops.length} Places`;
        }

        if (!stops || stops.length === 0) {
            elements.dayPlaceCards.innerHTML = `<div style="padding:1rem; color:var(--text-muted); font-size:0.88rem;">No locations planned for this selection.</div>`;
            return;
        }

        elements.dayPlaceCards.innerHTML = stops.map((stop, idx) => {
            const hasPhoto = stop.photos && stop.photos.length > 0;
            const thumbHtml = hasPhoto 
                ? `<img src="${stop.photos[0]}" class="day-place-card-thumb" alt="${stop.placeName}">`
                : `<div class="day-place-card-no-thumb"><i class="fas fa-map-pin"></i></div>`;

            const badgeText = activeDay === 'all' ? `D${stop.day}-${idx + 1}` : String(idx + 1);

            return `
                <div class="day-place-card" data-place-id="${stop.placeId || ''}" data-place-name="${stop.placeName}">
                    <div class="day-place-card-thumb-wrap">
                        ${thumbHtml}
                        <div class="day-place-card-badge" style="background:${getDayColor(stop.day)}">${badgeText}</div>
                    </div>
                    <div class="day-place-card-info">
                        <div class="day-place-card-title">${stop.placeName}</div>
                        <div class="day-place-card-address">${stop.formattedAddress || stop.activity || 'Destination landmark'}</div>
                        <div class="day-place-card-meta">
                            <span class="day-place-card-rating"><i class="fas fa-star"></i> ${stop.rating || '4.7'}</span>
                            <span style="color:var(--text-muted); font-size:0.75rem;">• ${stop.category || 'Sightseeing'}</span>
                        </div>
                    </div>
                    <button type="button" class="day-place-card-btn" data-place-name="${stop.placeName}">
                        <i class="fas fa-map-pin"></i> View
                    </button>
                </div>
            `;
        }).join('');

        // Card clicks
        elements.dayPlaceCards.querySelectorAll('.day-place-card').forEach((card, idx) => {
            card.addEventListener('click', () => {
                const stop = stops[idx];
                displayPlaceDetails(stop);
                highlightActiveStop(stop.placeId || stop.placeName);
                
                const lat = stop.latitude || (stop.coords && stop.coords.lat);
                const lng = stop.longitude || (stop.coords && stop.coords.lng);
                if (lat && lng) {
                    panToCoordinates(lat, lng, 15);
                }
            });
        });
    }

    // =========================================================================
    // 5. Place Details & Photo Carousel (Exact Place Photos Only)
    // =========================================================================
    function displayPlaceDetails(stop) {
        if (!elements.placeDetailsCard) return;

        state.activePlace = stop;
        state.activePlaceId = stop.placeId;

        elements.placeDetailsCard.classList.remove('hidden');
        elements.placeName.textContent = stop.placeName;
        elements.placeCategory.innerHTML = `<i class="fas fa-map-pin"></i> <span>${stop.category || 'Destination Landmark'}</span>`;
        elements.placeActivity.textContent = stop.activity || stop.description || 'Recommended attraction from your itinerary.';
        elements.placeAddress.textContent = stop.formattedAddress || `${stop.placeName}, ${state.destination}`;
        elements.placeRating.innerHTML = `<i class="fas fa-star"></i> <strong>${stop.rating || '4.7'}</strong> (${(stop.userRatingsTotal || 1500).toLocaleString()})`;

        if (stop.day) {
            elements.placeDayTag.classList.remove('hidden');
            elements.placeDayTag.innerHTML = `<i class="fas fa-calendar-day"></i> Day ${stop.day} Stop`;
        } else {
            elements.placeDayTag.classList.add('hidden');
        }

        // Photos handling: strictly use verified photos, else show clean No Photos state
        const photos = stop.photos || [];
        state.carouselPhotos = photos;
        state.currentPhotoIndex = 0;

        if (photos.length > 0) {
            elements.carouselMainWrap.classList.remove('hidden');
            elements.carouselThumbnails.classList.remove('hidden');
            elements.noPhotosFallback.classList.add('hidden');
            updateCarouselPhoto();
            renderCarouselThumbnails();
        } else {
            // Clean state - no fake/generic photos from other destinations
            elements.carouselMainWrap.classList.add('hidden');
            elements.carouselThumbnails.classList.add('hidden');
            elements.noPhotosFallback.classList.remove('hidden');
        }
    }

    function updateCarouselPhoto() {
        if (!elements.carouselMainImg || state.carouselPhotos.length === 0) return;
        const currentUrl = state.carouselPhotos[state.currentPhotoIndex];
        elements.carouselMainImg.src = currentUrl;
        elements.carouselCounter.textContent = `${state.currentPhotoIndex + 1} / ${state.carouselPhotos.length}`;

        document.querySelectorAll('.carousel-thumb').forEach((thumb, idx) => {
            thumb.classList.toggle('active', idx === state.currentPhotoIndex);
        });
    }

    function renderCarouselThumbnails() {
        if (!elements.carouselThumbnails) return;
        elements.carouselThumbnails.innerHTML = state.carouselPhotos.map((url, idx) => `
            <img src="${url}" class="carousel-thumb ${idx === 0 ? 'active' : ''}" data-index="${idx}" alt="Thumbnail ${idx + 1}">
        `).join('');

        elements.carouselThumbnails.querySelectorAll('.carousel-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                state.currentPhotoIndex = parseInt(thumb.dataset.index);
                updateCarouselPhoto();
            });
        });
    }

    elements.carouselPrev?.addEventListener('click', () => {
        if (state.carouselPhotos.length === 0) return;
        state.currentPhotoIndex = (state.currentPhotoIndex - 1 + state.carouselPhotos.length) % state.carouselPhotos.length;
        updateCarouselPhoto();
    });

    elements.carouselNext?.addEventListener('click', () => {
        if (state.carouselPhotos.length === 0) return;
        state.currentPhotoIndex = (state.currentPhotoIndex + 1) % state.carouselPhotos.length;
        updateCarouselPhoto();
    });

    elements.carouselZoom?.addEventListener('click', () => {
        if (state.carouselPhotos.length > 0) {
            elements.lightboxImg.src = state.carouselPhotos[state.currentPhotoIndex];
            elements.lightboxCaption.textContent = elements.placeName.textContent;
            elements.imageLightbox.classList.remove('hidden');
        }
    });

    elements.closeLightbox?.addEventListener('click', () => {
        elements.imageLightbox.classList.add('hidden');
    });

    elements.closePlaceDetailsBtn?.addEventListener('click', () => {
        elements.placeDetailsCard.classList.add('hidden');
    });

    elements.copyAddressBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText(elements.placeAddress.textContent);
        const originalIcon = elements.copyAddressBtn.innerHTML;
        elements.copyAddressBtn.innerHTML = '<i class="fas fa-check" style="color:#10b981;"></i>';
        setTimeout(() => elements.copyAddressBtn.innerHTML = originalIcon, 2000);
    });

    elements.getDirectionsBtn?.addEventListener('click', () => {
        const query = elements.placeName.textContent + ', ' + state.destination;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`, '_blank');
    });

    elements.askAiAboutPlaceBtn?.addEventListener('click', () => {
        const place = elements.placeName.textContent;
        openChatbot();
        sendChatMessage(`Tell me more about ${place} in ${state.destination}. What are the best things to do, tips, and nearby spots?`);
    });

    function highlightActiveStop(identifier) {
        // Highlight in Day Place Cards
        document.querySelectorAll('.day-place-card').forEach(card => {
            const match = card.dataset.placeId === identifier || card.dataset.placeName?.toLowerCase() === identifier?.toLowerCase();
            card.classList.toggle('active', match);
        });

        // Highlight in Itinerary Place Chips
        document.querySelectorAll('.itinerary-place-chip').forEach(chip => {
            const match = chip.dataset.place?.toLowerCase() === identifier?.toLowerCase();
            chip.classList.toggle('active', match);
        });
    }

    // =========================================================================
    // 6. Map Search
    // =========================================================================
    elements.mapPlaceSearch?.addEventListener('input', () => {
        elements.clearMapSearch?.classList.toggle('hidden', !elements.mapPlaceSearch.value);
    });

    elements.clearMapSearch?.addEventListener('click', () => {
        elements.mapPlaceSearch.value = '';
        elements.clearMapSearch.classList.add('hidden');
    });

    elements.mapPlaceSearch?.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const query = elements.mapPlaceSearch.value.trim();
            if (!query) return;

            try {
                const res = await fetch(`/api/places/details?query=${encodeURIComponent(query)}&name=${encodeURIComponent(query)}&destination=${encodeURIComponent(state.destination)}`);
                const details = await res.json();
                
                const lat = details.coords?.lat || (details.geometry?.location?.lat);
                const lng = details.coords?.lng || (details.geometry?.location?.lng);
                
                if (lat && lng) {
                    panToCoordinates(lat, lng, 15);
                }

                displayPlaceDetails(details);
            } catch (err) {
                console.error(err);
            }
        }
    });

    // =========================================================================
    // 7. Itinerary Rendering & Interactive Badges
    // =========================================================================
    function formatAndDisplayItinerary(itineraryText, destination) {
        const formattedHtml = formatItineraryWithInteractiveChips(itineraryText, destination);

        elements.itineraryContent.innerHTML = `
            <div class="itinerary-content">
                ${formattedHtml}
            </div>
        `;

        elements.explorerDestTitle.textContent = `Your Travel Itinerary: ${destination}`;
        elements.tripExplorerSection.classList.remove('hidden');
        ensureMapSize();
        elements.tripExplorerSection.scrollIntoView({ behavior: 'smooth' });

        // Bind Itinerary Place Chips
        document.querySelectorAll('.itinerary-place-chip').forEach(chip => {
            chip.addEventListener('click', async (e) => {
                e.preventDefault();
                const place = chip.dataset.place;

                // Find matching stop in state.stops
                let matchedStop = state.stops.find(s => s.placeName.toLowerCase().includes(place.toLowerCase()) || place.toLowerCase().includes(s.placeName.toLowerCase()));

                if (matchedStop) {
                    // Switch map to that stop's day
                    if (String(matchedStop.day) !== state.activeDay && state.activeDay !== 'all') {
                        selectDay(matchedStop.day);
                    }
                    displayPlaceDetails(matchedStop);
                    highlightActiveStop(matchedStop.placeId || matchedStop.placeName);
                    
                    const lat = matchedStop.latitude || (matchedStop.coords && matchedStop.coords.lat);
                    const lng = matchedStop.longitude || (matchedStop.coords && matchedStop.coords.lng);
                    if (lat && lng) panToCoordinates(lat, lng, 15);
                } else {
                    // Fetch place details dynamically
                    try {
                        const res = await fetch(`/api/places/details?query=${encodeURIComponent(place)}&name=${encodeURIComponent(place)}&destination=${encodeURIComponent(destination)}`);
                        const fetched = await res.json();
                        displayPlaceDetails(fetched);
                        highlightActiveStop(place);
                        if (fetched.coords) panToCoordinates(fetched.coords.lat, fetched.coords.lng, 15);
                    } catch (err) {
                        console.error(err);
                    }
                }
            });
        });

        // Bind Itinerary Day Headers to filter map
        document.querySelectorAll('.itinerary-day-header-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const day = btn.dataset.day;
                selectDay(day);
                document.getElementById('trip-map-section').scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    function formatItineraryWithInteractiveChips(text, destination) {
        let formatted = text
            .replace(/### (.*?)\n/g, '<h4>$1</h4>')
            .replace(/## (.*?)\n/g, '<h3>$1</h3>')
            .replace(/# (.*?)\n/g, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, (match, p1) => {
                const clean = p1.trim();
                if (clean.length > 2 && !isGenericHeader(clean)) {
                    return `<button type="button" class="itinerary-place-chip" data-place="${clean}" data-query="${clean}, ${destination}"><i class="fas fa-map-pin"></i> ${clean}</button>`;
                }
                return `<strong>${p1}</strong>`;
            })
            .replace(/\n\s*[-*]\s+(.*)/g, '<li>$1</li>')
            .replace(/\n\s*\d+\.\s+(.*)/g, '<li>$1</li>');

        const daySplits = formatted.split(/(?=Day \d+)/i);
        if (daySplits.length > 1) {
            return daySplits.map((dayBlock, idx) => {
                if (!dayBlock.trim()) return '';
                const headerMatch = dayBlock.match(/Day (\d+)[^<\n]*/i);
                const dayNum = headerMatch ? headerMatch[1] : String(idx);
                const title = headerMatch ? headerMatch[0] : `Day ${idx}`;
                const body = dayBlock.replace(title, '');
                return `
                    <div class="itinerary-day" id="itinerary-day-${dayNum}">
                        <div class="day-header">
                            <h3><i class="fas fa-calendar-day"></i> ${title}</h3>
                            <button type="button" class="itinerary-day-header-btn" data-day="${dayNum}" title="Show Day ${dayNum} on Map">
                                <i class="fas fa-map-marked-alt"></i> Show Day ${dayNum} Map
                            </button>
                        </div>
                        <div class="day-content">
                            ${body}
                        </div>
                    </div>
                `;
            }).join('');
        }

        return `<div class="itinerary-day"><div class="day-content">${formatted}</div></div>`;
    }

    function isGenericHeader(text) {
        const lower = text.toLowerCase();
        return ['morning', 'afternoon', 'evening', 'night', 'daily tips', 'day ', 'transportation', 'weather', 'costs', 'breakfast', 'lunch', 'dinner', 'budget', 'pace'].some(k => lower.includes(k));
    }

    // =========================================================================
    // 8. View Controls & UI Handlers
    // =========================================================================
    elements.viewToggleSplit?.addEventListener('click', () => setViewMode('split'));
    elements.viewToggleItinerary?.addEventListener('click', () => setViewMode('itinerary'));
    elements.viewToggleMap?.addEventListener('click', () => setViewMode('map'));

    function setViewMode(mode) {
        elements.viewToggleSplit.classList.toggle('active', mode === 'split');
        elements.viewToggleItinerary.classList.toggle('active', mode === 'itinerary');
        elements.viewToggleMap.classList.toggle('active', mode === 'map');

        elements.tripGrid.classList.remove('view-itinerary-only', 'view-map-only');
        if (mode === 'itinerary') elements.tripGrid.classList.add('view-itinerary-only');
        if (mode === 'map') elements.tripGrid.classList.add('view-map-only');

        ensureMapSize();
    }

    elements.fitMapBoundsBtn?.addEventListener('click', () => {
        selectDay(state.activeDay);
    });

    elements.toggleRouteBtn?.addEventListener('click', () => {
        elements.toggleRouteBtn.classList.toggle('active');
        const isActive = elements.toggleRouteBtn.classList.contains('active');
        if (!isActive) {
            clearRoute();
        } else {
            selectDay(state.activeDay);
        }
    });

    elements.quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            elements.destinationInput.value = chip.dataset.dest;
            elements.preferencesForm.scrollIntoView({ behavior: 'smooth' });
            elements.destinationInput.focus();
        });
    });

    elements.startPlanningBtn?.addEventListener('click', () => {
        elements.preferencesForm.scrollIntoView({ behavior: 'smooth' });
    });

    elements.planAnotherBtn?.addEventListener('click', () => {
        elements.preferencesForm.scrollIntoView({ behavior: 'smooth' });
        elements.destinationInput.focus();
    });

    elements.downloadPdfBtn?.addEventListener('click', async () => {
        try {
            elements.downloadPdfBtn.disabled = true;
            elements.downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';

            const response = await fetch('/download_pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: elements.itineraryContent.innerHTML })
            });

            if (!response.ok) throw new Error('PDF Generation failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Trip-Itinerary-${state.destination || 'TravelPlan'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            elements.downloadPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF';
            elements.downloadPdfBtn.disabled = false;
        } catch (err) {
            console.error('Error downloading PDF:', err);
            elements.downloadPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF';
            elements.downloadPdfBtn.disabled = false;
            alert('Failed to generate PDF. Please try again.');
        }
    });

    // =========================================================================
    // 9. Form Submission (Generate AI Itinerary & Map)
    // =========================================================================
    elements.preferencesForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            destination: elements.destinationInput.value.trim(),
            startDate: elements.startDateInput.value,
            endDate: elements.endDateInput.value,
            duration: elements.durationInput.value,
            interests: Array.from(document.querySelectorAll('input[name="interests"]:checked')).map(cb => cb.value),
            budget: document.getElementById('budget').value,
            pace: document.querySelector('input[name="pace"]:checked')?.value || 'balanced',
            specialConsiderations: document.getElementById('specialConsiderations').value
        };

        if (!formData.destination) {
            alert('Please enter a destination.');
            return;
        }

        elements.submitButton.disabled = true;
        elements.submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Itinerary & Mapping Stops...';

        try {
            const res = await fetch('/generate_itinerary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || data.error) {
                throw new Error(data.error || 'Failed to generate itinerary. Please try again.');
            }

            // Display formatted itinerary & update interactive map
            formatAndDisplayItinerary(data.itinerary, formData.destination);
            updateMapWithStops(data.stops || [], formData.destination, data.destinationCoords);

        } catch (error) {
            console.error('Itinerary error:', error);
            const errDiv = document.createElement('div');
            errDiv.className = 'error-message';
            errDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${error.message}`;
            elements.preferencesForm.appendChild(errDiv);
            setTimeout(() => errDiv.remove(), 7000);
        } finally {
            elements.submitButton.disabled = false;
            elements.submitButton.innerHTML = '<i class="fas fa-magic"></i> <span>Generate AI Itinerary & Map</span>';
        }
    });

    // =========================================================================
    // 10. AI Chatbot Assistant
    // =========================================================================
    elements.chatbotHeader?.addEventListener('click', toggleChatbot);
    elements.navChatbotBtn?.addEventListener('click', openChatbot);

    function toggleChatbot() {
        state.isChatbotMinimized = !state.isChatbotMinimized;
        elements.chatbotContainer.classList.toggle('minimized', state.isChatbotMinimized);
        elements.chatbotContent.classList.toggle('hidden', state.isChatbotMinimized);
    }

    function openChatbot() {
        state.isChatbotMinimized = false;
        elements.chatbotContainer.classList.remove('minimized');
        elements.chatbotContent.classList.remove('hidden');
        elements.userMessageInput.focus();
    }

    elements.sendMessageBtn?.addEventListener('click', () => sendChatMessage());
    elements.userMessageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    elements.chatChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt;
            sendChatMessage(prompt);
        });
    });

    async function sendChatMessage(customText) {
        const text = customText || elements.userMessageInput.value.trim();
        if (!text) return;

        if (!customText) elements.userMessageInput.value = '';

        appendChatMessage('user', text);

        const loadingId = 'loading-' + Date.now();
        appendChatMessage('assistant', '<i class="fas fa-circle-notch fa-spin"></i> Thinking...', loadingId);

        try {
            const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    destination: state.destination || elements.destinationInput.value
                })
            });

            const data = await res.json();
            const loadingBubble = document.getElementById(loadingId);
            if (loadingBubble) loadingBubble.remove();

            if (data.error) {
                appendChatMessage('assistant', `⚠️ ${data.error}`);
            } else {
                appendFormattedChatResponse(data.response);
            }
        } catch (err) {
            const loadingBubble = document.getElementById(loadingId);
            if (loadingBubble) loadingBubble.remove();
            appendChatMessage('assistant', '⚠️ Could not connect to travel assistant.');
        }
    }

    function appendChatMessage(sender, html, id = '') {
        const msg = document.createElement('div');
        msg.className = `chat-message ${sender}`;
        if (id) msg.id = id;

        const icon = sender === 'assistant' ? '<i class="fas fa-robot msg-icon"></i>' : '<i class="fas fa-user msg-icon"></i>';
        msg.innerHTML = `${icon}<div class="msg-bubble">${html}</div>`;

        elements.chatMessages.appendChild(msg);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    function appendFormattedChatResponse(rawText) {
        let formatted = rawText
            .replace(/\[place:\s*([^\]]+)\]/gi, (match, placeName) => {
                const clean = placeName.trim();
                return `<strong>${clean}</strong> <button type="button" class="chat-place-btn" data-place="${clean}"><i class="fas fa-map-pin"></i> View on Map</button>`;
            })
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\s*[-*]\s+(.*)/g, '<li>$1</li>')
            .replace(/\n/g, '<br>');

        appendChatMessage('assistant', formatted);

        elements.chatMessages.querySelectorAll('.chat-place-btn').forEach(btn => {
            btn.onclick = async () => {
                const place = btn.dataset.place;
                elements.tripExplorerSection.classList.remove('hidden');
                document.getElementById('trip-map-section').scrollIntoView({ behavior: 'smooth' });

                const matchedStop = state.stops.find(s => s.placeName.toLowerCase().includes(place.toLowerCase()));
                if (matchedStop) {
                    if (String(matchedStop.day) !== state.activeDay && state.activeDay !== 'all') {
                        selectDay(matchedStop.day);
                    }
                    displayPlaceDetails(matchedStop);
                    highlightActiveStop(matchedStop.placeId || matchedStop.placeName);
                    const lat = matchedStop.latitude || (matchedStop.coords && matchedStop.coords.lat);
                    const lng = matchedStop.longitude || (matchedStop.coords && matchedStop.coords.lng);
                    if (lat && lng) panToCoordinates(lat, lng, 15);
                } else {
                    try {
                        const res = await fetch(`/api/places/details?query=${encodeURIComponent(place)}&name=${encodeURIComponent(place)}&destination=${encodeURIComponent(state.destination)}`);
                        const fetched = await res.json();
                        displayPlaceDetails(fetched);
                        highlightActiveStop(place);
                        if (fetched.coords) panToCoordinates(fetched.coords.lat, fetched.coords.lng, 15);
                    } catch (err) {
                        console.error(err);
                    }
                }
            };
        });
    }
});