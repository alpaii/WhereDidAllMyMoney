'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, MapPin, Tag } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button, Input, Modal } from '@/components/ui';
import { KakaoMap } from '@/components/KakaoMap';
import { useStores } from '@/hooks/useStores';
import type { Store, StoreCreate } from '@/types';

const storeSchema = z.object({
  name: z.string().min(1, '매장 이름을 입력하세요'),
});

type StoreForm = z.infer<typeof storeSchema>;

function StoreItem({
  store,
  onEdit,
}: {
  store: Store;
  onEdit: (store: Store) => void;
}) {
  return (
    <div className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex-1 min-w-0">
        <span className="font-medium text-gray-800 block">{store.name}</span>
        {store.road_address && (
          <span className="text-sm text-gray-500 flex items-center gap-1 mt-1">
            <MapPin size={14} className="flex-shrink-0" />
            <span className="truncate">{store.road_address}</span>
          </span>
        )}
        {store.category && (
          <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <Tag size={12} className="flex-shrink-0" />
            {store.category}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(store)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          title="수정"
        >
          <Pencil size={18} />
        </button>
      </div>
    </div>
  );
}

export default function StoresPage() {
  const {
    stores,
    isLoading,
    createStore,
    updateStore,
    deleteStore,
  } = useStores();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<StoreCreate | null>(null);
  const [manualMode, setManualMode] = useState(false);

  const form = useForm<StoreForm>({
    resolver: zodResolver(storeSchema),
  });

  const handleSelectPlace = (place: StoreCreate) => {
    setSelectedPlace(place);
    form.setValue('name', place.name);
  };

  const handleSave = async (data: StoreForm) => {
    try {
      setIsSubmitting(true);
      if (editingStore) {
        // 수정 모드 - 위치 정보도 함께 업데이트
        const updateData: Partial<StoreCreate> = selectedPlace
          ? { ...selectedPlace, name: data.name }
          : { name: data.name };
        await updateStore(editingStore.id, updateData);
      } else {
        // 생성 모드
        const storeData: StoreCreate = selectedPlace
          ? { ...selectedPlace, name: data.name }
          : { name: data.name };
        await createStore(storeData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save store:', error);
      alert(editingStore ? '매장 수정에 실패했습니다.' : '매장 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStore(null);
    setSelectedPlace(null);
    setManualMode(false);
    form.reset();
  };

  const openCreateModal = () => {
    setEditingStore(null);
    setSelectedPlace(null);
    setManualMode(false);
    form.reset({ name: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    // 기존 매장 정보를 selectedPlace에 설정
    setSelectedPlace({
      name: store.name,
      address: store.address || undefined,
      road_address: store.road_address || undefined,
      latitude: store.latitude || undefined,
      longitude: store.longitude || undefined,
      naver_place_id: store.naver_place_id || undefined,
      category: store.category || undefined,
      phone: store.phone || undefined,
    });
    setManualMode(false);
    form.reset({ name: store.name });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('이 매장을 삭제하시겠습니까?')) {
      try {
        await deleteStore(id);
      } catch (error) {
        console.error('Failed to delete store:', error);
        alert('매장 삭제에 실패했습니다.');
      }
    }
  };

  return (
    <DashboardLayout
      title="매장 관리"
      action={
        <Button onClick={openCreateModal} size="icon" title="매장 추가">
          <Plus size={20} />
        </Button>
      }
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            등록된 매장이 없습니다
          </div>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => (
              <StoreItem
                key={store.id}
                store={store}
                onEdit={openEditModal}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingStore ? '매장 수정' : '매장 추가'}
          size="lg"
        >
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            {/* 직접 입력 모드일 때 */}
            {manualMode ? (
              <>
                <Input
                  id="name"
                  label="매장 이름"
                  error={form.formState.errors.name?.message}
                  {...form.register('name')}
                />
                <button
                  type="button"
                  onClick={() => setManualMode(false)}
                  className="text-sm text-primary-600 hover:underline"
                >
                  지도에서 검색하기
                </button>
              </>
            ) : (
              <>
                {/* 지도 검색 모드 */}
                {!selectedPlace ? (
                  <div className="space-y-3">
                    <KakaoMap onSelectPlace={handleSelectPlace} />
                    <button
                      type="button"
                      onClick={() => setManualMode(true)}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      직접 입력하기
                    </button>
                  </div>
                ) : (
                  /* 선택된 장소 표시 */
                  <div className="space-y-3">
                    {/* 좌표가 있는 경우 (지도로 저장된 매장) */}
                    {selectedPlace.latitude && selectedPlace.longitude ? (
                      <>
                        <KakaoMap
                          onSelectPlace={handleSelectPlace}
                          initialStore={selectedPlace}
                        />

                        {/* 매장 정보 표시 (지도 밖) */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="font-medium text-gray-800">{selectedPlace.name}</div>
                          {selectedPlace.road_address && (
                            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin size={12} />
                              {selectedPlace.road_address}
                            </div>
                          )}
                          {selectedPlace.category && (
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <Tag size={10} />
                              {selectedPlace.category}
                            </div>
                          )}
                        </div>

                        <Input
                          id="name"
                          label="매장 이름 (수정 가능)"
                          error={form.formState.errors.name?.message}
                          {...form.register('name')}
                        />

                        <button
                          type="button"
                          onClick={() => setManualMode(true)}
                          className="text-sm text-primary-600 hover:underline"
                        >
                          직접 입력하기
                        </button>
                      </>
                    ) : (
                      /* 좌표가 없는 경우 (직접 입력으로 저장된 매장) */
                      <>
                        <Input
                          id="name"
                          label="매장 이름 (수정 가능)"
                          error={form.formState.errors.name?.message}
                          {...form.register('name')}
                        />

                        <button
                          type="button"
                          onClick={() => setSelectedPlace(null)}
                          className="text-sm text-primary-600 hover:underline"
                        >
                          지도에서 검색하기
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between -mx-6 px-6 mt-6 pt-4 border-t border-gray-200">
              {editingStore ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    handleDelete(editingStore.id);
                    handleCloseModal();
                  }}
                >
                  삭제
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  취소
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={!manualMode && !selectedPlace}
                >
                  {editingStore ? '수정' : '추가'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
