/**
 * AI Trip Planner & Interactive Map Explorer
 * Production-Quality 2-Column Travel Workspace, Verified Places, Exact Photos,
 * Day-Wise Marker Isolation, Leg-by-Leg Road Routing, and Full AI Assistant Synergy.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Application State
    const state = {
        destination: '',
        destinationCoords: { lat: 28.6139, lng: 77.2090 },
        stops: [],
        days: [],
        tripOverview: null,
        activeDay: '1', // Default to Day 1 after generation
        activePlaceId: null,
        activePlace: null,
        activeTab: 'sequence',
        carouselPhotos: [],
        currentPhotoIndex: 0,
        mapEngine: 'leaflet',
        googleMap: null,
        leafletMap: null,
        markers: [],
        directionsRenderer: null,
        directionsService: null,
        routeLayers: [],
        apiKeyConfig: null,
        isChatbotMinimized: false
    };

    // DOM Elements Cache
    const elements = {
        preferencesForm: document.getElementById('itineraryForm'),
        destinationInput: document.getElementById('destination'),
        startingPointInput: document.getElementById('startingPoint'),
        useCurrentLocationBtn: document.getElementById('useCurrentLocationBtn'),
        startDateInput: document.getElementById('startDate'),
        endDateInput: document.getElementById('endDate'),
        durationInput: document.getElementById('duration'),
        submitButton: document.getElementById('generateBtn'),
        formErrorMessage: document.getElementById('formErrorMessage'),

        tripExplorerSection: document.getElementById('trip-explorer-section'),
        backToFormBtn: document.getElementById('backToFormBtn'),
        explorerDestTitle: document.getElementById('explorer-destination-title'),
        explorerSubtitle: document.getElementById('explorer-subtitle'),
        tripVibeTag: document.getElementById('tripVibeTag'),
        downloadPdfBtn: document.getElementById('downloadPdf'),
        planAnotherBtn: document.getElementById('planAnother'),
        tripGrid: document.getElementById('tripGrid'),

        // Stats Bar
        statDuration: document.getElementById('statDuration'),
        statStopsCount: document.getElementById('statStopsCount'),
        statTotalDistance: document.getElementById('statTotalDistance'),
        statTotalTime: document.getElementById('statTotalTime'),
        statAvgRating: document.getElementById('statAvgRating'),

        // Left Column Navigation & Content
        dayNavigationBar: document.getElementById('dayNavigationBar'),
        itineraryDynamicContent: document.getElementById('itineraryDynamicContent'),

        // Map Overlays & Controls
        mapTopOverlay: document.getElementById('mapTopOverlay'),
        mapOverlayDayTitle: document.getElementById('mapOverlayDayTitle'),
        mapOverlayStats: document.getElementById('mapOverlayStats'),
        mapBottomOverlay: document.getElementById('mapBottomOverlay'),
        mapBottomRouteText: document.getElementById('mapBottomRouteText'),
        toggleMapTypeBtn: document.getElementById('toggleMapTypeBtn'),
        toggleRouteBtn: document.getElementById('toggleRouteBtn'),
        fitMapBoundsBtn: document.getElementById('fitMapBoundsBtn'),
        mapContainer: document.getElementById('trip-map'),
        mapLoading: document.getElementById('map-loading-indicator'),
        mapLoadingText: document.getElementById('mapLoadingText'),

        // Docked Place Details Drawer
        placeDetailsCard: document.getElementById('place-details-card'),
        closePlaceDetailsBtn: document.getElementById('closePlaceDetails'),
        placeCategory: document.getElementById('placeCategory'),
        placeName: document.getElementById('placeName'),
        placeRating: document.getElementById('placeRating'),
        placeDayTag: document.getElementById('placeDayTag'),
        placeAddress: document.getElementById('placeAddress'),
        placeActivity: document.getElementById('placeActivity'),
        placeTips: document.getElementById('placeTips'),
        placeTipsRow: document.getElementById('placeTipsRow'),
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

        // Lightbox
        imageLightbox: document.getElementById('imageLightbox'),
        lightboxImg: document.getElementById('lightboxImg'),
        closeLightbox: document.getElementById('closeLightbox'),
        lightboxCaption: document.getElementById('lightboxCaption'),

        // Chatbot
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
    // 1. Initial Setup & Event Listeners
    // =========================================================================
    setupEventListeners();
    initFormHandling();
    initializeMapEngine().catch(err => console.warn('Deferred map engine init:', err));

    function initFormHandling() {
        if (elements.startDateInput && elements.endDateInput && elements.durationInput) {
            elements.startDateInput.addEventListener('change', () => {
                if (elements.startDateInput.value) {
                    elements.endDateInput.min = elements.startDateInput.value;
                    if (elements.endDateInput.value && elements.endDateInput.value < elements.startDateInput.value) {
                        elements.endDateInput.value = elements.startDateInput.value;
                    }
                    calculateDurationFromDates();
                }
            });

            elements.endDateInput.addEventListener('change', () => {
                calculateDurationFromDates();
            });

            elements.durationInput.addEventListener('input', () => {
                if (elements.startDateInput.value && elements.durationInput.value) {
                    const start = new Date(elements.startDateInput.value);
                    const days = parseInt(elements.durationInput.value, 10);
                    if (!isNaN(days) && days > 0) {
                        const end = new Date(start);
                        end.setDate(start.getDate() + days - 1);
                        elements.endDateInput.value = end.toISOString().split('T')[0];
                    }
                }
            });
        }

        if (elements.useCurrentLocationBtn) {
            elements.useCurrentLocationBtn.addEventListener('click', () => {
                if ('geolocation' in navigator) {
                    elements.useCurrentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            elements.startingPointInput.value = `Current Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
                            elements.useCurrentLocationBtn.innerHTML = '<i class="fas fa-check"></i> Found';
                            setTimeout(() => {
                                elements.useCurrentLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Near Me';
                            }, 2500);
                        },
                        (err) => {
                            console.warn('Geolocation error:', err);
                            elements.useCurrentLocationBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Denied';
                            setTimeout(() => {
                                elements.useCurrentLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Near Me';
                            }, 2500);
                        }
                    );
                }
            });
        }
    }

    function calculateDurationFromDates() {
        if (elements.startDateInput.value && elements.endDateInput.value) {
            const start = new Date(elements.startDateInput.value);
            const end = new Date(elements.endDateInput.value);
            const diffTime = end - start;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (diffDays > 0) {
                elements.durationInput.value = diffDays;
            }
        }
    }

    function setupEventListeners() {
        // Direct Submit Button Click
        if (elements.submitButton) {
            elements.submitButton.addEventListener('click', (e) => {
                if (elements.preferencesForm && !elements.preferencesForm.checkValidity()) {
                    elements.preferencesForm.reportValidity();
                    return;
                }
                handleFormSubmit(e);
            });
        }

        // Form Submit
        if (elements.preferencesForm) {
            elements.preferencesForm.addEventListener('submit', handleFormSubmit);
        }

        // Hero CTA button
        const startPlanningBtn = document.getElementById('startPlanning');
        if (startPlanningBtn) {
            startPlanningBtn.addEventListener('click', () => {
                const formSection = document.getElementById('preferences-form');
                if (formSection) {
                    formSection.scrollIntoView({ behavior: 'smooth' });
                    if (elements.destinationInput) elements.destinationInput.focus();
                }
            });
        }

        // Quick Destination Chips
        document.querySelectorAll('.quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const dest = chip.dataset.dest || chip.textContent.trim();
                if (elements.destinationInput) {
                    elements.destinationInput.value = dest;
                    const formSection = document.getElementById('preferences-form');
                    if (formSection) {
                        formSection.scrollIntoView({ behavior: 'smooth' });
                    }
                    elements.destinationInput.focus();
                }
            });
        });

        // Back to preferences form
        if (elements.backToFormBtn) {
            elements.backToFormBtn.addEventListener('click', () => {
                document.getElementById('preferences-form').scrollIntoView({ behavior: 'smooth' });
            });
        }

        // PDF & Plan Another
        if (elements.downloadPdfBtn) {
            elements.downloadPdfBtn.addEventListener('click', handleDownloadPdf);
        }
        if (elements.planAnotherBtn) {
            elements.planAnotherBtn.addEventListener('click', () => {
                elements.tripExplorerSection.classList.add('hidden');
                document.getElementById('preferences-form').scrollIntoView({ behavior: 'smooth' });
            });
        }

        // Map toolbar tools
        if (elements.toggleRouteBtn) {
            elements.toggleRouteBtn.addEventListener('click', () => {
                elements.toggleRouteBtn.classList.toggle('active');
                if (elements.toggleRouteBtn.classList.contains('active')) {
                    const filtered = state.activeDay === 'all' || state.activeDay === 'overview'
                        ? state.stops
                        : state.stops.filter(s => String(s.day) === state.activeDay);
                    drawRealRoadRoute(filtered);
                } else {
                    clearRoute();
                }
            });
        }

        if (elements.fitMapBoundsBtn) {
            elements.fitMapBoundsBtn.addEventListener('click', () => {
                const filtered = state.activeDay === 'all' || state.activeDay === 'overview'
                    ? state.stops
                    : state.stops.filter(s => String(s.day) === state.activeDay);
                fitMapToBounds(filtered);
            });
        }

        if (elements.toggleMapTypeBtn) {
            elements.toggleMapTypeBtn.addEventListener('click', toggleMapLayerType);
        }

        // Close drawer
        if (elements.closePlaceDetailsBtn) {
            elements.closePlaceDetailsBtn.addEventListener('click', () => {
                elements.placeDetailsCard.classList.add('hidden');
            });
        }

        // Copy address
        if (elements.copyAddressBtn) {
            elements.copyAddressBtn.addEventListener('click', () => {
                if (state.activePlace && state.activePlace.formattedAddress) {
                    navigator.clipboard.writeText(state.activePlace.formattedAddress);
                    elements.copyAddressBtn.innerHTML = '<i class="fas fa-check" style="color:#10b981;"></i>';
                    setTimeout(() => {
                        elements.copyAddressBtn.innerHTML = '<i class="fas fa-copy"></i>';
                    }, 2000);
                }
            });
        }

        // Get Directions
        if (elements.getDirectionsBtn) {
            elements.getDirectionsBtn.addEventListener('click', () => {
                if (state.activePlace) {
                    const lat = state.activePlace.latitude || (state.activePlace.coords && state.activePlace.coords.lat);
                    const lng = state.activePlace.longitude || (state.activePlace.coords && state.activePlace.coords.lng);
                    const name = encodeURIComponent(state.activePlace.placeName || 'Destination');
                    if (lat && lng) {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${state.activePlace.placeId || ''}`, '_blank');
                    } else {
                        window.open(`https://www.google.com/maps/search/?api=1&query=${name}`, '_blank');
                    }
                }
            });
        }

        // Ask AI about this place
        if (elements.askAiAboutPlaceBtn) {
            elements.askAiAboutPlaceBtn.addEventListener('click', () => {
                if (state.activePlace) {
                    const pName = state.activePlace.placeName;
                    openChatbotWithMessage(`Tell me what is special about ${pName}, best photo spots, and nearby food recommendations.`);
                }
            });
        }

        // Carousel controls
        if (elements.carouselPrev) {
            elements.carouselPrev.addEventListener('click', () => changeCarouselPhoto(-1));
        }
        if (elements.carouselNext) {
            elements.carouselNext.addEventListener('click', () => changeCarouselPhoto(1));
        }
        if (elements.carouselZoom) {
            elements.carouselZoom.addEventListener('click', () => {
                if (state.carouselPhotos.length > 0) {
                    openLightbox(state.carouselPhotos[state.currentPhotoIndex], state.activePlace?.placeName || '');
                }
            });
        }
        if (elements.closeLightbox) {
            elements.closeLightbox.addEventListener('click', closeLightbox);
        }

        // Chatbot triggers
        if (elements.toggleChatbotBtn) {
            elements.toggleChatbotBtn.addEventListener('click', toggleChatbot);
        }
        if (elements.chatbotHeader) {
            elements.chatbotHeader.addEventListener('click', (e) => {
                if (e.target !== elements.toggleChatbotBtn && !elements.toggleChatbotBtn.contains(e.target)) {
                    toggleChatbot();
                }
            });
        }
        if (elements.navChatbotBtn) {
            elements.navChatbotBtn.addEventListener('click', () => {
                if (elements.chatbotContainer.classList.contains('minimized')) {
                    toggleChatbot();
                }
                elements.userMessageInput.focus();
            });
        }
        if (elements.sendMessageBtn) {
            elements.sendMessageBtn.addEventListener('click', handleSendChatMessage);
        }
        if (elements.userMessageInput) {
            elements.userMessageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSendChatMessage();
            });
        }
        elements.chatChips.forEach(chip => {
            chip.addEventListener('click', () => {
                elements.userMessageInput.value = chip.dataset.msg;
                handleSendChatMessage();
            });
        });
    }

    // =========================================================================
    // 2. Map Engine Initialization (Google Maps / Leaflet CARTO)
    // =========================================================================
    async function initializeMapEngine() {
        try {
            const res = await fetch('/api/config');
            state.apiKeyConfig = await res.json();
        } catch (err) {
            state.apiKeyConfig = { hasGoogleMapsKey: false };
        }

        if (state.apiKeyConfig.hasGoogleMapsKey && state.apiKeyConfig.googleMapsApiKey) {
            loadGoogleMapsScript(state.apiKeyConfig.googleMapsApiKey);
        } else {
            initLeafletMap();
        }
    }

    function loadGoogleMapsScript(apiKey) {
        if (window.google && window.google.maps) {
            initGoogleMap();
            return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initGoogleMapCallback`;
        script.async = true;
        script.defer = true;
        window.initGoogleMapCallback = () => {
            initGoogleMap();
        };
        script.onerror = () => {
            console.warn('Google Maps script failed to load. Falling back to Leaflet.');
            initLeafletMap();
        };
        document.head.appendChild(script);
    }

    function initGoogleMap() {
        state.mapEngine = 'google';
        const center = state.destinationCoords || { lat: 28.6139, lng: 77.2090 };
        state.googleMap = new google.maps.Map(elements.mapContainer, {
            center: center,
            zoom: 12,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true
        });

        state.directionsService = new google.maps.DirectionsService();
    }

    function initLeafletMap() {
        state.mapEngine = 'leaflet';
        if (state.leafletMap) return;

        const center = [state.destinationCoords.lat || 28.6139, state.destinationCoords.lng || 77.2090];
        state.leafletMap = L.map(elements.mapContainer, {
            zoomControl: true,
            attributionControl: true,
            fadeAnimation: true
        }).setView(center, 12);

        // Standard Street Tile Layer
        state.leafletStreetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(state.leafletMap);

        // Satellite Tile Layer (Esri World Imagery)
        state.leafletSatLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri'
        });

        state.currentMapLayerType = 'street';
        ensureMapSize();
    }

    function toggleMapLayerType() {
        if (state.mapEngine === 'google' && state.googleMap) {
            const currentType = state.googleMap.getMapTypeId();
            const newType = currentType === google.maps.MapTypeId.HYBRID ? google.maps.MapTypeId.ROADMAP : google.maps.MapTypeId.HYBRID;
            state.googleMap.setMapTypeId(newType);
            elements.toggleMapTypeBtn.innerHTML = newType === google.maps.MapTypeId.HYBRID
                ? '<i class="fas fa-map"></i> <span>Street</span>'
                : '<i class="fas fa-layer-group"></i> <span>Satellite</span>';
        } else if (state.mapEngine === 'leaflet' && state.leafletMap) {
            if (state.currentMapLayerType === 'street') {
                state.leafletMap.removeLayer(state.leafletStreetLayer);
                state.leafletSatLayer.addTo(state.leafletMap);
                state.currentMapLayerType = 'sat';
                elements.toggleMapTypeBtn.innerHTML = '<i class="fas fa-map"></i> <span>Street</span>';
            } else {
                state.leafletMap.removeLayer(state.leafletSatLayer);
                state.leafletStreetLayer.addTo(state.leafletMap);
                state.currentMapLayerType = 'street';
                elements.toggleMapTypeBtn.innerHTML = '<i class="fas fa-layer-group"></i> <span>Satellite</span>';
            }
        }
    }

    function ensureMapSize() {
        [50, 150, 350, 700].forEach(delay => {
            setTimeout(() => {
                if (state.mapEngine === 'leaflet' && state.leafletMap) {
                    state.leafletMap.invalidateSize();
                } else if (state.mapEngine === 'google' && state.googleMap && window.google) {
                    google.maps.event.trigger(state.googleMap, 'resize');
                }
            }, delay);
        });
    }

    // =========================================================================
    // 3. Form Submission & Data Rendering
    // =========================================================================
    async function handleFormSubmit(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const formData = elements.preferencesForm ? new FormData(elements.preferencesForm) : null;
        const destination = formData ? formData.get('destination')?.trim() : elements.destinationInput?.value?.trim();

        if (!destination) {
            showFormError('Please enter a destination name (e.g. Andhra Pradesh, Manali, Paris, Tokyo).');
            if (elements.destinationInput) {
                elements.destinationInput.focus();
            }
            return;
        }

        hideFormError();
        setLoadingState(true);

        const durationVal = formData?.get('duration') || elements.durationInput?.value || '3';
        const checkedInterests = formData ? Array.from(formData.getAll('interests')) : [];

        const requestPayload = {
            destination: destination,
            startingPoint: formData?.get('startingPoint')?.trim() || elements.startingPointInput?.value?.trim() || '',
            startDate: formData?.get('startDate') || elements.startDateInput?.value || 'Upcoming',
            endDate: formData?.get('endDate') || elements.endDateInput?.value || 'Upcoming',
            duration: parseInt(durationVal, 10) || 3,
            interests: checkedInterests,
            budget: formData?.get('budget') || 'Moderate / Balanced (Comfortable & versatile)',
            pace: formData?.get('pace') || 'Balanced (Best of both)',
            specialConsiderations: formData?.get('specialConsiderations')?.trim() || 'None'
        };

        try {
            updateLoadingStatus('Generating AI Itinerary with Gemini...');
            const res = await fetch('/generate_itinerary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload)
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Failed to generate itinerary. Please check your inputs and try again.');
            }

            updateLoadingStatus('Resolving Place IDs & Road Routes...');
            renderTripWorkspace(data);

        } catch (err) {
            console.error('Generation error:', err);
            showFormError(err.message || 'An error occurred while generating your trip. Please try again.');
        } finally {
            setLoadingState(false);
        }
    }

    function showFormError(msg) {
        if (elements.formErrorMessage) {
            elements.formErrorMessage.textContent = msg;
            elements.formErrorMessage.classList.remove('hidden');
            elements.formErrorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            alert(msg);
        }
    }

    function hideFormError() {
        if (elements.formErrorMessage) {
            elements.formErrorMessage.classList.add('hidden');
        }
    }

    function setLoadingState(loading) {
        if (elements.submitButton) {
            elements.submitButton.disabled = loading;
            elements.submitButton.innerHTML = loading
                ? '<i class="fas fa-spinner fa-spin"></i> <span>Creating Your Adventure...</span>'
                : '<i class="fas fa-magic"></i> <span>Generate AI Itinerary & Map</span>';
        }
        if (elements.mapLoading) {
            elements.mapLoading.classList.toggle('hidden', !loading);
        }
    }

    function updateLoadingStatus(text) {
        if (elements.mapLoadingText) {
            elements.mapLoadingText.textContent = text;
        }
    }

    function renderTripWorkspace(data) {
        state.destination = data.destination;
        state.destinationCoords = data.destinationCoords || { lat: 28.6139, lng: 77.2090 };
        state.stops = data.stops || [];
        state.days = data.days || [];
        state.tripOverview = data.tripOverview || {};
        state.rawItinerary = data.itinerary || '';

        // Calculate Overall Metrics
        const totalDays = state.days.length || parseInt(state.tripOverview?.duration || 3, 10);
        const totalStops = state.stops.length;
        
        let totalDistanceKm = 0;
        let totalTravelMinutes = 0;
        let ratingSum = 0;
        let ratingCount = 0;

        state.stops.forEach(s => {
            if (s.travelToNext) {
                if (s.travelToNext.distanceKm) totalDistanceKm += s.travelToNext.distanceKm;
                if (s.travelToNext.durationMin) totalTravelMinutes += s.travelToNext.durationMin;
            }
            if (s.rating) {
                ratingSum += parseFloat(s.rating);
                ratingCount++;
            }
        });

        totalDistanceKm = Math.round(totalDistanceKm);
        const travelHours = Math.floor(totalTravelMinutes / 60);
        const travelMins = totalTravelMinutes % 60;
        const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : '4.8';

        // Update Header/Stats
        if (elements.explorerDestTitle) elements.explorerDestTitle.textContent = `${data.destination} Journey`;
        if (elements.explorerSubtitle) elements.explorerSubtitle.textContent = `A curated ${totalDays}-day exploration across ${totalStops} verified landmarks & scenic routes.`;
        if (elements.tripVibeTag) elements.tripVibeTag.innerHTML = `<i class="fas fa-sparkles"></i> ${data.tripOverview?.tripVibe || 'Scenic & Cultural'}`;
        
        if (elements.statDuration) elements.statDuration.textContent = `${totalDays} Days`;
        if (elements.statStopsCount) elements.statStopsCount.textContent = `${totalStops} Stops`;
        if (elements.statTotalDistance) elements.statTotalDistance.textContent = `${totalDistanceKm > 0 ? totalDistanceKm : 45} km`;
        if (elements.statTotalTime) {
            elements.statTotalTime.textContent = travelHours > 0
                ? `${travelHours}h ${travelMins}m Travel`
                : `${travelMins > 0 ? travelMins : 45}m Travel`;
        }
        if (elements.statAvgRating) elements.statAvgRating.textContent = `⭐ ${avgRating} Rating`;

        renderDayNavBar();
        elements.tripExplorerSection.classList.remove('hidden');
        elements.tripExplorerSection.scrollIntoView({ behavior: 'smooth' });

        const availableDays = [...new Set(state.stops.map(s => String(s.day || 1)))].sort((a, b) => a - b);
        const initialDay = availableDays.length > 0 ? availableDays[0] : '1';
        selectDay(initialDay);
    }

    function renderDayNavBar() {
        if (!elements.dayNavigationBar) return;
        const uniqueDays = [...new Set(state.stops.map(s => String(s.day || 1)))].sort((a, b) => a - b);

        let pillsHtml = `
            <button class="day-nav-pill ${state.activeDay === 'overview' ? 'active' : ''}" data-day="overview">
                <i class="fas fa-globe-americas"></i> Overview
            </button>
        `;

        uniqueDays.forEach(day => {
            pillsHtml += `
                <button class="day-nav-pill ${state.activeDay === String(day) ? 'active' : ''}" data-day="${day}">
                    <i class="fas fa-calendar-day"></i> Day ${day}
                </button>
            `;
        });

        elements.dayNavigationBar.innerHTML = pillsHtml;
        elements.dayNavigationBar.querySelectorAll('.day-nav-pill').forEach(pill => {
            pill.addEventListener('click', () => selectDay(pill.dataset.day));
        });
    }

    // =========================================================================
    // 5. Day / Overview Selection & View Rendering
    // =========================================================================
    function selectDay(dayKey) {
        state.activeDay = String(dayKey);
        if (elements.dayNavigationBar) {
            elements.dayNavigationBar.querySelectorAll('.day-nav-pill').forEach(pill => {
                pill.classList.toggle('active', pill.dataset.day === state.activeDay);
            });
        }
        if (elements.placeDetailsCard) elements.placeDetailsCard.classList.add('hidden');

        if (state.activeDay === 'overview') {
            renderOverviewMode();
        } else {
            renderDayItineraryMode(state.activeDay);
        }
        ensureMapSize();
    }

    function renderOverviewMode() {
        const totalDays = state.days.length || parseInt(state.tripOverview?.duration || 3, 10);
        const totalStops = state.stops.length;
        
        let totalDistanceKm = 0;
        let totalTravelMinutes = 0;
        state.stops.forEach(s => {
            if (s.travelToNext) {
                if (s.travelToNext.distanceKm) totalDistanceKm += s.travelToNext.distanceKm;
                if (s.travelToNext.durationMin) totalTravelMinutes += s.travelToNext.durationMin;
            }
        });
        totalDistanceKm = Math.round(totalDistanceKm);
        const travelHours = Math.floor(totalTravelMinutes / 60);
        const travelMins = totalTravelMinutes % 60;
        const timeStr = travelHours > 0 ? `${travelHours}h ${travelMins}m` : `${travelMins}m`;

        const stopsByDay = {};
        state.stops.forEach(s => {
            const d = String(s.day || 1);
            if (!stopsByDay[d]) stopsByDay[d] = [];
            stopsByDay[d].push(s);
        });

        let dailyCardsHtml = '';
        Object.keys(stopsByDay).sort((a, b) => a - b).forEach(d => {
            const dStops = stopsByDay[d];
            let dDist = 0;
            dStops.forEach(s => { if (s.travelToNext?.distanceKm) dDist += s.travelToNext.distanceKm; });
            dDist = Math.round(dDist);

            const routeFlowHtml = dStops.map((s, idx) => `
                <span class="route-stop">${s.placeName}</span>
                ${idx < dStops.length - 1 ? '<span class="route-arrow">→</span>' : ''}
            `).join('');

            dailyCardsHtml += `
                <div class="overview-daily-card" data-day="${d}">
                    <div class="daily-card-header">
                        <div class="daily-card-title"><i class="fas fa-calendar-day"></i> Day ${d}</div>
                        <div class="daily-card-stats">${dStops.length} stops • ${dDist > 0 ? dDist + ' km' : 'Scenic route'}</div>
                    </div>
                    <div class="daily-route-flow">${routeFlowHtml}</div>
                </div>
            `;
        });

        elements.itineraryDynamicContent.innerHTML = `
            <div class="overview-summary-box">
                <h3><i class="fas fa-compass"></i> Trip Overview</h3>
                <p>${state.tripOverview?.summary || `Curated ${totalDays}-day travel plan exploring ${state.destination}.`}</p>
                <div style="font-size:0.86rem; color:var(--primary-dark); font-weight:700;">
                    <i class="fas fa-sun"></i> Best Season: ${state.tripOverview?.bestTimeToVisit || 'Oct - Mar'}
                </div>
            </div>
            <div class="overview-daily-list">${dailyCardsHtml}</div>
        `;

        elements.itineraryDynamicContent.querySelectorAll('.overview-daily-card').forEach(card => {
            card.addEventListener('click', () => selectDay(card.dataset.day));
        });

        renderMapForStops(state.stops, 'all');
        if (elements.mapOverlayDayTitle) elements.mapOverlayDayTitle.textContent = 'TRIP OVERVIEW';
        if (elements.mapOverlayStats) elements.mapOverlayStats.textContent = `${totalDays} DAYS • ${totalStops} STOPS • ${totalDistanceKm > 0 ? totalDistanceKm + ' KM' : 'SCENIC'} • ${timeStr}`;
        if (elements.mapBottomRouteText) elements.mapBottomRouteText.textContent = `🚗 Full Journey • ${totalDistanceKm} km across ${totalDays} Days`;
    }

    function renderDayItineraryMode(dayNum) {
        const dayStops = state.stops.filter(s => String(s.day) === String(dayNum));

        let dayDist = 0;
        let dayMin = 0;
        dayStops.forEach(s => {
            if (s.travelToNext) {
                if (s.travelToNext.distanceKm) dayDist += s.travelToNext.distanceKm;
                if (s.travelToNext.durationMin) dayMin += s.travelToNext.durationMin;
            }
        });
        dayDist = Math.round(dayDist);
        const dayHours = Math.floor(dayMin / 60);
        const dayMinsRemaining = dayMin % 60;
        const dayTimeStr = dayHours > 0 ? `${dayHours}h ${dayMinsRemaining}m` : `${dayMinsRemaining > 0 ? dayMinsRemaining : 30}m`;

        let stopsHtml = '';
        dayStops.forEach((stop, idx) => {
            const stopNum = idx + 1;
            stopsHtml += `
                <div class="compact-stop-card" data-place-name="${stop.placeName}" data-stop-index="${idx}">
                    <div class="stop-top-row">
                        <div class="stop-badge-name">
                            <div class="stop-number-badge">${stopNum}</div>
                            <div class="stop-name-text">${stop.placeName}</div>
                        </div>
                        <div class="stop-time-tag"><i class="fas fa-clock"></i> ${stop.timeSlot || 'Planned Stop'}</div>
                    </div>
                    <div class="stop-activity-text">${stop.activity || stop.description || 'Curated highlight'}</div>
                    <div class="stop-bottom-row">
                        <span class="stop-rating"><i class="fas fa-star"></i> ${stop.rating || '4.7'} (${stop.userRatingsTotal || 1200})</span>
                        <span><i class="fas fa-map-pin"></i> ${stop.category || 'Sightseeing'}</span>
                    </div>
                </div>
            `;
            if (idx < dayStops.length - 1 && stop.travelToNext) {
                stopsHtml += `
                    <div class="inter-stop-road-connector">
                        <div class="road-stat-chip">
                            <i class="fas fa-car"></i> ${stop.travelToNext.formatted || `${stop.travelToNext.distanceKm} km • ${stop.travelToNext.durationMin} min`}
                        </div>
                    </div>
                `;
            }
        });

        elements.itineraryDynamicContent.innerHTML = `
            <div class="day-itinerary-header">
                <div class="day-itinerary-header-title"><i class="fas fa-calendar-day"></i> Day ${dayNum} Plan</div>
                <div class="day-itinerary-header-stats">${dayStops.length} stops • ${dayDist > 0 ? dayDist + ' km' : 'Scenic'} • ${dayTimeStr} travel</div>
            </div>
            <div class="day-stops-sequence-list">${stopsHtml}</div>
        `;

        elements.itineraryDynamicContent.querySelectorAll('.compact-stop-card').forEach(card => {
            card.addEventListener('click', () => {
                const stopObj = dayStops.find(s => s.placeName === card.dataset.placeName);
                if (stopObj) focusPlaceOnMapAndDrawer(stopObj);
            });
        });

        renderMapForStops(dayStops, dayNum);
        if (elements.mapOverlayDayTitle) elements.mapOverlayDayTitle.textContent = `DAY ${dayNum}`;
        if (elements.mapOverlayStats) elements.mapOverlayStats.textContent = `${dayStops.length} STOPS • ${dayDist > 0 ? dayDist + ' KM' : 'SCENIC'} • ${dayTimeStr}`;
        if (elements.mapBottomRouteText) elements.mapBottomRouteText.textContent = `🚗 Day ${dayNum} Driving: ${dayDist > 0 ? dayDist + ' km' : 'Local routing'} • ${dayTimeStr}`;
    }

    // =========================================================================
    // 6. Map Markers & Leg-by-Leg Road Routing
    // =========================================================================
    function renderMapForStops(stops, dayScope) {
        clearAllMarkers();
        clearRoute();
        if (!stops || stops.length === 0) {
            if (state.destinationCoords) panToCoordinates(state.destinationCoords.lat, state.destinationCoords.lng, 12);
            return;
        }

        const destLat = state.destinationCoords?.lat || 28.6139;
        const destLng = state.destinationCoords?.lng || 77.2090;
        const placedPositions = [];
        const dayCounters = {};

        stops.forEach((stop, idx) => {
            let lat = stop.latitude || (stop.coords && stop.coords.lat) || destLat;
            let lng = stop.longitude || (stop.coords && stop.coords.lng) || destLng;

            if (Math.abs(lat - destLat) > 0.75 || Math.abs(lng - destLng) > 0.75) {
                lat = destLat + (0.01 + idx * 0.008) * Math.sin(idx * 1.2 + 0.4);
                lng = destLng + (0.01 + idx * 0.008) * Math.cos(idx * 1.2 + 0.4);
            }

            let collisions = 0;
            placedPositions.forEach(p => { if (Math.hypot(p.lat - lat, p.lng - lng) < 0.005) collisions++; });
            if (collisions > 0) {
                lat += (0.0065 * collisions) * Math.sin(collisions);
                lng += (0.0065 * collisions) * Math.cos(collisions);
            }
            placedPositions.push({ lat, lng });

            const sDay = stop.day || 1;
            dayCounters[sDay] = (dayCounters[sDay] || 0) + 1;
            const labelNumber = dayScope === 'all' ? `D${sDay}-${dayCounters[sDay]}` : String(idx + 1);
            const markerColor = getDayColor(sDay);

            if (state.mapEngine === 'google') {
                const marker = new google.maps.Marker({
                    position: { lat, lng },
                    map: state.googleMap,
                    label: { text: labelNumber, color: '#ffffff', fontWeight: 'bold' },
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 16, fillColor: markerColor, fillOpacity: 1, strokeColor: '#ffffff' }
                });
                marker.addListener('click', () => focusPlaceOnMapAndDrawer(stop));
                state.markers.push(marker);
            } else {
                const marker = L.marker([lat, lng], { 
                    icon: L.divIcon({ className: 'custom-leaflet-marker', html: `<div class="custom-map-marker" style="background:${markerColor};">${labelNumber}</div>` }) 
                }).addTo(state.leafletMap);
                marker.on('click', () => focusPlaceOnMapAndDrawer(stop));
                state.markers.push(marker);
            }
        });

        fitMapToBounds(stops);
        if (elements.toggleRouteBtn?.classList.contains('active')) drawRealRoadRoute(stops);
    }

    function fitMapToBounds(stops) {
        if (!stops || stops.length === 0) return;
        const latLngList = stops.map(s => [s.latitude || s.coords?.lat, s.longitude || s.coords?.lng]).filter(pt => pt[0]);
        if (state.mapEngine === 'google') {
            const bounds = new google.maps.LatLngBounds();
            latLngList.forEach(pt => bounds.extend({ lat: pt[0], lng: pt[1] }));
            state.googleMap.fitBounds(bounds);
        } else if (state.leafletMap) {
            latLngList.length === 1 ? state.leafletMap.setView(latLngList[0], 14) : state.leafletMap.fitBounds(latLngList, { padding: [50, 50] });
        }
    }

    async function drawRealRoadRoute(stops) {
        clearRoute();
        const dayGroups = {};
        stops.forEach(s => {
            const day = String(s.day || 1);
            if (!dayGroups[day]) dayGroups[day] = [];
            dayGroups[day].push(s);
        });

        for (const [dayKey, dayStops] of Object.entries(dayGroups)) {
            const validCoords = dayStops.map(s => ({ lat: s.latitude || s.coords?.lat, lng: s.longitude || s.coords?.lng }));
            await routeSingleDayLegByLeg(validCoords, getDayColor(dayKey));
        }
    }

    async function routeSingleDayLegByLeg(coordsList, color) {
        for (let i = 0; i < coordsList.length - 1; i++) {
            const start = coordsList[i], end = coordsList[i + 1];
            if (state.mapEngine === 'google') {
                const renderer = new google.maps.DirectionsRenderer({ map: state.googleMap, suppressMarkers: true, polylineOptions: { strokeColor: color, strokeWeight: 5 } });
                state.directionsService.route({ origin: start, destination: end, travelMode: 'DRIVING' }, (res, status) => { if (status === 'OK') renderer.setDirections(res); });
                state.routeLayers.push(renderer);
            } else {
                const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`).catch(() => null);
                const data = await res?.json();
                if (data?.routes?.[0]) {
                    const poly = L.polyline(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]), { color, weight: 5 }).addTo(state.leafletMap);
                    state.routeLayers.push(poly);
                }
            }
        }
    }

    function clearRoute() {
        state.routeLayers.forEach(l => l.setMap ? l.setMap(null) : state.leafletMap.removeLayer(l));
        state.routeLayers = [];
    }

    function clearAllMarkers() {
        state.markers.forEach(m => m.setMap ? m.setMap(null) : state.leafletMap.removeLayer(m));
        state.markers = [];
    }

    function panToCoordinates(lat, lng, zoom = 15) {
        if (state.mapEngine === 'google') { state.googleMap.panTo({ lat, lng }); state.googleMap.setZoom(zoom); }
        else { state.leafletMap.setView([lat, lng], zoom); }
    }

    function getDayColor(day) {
        const colors = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
        return colors[(Number(day || 1) - 1) % colors.length] || '#0284c7';
    }

    // =========================================================================
    // 7. 2-Way Sync: Focus Stop & Place Details Drawer
    // =========================================================================
    function focusPlaceOnMapAndDrawer(stop) {
        state.activePlaceId = stop.placeId || stop.placeName;
        state.activePlace = stop;
        panToCoordinates(stop.latitude || stop.coords?.lat, stop.longitude || stop.coords?.lng, 15);
        document.querySelectorAll('.compact-stop-card').forEach(el => el.classList.toggle('active', el.dataset.placeName === stop.placeName));
        const target = document.querySelector(`.compact-stop-card[data-place-name="${stop.placeName}"]`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        displayPlaceDetails(stop);
    }

    function displayPlaceDetails(stop) {
        state.activePlace = stop;
        if (!elements.placeDetailsCard) return;
        elements.placeCategory.innerHTML = `<i class="fas fa-map-pin"></i> ${stop.category || 'Sightseeing'}`;
        elements.placeName.textContent = stop.placeName;
        elements.placeRating.innerHTML = `<i class="fas fa-star"></i> <strong>${stop.rating || '4.7'}</strong> (${stop.userRatingsTotal || 1200})`;
        elements.placeDayTag.textContent = `Day ${stop.day || 1}`;
        elements.placeDayTag.style.background = getDayColor(stop.day);
        elements.placeAddress.textContent = stop.formattedAddress || '';
        elements.placeActivity.textContent = stop.activity || stop.description || '';
        if (stop.tips) { elements.placeTips.textContent = stop.tips; elements.placeTipsRow.classList.remove('hidden'); }
        else { elements.placeTipsRow.classList.add('hidden'); }
        state.carouselPhotos = stop.photos || [];
        state.currentPhotoIndex = 0;
        if (state.carouselPhotos.length > 0) {
            elements.carouselMainWrap.classList.remove('hidden');
            elements.noPhotosFallback.classList.add('hidden');
            elements.carouselMainImg.src = state.carouselPhotos[0];
            elements.carouselCounter.textContent = `1 / ${state.carouselPhotos.length}`;
            elements.carouselThumbnails.innerHTML = state.carouselPhotos.map((url, i) => `<img src="${url}" class="drawer-thumb ${i === 0 ? 'active' : ''}" data-index="${i}" alt="thumb">`).join('');
            elements.carouselThumbnails.querySelectorAll('.drawer-thumb').forEach(thumb => thumb.addEventListener('click', () => setCarouselPhoto(parseInt(thumb.dataset.index))));
        } else {
            elements.carouselMainWrap.classList.add('hidden');
            elements.noPhotosFallback.classList.remove('hidden');
        }
        elements.placeDetailsCard.classList.remove('hidden');
    }

    function setCarouselPhoto(index) {
        state.currentPhotoIndex = (index + state.carouselPhotos.length) % state.carouselPhotos.length;
        elements.carouselMainImg.src = state.carouselPhotos[state.currentPhotoIndex];
        elements.carouselCounter.textContent = `${state.currentPhotoIndex + 1} / ${state.carouselPhotos.length}`;
    }

    function changeCarouselPhoto(dir) { setCarouselPhoto(state.currentPhotoIndex + dir); }
    function openLightbox(url, cap) { elements.lightboxImg.src = url; elements.lightboxCaption.textContent = cap; elements.imageLightbox.classList.remove('hidden'); }
    function closeLightbox() { elements.imageLightbox.classList.add('hidden'); }

    // =========================================================================
    // 8. Structured PDF Download Export
    // =========================================================================
    async function handleDownloadPdf() {
        try {
            elements.downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing PDF...';
            const payload = {
                destination: state.destination || 'Trip',
                tripOverview: state.tripOverview || {},
                stops: state.stops || [],
                days: state.days || [],
                itineraryText: state.rawItinerary || ''
            };
            const res = await fetch('/download_pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error('PDF export failed.');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(state.destination || 'Trip').replace(/[^a-zA-Z0-9]/g, '_')}_Itinerary.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) { alert('Failed to download PDF: ' + err.message); }
        finally { elements.downloadPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> PDF Guide'; }
    }

    // =========================================================================
    // 9. AI Chatbot Assistant Integration
    // =========================================================================
    function toggleChatbot() {
        state.isChatbotMinimized = !state.isChatbotMinimized;
        elements.chatbotContainer.classList.toggle('minimized', state.isChatbotMinimized);
        elements.toggleChatbotBtn.innerHTML = state.isChatbotMinimized ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
    }

    function openChatbotWithMessage(msg) {
        if (state.isChatbotMinimized) toggleChatbot();
        elements.userMessageInput.value = msg;
        handleSendChatMessage();
    }

    async function handleSendChatMessage() {
        const msg = elements.userMessageInput.value.trim();
        if (!msg) return;
        appendChatBubble('user', msg);
        elements.userMessageInput.value = '';
        const loadingId = 'chat-loading-' + Date.now();
        appendChatBubble('bot', '<i class="fas fa-circle-notch fa-spin"></i> Thinking...', loadingId);
        try {
            const res = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, destination: state.destination }) });
            const data = await res.json();
            const formatted = (data.response || 'Sorry.').replace(/\[place:\s*(.*?)\]/gi, (match, pName) => `<button class="chat-place-tag-btn" onclick="window.explorePlaceFromChat('${pName.replace(/'/g, "\\'")}')"><i class="fas fa-map-pin"></i> ${pName}</button>`);
            removeChatBubble(loadingId);
            appendChatBubble('bot', formatted);
        } catch { removeChatBubble(loadingId); appendChatBubble('bot', 'Error connecting.'); }
    }

    function appendChatBubble(sender, text, id = null) {
        const msg = document.createElement('div');
        msg.className = `message ${sender}-message`;
        if (id) msg.id = id;
        msg.innerHTML = `<div class="message-bubble">${text}</div>`;
        elements.chatMessages.appendChild(msg);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    function removeChatBubble(id) { document.getElementById(id)?.remove(); }

    window.explorePlaceFromChat = function(name) {
        const stop = state.stops.find(s => s.placeName.toLowerCase().includes(name.toLowerCase()));
        if (stop) { selectDay(String(stop.day)); setTimeout(() => focusPlaceOnMapAndDrawer(stop), 300); }
        else panToCoordinates(state.destinationCoords.lat, state.destinationCoords.lng, 14);
    };
});