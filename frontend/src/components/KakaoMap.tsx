'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, MapPin, Crosshair } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { StoreCreate } from '@/types';

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string; // longitude
  y: string; // latitude
  place_url: string;
  distance?: string;
}

interface KakaoMapProps {
  onSelectPlace: (place: StoreCreate) => void;
  initialStore?: StoreCreate | null;
}

export function KakaoMap({ onSelectPlace, initialStore }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);

  // Load Kakao Maps SDK
  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
    console.log('Kakao Map App Key:', appKey ? `${appKey.substring(0, 4)}...` : 'not set');

    if (!appKey) {
      console.error('Kakao Map App Key is not set');
      return;
    }

    // Check if script already exists
    if (window.kakao && window.kakao.maps) {
      console.log('Kakao SDK already loaded, calling maps.load()');
      window.kakao.maps.load(() => {
        console.log('Kakao maps.load() callback - already loaded');
        setIsMapLoaded(true);
      });
      return;
    }

    console.log('Loading Kakao SDK script...');
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      console.log('Kakao SDK script loaded, calling maps.load()');
      window.kakao.maps.load(() => {
        console.log('Kakao maps.load() callback - map ready');
        setIsMapLoaded(true);
      });
    };
    script.onerror = (e) => {
      console.error('Kakao SDK script load error:', e);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
    };
  }, []);

  // Get current position
  useEffect(() => {
    console.log('Getting current position...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Geolocation success:', position.coords.latitude, position.coords.longitude);
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          console.log('Using default position (Seoul City Hall)');
          // Default to Seoul City Hall
          setCurrentPosition({ lat: 37.5666805, lng: 126.9784147 });
        },
        { timeout: 5000 } // 5 second timeout
      );
    } else {
      console.log('Geolocation not supported, using default position');
      // Default to Seoul City Hall
      setCurrentPosition({ lat: 37.5666805, lng: 126.9784147 });
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !currentPosition) return;

    const { kakao } = window;

    // 초기 매장이 있고 좌표가 있으면 해당 위치로, 아니면 현재 위치로
    const initialCenter = initialStore?.latitude && initialStore?.longitude
      ? new kakao.maps.LatLng(initialStore.latitude, initialStore.longitude)
      : new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng);

    const mapOptions = {
      center: initialCenter,
      level: 3, // zoom level (1-14, smaller is more zoomed in)
    };

    mapInstanceRef.current = new kakao.maps.Map(mapRef.current, mapOptions);

    // Add zoom control
    const zoomControl = new kakao.maps.ZoomControl();
    mapInstanceRef.current.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    // Add current position marker (파란색 - 내 위치)
    const currentPosMarker = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng),
      content: `<div style="width: 16px; height: 16px; background: #3B82F6; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
      yAnchor: 0.5,
      xAnchor: 0.5,
    });
    currentPosMarker.setMap(mapInstanceRef.current);

    // 초기 매장 위치 마커 (빨간색 - 등록된 매장)
    if (initialStore?.latitude && initialStore?.longitude) {
      const storeMarker = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(initialStore.latitude, initialStore.longitude),
        content: `<div style="
          width: 36px; height: 36px;
          background: #EF4444;
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
        yAnchor: 0.5,
        xAnchor: 0.5,
      });
      storeMarker.setMap(mapInstanceRef.current);
      markersRef.current.push(storeMarker);
    }

    // Initialize InfoWindow (검색 결과용)
    infoWindowRef.current = new kakao.maps.InfoWindow({ zIndex: 1 });

    // Initialize Places service
    placesServiceRef.current = new kakao.maps.services.Places();
  }, [isMapLoaded, currentPosition, initialStore]);

  // Clear markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);

  // Convert KakaoPlace to StoreCreate
  const convertToStoreCreate = useCallback((place: KakaoPlace): StoreCreate => {
    return {
      name: place.place_name,
      address: place.address_name || undefined,
      road_address: place.road_address_name || undefined,
      latitude: parseFloat(place.y),
      longitude: parseFloat(place.x),
      naver_place_id: place.id, // Using this field for Kakao place ID
      category: place.category_name || undefined,
      phone: place.phone || undefined,
    };
  }, []);

  // Add markers for search results
  const addMarkers = useCallback((places: KakaoPlace[]) => {
    if (!mapInstanceRef.current || !window.kakao) return;

    const { kakao } = window;
    const bounds = new kakao.maps.LatLngBounds();

    places.forEach((place, index) => {
      const position = new kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x));
      bounds.extend(position);

      // Create custom marker with number
      const markerContent = document.createElement('div');
      markerContent.innerHTML = `
        <div style="
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
          cursor: pointer;
        ">${index + 1}</div>
      `;

      const marker = new kakao.maps.CustomOverlay({
        position,
        content: markerContent,
        yAnchor: 0.5,
        xAnchor: 0.5,
      });

      marker.setMap(mapInstanceRef.current);

      // Add click event
      markerContent.onclick = () => {
        setSelectedPlace(place);

        const infoContent = `
          <div style="padding: 10px; min-width: 200px; max-width: 280px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="font-weight: 600; margin-bottom: 4px;">${place.place_name}</div>
            ${place.road_address_name ? `<div style="font-size: 12px; color: #666; margin-bottom: 2px;">${place.road_address_name}</div>` : ''}
            ${place.category_name ? `<div style="font-size: 11px; color: #999;">${place.category_name}</div>` : ''}
          </div>
        `;

        infoWindowRef.current.setContent(infoContent);
        infoWindowRef.current.setPosition(position);
        infoWindowRef.current.open(mapInstanceRef.current);
      };

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (places.length > 0) {
      mapInstanceRef.current.setBounds(bounds);
    }
  }, []);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim() || !placesServiceRef.current) return;

    setIsSearching(true);
    clearMarkers();
    setSelectedPlace(null);

    // Search using Kakao Places API
    placesServiceRef.current.keywordSearch(
      searchQuery,
      (results: KakaoPlace[], status: any) => {
        const { kakao } = window;
        if (status === kakao.maps.services.Status.OK) {
          setSearchResults(results);
          addMarkers(results);
        } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
          setSearchResults([]);
          alert('검색 결과가 없습니다.');
        } else {
          console.error('Search error:', status);
          setSearchResults([]);
        }
        setIsSearching(false);
      },
      {
        location: currentPosition
          ? new window.kakao.maps.LatLng(currentPosition.lat, currentPosition.lng)
          : undefined,
        radius: 20000, // 20km radius
        size: 15, // max results
      }
    );
  };

  // Move to current position
  const moveToCurrentPosition = () => {
    if (currentPosition && mapInstanceRef.current) {
      const { kakao } = window;
      mapInstanceRef.current.setCenter(new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng));
      mapInstanceRef.current.setLevel(3);
    }
  };

  // Handle select from list
  const handleSelectFromList = (place: KakaoPlace, index: number) => {
    setSelectedPlace(place);

    // Move map to marker
    if (mapInstanceRef.current && window.kakao) {
      const { kakao } = window;
      const position = new kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x));
      mapInstanceRef.current.setCenter(position);

      // Show info window
      const infoContent = `
        <div style="padding: 10px; min-width: 200px; max-width: 280px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="font-weight: 600; margin-bottom: 4px;">${place.place_name}</div>
          ${place.road_address_name ? `<div style="font-size: 12px; color: #666; margin-bottom: 2px;">${place.road_address_name}</div>` : ''}
          ${place.category_name ? `<div style="font-size: 11px; color: #999;">${place.category_name}</div>` : ''}
        </div>
      `;
      infoWindowRef.current.setContent(infoContent);
      infoWindowRef.current.setPosition(position);
      infoWindowRef.current.open(mapInstanceRef.current);
    }
  };

  if (!isMapLoaded || !currentPosition) {
    console.log('Waiting for:', { isMapLoaded, hasPosition: !!currentPosition });
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
              key={place.id}
              type="button"
              onClick={() => handleSelectFromList(place, idx)}
              className={`w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-2 ${
                selectedPlace?.id === place.id ? 'bg-blue-50' : ''
              }`}
            >
              <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate">{place.place_name}</div>
                {place.road_address_name && (
                  <div className="text-sm text-gray-500 truncate flex items-center gap-1">
                    <MapPin size={12} />
                    {place.road_address_name}
                  </div>
                )}
                {place.category_name && (
                  <div className="text-xs text-gray-400 truncate">{place.category_name}</div>
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
            // 선택 후 상태 초기화
            setSearchResults([]);
            setSelectedPlace(null);
            setSearchQuery('');
            clearMarkers();
          }}
          className="w-full"
        >
          "{selectedPlace.place_name}" 선택
        </Button>
      )}
    </div>
  );
}
