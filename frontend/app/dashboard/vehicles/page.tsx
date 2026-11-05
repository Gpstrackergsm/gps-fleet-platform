"use client"

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Trash2, Clock, Gauge, Car, Activity, WifiOff, MapPin, X, Loader2, Edit3, User, Camera, Upload, Check, Copy, AlertCircle } from 'lucide-react';
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
    driver_name?: string | null;
    image_url?: string | null;
    plate_number?: string | null;
    model?: string | null;
    vehicle_type?: string | null;
}

type FilterTab = 'all' | 'moving' | 'parked' | 'offline';

const VEHICLE_PRESETS = [
    { id: 'car', label: 'Berline / Car', icon: '/vehicles/car.svg', type: 'car' },
    { id: 'suv', label: 'SUV / 4x4', icon: '/vehicles/suv.svg', type: 'suv' },
    { id: 'van', label: 'Fourgon / Van', icon: '/vehicles/van.svg', type: 'van' },
    { id: 'truck', label: 'Poids Lourd / Truck', icon: '/vehicles/truck.svg', type: 'truck' },
    { id: 'pickup', label: 'Pick-up', icon: '/vehicles/pickup.svg', type: 'pickup' },
    { id: 'motorcycle', label: 'Moto', icon: '/vehicles/motorcycle.svg', type: 'motorcycle' },
];

function timeSince(dateStr: string): string {
    if (!dateStr) return 'Jamais';
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return `${Math.max(0, s)}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}j`;
}

function stateColor(state: string) {
    if (state === 'moving') return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (state === 'parked') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-gray-400 bg-gray-700/50 border-gray-600/30';
}

function getDefaultIconForType(type?: string | null) {
    const t = (type || '').toLowerCase();
    const preset = VEHICLE_PRESETS.find(p => p.id === t);
    return preset ? preset.icon : '/vehicles/car.svg';
}

export default function VehiclesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterTab>('all');
    
    // Add Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newImei, setNewImei] = useState('');
    const [newName, setNewName] = useState('');
    const [newDriverName, setNewDriverName] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [newPlateNumber, setNewPlateNumber] = useState('');
    const [newModel, setNewModel] = useState('');
    const [newVehicleType, setNewVehicleType] = useState('car');
    const [adding, setAdding] = useState(false);

    // Edit Modal State
    const [editDevice, setEditDevice] = useState<Device | null>(null);
    const [editName, setEditName] = useState('');
    const [editDriverName, setEditDriverName] = useState('');
    const [editImageUrl, setEditImageUrl] = useState('');
    const [editPlateNumber, setEditPlateNumber] = useState('');
    const [editModel, setEditModel] = useState('');
    const [editVehicleType, setEditVehicleType] = useState('car');
    const [saving, setSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Image upload inputs
    const addFileInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [actionMenu, setActionMenu] = useState<string | null>(null);
    const [copiedImei, setCopiedImei] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

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

    const handleFileUpload = (file: File, isEdit: boolean) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            alert("L'image ne doit pas dépasser 8 Mo.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (isEdit) {
                setEditImageUrl(result);
            } else {
                setNewImageUrl(result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAdd = async () => {
        if (!newImei.trim()) return;
        setAdding(true);
        try {
            await api.post('/devices', {
                deviceId: newImei.trim(),
                name: newName.trim() || undefined,
                driver_name: newDriverName.trim() || undefined,
                image_url: newImageUrl || undefined,
                plate_number: newPlateNumber.trim() || undefined,
                model: newModel.trim() || undefined,
                vehicle_type: newVehicleType
            });
            setShowAddModal(false);
            setNewImei('');
            setNewName('');
            setNewDriverName('');
            setNewImageUrl('');
            setNewPlateNumber('');
            setNewModel('');
            setNewVehicleType('car');
            showToast('Véhicule ajouté avec succès !');
            fetchDevices();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Échec de l\'ajout du véhicule');
        } finally {
            setAdding(false);
        }
    };

    const openEditModal = (device: Device) => {
        setEditDevice(device);
        setEditName(device.name || '');
        setEditDriverName(device.driver_name || '');
        setEditImageUrl(device.image_url || '');
        setEditPlateNumber(device.plate_number || '');
        setEditModel(device.model || '');
        setEditVehicleType(device.vehicle_type || 'car');
        setActionMenu(null);
    };

    const handleSaveEdit = async () => {
        if (!editDevice) return;
        setSaving(true);
        try {
            await api.put(`/devices/${editDevice.device_id}`, {
                name: editName.trim() || null,
                driver_name: editDriverName.trim() || null,
                image_url: editImageUrl || null,
                plate_number: editPlateNumber.trim() || null,
                model: editModel.trim() || null,
                vehicle_type: editVehicleType
            });

            // Optimistic update
            setDevices(prev => prev.map(d => {
                if (d.device_id === editDevice.device_id) {
                    return {
                        ...d,
                        name: editName.trim() || null,
                        driver_name: editDriverName.trim() || null,
                        image_url: editImageUrl || null,
                        plate_number: editPlateNumber.trim() || null,
                        model: editModel.trim() || null,
                        vehicle_type: editVehicleType
                    };
                }
                return d;
            }));

            setEditDevice(null);
            showToast('Véhicule mis à jour avec succès !');
            fetchDevices();
        } catch (err: any) {
            console.error('Failed to update vehicle:', err);
            alert(err?.response?.data?.error || 'Erreur lors de la mise à jour du véhicule');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (deviceId: string) => {
        try {
            await api.delete(`/devices/${deviceId}`);
            setDeleteConfirm(null);
            showToast('Véhicule supprimé');
            fetchDevices();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Échec de la suppression');
        }
    };

    const handleCopyImei = (imei: string) => {
        navigator.clipboard.writeText(imei);
        setCopiedImei(imei);
        setTimeout(() => setCopiedImei(null), 2000);
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
            !search ||
            d.device_id.includes(search) ||
            (d.name && d.name.toLowerCase().includes(search.toLowerCase())) ||
            (d.driver_name && d.driver_name.toLowerCase().includes(search.toLowerCase())) ||
            (d.plate_number && d.plate_number.toLowerCase().includes(search.toLowerCase()))
        );

    const TABS: { key: FilterTab; label: string; count: number }[] = [
        { key: 'all', label: 'Tous', count: devices.length },
        { key: 'moving', label: 'En mouvement', count: moving },
        { key: 'parked', label: 'En stationnement', count: parked },
        { key: 'offline', label: 'Hors ligne', count: offline },
    ];

    return (
        <div className="h-full bg-gray-950 text-white overflow-y-auto pb-16 md:pb-0">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
                    <Check size={16} /> {toastMessage}
                </div>
            )}

            <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                            Gestion de la Flotte
                        </h1>
                        <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                            Gérez vos véhicules, conducteurs, photos et traceurs GPS
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-600/20 w-full sm:w-auto"
                    >
                        <Plus size={16} /> Ajouter un Véhicule
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {[
                        { label: 'Total Véhicules', value: devices.length, icon: <Car size={18} />, color: 'blue' },
                        { label: 'En Mouvement', value: moving, icon: <Activity size={18} />, color: 'green' },
                        { label: 'Stationnés', value: parked, icon: <MapPin size={18} />, color: 'yellow' },
                        { label: 'Hors Ligne', value: offline, icon: <WifiOff size={18} />, color: 'gray' },
                    ].map((card, i) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl shrink-0 ${card.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : card.color === 'green' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : card.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'}`}>
                                {card.icon}
                            </div>
                            <div className="truncate">
                                <div className="text-lg sm:text-2xl font-bold text-white">{card.value}</div>
                                <div className="text-[11px] sm:text-xs text-gray-400 truncate">{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter Tabs + Search */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 overflow-x-auto no-scrollbar">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${filter === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                {tab.label}
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filter === tab.key ? 'bg-white/20' : 'bg-gray-800 text-gray-400'}`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher nom, chauffeur, IMEI..."
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-visible min-h-[300px] shadow-xl">
                    <table className="w-full text-left">
                        <thead className="bg-gray-950/80 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                            <tr>
                                <th className="px-4 py-3.5 rounded-tl-2xl">Statut</th>
                                <th className="px-4 py-3.5">Véhicule</th>
                                <th className="px-4 py-3.5 hidden md:table-cell">Conducteur</th>
                                <th className="px-4 py-3.5 hidden lg:table-cell">Vitesse</th>
                                <th className="px-4 py-3.5 hidden xl:table-cell">Dernière MaJ</th>
                                <th className="px-4 py-3.5 text-right rounded-tr-2xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-3.5"><div className="h-4 w-20 bg-gray-800 rounded" /></td>
                                        <td className="px-4 py-3.5"><div className="h-10 w-44 bg-gray-800 rounded" /></td>
                                        <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-4 w-28 bg-gray-800 rounded" /></td>
                                        <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-4 w-16 bg-gray-800 rounded" /></td>
                                        <td className="px-4 py-3.5 hidden xl:table-cell"><div className="h-4 w-20 bg-gray-800 rounded" /></td>
                                        <td className="px-4 py-3.5" />
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <Car size={40} className="mx-auto text-gray-700 mb-3" />
                                        <p className="text-gray-400 font-medium">Aucun véhicule trouvé</p>
                                        <p className="text-gray-600 text-xs mt-1">Ajoutez un véhicule ou modifiez votre filtre</p>
                                        <button onClick={() => setShowAddModal(true)} className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-semibold hover:bg-blue-600 hover:text-white transition-all">
                                            <Plus size={14} /> Ajouter un véhicule
                                        </button>
                                    </td>
                                </tr>
                            ) : filtered.map(device => {
                                const state = device.current_state || 'offline';
                                const displayImage = device.image_url || getDefaultIconForType(device.vehicle_type);

                                return (
                                    <tr key={device.id} className="hover:bg-gray-800/40 transition-colors group">
                                        {/* Status */}
                                        <td className="px-4 py-3.5 align-middle">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${stateColor(state)}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                {state === 'moving' ? 'EN ROUTE' : state === 'parked' ? 'ARRÊT' : 'HORS LIGNE'}
                                            </span>
                                        </td>

                                        {/* Vehicle Card Cell (Image + Name + Plate + Driver on mobile) */}
                                        <td className="px-4 py-3.5 align-middle">
                                            <div className="flex items-center gap-3">
                                                {/* Vehicle Thumbnail */}
                                                <div className="relative w-11 h-11 rounded-xl bg-gray-800/90 border border-gray-700/80 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:border-blue-500/50 transition-colors">
                                                    <img
                                                        src={displayImage}
                                                        alt={device.name || 'Véhicule'}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = '/vehicles/car.svg';
                                                        }}
                                                    />
                                                </div>

                                                {/* Vehicle Details */}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white text-sm truncate hover:text-blue-400 transition-colors cursor-pointer" onClick={() => openEditModal(device)}>
                                                            {device.name || 'Véhicule Sans Nom'}
                                                        </span>
                                                        {device.plate_number && (
                                                            <span className="text-[10px] font-mono bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 text-gray-300 shrink-0">
                                                                {device.plate_number}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Driver visible on mobile under name */}
                                                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                                        {device.driver_name ? (
                                                            <span className="flex items-center gap-1 text-blue-400 font-medium truncate">
                                                                <User size={11} className="shrink-0" /> {device.driver_name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500 italic text-[11px] truncate md:hidden">
                                                                Sans chauffeur
                                                            </span>
                                                        )}
                                                        {device.model && (
                                                            <span className="text-gray-500 text-[11px] hidden sm:inline">
                                                                • {device.model}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Driver Name Column (Desktop) */}
                                        <td className="px-4 py-3.5 hidden md:table-cell align-middle">
                                            {device.driver_name ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
                                                    <User size={13} className="text-blue-400 shrink-0" />
                                                    <span className="truncate max-w-[150px]">{device.driver_name}</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => openEditModal(device)}
                                                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400 transition-colors"
                                                >
                                                    <Plus size={12} /> Assigner chauffeur
                                                </button>
                                            )}
                                        </td>

                                        {/* Speed */}
                                        <td className="px-4 py-3.5 hidden lg:table-cell align-middle">
                                            <span className="text-blue-400 text-sm font-mono font-semibold">
                                                {(device.speed || 0).toFixed(0)} <span className="text-xs text-gray-500">km/h</span>
                                            </span>
                                        </td>

                                        {/* Last Seen */}
                                        <td className="px-4 py-3.5 hidden xl:table-cell align-middle">
                                            <span className="text-gray-400 text-xs flex items-center gap-1">
                                                <Clock size={12} className="text-gray-500" />
                                                {timeSince(device.last_seen || device.last_update)}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3.5 text-right align-middle">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* Direct Edit Button */}
                                                <button
                                                    onClick={() => openEditModal(device)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-xs font-semibold transition-all shadow-sm"
                                                    title="Modifier le nom, chauffeur et photo"
                                                >
                                                    <Edit3 size={13} />
                                                    <span className="hidden sm:inline">Modifier</span>
                                                </button>

                                                {/* Dropdown Menu */}
                                                <div className={`relative inline-block text-left ${actionMenu === device.device_id ? 'z-30' : ''}`}>
                                                    <button
                                                        onClick={() => setActionMenu(actionMenu === device.device_id ? null : device.device_id)}
                                                        className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-xs px-2 border border-gray-700/60 bg-gray-800/40"
                                                    >
                                                        ▾
                                                    </button>
                                                    {actionMenu === device.device_id && (
                                                        <div className="absolute right-0 top-full mt-1.5 w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-30 py-1.5 overflow-hidden animate-in fade-in duration-150">
                                                            <button
                                                                onClick={() => openEditModal(device)}
                                                                className="flex items-center gap-2.5 px-3 py-2 text-sm text-blue-300 hover:bg-gray-700 hover:text-white w-full transition-colors text-left"
                                                            >
                                                                <Edit3 size={14} className="text-blue-400" /> Modifier Véhicule
                                                            </button>
                                                            <Link href="/dashboard" onClick={() => setActionMenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors">
                                                                <MapPin size={14} className="text-emerald-400" /> Voir sur la Carte
                                                            </Link>
                                                            <Link href="/dashboard/history" onClick={() => setActionMenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors">
                                                                <Clock size={14} className="text-purple-400" /> Voir l'Historique
                                                            </Link>
                                                            <button
                                                                onClick={() => {
                                                                    handleCopyImei(device.device_id);
                                                                    setActionMenu(null);
                                                                }}
                                                                className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white w-full transition-colors text-left"
                                                            >
                                                                <Copy size={14} className="text-gray-400" /> Copier IMEI
                                                            </button>
                                                            <div className="border-t border-gray-700/80 my-1" />
                                                            <button
                                                                onClick={() => { setDeleteConfirm(device.device_id); setActionMenu(null); }}
                                                                className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors text-left"
                                                            >
                                                                <Trash2 size={14} /> Supprimer Véhicule
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* EDIT VEHICLE MODAL */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {editDevice && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-950/60">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    <Edit3 size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-white">
                                        Modifier le Véhicule
                                    </h2>
                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                        IMEI : <span className="font-mono text-gray-300">{editDevice.device_id}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditDevice(null)}
                                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                            
                            {/* Photo / Image Section */}
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
                                    Photo / Image du Véhicule
                                </label>
                                
                                <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 bg-gray-950/60 border border-gray-800 rounded-xl">
                                    {/* Preview */}
                                    <div className="relative w-20 h-20 rounded-xl bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center shrink-0 overflow-hidden shadow-inner group">
                                        {editImageUrl ? (
                                            <img
                                                src={editImageUrl}
                                                alt="Véhicule"
                                                className="w-full h-full object-contain p-1"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/vehicles/car.svg';
                                                }}
                                            />
                                        ) : (
                                            <img
                                                src={getDefaultIconForType(editVehicleType)}
                                                alt="Aperçu"
                                                className="w-full h-full object-contain p-1 opacity-70"
                                            />
                                        )}
                                    </div>

                                    {/* Upload and Clear Actions */}
                                    <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                            <input
                                                ref={editFileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        handleFileUpload(e.target.files[0], true);
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => editFileInputRef.current?.click()}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                                            >
                                                <Upload size={13} /> Télécharger une Photo
                                            </button>

                                            {editImageUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditImageUrl('')}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg text-xs transition-colors"
                                                >
                                                    <Trash2 size={12} /> Supprimer
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-500">
                                            PNG, JPG ou WebP jusqu'à 8 Mo. S'affichera sur le tableau de bord et la carte.
                                        </p>
                                    </div>
                                </div>

                                {/* Preset Icons Picker */}
                                <div className="mt-3">
                                    <span className="text-[11px] text-gray-500 block mb-1.5">Ou choisissez un modèle prédéfini :</span>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                        {VEHICLE_PRESETS.map((p) => {
                                            const isSelected = editImageUrl === p.icon || (!editImageUrl && editVehicleType === p.type);
                                            return (
                                                <button
                                                    type="button"
                                                    key={p.id}
                                                    onClick={() => {
                                                        setEditImageUrl(p.icon);
                                                        setEditVehicleType(p.type);
                                                    }}
                                                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${isSelected ? 'border-blue-500 bg-blue-600/15 shadow-sm shadow-blue-500/20' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-800 hover:border-gray-700'}`}
                                                >
                                                    <img src={p.icon} alt={p.label} className="w-8 h-8 object-contain" />
                                                    <span className="text-[10px] text-gray-400 truncate max-w-full font-medium">
                                                        {p.label.split('/')[0].trim()}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Name (Required) */}
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                                    Nom du Véhicule *
                                </label>
                                <div className="relative">
                                    <Car size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        placeholder="Ex: V7, Peugeot 208, Camion 01"
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Driver Name */}
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                                    Nom du Conducteur / Chauffeur
                                </label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                                    <input
                                        value={editDriverName}
                                        onChange={e => setEditDriverName(e.target.value)}
                                        placeholder="Ex: Khalid Ait El Maati, Mohamed Alami"
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Additional Details (Plate & Model) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                                        Matricule (Immatriculation)
                                    </label>
                                    <input
                                        value={editPlateNumber}
                                        onChange={e => setEditPlateNumber(e.target.value)}
                                        placeholder="Ex: 12345-A-26"
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                                        Modèle / Marque
                                    </label>
                                    <input
                                        value={editModel}
                                        onChange={e => setEditModel(e.target.value)}
                                        placeholder="Ex: Dacia Duster 2024"
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex gap-3 p-5 border-t border-gray-800 bg-gray-950/60">
                            <button
                                type="button"
                                onClick={() => setEditDevice(null)}
                                className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-800 text-sm font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                            >
                                {saving ? (
                                    <><Loader2 size={15} className="animate-spin" /> Enregistrement...</>
                                ) : (
                                    <><Check size={15} /> Enregistrer les modifications</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ADD VEHICLE MODAL */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-950/60">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    <Plus size={18} />
                                </div>
                                <h2 className="text-base sm:text-lg font-bold text-white">Ajouter un Nouveau Véhicule</h2>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* IMEI */}
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                                    Numéro IMEI du Traceur *
                                </label>
                                <input
                                    value={newImei}
                                    onChange={e => setNewImei(e.target.value)}
                                    placeholder="Ex: 869706063068334"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                                    Nom du Véhicule
                                </label>
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Ex: V7, Toyota Hilux"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Driver Name */}
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                                    Nom du Conducteur
                                </label>
                                <input
                                    value={newDriverName}
                                    onChange={e => setNewDriverName(e.target.value)}
                                    placeholder="Ex: Khalid Ait El Maati"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Photo / Presets */}
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                                    Photo / Modèle du Véhicule
                                </label>
                                <div className="flex items-center gap-3 p-3 bg-gray-950/60 border border-gray-800 rounded-xl mb-2">
                                    <div className="w-14 h-14 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                                        <img
                                            src={newImageUrl || getDefaultIconForType(newVehicleType)}
                                            alt="Preview"
                                            className="w-full h-full object-contain p-1"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            ref={addFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    handleFileUpload(e.target.files[0], false);
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => addFileInputRef.current?.click()}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium transition-colors"
                                        >
                                            <Upload size={12} /> Télécharger Photo
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {VEHICLE_PRESETS.map((p) => {
                                        const isSelected = newImageUrl === p.icon || (!newImageUrl && newVehicleType === p.type);
                                        return (
                                            <button
                                                type="button"
                                                key={p.id}
                                                onClick={() => {
                                                    setNewImageUrl(p.icon);
                                                    setNewVehicleType(p.type);
                                                }}
                                                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${isSelected ? 'border-blue-500 bg-blue-600/15' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-800'}`}
                                            >
                                                <img src={p.icon} alt={p.label} className="w-7 h-7 object-contain" />
                                                <span className="text-[10px] text-gray-400 truncate max-w-full font-medium">
                                                    {p.label.split('/')[0].trim()}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 p-5 border-t border-gray-800 bg-gray-950/60">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-800 text-sm transition-colors">
                                Annuler
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={!newImei.trim() || adding}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                            >
                                {adding ? <><Loader2 size={14} className="animate-spin" /> Ajout en cours...</> : 'Ajouter le Véhicule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* DELETE CONFIRMATION MODAL */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
                            <Trash2 size={22} className="text-red-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-white text-base">Supprimer ce véhicule ?</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                Cette action supprimera définitivement le véhicule <span className="font-mono text-white font-semibold">{deleteConfirm}</span> ainsi que tout son historique de trajets.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-800 text-xs font-medium transition-colors">
                                Annuler
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-red-600/30">
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Click-outside to close action menu */}
            {actionMenu && <div className="fixed inset-0 z-20" onClick={() => setActionMenu(null)} />}
        </div>
    );
}
