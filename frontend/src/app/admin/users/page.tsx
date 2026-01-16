'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, MoreVertical, Shield, ShieldOff, UserX } from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { User, PaginatedResponse } from '@/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', '10');
      if (search) params.append('search', search);

      const response = await api.get<PaginatedResponse<User>>(
        `/admin/users?${params.toString()}`
      );
      setUsers(response.data.items);
      setTotal(response.data.total);
      setPages(response.data.pages);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`이 사용자의 권한을 ${newRole === 'admin' ? '관리자' : '일반 사용자'}로 변경하시겠습니까?`)) {
      return;
    }

    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
    setOpenMenu(null);
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    const action = isActive ? '비활성화' : '활성화';
    if (!confirm(`이 사용자를 ${action}하시겠습니까?`)) {
      return;
    }

    try {
      await api.put(`/admin/users/${userId}/active`, { is_active: !isActive });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
    setOpenMenu(null);
  };

  return (
    <AdminLayout title="사용자 관리">
      <div className="space-y-6">
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="이메일 또는 이름으로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Button type="submit">검색</Button>
            </form>
          </CardContent>
        </Card>

        {/* Users table */}
        <Card>
          <CardHeader>
            <CardTitle>사용자 목록 ({total}명)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile view */}
            <div className="lg:hidden divide-y divide-gray-100">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="p-4">
                    <div className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                  </div>
                ))
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  사용자가 없습니다
                </div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800">{user.name}</p>
                          <Badge variant={user.role === 'admin' ? 'info' : 'default'}>
                            {user.role === 'admin' ? '관리자' : '사용자'}
                          </Badge>
                          {!user.is_active && (
                            <Badge variant="danger">비활성</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          가입일: {formatDate(user.created_at)}
                        </p>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {openMenu === user.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => toggleRole(user.id, user.role)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              {user.role === 'admin' ? (
                                <>
                                  <ShieldOff size={16} />
                                  일반 사용자로 변경
                                </>
                              ) : (
                                <>
                                  <Shield size={16} />
                                  관리자로 변경
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => toggleActive(user.id, user.is_active)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600"
                            >
                              <UserX size={16} />
                              {user.is_active ? '비활성화' : '활성화'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop view */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>권한</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        로딩 중...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        사용자가 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'info' : 'default'}>
                            {user.role === 'admin' ? '관리자' : '사용자'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'success' : 'danger'}>
                            {user.is_active ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                              <MoreVertical size={18} />
                            </button>
                            {openMenu === user.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <button
                                  onClick={() => toggleRole(user.id, user.role)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                                >
                                  {user.role === 'admin' ? (
                                    <>
                                      <ShieldOff size={16} />
                                      일반 사용자로 변경
                                    </>
                                  ) : (
                                    <>
                                      <Shield size={16} />
                                      관리자로 변경
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => toggleActive(user.id, user.is_active)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600"
                                >
                                  <UserX size={16} />
                                  {user.is_active ? '비활성화' : '활성화'}
                                </button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              이전
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              {page} / {pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
