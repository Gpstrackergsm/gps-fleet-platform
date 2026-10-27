"use client";

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Shield, Users, LogOut, ArrowLeft, Radio, Smartphone } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUserEmail(payload.email || '');
            const role = localStorage.getItem('role') || payload.role;
            if (role !== 'admin') {
                router.push('/dashboard');
            }
        } catch {
            router.push('/login');
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.push('/login');
    };

    return (
        <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
            {/* Admin Sidebar */}
            <aside className="w-64 border-r border-zinc-800 bg-zinc-900/80 backdrop-blur flex flex-col shrink-0">
                <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                            <Shield size={18} />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-white tracking-wide">ADMIN PORTAL</h1>
                            <p className="text-[11px] text-zinc-400">Master Fleet Control</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                    <Link
                        href="/admin"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            pathname === '/admin' || pathname.startsWith('/admin/clients')
                                ? 'bg-red-600/15 text-red-400 border border-red-500/20'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                        }`}
                    >
                        <Users size={18} />
                        <span>Clients & Trackers</span>
                    </Link>

                    <div className="pt-4 pb-2 px-3">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Shortcuts</span>
                    </div>

                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
                    >
                        <Radio size={18} className="text-blue-400" />
                        <span>Live GPS Map</span>
                    </Link>
                </nav>

                <div className="p-3 border-t border-zinc-800 space-y-2 bg-zinc-900/40">
                    {userEmail && (
                        <div className="px-3 py-2 bg-zinc-800/40 rounded-lg border border-zinc-800 text-xs">
                            <p className="text-zinc-400 text-[10px] uppercase font-semibold">Logged In As</p>
                            <p className="text-zinc-200 truncate font-mono mt-0.5">{userEmail}</p>
                        </div>
                    )}

                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2.5 px-3 py-2 w-full text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition-colors text-xs font-medium"
                    >
                        <ArrowLeft size={15} />
                        Back to User Dashboard
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2 w-full text-zinc-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors text-xs font-medium"
                    >
                        <LogOut size={15} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-auto bg-zinc-950">
                {children}
            </main>
        </div>
    );
}
