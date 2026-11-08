"use client";

import { useEffect, useState, useMemo } from 'react';
import {
    Wrench, Plus, CheckCircle2, AlertTriangle, Clock,
    Car, Sparkles, Search, Filter, Trash2, Edit3,
    Calendar, DollarSign, Gauge, Shield, ChevronRight,
    ArrowUpRight, RefreshCw, X, FileText, Check, AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

interface MaintenanceService {
    id: number;
    tenant_id: number;
    device_id: string;
    service_type: string;
    title: string;
    interval_km: number;
    last_service_km: number;
    last_service_date: string | null;
    next_due_km: number;
    alert_before_km: number;
    cost_mad: number;
    notes: string | null;
    device_name?: string;
    plate_number?: string;
    model?: string;
    driver_name?: string;
    image_url?: string;
    current_odometer_km?: number;
    km_remaining?: number;
    progress_percent?: number;
    status?: 'ok' | 'due_soon' | 'overdue';
}

interface MaintenanceLog {
    id: number;
    tenant_id: number;
    device_id: string;
    service_id: number | null;
    service_type: string;
    title: string;
    service_km: number;
    service_date: string;
    cost_mad: number;
    performed_by: string | null;
    invoice_number: string | null;
    notes: string | null;
    device_name?: string;
    plate_number?: string;
    model?: string;
    driver_name?: string;
    image_url?: string;
}

interface MaintenanceOverview {
    total_services: number;
    ok_count: number;
    due_soon_count: number;
    overdue_count: number;
    total_spent_mad: number;
    spent_30d_mad: number;
    total_logs_count: number;
}

interface VehicleOption {
    device_id: string;
    name: string;
    plate_number?: string;
    driver_name?: string;
    odometer_km?: number;
    image_url?: string;
}

export default function MaintenancePage() {
    const { t, language, isRTL } = useLanguage();

    const [activeTab, setActiveTab] = useState<'schedules' | 'logs'>('schedules');
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<MaintenanceOverview | null>(null);
    const [services, setServices] = useState<MaintenanceService[]>([]);
    const [logs, setLogs] = useState<MaintenanceLog[]>([]);
    const [vehicles, setVehicles] = useState<VehicleOption[]>([]);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDeviceFilter, setSelectedDeviceFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Modals
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showInitPackModal, setShowInitPackModal] = useState(false);
    const [showOdometerModal, setShowOdometerModal] = useState(false);

    // Selected items for modal action
    const [selectedService, setSelectedService] = useState<MaintenanceService | null>(null);
    const [selectedDeviceForAction, setSelectedDeviceForAction] = useState<VehicleOption | null>(null);

    // Form states
    const [scheduleForm, setScheduleForm] = useState({
        id: 0,
        device_id: '',
        service_type: 'oil_change',
        title: 'Vidange Huile Moteur (10W40 / 5W30)',
        interval_km: 10000,
        last_service_km: 0,
        last_service_date: new Date().toISOString().split('T')[0],
        alert_before_km: 1000,
        cost_mad: 0,
        notes: ''
    });

    const [completeForm, setCompleteForm] = useState({
        service_km: 0,
        service_date: new Date().toISOString().split('T')[0],
        cost_mad: 450,
        performed_by: '',
        invoice_number: '',
        notes: '',
        next_interval_km: 10000
    });

    const [odometerForm, setOdometerForm] = useState({
        device_id: '',
        odometer_km: 0
    });

    const [packInitDeviceId, setPackInitDeviceId] = useState('');
    const [packInitOdometer, setPackInitOdometer] = useState(0);

    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Load initial data
    const fetchData = async () => {
        try {
            setLoading(true);
            const [overviewRes, servicesRes, logsRes, devRes] = await Promise.all([
                api.get('/maintenance/overview'),
                api.get('/maintenance/services'),
                api.get('/maintenance/logs'),
                api.get('/devices')
            ]);

            setOverview(overviewRes.data);
            setServices(servicesRes.data);
            setLogs(logsRes.data);
            setVehicles(devRes.data.map((d: any) => ({
                device_id: d.device_id,
                name: d.name || d.device_id,
                plate_number: d.plate_number,
                driver_name: d.driver_name,
                odometer_km: Number(d.odometer_km) || 0,
                image_url: d.image_url
            })));
        } catch (err) {
            console.error('Failed to load maintenance data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filtered services
    const filteredServices = useMemo(() => {
        return services.filter(s => {
            const matchSearch =
                s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.device_name && s.device_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (s.plate_number && s.plate_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (s.driver_name && s.driver_name.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchDevice = selectedDeviceFilter === 'all' || s.device_id === selectedDeviceFilter;
            const matchStatus = statusFilter === 'all' || s.status === statusFilter;

            return matchSearch && matchDevice && matchStatus;
        });
    }, [services, searchTerm, selectedDeviceFilter, statusFilter]);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            const matchSearch =
                l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (l.device_name && l.device_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (l.plate_number && l.plate_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (l.performed_by && l.performed_by.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchDevice = selectedDeviceFilter === 'all' || l.device_id === selectedDeviceFilter;

            return matchSearch && matchDevice;
        });
    }, [logs, searchTerm, selectedDeviceFilter]);

    // Pre-populate title & interval when service type changes
    const handleServiceTypeChange = (type: string) => {
        const presets: Record<string, { title: string; interval: number; alert: number }> = {
            oil_change: { title: 'Vidange Huile Moteur (10W40 / 5W30)', interval: 10000, alert: 1000 },
            oil_filter: { title: 'Filtre à Huile', interval: 10000, alert: 1000 },
            fuel_filter: { title: 'Filtre à Carburant (Gasoil / Essence)', interval: 20000, alert: 2000 },
            air_filter: { title: 'Filtre à Air & Habitacle', interval: 20000, alert: 2000 },
            brake_pads: { title: 'Plaquettes de Frein', interval: 30000, alert: 3000 },
            brake_discs: { title: 'Disques de Frein', interval: 60000, alert: 5000 },
            tires: { title: 'Pneumatiques (Rotation / Remplacement)', interval: 40000, alert: 4000 },
            timing_belt: { title: 'Courroie de Distribution & Pompe à Eau', interval: 80000, alert: 5000 },
            spark_plugs: { title: 'Bougies d\'Allumage / Préchauffage', interval: 40000, alert: 4000 },
            coolant: { title: 'Liquide de Refroidissement', interval: 40000, alert: 4000 },
            custom: { title: 'Entretien Personnalisé', interval: 10000, alert: 1000 },
        };

        const preset = presets[type] || presets.custom;
        setScheduleForm(prev => ({
            ...prev,
            service_type: type,
            title: preset.title,
            interval_km: preset.interval,
            alert_before_km: preset.alert
        }));
    };

    // Open schedule modal for add/edit
    const handleOpenScheduleModal = (s?: MaintenanceService) => {
        if (s) {
            setScheduleForm({
                id: s.id,
                device_id: s.device_id,
                service_type: s.service_type,
                title: s.title,
                interval_km: s.interval_km,
                last_service_km: s.last_service_km,
                last_service_date: s.last_service_date ? s.last_service_date.split('T')[0] : '',
                alert_before_km: s.alert_before_km,
                cost_mad: s.cost_mad || 0,
                notes: s.notes || ''
            });
        } else {
            const defaultDev = vehicles[0]?.device_id || '';
            const defaultKm = vehicles[0]?.odometer_km || 0;
            setScheduleForm({
                id: 0,
                device_id: defaultDev,
                service_type: 'oil_change',
                title: 'Vidange Huile Moteur (10W40 / 5W30)',
                interval_km: 10000,
                last_service_km: defaultKm,
                last_service_date: new Date().toISOString().split('T')[0],
                alert_before_km: 1000,
                cost_mad: 450,
                notes: ''
            });
        }
        setShowScheduleModal(true);
    };

    // Save schedule (create or update)
    const handleSaveSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (scheduleForm.id > 0) {
                await api.put(`/maintenance/services/${scheduleForm.id}`, scheduleForm);
                showToast(t('serviceCreatedSuccess'));
            } else {
                await api.post('/maintenance/services', scheduleForm);
                showToast(t('serviceCreatedSuccess'));
            }
            setShowScheduleModal(false);
            fetchData();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Erreur lors de l\'enregistrement');
        }
    };

    // Delete schedule
    const handleDeleteSchedule = async (id: number) => {
        if (!confirm(t('deleteServiceConfirm'))) return;
        try {
            await api.delete(`/maintenance/services/${id}`);
            showToast(t('serviceDeletedSuccess'));
            fetchData();
        } catch (err) {
            alert('Erreur lors de la suppression');
        }
    };

    // Open complete modal
    const handleOpenCompleteModal = (s: MaintenanceService) => {
        setSelectedService(s);
        setCompleteForm({
            service_km: Math.round(s.current_odometer_km || s.next_due_km),
            service_date: new Date().toISOString().split('T')[0],
            cost_mad: s.cost_mad > 0 ? s.cost_mad : 450,
            performed_by: '',
            invoice_number: '',
            notes: '',
            next_interval_km: s.interval_km
        });
        setShowCompleteModal(true);
    };

    // Submit completion
    const handleSubmitComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedService) return;
        try {
            await api.post(`/maintenance/services/${selectedService.id}/complete`, completeForm);
            showToast(t('serviceCompletedSuccess'));
            setShowCompleteModal(false);
            fetchData();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Erreur lors de la validation');
        }
    };

    // Quick Pack Init
    const handleOpenPackInit = () => {
        const firstDev = vehicles[0];
        setPackInitDeviceId(firstDev?.device_id || '');
        setPackInitOdometer(firstDev?.odometer_km || 0);
        setShowInitPackModal(true);
    };

    const handleRunPackInit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!packInitDeviceId) return;
        try {
            const res = await api.post(`/maintenance/batch-init/${packInitDeviceId}`, {
                current_odometer_km: packInitOdometer
            });
            showToast(res.data.message || 'Pack initialisé avec succès !');
            setShowInitPackModal(false);
            fetchData();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Erreur initialisation');
        }
    };

    // Odometer edit modal
    const handleOpenOdometerModal = (v: VehicleOption) => {
        setSelectedDeviceForAction(v);
        setOdometerForm({
            device_id: v.device_id,
            odometer_km: v.odometer_km || 0
        });
        setShowOdometerModal(true);
    };

    const handleSaveOdometer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!odometerForm.device_id) return;
        try {
            await api.put(`/maintenance/odometer/${odometerForm.device_id}`, {
                odometer_km: odometerForm.odometer_km
            });
            showToast(t('odometerUpdatedSuccess'));
            setShowOdometerModal(false);
            fetchData();
        } catch (err) {
            alert('Erreur lors de la mise à jour de l\'odomètre');
        }
    };

    // Delete log
    const handleDeleteLog = async (id: number) => {
        if (!confirm('Supprimer cette intervention de l\'historique ?')) return;
        try {
            await api.delete(`/maintenance/logs/${id}`);
            showToast('Intervention supprimée');
            fetchData();
        } catch (err) {
            alert('Erreur suppression');
        }
    };

    return (
        <div className="min-h-full bg-gray-950 text-gray-100 p-4 sm:p-6 lg:p-8 space-y-6">

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-6 end-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-600 text-white font-medium text-xs sm:text-sm shadow-2xl shadow-emerald-900/50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle2 size={16} />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
                        <Wrench size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                            <span>{t('maintenance')}</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30">
                                Pro Fleet
                            </span>
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                            {t('maintenanceSubtitle')}
                        </p>
                    </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={handleOpenPackInit}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold transition-all shadow-sm"
                        title={t('quickInitDesc')}
                    >
                        <Sparkles size={15} className="text-amber-400" />
                        <span>{t('quickInitPresets')}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpenScheduleModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40"
                    >
                        <Plus size={16} />
                        <span>{t('newServiceSchedule')}</span>
                    </button>

                    <button
                        type="button"
                        onClick={fetchData}
                        className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white transition-colors"
                        title="Rafraîchir"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* KPI Cards Overview */}
            {overview && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                    {/* Card 1: Total */}
                    <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
                            <span>{t('totalServices')}</span>
                            <Wrench size={15} className="text-blue-400" />
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl sm:text-3xl font-extrabold text-white">{overview.total_services}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">Sur l'ensemble de la flotte</div>
                        </div>
                    </div>

                    {/* Card 2: OK */}
                    <div className="p-4 rounded-2xl bg-gray-900/80 border border-emerald-500/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
                            <span>{t('servicesOk')}</span>
                            <CheckCircle2 size={15} className="text-emerald-400" />
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{overview.ok_count}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">Véhicules prêts à rouler</div>
                        </div>
                    </div>

                    {/* Card 3: Due Soon */}
                    <div className="p-4 rounded-2xl bg-gray-900/80 border border-amber-500/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
                            <span>{t('servicesDueSoon')}</span>
                            <Clock size={15} className="text-amber-400" />
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{overview.due_soon_count}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">Échéance &lt; 1 000 km</div>
                        </div>
                    </div>

                    {/* Card 4: Overdue */}
                    <div className="p-4 rounded-2xl bg-gray-900/80 border border-rose-500/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-rose-400 text-xs font-medium">
                            <span>{t('servicesOverdue')}</span>
                            <AlertTriangle size={15} className="text-rose-400" />
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400">{overview.overdue_count}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">Kilométrage dépassé</div>
                        </div>
                    </div>

                    {/* Card 5: Total Spent MAD */}
                    <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/40 border border-blue-500/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-blue-400 text-xs font-medium">
                            <span>{t('totalSpentMad')}</span>
                            <span className="font-bold text-xs">MAD</span>
                        </div>
                        <div className="mt-3">
                            <div className="text-xl sm:text-2xl font-extrabold text-white">
                                {overview.total_spent_mad.toLocaleString()} <span className="text-xs font-bold text-blue-400">MAD</span>
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                                30j : <span className="text-emerald-400 font-semibold">{overview.spent_30d_mad.toLocaleString()} MAD</span> ({overview.total_logs_count} faits)
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs & Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-xl w-fit">
                    <button
                        type="button"
                        onClick={() => setActiveTab('schedules')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'schedules'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Gauge size={14} />
                        <span>Échéancier Actif ({services.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('logs')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'logs'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <FileText size={14} />
                        <span>{t('serviceHistory')} ({logs.length})</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search */}
                    <div className="relative min-w-[200px] flex-1 sm:flex-none">
                        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher véhicule, vidange..."
                            className="w-full ps-9 pe-3 py-1.5 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* Filter by Vehicle */}
                    <select
                        value={selectedDeviceFilter}
                        onChange={(e) => setSelectedDeviceFilter(e.target.value)}
                        className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">{t('allVehicles')}</option>
                        {vehicles.map(v => (
                            <option key={v.device_id} value={v.device_id}>
                                {v.name} {v.plate_number ? `(${v.plate_number})` : ''}
                            </option>
                        ))}
                    </select>

                    {/* Status filter (for schedules) */}
                    {activeTab === 'schedules' && (
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                        >
                            <option value="all">{t('allStatuses')}</option>
                            <option value="overdue">⚠️ {t('overdueBadge')}</option>
                            <option value="due_soon">⏳ {t('dueSoonBadge')}</option>
                            <option value="ok">✅ {t('okBadge')}</option>
                        </select>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════
                TAB 1: SCHEDULED SERVICES
               ══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'schedules' && (
                <div>
                    {filteredServices.length === 0 ? (
                        <div className="py-16 text-center rounded-3xl bg-gray-900/40 border border-gray-800/80 p-6 space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-gray-800/80 mx-auto flex items-center justify-center text-gray-400">
                                <Wrench size={28} />
                            </div>
                            <div className="max-w-md mx-auto">
                                <h3 className="text-base font-bold text-white">{t('noServicesFound')}</h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Initialisez automatiquement le pack complet pour vos véhicules ou créez un rappel personnalisé de vidange.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleOpenPackInit}
                                    className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all flex items-center gap-2"
                                >
                                    <Sparkles size={14} />
                                    <span>{t('quickInitPresets')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleOpenScheduleModal()}
                                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-all flex items-center gap-2"
                                >
                                    <Plus size={14} />
                                    <span>{t('newServiceSchedule')}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredServices.map((service) => {
                                const currentKm = Math.round(service.current_odometer_km || 0);
                                const nextDueKm = Math.round(service.next_due_km);
                                const remaining = service.km_remaining !== undefined ? Math.round(service.km_remaining) : (nextDueKm - currentKm);
                                const isOverdue = remaining < 0;
                                const isDueSoon = !isOverdue && remaining <= (service.alert_before_km || 1000);
                                const progress = service.progress_percent !== undefined ? service.progress_percent : 50;

                                // Badge styling
                                const badgeColor = isOverdue
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                    : isDueSoon
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

                                const progressColor = isOverdue
                                    ? 'bg-rose-500'
                                    : isDueSoon
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500';

                                return (
                                    <div
                                        key={service.id}
                                        className={`rounded-2xl bg-gray-900/90 border transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-lg ${
                                            isOverdue
                                                ? 'border-rose-500/40 shadow-rose-950/20'
                                                : isDueSoon
                                                ? 'border-amber-500/40 shadow-amber-950/20'
                                                : 'border-gray-800 hover:border-gray-700'
                                        }`}
                                    >
                                        {/* Card Top: Vehicle Header */}
                                        <div>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {/* Vehicle Image Thumbnail */}
                                                    <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 shrink-0 overflow-hidden flex items-center justify-center">
                                                        {service.image_url ? (
                                                            <img
                                                                src={service.image_url}
                                                                alt={service.device_name || 'Vehicle'}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <Car size={18} className="text-gray-400" />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-white text-sm truncate">
                                                            {service.device_name || service.device_id}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5 truncate">
                                                            {service.plate_number && (
                                                                <span className="font-mono bg-gray-800 px-1.5 py-0.5 rounded text-[10px] text-gray-300 font-semibold">
                                                                    {service.plate_number}
                                                                </span>
                                                            )}
                                                            {service.driver_name && (
                                                                <span className="truncate text-blue-400 font-medium">
                                                                    {service.driver_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Status Pill */}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeColor}`}>
                                                    {isOverdue ? `⚠️ ${t('overdueBadge')}` : isDueSoon ? `⏳ ${t('dueSoonBadge')}` : `✅ ${t('okBadge')}`}
                                                </span>
                                            </div>

                                            {/* Service Title */}
                                            <div className="mt-4 pt-3 border-t border-gray-800/80">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="font-semibold text-white text-sm">
                                                        {service.title}
                                                    </h4>
                                                    <span className="text-[11px] font-mono text-gray-400 shrink-0">
                                                        Tous les {service.interval_km.toLocaleString()} km
                                                    </span>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="mt-3 space-y-1.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-400 font-mono text-[11px]">
                                                            Compteur : <span className="text-white font-bold">{currentKm.toLocaleString()} km</span>
                                                        </span>
                                                        <span className={`font-mono font-bold text-xs ${isOverdue ? 'text-rose-400' : isDueSoon ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                            {isOverdue
                                                                ? `Dépassé de ${Math.abs(remaining).toLocaleString()} km`
                                                                : `Dans ${remaining.toLocaleString()} km`}
                                                        </span>
                                                    </div>

                                                    <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                                            style={{ width: `${Math.min(100, progress)}%` }}
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                                                        <span>Dernière : {service.last_service_km.toLocaleString()} km</span>
                                                        <span>Échéance : {nextDueKm.toLocaleString()} km</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Actions */}
                                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-800/80">
                                            {/* Mark Done / Validate Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenCompleteModal(service)}
                                                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <CheckCircle2 size={14} className="text-emerald-400" />
                                                <span>{t('markAsCompleted')}</span>
                                            </button>

                                            {/* Edit */}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenScheduleModal(service)}
                                                className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                                                title="Modifier l'entretien"
                                            >
                                                <Edit3 size={14} />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSchedule(service.id)}
                                                className="p-2 rounded-xl bg-gray-800/80 hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                TAB 2: MAINTENANCE LOGS HISTORY
               ══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'logs' && (
                <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden shadow-xl">
                    <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <FileText size={18} className="text-blue-400" />
                                <span>{t('serviceHistory')}</span>
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Registre chronologique de toutes les vidanges et réparations effectuées sur la flotte
                            </p>
                        </div>
                    </div>

                    {filteredLogs.length === 0 ? (
                        <div className="py-16 text-center p-6 space-y-3">
                            <Clock size={32} className="mx-auto text-gray-600" />
                            <p className="text-sm font-semibold text-gray-400">{t('noLogsFound')}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-start text-xs">
                                <thead className="bg-gray-950/60 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold">Date</th>
                                        <th className="py-3 px-4 font-semibold">Véhicule</th>
                                        <th className="py-3 px-4 font-semibold">Intervention</th>
                                        <th className="py-3 px-4 font-semibold">Kilométrage</th>
                                        <th className="py-3 px-4 font-semibold">Garage / Prestataire</th>
                                        <th className="py-3 px-4 font-semibold">Coût</th>
                                        <th className="py-3 px-4 font-semibold text-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                                            {/* Date */}
                                            <td className="py-3.5 px-4 font-mono text-gray-300 whitespace-nowrap">
                                                {new Date(log.service_date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}
                                            </td>

                                            {/* Vehicle */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-white truncate max-w-[150px]">
                                                    {log.device_name || log.device_id}
                                                </div>
                                                {log.plate_number && (
                                                    <div className="text-[10px] font-mono text-gray-400">
                                                        {log.plate_number}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Title */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-blue-400">
                                                    {log.title}
                                                </div>
                                                {log.notes && (
                                                    <div className="text-[11px] text-gray-400 truncate max-w-[220px]">
                                                        {log.notes}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Kilométrage */}
                                            <td className="py-3.5 px-4 font-mono text-gray-200">
                                                {log.service_km.toLocaleString()} km
                                            </td>

                                            {/* Performed by / Garage */}
                                            <td className="py-3.5 px-4 text-gray-300">
                                                {log.performed_by || '—'}
                                                {log.invoice_number && (
                                                    <span className="block text-[10px] font-mono text-gray-500">
                                                        Facture : #{log.invoice_number}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Cost */}
                                            <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                                                {Number(log.cost_mad).toLocaleString()} MAD
                                            </td>

                                            {/* Delete */}
                                            <td className="py-3.5 px-4 text-end">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors"
                                                    title="Supprimer ce reçu"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                MODAL 1: COMPLETE SERVICE (VALIDER L'ENTRETIEN)
               ══════════════════════════════════════════════════════════════════════ */}
            {showCompleteModal && selectedService && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <CheckCircle2 size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm sm:text-base">
                                        Valider l'Intervention
                                    </h3>
                                    <p className="text-[11px] text-gray-400 truncate max-w-[280px]">
                                        {selectedService.title} · {selectedService.device_name || selectedService.device_id}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCompleteModal(false)}
                                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitComplete} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Kilométrage */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Kilométrage réel du compteur *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={completeForm.service_km}
                                        onChange={(e) => setCompleteForm({ ...completeForm, service_km: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Date de réalisation *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={completeForm.service_date}
                                        onChange={(e) => setCompleteForm({ ...completeForm, service_date: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Coût en MAD */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Coût total payé (MAD)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={completeForm.cost_mad}
                                        onChange={(e) => setCompleteForm({ ...completeForm, cost_mad: Number(e.target.value) })}
                                        placeholder="Ex: 450"
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                {/* Prochain intervalle */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Prochain intervalle (km)
                                    </label>
                                    <input
                                        type="number"
                                        min="500"
                                        step="500"
                                        value={completeForm.next_interval_km}
                                        onChange={(e) => setCompleteForm({ ...completeForm, next_interval_km: Number(e.target.value) })}
                                        placeholder="Ex: 10000"
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Garage / Prestataire */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Garage / Prestataire / Station
                                </label>
                                <input
                                    type="text"
                                    value={completeForm.performed_by}
                                    onChange={(e) => setCompleteForm({ ...completeForm, performed_by: e.target.value })}
                                    placeholder="Ex: Station Total Marrakech, Garage Speedy..."
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* N° Facture */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    N° Facture / Bon d'intervention
                                </label>
                                <input
                                    type="text"
                                    value={completeForm.invoice_number}
                                    onChange={(e) => setCompleteForm({ ...completeForm, invoice_number: e.target.value })}
                                    placeholder="Ex: FACT-2026-089"
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Notes & Référence d'huile / pièces
                                </label>
                                <textarea
                                    rows={2}
                                    value={completeForm.notes}
                                    onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                                    placeholder="Ex: Huile Total Quartz 5W30 + filtre à huile Bosch remplacé..."
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowCompleteModal(false)}
                                    className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-1.5"
                                >
                                    <Check size={14} />
                                    <span>Valider & Réinitialiser Cycle</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                MODAL 2: CREATE / EDIT SCHEDULE
               ══════════════════════════════════════════════════════════════════════ */}
            {showScheduleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                                <Wrench size={16} className="text-blue-400" />
                                <span>{scheduleForm.id > 0 ? 'Modifier l\'Entretien Programmé' : 'Programmer un Nouvel Entretien'}</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowScheduleModal(false)}
                                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSchedule} className="p-6 space-y-4">
                            {/* Vehicle select (if creating) */}
                            {scheduleForm.id === 0 && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Sélectionner le Véhicule *
                                    </label>
                                    <select
                                        required
                                        value={scheduleForm.device_id}
                                        onChange={(e) => {
                                            const dev = vehicles.find(v => v.device_id === e.target.value);
                                            setScheduleForm({
                                                ...scheduleForm,
                                                device_id: e.target.value,
                                                last_service_km: dev?.odometer_km || 0
                                            });
                                        }}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                                    >
                                        {vehicles.map(v => (
                                            <option key={v.device_id} value={v.device_id}>
                                                {v.name} {v.plate_number ? `(${v.plate_number})` : ''} - Odomètre: {v.odometer_km?.toLocaleString()} km
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Service Type */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Type d'intervention
                                </label>
                                <select
                                    value={scheduleForm.service_type}
                                    onChange={(e) => handleServiceTypeChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="oil_change">🛢️ Vidange Huile Moteur</option>
                                    <option value="oil_filter">⚙️ Filtre à Huile</option>
                                    <option value="fuel_filter">⛽ Filtre à Carburant / Gasoil</option>
                                    <option value="air_filter">💨 Filtre à Air & Habitacle</option>
                                    <option value="brake_pads">🛑 Plaquettes de Frein</option>
                                    <option value="brake_discs">🔘 Disques de Frein</option>
                                    <option value="tires">🛞 Pneumatiques (Rotation / Changement)</option>
                                    <option value="timing_belt">🔄 Courroie de Distribution</option>
                                    <option value="spark_plugs">⚡ Bougies d'Allumage</option>
                                    <option value="coolant">❄️ Liquide de Refroidissement</option>
                                    <option value="custom">🛠️ Autre / Service Personnalisé</option>
                                </select>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Intitulé du service *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={scheduleForm.title}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Interval */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Intervalle récurrent (km) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="500"
                                        step="500"
                                        value={scheduleForm.interval_km}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, interval_km: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {/* Last service km */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Dernière réalisée à (km)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={scheduleForm.last_service_km}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, last_service_km: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Alert before km */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Déclencher l'alerte avant échéance (km)
                                </label>
                                <input
                                    type="number"
                                    min="100"
                                    step="100"
                                    value={scheduleForm.alert_before_km}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, alert_before_km: Number(e.target.value) })}
                                    placeholder="Ex: 1000"
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Notes (Recommandations constructeur, grade huile...)
                                </label>
                                <textarea
                                    rows={2}
                                    value={scheduleForm.notes}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                                    placeholder="Ex: Huile 5W30 norme RN0720, changer joint de bouchon..."
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowScheduleModal(false)}
                                    className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25"
                                >
                                    Enregistrer l'Entretien
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                MODAL 3: BATCH INITIALIZE PACK
               ══════════════════════════════════════════════════════════════════════ */}
            {showInitPackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-3xl bg-gray-900 border border-amber-500/30 shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
                                <Sparkles size={18} />
                                <span>{t('quickInitPresets')}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowInitPackModal(false)}
                                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleRunPackInit} className="p-6 space-y-4">
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Ce générateur configure en 1 clic les **7 programmes d'entretien essentiels** pour votre véhicule à partir de son compteur réel :
                            </p>

                            <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 text-xs space-y-2 text-gray-300">
                                <div className="flex items-center justify-between">
                                    <span>🛢️ Vidange Huile Moteur</span>
                                    <span className="font-mono text-amber-400">10 000 km</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>⚙️ Filtre à Huile</span>
                                    <span className="font-mono text-amber-400">10 000 km</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>⛽ Filtre à Carburant (Gasoil)</span>
                                    <span className="font-mono text-amber-400">20 000 km</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>💨 Filtre à Air & Habitacle</span>
                                    <span className="font-mono text-amber-400">20 000 km</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>🛑 Plaquettes de Frein</span>
                                    <span className="font-mono text-amber-400">30 000 km</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>🛞 Rotation Pneumatiques</span>
                                    <span className="font-mono text-amber-400">40 000 km</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>🔄 Courroie de Distribution</span>
                                    <span className="font-mono text-amber-400">80 000 km</span>
                                </div>
                            </div>

                            {/* Select Vehicle */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Choisir le véhicule cible *
                                </label>
                                <select
                                    required
                                    value={packInitDeviceId}
                                    onChange={(e) => {
                                        setPackInitDeviceId(e.target.value);
                                        const dev = vehicles.find(v => v.device_id === e.target.value);
                                        setPackInitOdometer(dev?.odometer_km || 0);
                                    }}
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                                >
                                    {vehicles.map(v => (
                                        <option key={v.device_id} value={v.device_id}>
                                            {v.name} {v.plate_number ? `(${v.plate_number})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Current Odometer */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Kilométrage actuel du véhicule (km) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={packInitOdometer}
                                    onChange={(e) => setPackInitOdometer(Number(e.target.value))}
                                    placeholder="Ex: 85000"
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                                />
                                <span className="text-[11px] text-gray-500 mt-1 block">
                                    Les prochaines échéances seront automatiquement calculées à partir de cette valeur.
                                </span>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowInitPackModal(false)}
                                    className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 flex items-center gap-1.5"
                                >
                                    <Sparkles size={14} />
                                    <span>Générer les 7 Entretiens</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
