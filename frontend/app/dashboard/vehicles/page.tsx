"use client"

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Trash2, ExternalLink, Clock, Gauge, Car, Activity, WifiOff, MapPin, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface Device {
    id: number;
    device_id: string;
    name: string | null;
    status: string;
    current_state: string;
    speed: number;
    lat: number;
    lng: number;
    last_seen: string;
    last_update: string;
    internet_status: boolean;
    gps_status: boolean;
}

type FilterTab = 'all' | 'moving' | 'parked' | 'offline';

function timeSince(dateStr: string): string {
    if (!dateStr) return 'Never';
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

function stateColor(state: string) {
    if (state === 'moving') return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (state === 'parked') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-gray-400 bg-gray-700/50 border-gray-600/30';
}

export default function VehiclesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterTab>('all');
    const [showModal, setShowModal] = useState(false);
    const [newImei, setNewImei] = useState('');
    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [actionMenu, setActionMenu] = useState<string | null>(null);

    const fetchDevices = useCallback(async () => {
        try {
            const res = await api.get('/devices');
            setDevices(res.data);
        } catch (err) {
            console.error('Failed to fetch devices', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDevices();
        const interval = setInterval(fetchDevices, 15000);
        return () => clearInterval(interval);
    }, [fetchDevices]);

    const handleAdd = async () => {
        if (!newImei.trim()) return;
        setAdding(true);
        try {
            await api.post('/devices', { deviceId: newImei.trim(), name: newName.trim() || undefined });
            setShowModal(false);
            setNewImei('');
            setNewName('');
            fetchDevices();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to add device');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (deviceId: string) => {
        try {
            await api.delete(`/devices/${deviceId}`);
            setDeleteConfirm(null);
            fetchDevices();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to delete device');
        }
    };

    const moving = devices.filter(d => d.current_state === 'moving').length;
    const parked = devices.filter(d => d.current_state === 'parked').length;
    const offline = devices.filter(d => !['moving', 'parked'].includes(d.current_state)).length;

    const filtered = devices
        .filter(d => {
            if (filter === 'moving') return d.current_state === 'moving';
            if (filter === 'parked') return d.current_state === 'parked';
            if (filter === 'offline') return !['moving', 'parked'].includes(d.current_state);
            return true;
        })
        .filter(d =>
            !search || d.device_id.includes(search) ||
            (d.name && d.name.toLowerCase().includes(search.toLowerCase()))
        );

    const TABS: { key: FilterTab; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: devices.length },
        { key: 'moving', label: 'Moving', count: moving },
        { key: 'parked', label: 'Parked', count: parked },
        { key: 'offline', label: 'Offline', count: offline },
    ];

    return (
        <div className="h-full bg-gray-950 text-white overflow-y-auto pb-16 md:pb-0">
            <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">Fleet Management</h1>
                        <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Monitor and manage your GPS trackers</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                    >
                        <Plus size={16} /> Add Vehicle
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {[
                        { label: 'Total Vehicles', value: devices.length, icon: <Car size={18} />, color: 'blue' },
                        { label: 'Moving', value: moving, icon: <Activity size={18} />, color: 'green' },
                        { label: 'Parked', value: parked, icon: <MapPin size={18} />, color: 'yellow' },
                        { label: 'Offline', value: offline, icon: <WifiOff size={18} />, color: 'gray' },
                    ].map((card, i) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${card.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : card.color === 'green' ? 'bg-green-500/10 text-green-400' : card.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-gray-700/50 text-gray-400'}`}>
                                {card.icon}
                            </div>
                            <div className="truncate">
                                <div className="text-lg sm:text-2xl font-bold text-white">{card.value}</div>
                                <div className="text-[11px] sm:text-xs text-gray-500 truncate">{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter Tabs + Search */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 overflow-x-auto no-scrollbar">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${filter === tab.key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                {tab.label}
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filter === tab.key ? 'bg-white/20' : 'bg-gray-700'}`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or IMEI..."
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-950/60 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                            <tr>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Vehicle</th>
                                <th className="px-4 py-3 hidden md:table-cell">IMEI</th>
                                <th className="px-4 py-3 hidden lg:table-cell">Speed</th>
                                <th className="px-4 py-3 hidden lg:table-cell">Last Seen</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-800 rounded" /></td>
                                        <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-800 rounded" /></td>
                                        <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-36 bg-gray-800 rounded" /></td>
                                        <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-16 bg-gray-800 rounded" /></td>
                                        <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-24 bg-gray-800 rounded" /></td>
                                        <td className="px-4 py-3" />
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <Car size={40} className="mx-auto text-gray-700 mb-3" />
                                        <p className="text-gray-500">No vehicles found</p>
                                        <button onClick={() => setShowModal(true)} className="mt-3 text-blue-400 text-sm hover:underline">Add your first vehicle →</button>
                                    </td>
                                </tr>
                            ) : filtered.map(device => {
                                const state = device.current_state || 'offline';
                                return (
                                    <tr key={device.id} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${stateColor(state)}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                {state.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-white">{device.name || 'Unnamed Vehicle'}</div>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <span className="font-mono text-xs text-gray-400">{device.device_id}</span>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <span className="text-blue-400 text-sm font-mono">{(device.speed || 0).toFixed(0)} km/h</span>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <span className="text-gray-500 text-sm">{timeSince(device.last_seen || device.last_update)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() => setActionMenu(actionMenu === device.device_id ? null : device.device_id)}
                                                    className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-sm px-3"
                                                >
                                                    Actions ▾
                                                </button>
                                                {actionMenu === device.device_id && (
                                                    <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                                                        <Link href="/dashboard" onClick={() => setActionMenu(null)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                                                            <MapPin size={14} /> View on Map
                                                        </Link>
                                                        <Link href="/dashboard/history" onClick={() => setActionMenu(null)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                                                            <Clock size={14} /> View History
                                                        </Link>
                                                        <div className="border-t border-gray-700" />
                                                        <button
                                                            onClick={() => { setDeleteConfirm(device.device_id); setActionMenu(null); }}
                                                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors"
                                                        >
                                                            <Trash2 size={14} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Vehicle Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-gray-800">
                            <h2 className="text-lg font-bold">Add New Vehicle</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-1"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-1.5 block">Device IMEI *</label>
                                <input
                                    value={newImei}
                                    onChange={e => setNewImei(e.target.value)}
                                    placeholder="e.g. 359586018966098"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1.5 block">Vehicle Name</label>
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. Toyota Corolla"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 pt-0">
                            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 text-sm transition-colors">Cancel</button>
                            <button onClick={handleAdd} disabled={!newImei || adding} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                {adding ? <><Loader2 size={14} className="animate-spin" /> Adding...</> : 'Add Vehicle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                            <Trash2 size={22} className="text-red-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-white">Delete Vehicle?</h3>
                            <p className="text-sm text-gray-400 mt-1">This will permanently remove <span className="font-mono text-white">{deleteConfirm}</span> and all its history.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 text-sm transition-colors">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Click-outside to close action menu */}
            {actionMenu && <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />}
        </div>
    );
}
