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

const registerSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 주소를 입력하세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError(null);
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '회원가입에 실패했습니다');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <span className="text-5xl">💰</span>
            <h1 className="mt-4 text-2xl font-bold text-gray-800">회원가입</h1>
            <p className="mt-2 text-gray-600">새 계정을 만드세요</p>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              회원가입이 완료되었습니다! 로그인 페이지로 이동합니다...
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Register form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              id="name"
              type="text"
              label="이름"
              placeholder="홍길동"
              error={errors.name?.message}
              {...register('name')}
            />

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
              placeholder="최소 6자 이상"
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              id="confirmPassword"
              type="password"
              label="비밀번호 확인"
              placeholder="비밀번호를 다시 입력하세요"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              disabled={success}
            >
              회원가입
            </Button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link
                href="/login"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
