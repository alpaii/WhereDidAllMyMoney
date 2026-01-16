'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Shield } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import Link from 'next/link';

const profileSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, '현재 비밀번호를 입력하세요'),
  newPassword: z.string().min(6, '새 비밀번호는 최소 6자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      setIsProfileSubmitting(true);
      setProfileError(null);
      setProfileSuccess(false);
      await api.put('/auth/me', { name: data.name });
      await fetchUser();
      setProfileSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setProfileError(error.response?.data?.detail || '프로필 업데이트에 실패했습니다');
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      setIsPasswordSubmitting(true);
      setPasswordError(null);
      setPasswordSuccess(false);
      await api.put('/auth/password', {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });
      setPasswordSuccess(true);
      resetPassword();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setPasswordError(error.response?.data?.detail || '비밀번호 변경에 실패했습니다');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="설정">
      <div className="max-w-2xl space-y-6">
        {/* Profile settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} />
              프로필 설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profileSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                프로필이 업데이트되었습니다
              </div>
            )}
            {profileError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {profileError}
              </div>
            )}
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <Input
                id="email"
                label="이메일"
                value={user?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <Input
                id="name"
                label="이름"
                error={profileErrors.name?.message}
                {...registerProfile('name')}
              />
              <div className="flex justify-end">
                <Button type="submit" isLoading={isProfileSubmitting}>
                  저장
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock size={20} />
              비밀번호 변경
            </CardTitle>
          </CardHeader>
          <CardContent>
            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                비밀번호가 변경되었습니다
              </div>
            )}
            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {passwordError}
              </div>
            )}
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <Input
                id="currentPassword"
                type="password"
                label="현재 비밀번호"
                error={passwordErrors.currentPassword?.message}
                {...registerPassword('currentPassword')}
              />
              <Input
                id="newPassword"
                type="password"
                label="새 비밀번호"
                error={passwordErrors.newPassword?.message}
                {...registerPassword('newPassword')}
              />
              <Input
                id="confirmPassword"
                type="password"
                label="새 비밀번호 확인"
                error={passwordErrors.confirmPassword?.message}
                {...registerPassword('confirmPassword')}
              />
              <div className="flex justify-end">
                <Button type="submit" isLoading={isPasswordSubmitting}>
                  변경
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Admin link */}
        {user?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={20} />
                관리자
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                관리자 권한으로 시스템을 관리할 수 있습니다.
              </p>
              <Link href="/admin">
                <Button>관리자 대시보드</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
