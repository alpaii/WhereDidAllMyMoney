'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import type {
  MaintenanceFee,
  MaintenanceFeeCreate,
  MaintenanceFeeUpdate,
  MaintenanceFeeItemTemplate,
  MaintenanceFeeItemTemplateCreate,
  MaintenanceFeeItemTemplateUpdate,
  MaintenanceFeeRecord,
  MaintenanceFeeRecordCreate,
  MaintenanceFeeRecordUpdate,
  MaintenanceFeeDetail,
  MaintenanceFeeDetailCreate,
  MaintenanceFeeStatsByMonth,
  MaintenanceFeeStatsByItem,
} from '@/types';

export function useMaintenanceFees() {
  const [fees, setFees] = useState<MaintenanceFee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchFees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<MaintenanceFee[]>('/maintenance-fees/');
      setFees(response.data);
    } catch (err) {
      setError('관리비 장소 목록을 불러오는데 실패했습니다.');
      console.error('Failed to fetch maintenance fees:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createFee = async (data: MaintenanceFeeCreate) => {
    const response = await api.post<MaintenanceFee>('/maintenance-fees/', data);
    setFees((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateFee = async (id: string, data: MaintenanceFeeUpdate) => {
    const response = await api.patch<MaintenanceFee>(`/maintenance-fees/${id}`, data);
    setFees((prev) =>
      prev.map((fee) => (fee.id === id ? response.data : fee))
    );
    return response.data;
  };

  const deleteFee = async (id: string) => {
    await api.delete(`/maintenance-fees/${id}`);
    setFees((prev) => prev.filter((fee) => fee.id !== id));
  };

  const updateFeeOrder = async (orderUpdate: { id: string; sort_order: number }[]) => {
    await api.put('/maintenance-fees/order', { items: orderUpdate });
    setFees((prev) => {
      const newFees = [...prev];
      orderUpdate.forEach((item) => {
        const fee = newFees.find((f) => f.id === item.id);
        if (fee) {
          fee.sort_order = item.sort_order;
        }
      });
      return newFees.sort((a, b) => a.sort_order - b.sort_order);
    });
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchFees();
  }, [fetchFees]);

  return {
    fees,
    isLoading,
    error,
    fetchFees,
    createFee,
    updateFee,
    deleteFee,
    updateFeeOrder,
  };
}

// 항목 템플릿 관리 훅
export function useItemTemplates(feeId: string | null) {
  const [templates, setTemplates] = useState<MaintenanceFeeItemTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!feeId) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<MaintenanceFeeItemTemplate[]>(`/maintenance-fees/${feeId}/item-templates`);
      setTemplates(response.data);
    } catch (err) {
      setError('항목 템플릿을 불러오는데 실패했습니다.');
      console.error('Failed to fetch item templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [feeId]);

  const createTemplate = async (data: MaintenanceFeeItemTemplateCreate) => {
    if (!feeId) throw new Error('feeId is required');
    const response = await api.post<MaintenanceFeeItemTemplate>(`/maintenance-fees/${feeId}/item-templates`, data);
    setTemplates((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateTemplate = async (templateId: string, data: MaintenanceFeeItemTemplateUpdate) => {
    if (!feeId) throw new Error('feeId is required');
    const response = await api.patch<MaintenanceFeeItemTemplate>(
      `/maintenance-fees/${feeId}/item-templates/${templateId}`,
      data
    );
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? response.data : t))
    );
    return response.data;
  };

  const deleteTemplate = async (templateId: string) => {
    if (!feeId) throw new Error('feeId is required');
    await api.delete(`/maintenance-fees/${feeId}/item-templates/${templateId}`);
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const updateTemplateOrder = async (orderUpdate: { id: string; sort_order: number }[]) => {
    if (!feeId) throw new Error('feeId is required');
    await api.put(`/maintenance-fees/${feeId}/item-templates/order`, { items: orderUpdate });
    setTemplates((prev) => {
      const newTemplates = [...prev];
      orderUpdate.forEach((item) => {
        const template = newTemplates.find((t) => t.id === item.id);
        if (template) {
          template.sort_order = item.sort_order;
        }
      });
      return newTemplates.sort((a, b) => a.sort_order - b.sort_order);
    });
  };

  useEffect(() => {
    if (feeId) {
      fetchTemplates();
    } else {
      setTemplates([]);
    }
  }, [feeId, fetchTemplates]);

  return {
    templates,
    isLoading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    updateTemplateOrder,
  };
}

// 특정 관리비 장소의 월별 기록 관리 훅
export function useMaintenanceFeeRecords(feeId: string | null) {
  const [records, setRecords] = useState<MaintenanceFeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!feeId) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<MaintenanceFeeRecord[]>(`/maintenance-fees/${feeId}/records`);
      setRecords(response.data);
    } catch (err) {
      setError('관리비 기록을 불러오는데 실패했습니다.');
      console.error('Failed to fetch maintenance fee records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [feeId]);

  const createRecord = async (data: MaintenanceFeeRecordCreate) => {
    if (!feeId) throw new Error('feeId is required');
    const response = await api.post<MaintenanceFeeRecord>(`/maintenance-fees/${feeId}/records`, data);
    setRecords((prev) => [response.data, ...prev]);
    return response.data;
  };

  const updateRecord = async (recordId: string, data: MaintenanceFeeRecordUpdate) => {
    if (!feeId) throw new Error('feeId is required');
    const response = await api.patch<MaintenanceFeeRecord>(
      `/maintenance-fees/${feeId}/records/${recordId}`,
      data
    );
    setRecords((prev) =>
      prev.map((record) => (record.id === recordId ? response.data : record))
    );
    return response.data;
  };

  const deleteRecord = async (recordId: string) => {
    if (!feeId) throw new Error('feeId is required');
    await api.delete(`/maintenance-fees/${feeId}/records/${recordId}`);
    setRecords((prev) => prev.filter((record) => record.id !== recordId));
  };

  const getRecord = async (recordId: string) => {
    if (!feeId) throw new Error('feeId is required');
    const response = await api.get<MaintenanceFeeRecord>(
      `/maintenance-fees/${feeId}/records/${recordId}`
    );
    return response.data;
  };

  // 상세 항목 일괄 저장
  const bulkUpdateDetails = async (recordId: string, details: MaintenanceFeeDetailCreate[]) => {
    if (!feeId) throw new Error('feeId is required');
    const response = await api.put<MaintenanceFeeDetail[]>(
      `/maintenance-fees/${feeId}/records/${recordId}/details`,
      { details }
    );
    // 해당 레코드의 상세 항목 업데이트
    setRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? { ...record, details: response.data, total_amount: details.reduce((sum, d) => sum + d.amount, 0) }
          : record
      )
    );
    return response.data;
  };

  // 통계 조회
  const getStatsByMonth = async (): Promise<MaintenanceFeeStatsByMonth[]> => {
    if (!feeId) throw new Error('feeId is required');
    const response = await api.get<MaintenanceFeeStatsByMonth[]>(
      `/maintenance-fees/${feeId}/statistics/monthly`
    );
    return response.data;
  };

  const getStatsByItem = async (itemTemplateId: string): Promise<MaintenanceFeeStatsByItem[]> => {
    if (!feeId) throw new Error('feeId is required');
    const response = await api.get<MaintenanceFeeStatsByItem[]>(
      `/maintenance-fees/${feeId}/statistics/items`,
      { params: { item_template_id: itemTemplateId } }
    );
    return response.data;
  };

  useEffect(() => {
    if (feeId) {
      fetchRecords();
    } else {
      setRecords([]);
    }
  }, [feeId, fetchRecords]);

  return {
    records,
    isLoading,
    error,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    getRecord,
    bulkUpdateDetails,
    getStatsByMonth,
    getStatsByItem,
  };
}
