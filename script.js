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
        explorerDestTitle: document.getElementById('explorer-destination-title'),
        explorerSubtitle: document.getElementById('explorer-subtitle'),
        downloadPdfBtn: document.getElementById('downloadPdf'),
        planAnotherBtn: document.getElementById('planAnother'),
        tripGrid: document.getElementById('tripGrid'),

        tripOverviewCard: document.getElementById('tripOverviewCard'),
        tripVibeTag: document.getElementById('tripVibeTag'),
        tripDurationTag: document.getElementById('tripDurationTag'),
        tripSummaryText: document.getElementById('tripSummaryText'),
        tripBestSeason: document.getElementById('tripBestSeason'),

        tabBtnPlan: document.getElementById('tabBtnPlan'),
        tabBtnSequence: document.getElementById('tabBtnSequence'),
        planTabView: document.getElementById('planTabView'),
        sequenceTabView: document.getElementById('sequenceTabView'),
        dayPlanCardsContainer: document.getElementById('dayPlanCardsContainer'),
        sidebarDayFilters: document.getElementById('sidebarDayFilters'),
        timelineSequenceList: document.getElementById('timelineSequenceList'),
        itineraryContent: document.getElementById('itinerary-content'),

        mapDayFilters: document.getElementById('mapDayFilters'),
        toggleRouteBtn: document.getElementById('toggleRouteBtn'),
        fitMapBoundsBtn: document.getElementById('fitMapBoundsBtn'),
        mapContainer: document.getElementById('trip-map'),
        mapLoading: document.getElementById('map-loading-indicator'),
        mapLoadingText: document.getElementById('mapLoadingText'),

        dayPlaceCardsSection: document.getElementById('day-place-cards-section'),
        dayCardsTitle: document.getElementById('dayCardsTitle'),
        dayStopsCount: document.getElementById('dayStopsCount'),
        dayPlaceCards: document.getElementById('day-place-cards'),

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
    // 1. Initial Setup & Event Listeners
    // =========================================================================
    initFormHandling();
    await initializeMapEngine();
    setupEventListeners();

    function initFormHandling() {
        // Ensure form inputs start clean with NO unwanted automatic pre-fills
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

        // Geolocation button
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
                elements.durationInput.value = Math.min(Math.max(diffDays, 1), 14);
            }
        }
    }

    function setupEventListeners() {
        // Form submit
        if (elements.preferencesForm) {
            elements.preferencesForm.addEventListener('submit', handleFormSubmit);
        }

        // Workspace tab switcher
        if (elements.tabBtnPlan) {
            elements.tabBtnPlan.addEventListener('click', () => switchWorkspaceTab('plan'));
        }
        if (elements.tabBtnSequence) {
            elements.tabBtnSequence.addEventListener('click', () => switchWorkspaceTab('sequence'));
        }

        // Start Planning Hero CTA button
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
                    const filtered = state.activeDay === 'all'
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
                const filtered = state.activeDay === 'all'
                    ? state.stops
                    : state.stops.filter(s => String(s.day) === state.activeDay);
                fitMapToBounds(filtered);
            });
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

    function switchWorkspaceTab(tab) {
        state.activeTab = tab;
        if (tab === 'plan') {
            elements.tabBtnPlan.classList.add('active');
            elements.tabBtnSequence.classList.remove('active');
            elements.planTabView.classList.remove('hidden');
            elements.sequenceTabView.classList.add('hidden');
        } else {
            elements.tabBtnPlan.classList.remove('active');
            elements.tabBtnSequence.classList.add('active');
            elements.planTabView.classList.add('hidden');
            elements.sequenceTabView.classList.remove('hidden');
        }
        ensureMapSize();
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
            console.warn('Google Maps script failed to load. Falling back to Leaflet CARTO.');
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
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true
        });

        state.directionsService = new google.maps.DirectionsService();
        state.directionsRenderer = new google.maps.DirectionsRenderer({
            map: state.googleMap,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#0284c7',
                strokeWeight: 5,
                strokeOpacity: 0.85
            }
        });
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

        // Standard high-reliability OpenStreetMap Tile Server
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(state.leafletMap);

        ensureMapSize();
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

    window.addEventListener('resize', ensureMapSize);

    // =========================================================================
    // 3. Form Submission & Structured Itinerary Generation
    // =========================================================================
    async function handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(elements.preferencesForm);
        const destination = formData.get('destination')?.trim();

        if (!destination) {
            showFormError('Please enter a destination.');
            return;
        }

        hideFormError();
        setLoadingState(true);

        const checkedInterests = Array.from(formData.getAll('interests'));
        const requestPayload = {
            destination: destination,
            startingPoint: formData.get('startingPoint')?.trim() || '',
            startDate: formData.get('startDate') || 'Upcoming',
            endDate: formData.get('endDate') || 'Upcoming',
            duration: formData.get('duration') || 3,
            interests: checkedInterests,
            budget: formData.get('budget'),
            pace: formData.get('pace'),
            specialConsiderations: formData.get('specialConsiderations')?.trim() || 'None'
        };

        try {
            updateLoadingStatus('Generating AI Itinerary with Gemini...');
            const res = await fetch('/generate_itinerary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate itinerary.');
            }

            updateLoadingStatus('Resolving Place IDs & Road Routes...');
            renderTripWorkspace(data);

        } catch (err) {
            console.error('Generation error:', err);
            showFormError(err.message || 'An error occurred while generating your trip.');
        } finally {
            setLoadingState(false);
        }
    }

    function showFormError(msg) {
        if (elements.formErrorMessage) {
            elements.formErrorMessage.textContent = msg;
            elements.formErrorMessage.classList.remove('hidden');
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

    // =========================================================================
    // 4. Render Trip Workspace & Synchronize Data
    // =========================================================================
    function renderTripWorkspace(data) {
        state.destination = data.destination;
        state.destinationCoords = data.destinationCoords || { lat: 28.6139, lng: 77.2090 };
        state.stops = data.stops || [];
        state.days = data.days || [];
        state.tripOverview = data.tripOverview || {};

        // Update Top Bar & Header
        if (elements.explorerDestTitle) {
            elements.explorerDestTitle.textContent = `${data.destination} Itinerary & Map`;
        }
        if (elements.explorerSubtitle) {
            elements.explorerSubtitle.textContent = `A curated ${data.tripOverview?.duration || 3}-day journey across ${state.stops.length} verified stops.`;
        }

        // Update Trip Overview Card
        if (elements.tripVibeTag) {
            elements.tripVibeTag.innerHTML = `<i class="fas fa-sparkles"></i> ${data.tripOverview?.tripVibe || 'Scenic Exploration'}`;
        }
        if (elements.tripDurationTag) {
            elements.tripDurationTag.innerHTML = `<i class="fas fa-calendar"></i> ${data.tripOverview?.duration || 3} Days`;
        }
        if (elements.tripSummaryText) {
            elements.tripSummaryText.textContent = data.tripOverview?.summary || `Curated itinerary exploring ${data.destination}.`;
        }
        if (elements.tripBestSeason) {
            elements.tripBestSeason.innerHTML = `<i class="fas fa-sun"></i> Best Season: ${data.tripOverview?.bestTimeToVisit || 'Oct - Mar'}`;
        }

        // Render Day-by-Day Plan Cards (Picture 2 & 3 Style)
        renderDayPlanCards(data.itinerary || '', data.destination);

        // Show Workspace
        elements.tripExplorerSection.classList.remove('hidden');
        elements.tripExplorerSection.scrollIntoView({ behavior: 'smooth' });

        // Set active day to Day 1
        const availableDays = [...new Set(state.stops.map(s => String(s.day || 1)))];
        state.activeDay = availableDays.length > 0 ? availableDays[0] : '1';

        // Render Day Filter Pills on both Map & Sidebar
        renderDayFilters(state.stops);

        // Render Day Stops & Map
        ensureMapSize();
        selectDay(state.activeDay);
    }

    function renderDayPlanCards(itineraryText, destination) {
        if (!elements.dayPlanCardsContainer) return;

        if (!itineraryText) {
            elements.dayPlanCardsContainer.innerHTML = '<div style="padding:1.5rem; text-align:center; color:var(--text-muted);">No itinerary text available.</div>';
            return;
        }

        // Clean text
        let cleanText = itineraryText
            .replace(/=== ITINERARY TEXT ===/gi, '')
            .replace(/=== STRUCTURED TRIP JSON ===/gi, '')
            .replace(/```json[\s\S]*?```/gi, '')
            .trim();

        // Split by Day X
        const daySplits = cleanText.split(/(?=(?:###?\s*)?Day\s+\d+)/i);
        let cardsHtml = '';

        daySplits.forEach((dayBlock, idx) => {
            const trimmed = dayBlock.trim();
            if (!trimmed) return;

            // Extract Day Number and Day Title
            const headerMatch = trimmed.match(/(?:###?\s*)?Day\s+(\d+)\s*[-–:]?\s*([^\n<]+)/i);
            const dayNum = headerMatch ? headerMatch[1] : String(idx + 1);
            let dayTitle = headerMatch ? `Day ${dayNum} – ${headerMatch[2].replace(/\*\*/g, '').trim()}` : `Day ${dayNum} Highlights`;

            // Extract Body (remove header line)
            let bodyText = trimmed;
            if (headerMatch) {
                bodyText = trimmed.substring(headerMatch[0].length).trim();
            }

            // Format body content
            let formattedBody = bodyText
                .replace(/^#### (.*?)$/gim, '<h4>$1</h4>')
                .replace(/^### (.*?)$/gim, '<h4>$1</h4>')
                .replace(/^## (.*?)$/gim, '<h4>$1</h4>')
                .replace(/\*\*\[(.*?)\]\*\*/g, (match, p1) => {
                    const cleanPlace = p1.trim();
                    return `<button type="button" class="itinerary-place-chip" data-place="${cleanPlace}"><i class="fas fa-map-pin"></i> ${cleanPlace}</button>`;
                })
                .replace(/\*\*(.*?)\*\*/g, (match, p1) => {
                    const clean = p1.trim();
                    const isHeader = ['morning', 'afternoon', 'evening', 'night', 'daily tips', 'day ', 'transportation', 'weather', 'costs', 'breakfast', 'lunch', 'dinner', 'budget', 'pace'].some(k => clean.toLowerCase().includes(k));
                    if (!isHeader && clean.length > 2) {
                        return `<button type="button" class="itinerary-place-chip" data-place="${clean}"><i class="fas fa-map-pin"></i> ${clean}</button>`;
                    }
                    return `<strong>${p1}</strong>`;
                })
                .replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>')
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n/g, '<br>');

            formattedBody = formattedBody.replace(/(<li>.*?<\/li>)/gis, '<ul>$1</ul>');

            cardsHtml += `
                <div class="itinerary-day-card" id="itinerary-day-${dayNum}" data-day="${dayNum}">
                    <div class="itinerary-day-header">
                        <h3 class="itinerary-day-title">
                            <i class="fas fa-calendar-day"></i> ${dayTitle}
                        </h3>
                        <button type="button" class="day-show-map-btn" data-day="${dayNum}" title="Show Day ${dayNum} on Map">
                            <i class="fas fa-map-marked-alt"></i> Show Day ${dayNum} Map
                        </button>
                    </div>
                    <div class="itinerary-day-body">
                        ${formattedBody}
                    </div>
                </div>
            `;
        });

        elements.dayPlanCardsContainer.innerHTML = cardsHtml;

        // Bind [Show Day X Map] buttons
        elements.dayPlanCardsContainer.querySelectorAll('.day-show-map-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dayNum = btn.dataset.day;
                selectDay(dayNum);
                ensureMapSize();
                // Smooth scroll to map on mobile/small screens
                if (window.innerWidth <= 1024) {
                    elements.mapContainer.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Bind interactive [📍 Place Name] chips
        elements.dayPlanCardsContainer.querySelectorAll('.itinerary-place-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const placeName = chip.dataset.place;

                // Find matching stop in state.stops
                let matchedStop = state.stops.find(s => 
                    s.placeName.toLowerCase().includes(placeName.toLowerCase()) ||
                    placeName.toLowerCase().includes(s.placeName.toLowerCase())
                );

                if (matchedStop) {
                    if (String(matchedStop.day) !== state.activeDay && state.activeDay !== 'all') {
                        selectDay(matchedStop.day);
                    }
                    focusPlaceOnMapAndDrawer(matchedStop);
                } else {
                    // Fallback to nearest destination stop or map center
                    panToCoordinates(state.destinationCoords.lat, state.destinationCoords.lng, 14);
                }
            });
        });
    }

    function renderDayFilters(stops) {
        const uniqueDays = [...new Set(stops.map(s => s.day || 1))].sort((a, b) => a - b);

        let pillsHtml = `<button class="map-day-chip ${state.activeDay === 'all' ? 'active' : ''}" data-day="all"><i class="fas fa-globe"></i> All Days</button>`;
        let sidebarPillsHtml = `<button class="day-pill ${state.activeDay === 'all' ? 'active' : ''}" data-day="all"><i class="fas fa-globe"></i> All Days</button>`;

        uniqueDays.forEach(day => {
            pillsHtml += `<button class="map-day-chip ${state.activeDay === String(day) ? 'active' : ''}" data-day="${day}"><i class="fas fa-calendar-day"></i> Day ${day}</button>`;
            sidebarPillsHtml += `<button class="day-pill ${state.activeDay === String(day) ? 'active' : ''}" data-day="${day}"><i class="fas fa-calendar-day"></i> Day ${day}</button>`;
        });

        if (elements.mapDayFilters) {
            elements.mapDayFilters.innerHTML = pillsHtml;
            elements.mapDayFilters.querySelectorAll('.map-day-chip').forEach(chip => {
                chip.addEventListener('click', () => selectDay(chip.dataset.day));
            });
        }

        if (elements.sidebarDayFilters) {
            elements.sidebarDayFilters.innerHTML = sidebarPillsHtml;
            elements.sidebarDayFilters.querySelectorAll('.day-pill').forEach(pill => {
                pill.addEventListener('click', () => selectDay(pill.dataset.day));
            });
        }
    }

    // =========================================================================
    // 5. Day-Wise Map Control & Marker Isolation System
    // =========================================================================
    function selectDay(day) {
        state.activeDay = String(day);

        // Update active class on all day pills
        document.querySelectorAll('.map-day-chip, .day-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.day === state.activeDay);
        });

        // 1. Strict Clear of all previous markers & routes
        clearAllMarkers();
        clearRoute();
        ensureMapSize();

        // 2. Filter stops strictly for selected day
        const filteredStops = state.activeDay === 'all'
            ? state.stops
            : state.stops.filter(s => String(s.day) === state.activeDay);

        // 3. Render Timeline Sequence List (Left Column) & Bottom Strip
        renderTimelineSequence(filteredStops, state.activeDay);
        renderBottomCardsStrip(filteredStops, state.activeDay);

        if (!filteredStops || filteredStops.length === 0) {
            if (state.destinationCoords) {
                panToCoordinates(state.destinationCoords.lat, state.destinationCoords.lng, 12);
            }
            return;
        }

        const latLngList = [];
        const destLat = state.destinationCoords?.lat || 28.6139;
        const destLng = state.destinationCoords?.lng || 77.2090;
        const placedPositions = [];
        const dayCounters = {};

        // 4. Render numbered markers with anti-overlap collision avoidance
        filteredStops.forEach((stop, idx) => {
            let lat = stop.latitude || (stop.coords && stop.coords.lat) || destLat;
            let lng = stop.longitude || (stop.coords && stop.coords.lng) || destLng;

            // Geographic sanity guard: Clamp to destination vicinity if wildly distant
            if (Math.abs(lat - destLat) > 0.75 || Math.abs(lng - destLng) > 0.75) {
                lat = destLat + (0.01 + idx * 0.008) * Math.sin(idx * 1.2 + 0.4);
                lng = destLng + (0.01 + idx * 0.008) * Math.cos(idx * 1.2 + 0.4);
                stop.latitude = lat;
                stop.longitude = lng;
                if (stop.coords) {
                    stop.coords.lat = lat;
                    stop.coords.lng = lng;
                }
            }

            // Anti-Overlap Guard: If another marker is at virtually same pixel, offset slightly
            let collisions = 0;
            placedPositions.forEach(p => {
                const dist = Math.hypot(p.lat - lat, p.lng - lng);
                if (dist < 0.005) {
                    collisions++;
                }
            });

            if (collisions > 0) {
                const spreadAngle = (collisions * 1.35) + (idx * 0.85);
                const spreadRadius = 0.0065 * collisions;
                lat = Number((lat + spreadRadius * Math.sin(spreadAngle)).toFixed(5));
                lng = Number((lng + spreadRadius * Math.cos(spreadAngle)).toFixed(5));
            }
            placedPositions.push({ lat, lng });

            // Calculate per-day sequential stop number
            const sDay = stop.day || 1;
            dayCounters[sDay] = (dayCounters[sDay] || 0) + 1;
            const dayStopIndex = dayCounters[sDay];

            // Numbering: 1, 2, 3... for single day; D1-1, D2-1... for all days
            const labelNumber = state.activeDay === 'all' ? `D${sDay}-${dayStopIndex}` : String(idx + 1);
            const markerColor = getDayColor(sDay);

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
                    focusPlaceOnMapAndDrawer(stop);
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
                    focusPlaceOnMapAndDrawer(stop);
                });

                state.markers.push(marker);
            }
        });

        // 5. Fit Map Bounds
        fitMapToBounds(filteredStops);

        // 6. Draw leg-by-leg Road Route
        if (elements.toggleRouteBtn?.classList.contains('active')) {
            drawRealRoadRoute(filteredStops);
        }

        // 7. Auto preview the 1st stop
        if (filteredStops.length > 0) {
            displayPlaceDetails(filteredStops[0]);
        }
    }

    function fitMapToBounds(stops) {
        if (!stops || stops.length === 0) return;
        const latLngList = stops.map(s => [
            s.latitude || (s.coords && s.coords.lat),
            s.longitude || (s.coords && s.coords.lng)
        ]).filter(pt => pt[0] && pt[1]);

        if (latLngList.length === 0) return;

        if (state.mapEngine === 'google' && state.googleMap) {
            const bounds = new google.maps.LatLngBounds();
            latLngList.forEach(pt => bounds.extend(new google.maps.LatLng(pt[0], pt[1])));
            state.googleMap.fitBounds(bounds);
        } else if (state.mapEngine === 'leaflet' && state.leafletMap) {
            if (latLngList.length === 1) {
                state.leafletMap.setView(latLngList[0], 14);
            } else {
                state.leafletMap.fitBounds(latLngList, { padding: [50, 50], maxZoom: 14 });
            }
        }
    }

    // =========================================================================
    // 6. Leg-by-Leg Resilient Road Routing
    // =========================================================================
    async function drawRealRoadRoute(stops) {
        clearRoute();
        if (!stops || stops.length < 2) return;

        // Group stops by day so each day's route connects ONLY within that day
        const dayGroups = {};
        stops.forEach(s => {
            const day = String(s.day || 1);
            if (!dayGroups[day]) dayGroups[day] = [];
            dayGroups[day].push(s);
        });

        for (const [dayKey, dayStops] of Object.entries(dayGroups)) {
            if (dayStops.length < 2) continue;

            const dayColor = getDayColor(dayKey);
            const validCoords = dayStops.map(s => ({
                lat: s.latitude || (s.coords && s.coords.lat),
                lng: s.longitude || (s.coords && s.coords.lng)
            })).filter(c => c.lat && c.lng);

            if (validCoords.length < 2) continue;

            await routeSingleDayLegByLeg(validCoords, dayColor);
        }
    }

    async function routeSingleDayLegByLeg(coordsList, color = '#0284c7') {
        if (!coordsList || coordsList.length < 2) return;

        for (let i = 0; i < coordsList.length - 1; i++) {
            const start = coordsList[i];
            const end = coordsList[i + 1];

            try {
                // Distance guard (< 70km)
                const distKm = Math.hypot(end.lat - start.lat, end.lng - start.lng) * 111;
                if (distKm > 70) {
                    drawSimplePolyline([start, end], color);
                    continue;
                }

                // 1. Google Maps Directions
                if (state.mapEngine === 'google' && state.directionsService) {
                    const renderer = new google.maps.DirectionsRenderer({
                        map: state.googleMap,
                        suppressMarkers: true,
                        polylineOptions: {
                            strokeColor: color,
                            strokeWeight: 5,
                            strokeOpacity: 0.85
                        }
                    });

                    state.directionsService.route({
                        origin: new google.maps.LatLng(start.lat, start.lng),
                        destination: new google.maps.LatLng(end.lat, end.lng),
                        travelMode: google.maps.TravelMode.DRIVING
                    }, (result, status) => {
                        if (status === google.maps.DirectionsStatus.OK) {
                            renderer.setDirections(result);
                            state.routeLayers.push(renderer);
                        } else {
                            drawSimplePolyline([start, end], color);
                        }
                    });
                    continue;
                }

                // 2. Leaflet Engine with OSRM
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
                const res = await fetch(osrmUrl);
                const data = await res.json();

                if (data.routes && data.routes.length > 0 && data.routes[0].distance < 80000 && state.leafletMap) {
                    const routeGeoJson = data.routes[0].geometry;
                    const legCoordinates = [
                        [start.lat, start.lng],
                        ...routeGeoJson.coordinates.map(c => [c[1], c[0]]),
                        [end.lat, end.lng]
                    ];

                    const poly = L.polyline(legCoordinates, {
                        color: color,
                        weight: 5,
                        opacity: 0.85,
                        lineJoin: 'round'
                    }).addTo(state.leafletMap);

                    state.routeLayers.push(poly);
                } else {
                    drawSimplePolyline([start, end], color);
                }
            } catch (err) {
                drawSimplePolyline([start, end], color);
            }
        }
    }

    function drawSimplePolyline(coordsList, color = '#0284c7') {
        if (state.mapEngine === 'leaflet' && state.leafletMap && coordsList.length >= 2) {
            const points = coordsList.map(c => [c.lat, c.lng]);
            const poly = L.polyline(points, {
                color: color,
                weight: 5,
                opacity: 0.85,
                dashArray: '8, 8',
                lineJoin: 'round'
            }).addTo(state.leafletMap);
            state.routeLayers.push(poly);
        }
    }

    function clearRoute() {
        if (state.directionsRenderer) {
            state.directionsRenderer.set('directions', null);
        }
        if (state.routeLayers && state.routeLayers.length > 0) {
            state.routeLayers.forEach(layer => {
                if (layer.setMap) {
                    layer.setMap(null);
                } else if (state.leafletMap && state.leafletMap.hasLayer(layer)) {
                    state.leafletMap.removeLayer(layer);
                }
            });
            state.routeLayers = [];
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

    function panToCoordinates(lat, lng, zoom = 15) {
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
    // 7. Render Timeline Sequence (Left Column) & 2-Way Sync
    // =========================================================================
    function renderTimelineSequence(stops, activeDay) {
        if (!elements.timelineSequenceList) return;

        if (!stops || stops.length === 0) {
            elements.timelineSequenceList.innerHTML = `<div style="padding:1.5rem; text-align:center; color:var(--text-muted);">No locations planned for this day selection.</div>`;
            return;
        }

        let html = '';
        const dayCounters = {};

        stops.forEach((stop, idx) => {
            const sDay = stop.day || 1;
            dayCounters[sDay] = (dayCounters[sDay] || 0) + 1;
            const dayStopIndex = dayCounters[sDay];
            const badgeNumber = activeDay === 'all' ? `D${sDay}-${dayStopIndex}` : String(idx + 1);
            const badgeColor = getDayColor(sDay);

            html += `
                <div class="timeline-place-item" data-place-id="${stop.placeId || ''}" data-place-name="${stop.placeName}">
                    <div class="place-item-top">
                        <div class="place-step-badge" style="background:${badgeColor};">${badgeNumber}</div>
                        <div class="place-item-content">
                            <div class="place-item-header">
                                <h4 class="place-item-title">${stop.placeName}</h4>
                                <span class="place-time-tag">${stop.timeSlot || 'Day Stop'}</span>
                            </div>
                            <div class="place-item-address">${stop.formattedAddress || 'Destination landmark'}</div>
                            <div class="place-item-activity">${stop.activity || stop.description || ''}</div>
                            
                            <div class="place-item-footer">
                                <span class="place-rating-badge"><i class="fas fa-star"></i> ${stop.rating || '4.7'} (${stop.userRatingsTotal || 1200})</span>
                                <div class="place-item-actions">
                                    <button class="item-action-btn view-btn" data-action="view"><i class="fas fa-eye"></i> Details</button>
                                    <button class="item-action-btn dir-btn" data-action="dir"><i class="fas fa-location-arrow"></i> Map</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Travel stats connector to next stop
            if (stop.travelToNext && idx < stops.length - 1 && stops[idx + 1].day === stop.day) {
                html += `
                    <div class="inter-stop-travel-connector">
                        <span class="travel-stat-pill">
                            <i class="fas fa-car-side"></i> ${stop.travelToNext.formatted}
                        </span>
                    </div>
                `;
            }
        });

        elements.timelineSequenceList.innerHTML = html;

        // Add 2-way click listeners
        elements.timelineSequenceList.querySelectorAll('.timeline-place-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const pName = item.dataset.placeName;
                const stopObj = stops.find(s => s.placeName === pName);
                if (stopObj) {
                    focusPlaceOnMapAndDrawer(stopObj);
                }
            });
        });
    }

    function renderBottomCardsStrip(stops, activeDay) {
        if (!elements.dayPlaceCards) return;

        if (elements.dayCardsTitle) {
            elements.dayCardsTitle.innerHTML = activeDay === 'all'
                ? `<i class="fas fa-globe"></i> All Planned Stops`
                : `<i class="fas fa-location-arrow"></i> Day ${activeDay} Stops`;
        }
        if (elements.dayStopsCount) {
            elements.dayStopsCount.textContent = `${stops.length} Places`;
        }

        const cardCounters = {};
        elements.dayPlaceCards.innerHTML = stops.map((stop, idx) => {
            const hasPhoto = stop.photos && stop.photos.length > 0;
            const thumbHtml = hasPhoto
                ? `<img src="${stop.photos[0]}" class="day-place-card-thumb" alt="${stop.placeName}">`
                : `<div class="day-place-card-no-thumb"><i class="fas fa-map-pin"></i></div>`;

            const sDay = stop.day || 1;
            cardCounters[sDay] = (cardCounters[sDay] || 0) + 1;
            const badgeText = activeDay === 'all' ? `D${sDay}-${cardCounters[sDay]}` : String(idx + 1);

            return `
                <div class="day-place-card" data-place-name="${stop.placeName}">
                    <div class="day-place-card-thumb-wrap">
                        ${thumbHtml}
                        <div class="day-place-card-badge" style="background:${getDayColor(stop.day)}">${badgeText}</div>
                    </div>
                    <div class="day-place-card-info">
                        <div class="day-place-card-title">${stop.placeName}</div>
                        <div class="day-place-card-address">${stop.formattedAddress || stop.activity || ''}</div>
                        <div class="day-place-card-meta">
                            <span class="day-place-card-rating"><i class="fas fa-star"></i> ${stop.rating || '4.7'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        elements.dayPlaceCards.querySelectorAll('.day-place-card').forEach(card => {
            card.addEventListener('click', () => {
                const pName = card.dataset.placeName;
                const stopObj = stops.find(s => s.placeName === pName);
                if (stopObj) {
                    focusPlaceOnMapAndDrawer(stopObj);
                }
            });
        });
    }

    function focusPlaceOnMapAndDrawer(stop) {
        state.activePlaceId = stop.placeId || stop.placeName;
        state.activePlace = stop;

        // Pan map and zoom
        const lat = stop.latitude || (stop.coords && stop.coords.lat) || state.destinationCoords.lat;
        const lng = stop.longitude || (stop.coords && stop.coords.lng) || state.destinationCoords.lng;
        panToCoordinates(lat, lng, 15);

        // Highlight card on left
        document.querySelectorAll('.timeline-place-item, .day-place-card').forEach(el => {
            el.classList.toggle('active', el.dataset.placeName === stop.placeName);
        });

        // Scroll timeline to card
        const targetItem = document.querySelector(`.timeline-place-item[data-place-name="${stop.placeName}"]`);
        if (targetItem) {
            targetItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Open Place Details Drawer
        displayPlaceDetails(stop);
    }

    // =========================================================================
    // 8. Place Details Drawer & Photo Carousel
    // =========================================================================
    function displayPlaceDetails(stop) {
        state.activePlace = stop;
        if (!elements.placeDetailsCard) return;

        elements.placeCategory.innerHTML = `<i class="fas fa-map-pin"></i> ${stop.category || 'Sightseeing'}`;
        elements.placeName.textContent = stop.placeName;
        elements.placeRating.innerHTML = `<i class="fas fa-star"></i> <strong>${stop.rating || '4.7'}</strong> (${stop.userRatingsTotal || 1200})`;
        elements.placeDayTag.textContent = `Day ${stop.day || 1} • ${stop.timeSlot || 'Stop'}`;
        elements.placeDayTag.style.background = getDayColor(stop.day);
        elements.placeDayTag.style.color = '#ffffff';

        elements.placeAddress.textContent = stop.formattedAddress || `${stop.placeName}, ${state.destination}`;
        elements.placeActivity.textContent = stop.activity || stop.description || 'Curated itinerary highlight.';

        if (stop.tips) {
            elements.placeTips.textContent = stop.tips;
            elements.placeTipsRow.classList.remove('hidden');
        } else {
            elements.placeTipsRow.classList.add('hidden');
        }

        // Photos gallery setup
        state.carouselPhotos = stop.photos || [];
        state.currentPhotoIndex = 0;

        if (state.carouselPhotos.length > 0) {
            elements.carouselMainWrap.classList.remove('hidden');
            elements.noPhotosFallback.classList.add('hidden');
            elements.carouselMainImg.src = state.carouselPhotos[0];
            elements.carouselCounter.textContent = `1 / ${state.carouselPhotos.length}`;

            // Render thumbnails
            elements.carouselThumbnails.innerHTML = state.carouselPhotos.map((url, i) => `
                <img src="${url}" class="drawer-thumb ${i === 0 ? 'active' : ''}" data-index="${i}" alt="thumb">
            `).join('');

            elements.carouselThumbnails.querySelectorAll('.drawer-thumb').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    const idx = parseInt(thumb.dataset.index, 10);
                    setCarouselPhoto(idx);
                });
            });
        } else {
            elements.carouselMainWrap.classList.add('hidden');
            elements.noPhotosFallback.classList.remove('hidden');
            elements.carouselThumbnails.innerHTML = '';
        }

        elements.placeDetailsCard.classList.remove('hidden');
    }

    function setCarouselPhoto(index) {
        if (state.carouselPhotos.length === 0) return;
        state.currentPhotoIndex = (index + state.carouselPhotos.length) % state.carouselPhotos.length;
        elements.carouselMainImg.src = state.carouselPhotos[state.currentPhotoIndex];
        elements.carouselCounter.textContent = `${state.currentPhotoIndex + 1} / ${state.carouselPhotos.length}`;

        elements.carouselThumbnails.querySelectorAll('.drawer-thumb').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === state.currentPhotoIndex);
        });
    }

    function changeCarouselPhoto(direction) {
        setCarouselPhoto(state.currentPhotoIndex + direction);
    }

    function openLightbox(imgUrl, caption) {
        if (!elements.imageLightbox) return;
        elements.lightboxImg.src = imgUrl;
        elements.lightboxCaption.textContent = caption;
        elements.imageLightbox.classList.remove('hidden');
    }

    function closeLightbox() {
        if (elements.imageLightbox) {
            elements.imageLightbox.classList.add('hidden');
        }
    }

    // =========================================================================
    // 9. Markdown Itinerary Formatting & PDF Download
    // =========================================================================
    function formatMarkdownItinerary(markdownText) {
        if (!markdownText) return '<p>No itinerary guide available.</p>';

        let html = markdownText
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/\n\n/gim, '</p><p>');

        html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
        return `<p>${html}</p>`;
    }

    async function handleDownloadPdf() {
        try {
            elements.downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing PDF...';
            const itineraryHtml = elements.itineraryContent.innerHTML;

            const res = await fetch('/download_pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: state.destination,
                    itinerary: itineraryHtml
                })
            });

            if (!res.ok) throw new Error('PDF export failed.');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.destination.replace(/[^a-zA-Z0-9]/g, '_')}_Itinerary.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            alert('Failed to download PDF: ' + err.message);
        } finally {
            elements.downloadPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> PDF Guide';
        }
    }

    // =========================================================================
    // 10. AI Chatbot Assistant Integration
    // =========================================================================
    function toggleChatbot() {
        state.isChatbotMinimized = !state.isChatbotMinimized;
        elements.chatbotContainer.classList.toggle('minimized', state.isChatbotMinimized);
        elements.toggleChatbotBtn.innerHTML = state.isChatbotMinimized
            ? '<i class="fas fa-chevron-up"></i>'
            : '<i class="fas fa-chevron-down"></i>';
    }

    function openChatbotWithMessage(msg) {
        if (state.isChatbotMinimized) toggleChatbot();
        elements.userMessageInput.value = msg;
        handleSendChatMessage();
    }

    async function handleSendChatMessage() {
        const msg = elements.userMessageInput.value.trim();
        if (!msg) return;

        // Append user bubble
        appendChatBubble('user', msg);
        elements.userMessageInput.value = '';

        // Typing indicator
        const loadingId = 'chat-loading-' + Date.now();
        appendChatBubble('bot', '<i class="fas fa-circle-notch fa-spin"></i> Thinking...', loadingId);

        try {
            const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    destination: state.destination
                })
            });

            const data = await res.json();
            const reply = data.response || 'Sorry, I could not process your request.';
            
            // Format place tags: [place: Place Name] -> interactive clickable button
            const formattedReply = reply.replace(/\[place:\s*(.*?)\]/gi, (match, pName) => {
                return `<button class="chat-place-tag-btn" onclick="window.explorePlaceFromChat('${pName.replace(/'/g, "\\'")}')"><i class="fas fa-map-pin"></i> ${pName}</button>`;
            });

            removeChatBubble(loadingId);
            appendChatBubble('bot', formattedReply);
        } catch (err) {
            removeChatBubble(loadingId);
            appendChatBubble('bot', 'Sorry, an error occurred while connecting to the assistant.');
        }
    }

    function appendChatBubble(sender, text, customId = null) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        if (customId) msgDiv.id = customId;
        msgDiv.innerHTML = `<div class="message-bubble">${text}</div>`;
        elements.chatMessages.appendChild(msgDiv);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    function removeChatBubble(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    window.explorePlaceFromChat = function(placeName) {
        const stop = state.stops.find(s => s.placeName.toLowerCase().includes(placeName.toLowerCase()));
        if (stop) {
            selectDay(String(stop.day));
            setTimeout(() => focusPlaceOnMapAndDrawer(stop), 300);
        } else {
            panToCoordinates(state.destinationCoords.lat, state.destinationCoords.lng, 14);
        }
    };
});