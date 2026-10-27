"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const router = useRouter();
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 w-full max-w-md space-y-8 p-8 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-2xl"
            >
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white">GPS Command</h2>
                    <p className="mt-2 text-sm text-zinc-400">Sign in to your fleet dashboard</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        <div>
                            <Input
                                {...register('email', { required: true })}
                                type="email"
                                placeholder="name@company.com"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                            />
                            {errors.email && <span className="text-xs text-red-500">Email is required</span>}
                        </div>
                        <div>
                            <Input
                                {...register('password', { required: true })}
                                type="password"
                                placeholder="Password"
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
                        {loading ? 'Signing in...' : 'Sign in'}
                    </Button>

                    <div className="text-center text-sm">
                        <span className="text-zinc-500">Don't have an account? </span>
                        <a href="/register" className="font-medium text-blue-500 hover:text-blue-400">Sign up</a>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
