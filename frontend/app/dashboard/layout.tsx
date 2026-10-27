"use client";

import { ReactNode, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
    Map, Truck, Clock, Settings, LogOut,
    MapPin, ChevronRight, Wifi, WifiOff, BarChart2,
    Compass, ShieldAlert, Shield, Menu, X
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
    return <span className="font-mono text-xs text-gray-400 hidden sm:inline">{time}</span>;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [userEmail, setUserEmail] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [connected, setConnected] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

    // Close mobile drawer on route change
    useEffect(() => {
        setMobileNavOpen(false);
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.push('/login');
    };

    return (
        <div className="flex h-screen h-[100dvh] bg-gray-950 text-white overflow-hidden">

            {/* ── Desktop Sidebar ── */}
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

            {/* ── Mobile Slide-Over Navigation Drawer ── */}
            {mobileNavOpen && (
                <div className="fixed inset-0 z-[1000] md:hidden">
                    {/* Backdrop */}
                    <div
                        onClick={() => setMobileNavOpen(false)}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                    />

                    {/* Drawer Content */}
                    <div className="absolute left-0 top-0 bottom-0 w-72 bg-gray-900 border-r border-gray-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between h-14 border-b border-gray-800 px-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                                    <MapPin size={14} className="text-white" />
                                </div>
                                <span className="font-bold text-white text-base">TrackPro</span>
                            </div>
                            <button
                                onClick={() => setMobileNavOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* User Identity Card */}
                        {userEmail && (
                            <div className="p-4 border-b border-gray-800 bg-gray-950/40">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-400">
                                        {userEmail[0]?.toUpperCase()}
                                    </div>
                                    <div className="truncate">
                                        <div className="text-xs font-semibold text-white truncate">{userEmail}</div>
                                        <div className="text-[10px] text-gray-400 capitalize">{isAdmin ? 'Administrator' : 'Standard User'}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Links */}
                        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                            {NAV.filter(item => !item.adminOnly || isAdmin).map(({ href, icon: Icon, label, soon }) => {
                                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                                return (
                                    <Link
                                        key={href}
                                        href={soon ? '#' : href}
                                        onClick={() => setMobileNavOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                                            active
                                                ? 'bg-blue-600 text-white font-semibold'
                                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                        } ${soon ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        <Icon size={18} />
                                        <span>{label}</span>
                                        {soon && <span className="ml-auto text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">SOON</span>}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Sign Out Button in Drawer */}
                        <div className="p-3 border-t border-gray-800">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 text-sm font-semibold transition-colors"
                            >
                                <LogOut size={16} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main Column ── */}
            <div className="flex flex-col flex-1 overflow-hidden">

                {/* ── Header ── */}
                <header className="flex items-center h-12 px-3 md:px-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur shrink-0 gap-2 md:gap-4">
                    {/* Mobile Hamburger Menu Toggle */}
                    <button
                        onClick={() => setMobileNavOpen(true)}
                        className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                        title="Open Menu"
                    >
                        <Menu size={18} />
                    </button>

                    <div className="flex-1 flex items-center gap-1.5 text-xs text-gray-500 truncate">
                        <ChevronRight size={12} className="hidden sm:inline" />
                        <span className="text-gray-300 font-semibold truncate">
                            {NAV.find(n => n.href === pathname || (n.href !== '/dashboard' && pathname.startsWith(n.href)))?.label || 'Dashboard'}
                        </span>
                    </div>

                    <Clock24 />

                    <div className="flex items-center gap-1.5 shrink-0">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-[11px] md:text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
                            {connected ? 'Live' : 'Offline'}
                        </span>
                    </div>

                    {userEmail && (
                        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-gray-800 shrink-0">
                            <button
                                onClick={() => setMobileNavOpen(true)}
                                className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-400 hover:ring-2 hover:ring-blue-500 transition-all"
                                title={userEmail}
                            >
                                {userEmail[0]?.toUpperCase()}
                            </button>
                            <span className="text-xs text-gray-400 hidden lg:block">{userEmail}</span>
                        </div>
                    )}
                </header>

                {/* ── Page Content ── */}
                <main className="flex-1 overflow-hidden relative">{children}</main>

                {/* ── Mobile Bottom Navigation Bar ── */}
                <nav className="md:hidden flex border-t border-gray-800 bg-gray-900/95 backdrop-blur shrink-0 safe-bottom">
                    {[
                        { href: '/dashboard', icon: Map, label: 'Map' },
                        { href: '/dashboard/vehicles', icon: Truck, label: 'Fleet' },
                        { href: '/dashboard/history', icon: Clock, label: 'History' },
                        { href: '/dashboard/alerts', icon: ShieldAlert, label: 'Alerts' },
                    ].map(({ href, icon: Icon, label }) => {
                        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                                    active ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Icon size={18} />
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                    {/* More / Menu Drawer Toggle */}
                    <button
                        onClick={() => setMobileNavOpen(true)}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-gray-400 hover:text-white transition-colors`}
                    >
                        <Menu size={18} />
                        <span>Menu</span>
                    </button>
                </nav>
            </div>
        </div>
    );
}
