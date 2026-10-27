"use client";

import { ReactNode, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
    Map, Truck, Clock, Settings, LogOut,
    MapPin, ChevronRight, Wifi, WifiOff, BarChart2,
    Compass, ShieldAlert, Shield
} from 'lucide-react';
import { socket } from '@/lib/socket';

const NAV = [
    { href: '/dashboard', icon: Map, label: 'Live Map' },
    { href: '/dashboard/vehicles', icon: Truck, label: 'Fleet' },
    { href: '/dashboard/history', icon: Clock, label: 'History' },
    { href: '/dashboard/geofences', icon: Compass, label: 'Geofences' },
    { href: '/dashboard/alerts', icon: ShieldAlert, label: 'Alerts' },
    { href: '/dashboard/reports', icon: BarChart2, label: 'Reports', soon: true },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    { href: '/admin', icon: Shield, label: 'Admin Panel', adminOnly: true },
];

function Clock24() {
    const [time, setTime] = useState('');
    useEffect(() => {
        const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);
    return <span className="font-mono text-xs text-gray-400">{time}</span>;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [userEmail, setUserEmail] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [connected, setConnected] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUserEmail(payload.email || '');
            const role = localStorage.getItem('role') || payload.role;
            if (role === 'admin') {
                setIsAdmin(true);
            }
        } catch { /* ignore */ }

        // Socket connection status
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        setConnected(socket.connected);
        return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.push('/login');
    };

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

            {/* ── Sidebar ── */}
            <aside
                onMouseEnter={() => setExpanded(true)}
                onMouseLeave={() => setExpanded(false)}
                className={`hidden md:flex flex-col h-full bg-gray-900 border-r border-gray-800 transition-all duration-300 ease-in-out shrink-0 ${expanded ? 'w-56' : 'w-16'}`}
            >
                {/* Logo */}
                <div className={`flex items-center h-12 border-b border-gray-800 px-4 gap-3 overflow-hidden`}>
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                        <MapPin size={14} className="text-white" />
                    </div>
                    <span className={`font-bold text-white text-sm whitespace-nowrap transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
                        TrackPro
                    </span>
                </div>

                {/* Nav */}
                <nav className="flex-1 flex flex-col gap-1 p-2 overflow-hidden">
                    {NAV.filter(item => !item.adminOnly || isAdmin).map(({ href, icon: Icon, label, soon }) => {
                        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                        return (
                            <Link
                                key={href}
                                href={soon ? '#' : href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative overflow-hidden group
                                    ${active ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}
                                    ${soon ? 'cursor-default opacity-60' : ''}`}
                            >
                                <Icon size={18} className="shrink-0" />
                                <span className={`text-sm whitespace-nowrap transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
                                    {label}
                                </span>
                                {soon && expanded && (
                                    <span className="ml-auto text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-semibold">SOON</span>
                                )}
                                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-2 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 w-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors overflow-hidden"
                    >
                        <LogOut size={18} className="shrink-0" />
                        <span className={`text-sm whitespace-nowrap transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
                            Sign Out
                        </span>
                    </button>
                </div>
            </aside>

            {/* ── Main Column ── */}
            <div className="flex flex-col flex-1 overflow-hidden">

                {/* ── Header ── */}
                <header className="flex items-center h-12 px-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur shrink-0 gap-4">
                    <div className="flex-1 flex items-center gap-2 text-xs text-gray-500">
                        <ChevronRight size={12} />
                        <span className="text-gray-300">
                            {NAV.find(n => n.href === pathname || (n.href !== '/dashboard' && pathname.startsWith(n.href)))?.label || 'Dashboard'}
                        </span>
                    </div>
                    <Clock24 />
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
                            {connected ? 'Connected' : 'Offline'}
                        </span>
                    </div>
                    {userEmail && (
                        <div className="flex items-center gap-2 pl-3 border-l border-gray-700">
                            <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-400">
                                {userEmail[0]?.toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-400 hidden sm:block">{userEmail}</span>
                        </div>
                    )}
                </header>

                {/* ── Page Content ── */}
                <main className="flex-1 overflow-hidden">{children}</main>

                {/* ── Mobile Bottom Nav ── */}
                <nav className="md:hidden flex border-t border-gray-800 bg-gray-900">
                    {NAV.filter(n => !n.soon).slice(0, 4).map(({ href, icon: Icon, label }) => {
                        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                        return (
                            <Link key={href} href={href} className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs ${active ? 'text-blue-400' : 'text-gray-500'}`}>
                                <Icon size={20} />
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
