"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/lib/LanguageContext';
import Link from 'next/link';
import { Car } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { t, isRTL } = useLanguage();

    // Clear any stale tokens on login page load (e.g. from production backend switch)
    useState(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
        }
    });

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/login', data);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('role', res.data.user.role); // Store role
            // Force full reload to ensure layout updates
            window.location.href = res.data.user.role === 'admin' ? '/admin' : '/dashboard';
        } catch (err: any) {
            setError(err.response?.data?.error || t('loginFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 relative ${isRTL ? 'font-sans' : ''}`}>
            {/* Top Bar with Brand Link and Language Switcher */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Car size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-white text-sm">TrackPro</span>
                </Link>

                <LanguageSelector />
            </div>

            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 w-full max-w-md space-y-8 p-8 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-2xl"
            >
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white">{t('gpsCommand')}</h2>
                    <p className="mt-2 text-sm text-zinc-400">{t('signInSubtitle')}</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-zinc-400 block mb-1">{t('email')}</label>
                            <Input
                                {...register('email', { required: true })}
                                type="email"
                                placeholder="name@company.com"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                            />
                            {errors.email && <span className="text-xs text-red-500">Email is required</span>}
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400 block mb-1">{t('password')}</label>
                            <Input
                                {...register('password', { required: true })}
                                type="password"
                                placeholder="••••••••"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                            />
                            {errors.password && <span className="text-xs text-red-500">Password is required</span>}
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-sm italic">{error}</div>}

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-6"
                        disabled={loading}
                    >
                        {loading ? t('loading') : t('loginButton')}
                    </Button>

                    <div className="text-center text-sm">
                        <span className="text-zinc-500">{t('noAccount')} </span>
                        <a href="/register" className="font-medium text-blue-500 hover:text-blue-400">{t('signUp')}</a>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
