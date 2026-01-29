'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, MapPin, Crosshair } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { NaverPlaceItem, StoreCreate } from '@/types';

declare global {
  interface Window {
    naver: any;
  }
}

interface NaverMapProps {
  onSelectPlace: (place: StoreCreate) => void;
  searchPlaces: (query: string) => Promise<NaverPlaceItem[]>;
  convertToStoreCreate: (place: NaverPlaceItem) => StoreCreate;
}

export function NaverMap({ onSelectPlace, searchPlaces, convertToStoreCreate }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NaverPlaceItem[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<NaverPlaceItem | null>(null);

  // Load Naver Maps SDK
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    console.log('Naver Map Client ID:', clientId);
    console.log('Script URL:', `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`);
    if (!clientId) {
      console.error('Naver Map Client ID is not set');
      return;
    }

    // Check if script already exists
    if (window.naver && window.naver.maps) {
      setIsMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    script.onload = () => {
      setIsMapLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
    };
  }, []);

  // Get current position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Default to Seoul City Hall
          setCurrentPosition({ lat: 37.5666805, lng: 126.9784147 });
        }
      );
    } else {
      // Default to Seoul City Hall
      setCurrentPosition({ lat: 37.5666805, lng: 126.9784147 });
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !currentPosition) return;

    const { naver } = window;
    const mapOptions = {
      center: new naver.maps.LatLng(currentPosition.lat, currentPosition.lng),
      zoom: 15,
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT,
      },
    };

    mapInstanceRef.current = new naver.maps.Map(mapRef.current, mapOptions);

    // Add current position marker
    new naver.maps.Marker({
      position: new naver.maps.LatLng(currentPosition.lat, currentPosition.lng),
      map: mapInstanceRef.current,
      icon: {
        content: `<div style="width: 20px; height: 20px; background: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        anchor: new naver.maps.Point(10, 10),
      },
    });

    // Create info window
    infoWindowRef.current = new naver.maps.InfoWindow({
      content: '',
      backgroundColor: 'white',
      borderColor: '#ddd',
      borderWidth: 1,
      anchorSize: new naver.maps.Size(10, 10),
      pixelOffset: new naver.maps.Point(0, -5),
    });
  }, [isMapLoaded, currentPosition]);

  // Clear markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);

  // Convert Naver coords
  const convertNaverCoords = (mapx: string, mapy: string) => {
    const lng = parseInt(mapx, 10) / 10000000;
    const lat = parseInt(mapy, 10) / 10000000;
    return { lat, lng };
  };

  // Add markers for search results
  const addMarkers = useCallback((places: NaverPlaceItem[]) => {
    if (!mapInstanceRef.current || !window.naver) return;

    const { naver } = window;
    const bounds = new naver.maps.LatLngBounds();

    places.forEach((place, index) => {
      const coords = convertNaverCoords(place.mapx, place.mapy);
      const position = new naver.maps.LatLng(coords.lat, coords.lng);
      bounds.extend(position);

      const marker = new naver.maps.Marker({
        position,
        map: mapInstanceRef.current,
        icon: {
          content: `<div style="
            width: 30px; height: 30px;
            background: #EF4444;
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">${index + 1}</div>`,
          anchor: new naver.maps.Point(15, 15),
        },
      });

      naver.maps.Event.addListener(marker, 'click', () => {
        setSelectedPlace(place);

        const content = `
          <div style="padding: 10px; min-width: 200px; max-width: 280px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${place.title}</div>
            ${place.road_address ? `<div style="font-size: 12px; color: #666; margin-bottom: 2px;">${place.road_address}</div>` : ''}
            ${place.category ? `<div style="font-size: 11px; color: #999;">${place.category}</div>` : ''}
            <button
              onclick="window.selectNaverPlace(${index})"
              style="
                margin-top: 8px;
                padding: 6px 12px;
                background: #3B82F6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                width: 100%;
              "
            >이 매장 선택</button>
          </div>
        `;

        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (places.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
    }
  }, []);

  // Set up window function for marker button click
  useEffect(() => {
    (window as any).selectNaverPlace = (index: number) => {
      const place = searchResults[index];
      if (place) {
        const storeData = convertToStoreCreate(place);
        onSelectPlace(storeData);
      }
    };

    return () => {
      delete (window as any).selectNaverPlace;
    };
  }, [searchResults, convertToStoreCreate, onSelectPlace]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    clearMarkers();
    setSelectedPlace(null);

    try {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
      addMarkers(results);
    } finally {
      setIsSearching(false);
    }
  };

  // Move to current position
  const moveToCurrentPosition = () => {
    if (currentPosition && mapInstanceRef.current) {
      const { naver } = window;
      mapInstanceRef.current.setCenter(new naver.maps.LatLng(currentPosition.lat, currentPosition.lng));
      mapInstanceRef.current.setZoom(15);
    }
  };

  // Handle select from list
  const handleSelectFromList = (place: NaverPlaceItem, index: number) => {
    setSelectedPlace(place);

    // Move map to marker
    if (mapInstanceRef.current && window.naver) {
      const { naver } = window;
      const coords = convertNaverCoords(place.mapx, place.mapy);
      mapInstanceRef.current.setCenter(new naver.maps.LatLng(coords.lat, coords.lng));

      // Trigger marker click
      const marker = markersRef.current[index];
      if (marker) {
        naver.maps.Event.trigger(marker, 'click');
      }
    }
  };

  if (!isMapLoaded || !currentPosition) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">지도를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <Input
          placeholder="매장 이름으로 검색 (예: 스타벅스 강남)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleSearch}
          isLoading={isSearching}
          className="px-4"
        >
          <Search size={18} />
        </Button>
      </div>

      {/* Map container */}
      <div className="relative">
        <div ref={mapRef} className="w-full h-72 rounded-lg border border-gray-200" />

        {/* Current position button */}
        <button
          type="button"
          onClick={moveToCurrentPosition}
          className="absolute bottom-3 right-3 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 border border-gray-200"
          title="현재 위치로 이동"
        >
          <Crosshair size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Search results list */}
      {searchResults.length > 0 && (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
          {searchResults.map((place, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectFromList(place, idx)}
              className={`w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-2 ${
                selectedPlace === place ? 'bg-blue-50' : ''
              }`}
            >
              <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate">{place.title}</div>
                {place.road_address && (
                  <div className="text-sm text-gray-500 truncate flex items-center gap-1">
                    <MapPin size={12} />
                    {place.road_address}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Select button */}
      {selectedPlace && (
        <Button
          type="button"
          onClick={() => {
            const storeData = convertToStoreCreate(selectedPlace);
            onSelectPlace(storeData);
          }}
          className="w-full"
        >
          "{selectedPlace.title}" 선택
        </Button>
      )}
    </div>
  );
}
