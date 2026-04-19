'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { FormField, Button, ErrorMessage, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/common';

export default function DangNhapPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f9f7f3] flex items-center justify-center px-4 py-12">
      <Card variant="default" className="w-full max-w-md">
        <CardHeader>
          <div className="text-center">
            <CardTitle className="text-3xl text-[#d97757]">Đăng nhập</CardTitle>
            <p className="text-sm text-[#5a5a5a] mt-2">Truy cập tài khoản của bạn để tiếp tục</p>
          </div>
        </CardHeader>

        <CardContent>
          {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleLogin} className="space-y-4">
            <FormField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <FormField
              id="password"
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              showPasswordToggle={true}
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-[#5a5a5a]">Nhớ tôi</span>
              </label>
              <a href="#" className="text-[#d97757] hover:text-[#c4694d] transition-colors">
                Quên mật khẩu?
              </a>
            </div>

            <Button type="submit" variant="primary" size="md" isLoading={loading} className="w-full mt-6">
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-0 pt-0">
          <p className="text-sm text-[#5a5a5a]">
            Chưa có tài khoản?{' '}
            <a href="#" className="text-[#d97757] hover:text-[#c4694d] font-medium transition-colors">
              Đăng ký ngay
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
