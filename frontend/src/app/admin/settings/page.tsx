'use client';

import { useState } from 'react';
import { Database, RefreshCw, AlertTriangle } from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import api from '@/lib/api';

export default function AdminSettingsPage() {
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const runSeedData = async () => {
    if (!confirm('시드 데이터를 실행하시겠습니까? 기존 카테고리가 있으면 건너뜁니다.')) {
      return;
    }

    try {
      setSeedLoading(true);
      setSeedResult(null);
      await api.post('/admin/seed');
      setSeedResult('시드 데이터가 성공적으로 실행되었습니다.');
    } catch (error) {
      console.error('Failed to run seed:', error);
      setSeedResult('시드 데이터 실행에 실패했습니다.');
    } finally {
      setSeedLoading(false);
    }
  };

  return (
    <AdminLayout title="시스템 설정">
      <div className="max-w-2xl space-y-6">
        {/* Seed data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database size={20} />
              시드 데이터
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              기본 카테고리 데이터를 생성합니다. 이미 존재하는 카테고리는 건너뜁니다.
            </p>
            {seedResult && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  seedResult.includes('성공')
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {seedResult}
              </div>
            )}
            <Button onClick={runSeedData} isLoading={seedLoading}>
              <RefreshCw size={18} />
              시드 데이터 실행
            </Button>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              위험 영역
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              아래 작업은 되돌릴 수 없습니다. 신중하게 실행하세요.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">전체 데이터 초기화</p>
                  <p className="text-sm text-gray-600">
                    모든 사용자 데이터를 삭제합니다.
                  </p>
                </div>
                <Button variant="danger" disabled>
                  초기화
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
