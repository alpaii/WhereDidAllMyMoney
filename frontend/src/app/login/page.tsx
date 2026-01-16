'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력하세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      await login(data);
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '로그인에 실패했습니다');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <span className="text-5xl">💰</span>
            <h1 className="mt-4 text-2xl font-bold text-gray-800">소비 관리</h1>
            <p className="mt-2 text-gray-600">계정에 로그인하세요</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              id="email"
              type="email"
              label="이메일"
              placeholder="email@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              id="password"
              type="password"
              label="비밀번호"
              placeholder="비밀번호를 입력하세요"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              로그인
            </Button>
          </form>

          {/* Register link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              계정이 없으신가요?{' '}
              <Link
                href="/register"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
