'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import type { Store, StoreCreate, NaverSearchResponse, NaverPlaceItem } from '@/types';

export function useStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Store[]>('/stores/');
      setStores(response.data.sort((a, b) => a.name.localeCompare(b.name, 'ko')));
    } catch (err) {
      setError('매장 목록을 불러오는데 실패했습니다.');
      console.error('Failed to fetch stores:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createStore = async (data: StoreCreate) => {
    const response = await api.post<Store>('/stores/', data);
    setStores((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateStore = async (id: string, data: Partial<StoreCreate>) => {
    const response = await api.patch<Store>(`/stores/${id}`, data);
    setStores((prev) =>
      prev.map((store) => (store.id === id ? response.data : store))
    );
    return response.data;
  };

  const deleteStore = async (id: string) => {
    await api.delete(`/stores/${id}`);
    setStores((prev) => prev.filter((store) => store.id !== id));
  };

  const updateStoreOrder = async (orderUpdate: { id: string; sort_order: number }[]) => {
    await api.put('/stores/order', { stores: orderUpdate });
    // Optimistically update the order locally
    setStores((prev) => {
      const newStores = [...prev];
      orderUpdate.forEach((item) => {
        const store = newStores.find((s) => s.id === item.id);
        if (store) {
          store.sort_order = item.sort_order;
        }
      });
      return newStores.sort((a, b) => a.sort_order - b.sort_order);
    });
  };

  const searchNaverPlaces = async (query: string): Promise<NaverPlaceItem[]> => {
    if (!query.trim()) return [];
    try {
      const response = await api.get<NaverSearchResponse>('/stores/naver/search', {
        params: { query, display: 5 }
      });
      return response.data.items;
    } catch (err) {
      console.error('Failed to search Naver places:', err);
      return [];
    }
  };

  // 네이버 좌표를 일반 좌표로 변환 (네이버는 KATECH 좌표계 사용)
  const convertNaverCoords = (mapx: string, mapy: string): { lat: number; lng: number } => {
    // 네이버 지역검색 API는 좌표를 10000000으로 나눈 값을 제공
    const lng = parseInt(mapx, 10) / 10000000;
    const lat = parseInt(mapy, 10) / 10000000;
    return { lat, lng };
  };

  // NaverPlaceItem을 StoreCreate로 변환
  const naverPlaceToStoreCreate = (place: NaverPlaceItem): StoreCreate => {
    const coords = convertNaverCoords(place.mapx, place.mapy);
    return {
      name: place.title,
      address: place.address || null,
      road_address: place.road_address || null,
      latitude: coords.lat || null,
      longitude: coords.lng || null,
      naver_place_id: place.link || null,
      category: place.category || null,
      phone: place.telephone || null,
    };
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchStores();
  }, []);

  return {
    stores,
    isLoading,
    error,
    fetchStores,
    createStore,
    updateStore,
    deleteStore,
    updateStoreOrder,
    searchNaverPlaces,
    naverPlaceToStoreCreate,
  };
}
