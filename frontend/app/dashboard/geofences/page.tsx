"use client"

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Plus, Compass, Trash2, MapPin, Gauge, X, Loader2 } from 'lucide-react';

interface Geofence {
    id: number;
    name: string;
    description: string | null;
    type: 'circle' | 'polygon';
    center_lat: number | null;
    center_lng: number | null;
    radius_meters: number;
    speed_limit: number;
    is_active: boolean;
    created_at: string;
}

export default function GeofencesPage() {
    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [centerLat, setCenterLat] = useState('33.5935');
    const [centerLng, setCenterLng] = useState('-7.6115');
    const [radiusMeters, setRadiusMeters] = useState('500');
    const [speedLimit, setSpeedLimit] = useState('60');
    const [saving, setSaving] = useState(false);

    const fetchGeofences = useCallback(async () => {
        try {
            const res = await api.get('/geofences');
            setGeofences(res.data);
        } catch (err) {
            console.error('Failed to fetch geofences:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGeofences();
    }, [fetchGeofences]);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await api.post('/geofences', {
                name: name.trim(),
                description: description.trim() || undefined,
                type: 'circle',
                centerLat: parseFloat(centerLat),
                centerLng: parseFloat(centerLng),
                radiusMeters: parseFloat(radiusMeters) || 500,
                speedLimit: parseFloat(speedLimit) || 0
            });
            setShowModal(false);
            setName('');
            setDescription('');
            fetchGeofences();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to create geofence');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this geofence?')) return;
        try {
            await api.delete(`/geofences/${id}`);
            fetchGeofences();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to delete geofence');
        }
    };

    return (
        <div className="h-full bg-gray-950 text-white overflow-y-auto">
            <div className="p-6 max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2.5">
                            <Compass className="text-blue-400" size={26} />
                            Geofences & Operational Zones
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5">Control operational boundaries, speed corridors, and restricted areas</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus size={16} /> New Geofence
                    </button>
                </div>

                {/* Geofences Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                        <div className="col-span-full p-12 text-center text-gray-500">Loading geofences...</div>
                    ) : geofences.length === 0 ? (
                        <div className="col-span-full p-16 text-center bg-gray-900 border border-gray-800 rounded-xl">
                            <Compass size={40} className="mx-auto text-gray-700 mb-3" />
                            <h3 className="font-semibold text-white">No Geofences Created</h3>
                            <p className="text-gray-500 text-sm mt-1">Define your first circular or polygonal monitoring perimeter.</p>
                            <button onClick={() => setShowModal(true)} className="mt-4 text-blue-400 text-sm hover:underline">Create Geofence →</button>
                        </div>
                    ) : (
                        geofences.map(geo => (
                            <div key={geo.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3 hover:border-gray-700 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                                            <h3 className="font-bold text-white text-base">{geo.name}</h3>
                                        </div>
                                        {geo.description && (
                                            <p className="text-xs text-gray-400 mt-1">{geo.description}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(geo.id)}
                                        className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="space-y-1.5 text-xs text-gray-400 pt-2 border-t border-gray-800">
                                    <div className="flex justify-between">
                                        <span className="flex items-center gap-1 text-gray-500"><MapPin size={12} /> Center</span>
                                        <span className="font-mono text-gray-300">{geo.center_lat?.toFixed(4)}, {geo.center_lng?.toFixed(4)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="flex items-center gap-1 text-gray-500"><Compass size={12} /> Radius</span>
                                        <span className="font-semibold text-white">{geo.radius_meters} meters</span>
                                    </div>
                                    {geo.speed_limit > 0 && (
                                        <div className="flex justify-between">
                                            <span className="flex items-center gap-1 text-gray-500"><Gauge size={12} /> Speed Limit</span>
                                            <span className="font-mono text-orange-400 font-bold">{geo.speed_limit} km/h</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-gray-800">
                            <h2 className="text-lg font-bold">New Geofence Perimeter</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-1"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Zone Name *</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Warehouse Alpha"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                                <input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="e.g. Authorized depot perimeter"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Center Latitude</label>
                                    <input
                                        value={centerLat}
                                        onChange={e => setCenterLat(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Center Longitude</label>
                                    <input
                                        value={centerLng}
                                        onChange={e => setCenterLng(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Radius (Meters)</label>
                                    <input
                                        type="number"
                                        value={radiusMeters}
                                        onChange={e => setRadiusMeters(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Speed Limit (km/h)</label>
                                    <input
                                        type="number"
                                        value={speedLimit}
                                        onChange={e => setSpeedLimit(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 pt-0">
                            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 text-sm">Cancel</button>
                            <button onClick={handleCreate} disabled={!name || saving} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Create Zone'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
