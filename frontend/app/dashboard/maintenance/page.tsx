"use client";

import { useEffect, useState, useMemo } from 'react';
import {
    Wrench, Plus, CheckCircle2, AlertTriangle, Clock,
    Car, Sparkles, Search, Filter, Trash2, Edit3,
    Calendar, DollarSign, Gauge, Shield, ChevronRight,
    ArrowUpRight, RefreshCw, X, FileText, Check, AlertCircle,
    ShieldAlert, ClipboardCheck
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
    interval_days?: number;
    last_service_km: number;
    last_service_date: string | null;
    next_due_km: number;
    next_due_date?: string | null;
    alert_before_km: number;
    alert_before_days?: number;
    is_mandatory?: boolean;
    cost_mad: number;
    notes: string | null;
    device_name?: string;
    plate_number?: string;
    model?: string;
    driver_name?: string;
    image_url?: string;
    current_odometer_km?: number;
    km_remaining?: number;
    days_remaining?: number;
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
    mandatory_count?: number;
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
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'mandatory' | 'mechanical'>('all');

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
        service_type: 'technical_inspection',
        title: 'Visite Technique Annuelle Obligatoire (Centre Agréé)',
        interval_km: 0,
        interval_days: 365,
        last_service_km: 0,
        last_service_date: new Date().toISOString().split('T')[0],
        next_due_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        alert_before_km: 1000,
        alert_before_days: 30,
        is_mandatory: true,
        cost_mad: 350,
        notes: 'Obligatoire chaque année par les autorités (Ministère / NARSA). Risque d\'amende, fourrière et nullité d\'assurance en cas d\'expiration.'
    });

    const [completeForm, setCompleteForm] = useState({
        service_km: 0,
        service_date: new Date().toISOString().split('T')[0],
        cost_mad: 350,
        performed_by: '',
        invoice_number: '',
        notes: '',
        next_interval_km: 0,
        next_interval_days: 365
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

    // Count mandatory vs mechanical services
    const mandatoryCount = useMemo(() => {
        return services.filter(s => s.is_mandatory || s.service_type === 'technical_inspection').length;
    }, [services]);

    const mechanicalCount = useMemo(() => {
        return services.filter(s => !s.is_mandatory && s.service_type !== 'technical_inspection').length;
    }, [services]);

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

            const isMandatoryItem = Boolean(s.is_mandatory || s.service_type === 'technical_inspection');
            const matchCategory =
                categoryFilter === 'all'
                    ? true
                    : categoryFilter === 'mandatory'
                    ? isMandatoryItem
                    : !isMandatoryItem;

            return matchSearch && matchDevice && matchStatus && matchCategory;
        });
    }, [services, searchTerm, selectedDeviceFilter, statusFilter, categoryFilter]);

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
        const presets: Record<string, {
            title: string;
            interval_km: number;
            interval_days: number;
            alert_km: number;
            alert_days: number;
            cost: number;
            is_mandatory: boolean;
            notes: string;
        }> = {
            technical_inspection: {
                title: 'Visite Technique Annuelle Obligatoire (Centre Agréé)',
                interval_km: 0,
                interval_days: 365,
                alert_km: 0,
                alert_days: 30,
                cost: 350,
                is_mandatory: true,
                notes: 'Obligatoire chaque année par les autorités (Ministère / NARSA). Risque d\'amende forfaitaire, saisie en fourrière et rejet d\'assurance.'
            },
            insurance: {
                title: 'Assurance Véhicule (Renouvellement Annuel)',
                interval_km: 0,
                interval_days: 365,
                alert_km: 0,
                alert_days: 15,
                cost: 3000,
                is_mandatory: true,
                notes: 'Police d\'assurance automobile annuelle obligatoire pour circuler sur la voie publique.'
            },
            oil_change: {
                title: 'Vidange Huile Moteur (10W40 / 5W30)',
                interval_km: 10000,
                interval_days: 0,
                alert_km: 1000,
                alert_days: 30,
                cost: 450,
                is_mandatory: false,
                notes: ''
            },
            oil_filter: {
                title: 'Filtre à Huile',
                interval_km: 10000,
                interval_days: 0,
                alert_km: 1000,
                alert_days: 30,
                cost: 90,
                is_mandatory: false,
                notes: ''
            },
            fuel_filter: {
                title: 'Filtre à Carburant (Gasoil / Essence)',
                interval_km: 20000,
                interval_days: 0,
                alert_km: 2000,
                alert_days: 30,
                cost: 180,
                is_mandatory: false,
                notes: ''
            },
            air_filter: {
                title: 'Filtre à Air & Habitacle',
                interval_km: 20000,
                interval_days: 0,
                alert_km: 2000,
                alert_days: 30,
                cost: 150,
                is_mandatory: false,
                notes: ''
            },
            brake_pads: {
                title: 'Plaquettes de Frein',
                interval_km: 30000,
                interval_days: 0,
                alert_km: 3000,
                alert_days: 30,
                cost: 400,
                is_mandatory: false,
                notes: ''
            },
            brake_discs: {
                title: 'Disques de Frein',
                interval_km: 60000,
                interval_days: 0,
                alert_km: 5000,
                alert_days: 30,
                cost: 800,
                is_mandatory: false,
                notes: ''
            },
            tires: {
                title: 'Pneumatiques (Rotation / Remplacement)',
                interval_km: 40000,
                interval_days: 0,
                alert_km: 4000,
                alert_days: 30,
                cost: 1600,
                is_mandatory: false,
                notes: ''
            },
            timing_belt: {
                title: 'Courroie de Distribution & Pompe à Eau',
                interval_km: 80000,
                interval_days: 0,
                alert_km: 5000,
                alert_days: 30,
                cost: 1800,
                is_mandatory: false,
                notes: ''
            },
            spark_plugs: {
                title: 'Bougies d\'Allumage / Préchauffage',
                interval_km: 40000,
                interval_days: 0,
                alert_km: 4000,
                alert_days: 30,
                cost: 300,
                is_mandatory: false,
                notes: ''
            },
            coolant: {
                title: 'Liquide de Refroidissement',
                interval_km: 40000,
                interval_days: 0,
                alert_km: 4000,
                alert_days: 30,
                cost: 200,
                is_mandatory: false,
                notes: ''
            },
            custom: {
                title: 'Entretien Personnalisé',
                interval_km: 10000,
                interval_days: 0,
                alert_km: 1000,
                alert_days: 30,
                cost: 0,
                is_mandatory: false,
                notes: ''
            },
        };

        const preset = presets[type] || presets.custom;

        // Calculate next due date if days > 0
        let dueDate = '';
        if (preset.interval_days > 0) {
            const d = new Date();
            d.setDate(d.getDate() + preset.interval_days);
            dueDate = d.toISOString().split('T')[0];
        }

        setScheduleForm(prev => ({
            ...prev,
            service_type: type,
            title: preset.title,
            interval_km: preset.interval_km,
            interval_days: preset.interval_days,
            alert_before_km: preset.alert_km,
            alert_before_days: preset.alert_days,
            cost_mad: preset.cost,
            is_mandatory: preset.is_mandatory,
            next_due_date: dueDate,
            notes: preset.notes
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
                interval_km: s.interval_km || 0,
                interval_days: s.interval_days || 0,
                last_service_km: s.last_service_km || 0,
                last_service_date: s.last_service_date ? s.last_service_date.split('T')[0] : '',
                next_due_date: s.next_due_date ? s.next_due_date.split('T')[0] : '',
                alert_before_km: s.alert_before_km || 1000,
                alert_before_days: s.alert_before_days || 30,
                is_mandatory: Boolean(s.is_mandatory),
                cost_mad: s.cost_mad || 0,
                notes: s.notes || ''
            });
        } else {
            const defaultDev = vehicles[0]?.device_id || '';
            const defaultKm = vehicles[0]?.odometer_km || 0;
            const oneYearDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
            setScheduleForm({
                id: 0,
                device_id: defaultDev,
                service_type: 'technical_inspection',
                title: 'Visite Technique Annuelle Obligatoire (Centre Agréé)',
                interval_km: 0,
                interval_days: 365,
                last_service_km: defaultKm,
                last_service_date: new Date().toISOString().split('T')[0],
                next_due_date: oneYearDate,
                alert_before_km: 0,
                alert_before_days: 30,
                is_mandatory: true,
                cost_mad: 350,
                notes: 'Obligatoire chaque année par les autorités (Ministère / NARSA). Risque d\'amende, fourrière et nullité d\'assurance en cas d\'expiration.'
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
        const isVisiteTech = s.is_mandatory || s.service_type === 'technical_inspection';
        setCompleteForm({
            service_km: Math.round(s.current_odometer_km || s.next_due_km || 0),
            service_date: new Date().toISOString().split('T')[0],
            cost_mad: s.cost_mad > 0 ? s.cost_mad : (isVisiteTech ? 350 : 450),
            performed_by: isVisiteTech ? 'Centre de Visite Technique Agréé' : '',
            invoice_number: '',
            notes: isVisiteTech ? 'Contrôle technique favorable délivré. Vignette apposée.' : '',
            next_interval_km: s.interval_km || 0,
            next_interval_days: s.interval_days || (isVisiteTech ? 365 : 0)
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
            showToast(res.data.message || '8 entretiens et visite technique initialisés !');
            setShowInitPackModal(false);
            fetchData();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Erreur lors de l\'initialisation');
        }
    };

    // Quick Odometer Modal
    const handleOpenOdometerModal = (v?: VehicleOption) => {
        const target = v || vehicles[0];
        if (!target) return;
        setSelectedDeviceForAction(target);
        setOdometerForm({
            device_id: target.device_id,
            odometer_km: target.odometer_km || 0
        });
        setShowOdometerModal(true);
    };

    const handleSaveOdometer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/maintenance/odometer/${odometerForm.device_id}`, {
                odometer_km: odometerForm.odometer_km
            });
            showToast(t('odometerUpdatedSuccess'));
            setShowOdometerModal(false);
            fetchData();
        } catch (err) {
            alert('Erreur mise à jour odomètre');
        }
    };

    // Delete Log
    const handleDeleteLog = async (id: number) => {
        if (!confirm('Supprimer cette intervention de l\'historique ?')) return;
        try {
            await api.delete(`/maintenance/logs/${id}`);
            showToast('Ligne d\'historique supprimée');
            fetchData();
        } catch (err) {
            alert('Erreur lors de la suppression');
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
                                Pro Fleet & Visite Technique
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
                        <span>{t('quickInitPresets')} (8 en 1)</span>
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

                    {/* Card 2: Visite Technique & Obligations Légales */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/30 via-gray-900 to-amber-950/20 border border-rose-500/30 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-rose-300 text-xs font-medium">
                            <span>{t('mandatoryCount')}</span>
                            <ShieldAlert size={15} className="text-rose-400" />
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl sm:text-3xl font-extrabold text-white flex items-baseline gap-2">
                                <span>{overview.mandatory_count ?? mandatoryCount}</span>
                                <span className="text-xs font-semibold text-rose-400">visites / lois</span>
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">Contrôles réglementaires annuels</div>
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
                            <div className="text-[11px] text-gray-500 mt-0.5">&lt; 1 000 km ou &lt; 30 jours</div>
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
                            <div className="text-[11px] text-rose-300/80 mt-0.5">Délai ou km dépassé</div>
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

            {/* Category Quick Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        categoryFilter === 'all'
                            ? 'bg-blue-600 text-white shadow'
                            : 'bg-gray-900 hover:bg-gray-800 text-gray-400 border border-gray-800'
                    }`}
                >
                    <span>{t('allCategories')}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30">{services.length}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setCategoryFilter('mandatory')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        categoryFilter === 'mandatory'
                            ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-950/50'
                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                >
                    <ShieldAlert size={14} className={categoryFilter === 'mandatory' ? 'text-white' : 'text-rose-400'} />
                    <span>{t('regulatoryInspections')}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-200 border border-rose-500/40">
                        {mandatoryCount}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setCategoryFilter('mechanical')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        categoryFilter === 'mechanical'
                            ? 'bg-amber-600 text-white shadow'
                            : 'bg-gray-900 hover:bg-gray-800 text-gray-400 border border-gray-800'
                    }`}
                >
                    <span>🛢️ {t('mechanicalMaintenance')}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30">{mechanicalCount}</span>
                </button>
            </div>

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
                        <span>Échéancier Actif ({filteredServices.length})</span>
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
                            placeholder="Rechercher véhicule, vidange, visite..."
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
                                    Initialisez automatiquement le pack complet pour vos véhicules ou créez un rappel de visite technique ou vidange.
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
                                const isMandatoryItem = Boolean(service.is_mandatory || service.service_type === 'technical_inspection');
                                const currentKm = Math.round(service.current_odometer_km || 0);
                                const nextDueKm = Math.round(service.next_due_km);
                                const hasKmInterval = (service.interval_km || 0) > 0;
                                const hasDateInterval = Boolean(service.next_due_date);

                                const remainingKm = service.km_remaining !== undefined ? Math.round(service.km_remaining) : (nextDueKm - currentKm);
                                const daysRemaining = service.days_remaining;

                                const isOverdue = service.status === 'overdue';
                                const isDueSoon = service.status === 'due_soon';
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
                                                ? 'border-rose-500/50 shadow-rose-950/20 ring-1 ring-rose-500/30'
                                                : isDueSoon
                                                ? 'border-amber-500/40 shadow-amber-950/20'
                                                : isMandatoryItem
                                                ? 'border-amber-500/25 hover:border-amber-500/40'
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

                                                {/* Status & Mandatory Pills */}
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    {isMandatoryItem && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wider">
                                                            <ShieldAlert size={10} className="text-rose-400" />
                                                            <span>{t('mandatoryBadge')}</span>
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                                        {isOverdue ? `⚠️ ${t('overdueBadge')}` : isDueSoon ? `⏳ ${t('dueSoonBadge')}` : `✅ ${t('okBadge')}`}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Service Title */}
                                            <div className="mt-4 pt-3 border-t border-gray-800/80">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="font-semibold text-white text-sm flex items-center gap-1.5">
                                                        {isMandatoryItem ? '📋' : '⚙️'} {service.title}
                                                    </h4>
                                                </div>

                                                {/* Interval Subtitle */}
                                                <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                                                    {service.interval_days && service.interval_days > 0 ? (
                                                        <span className="font-mono text-amber-300 font-medium">
                                                            Chaque {service.interval_days === 365 ? 'an (365 jours)' : `${service.interval_days} jours`}
                                                        </span>
                                                    ) : null}
                                                    {hasKmInterval && (
                                                        <span className="font-mono text-gray-400">
                                                            Tous les {service.interval_km.toLocaleString()} km
                                                        </span>
                                                    )}
                                                </div>

                                                {/* DATE DEADLINE CALLOUT (For Visite Technique & Mandatory Inspections) */}
                                                {hasDateInterval && service.next_due_date && (
                                                    <div className="mt-3">
                                                        {daysRemaining !== undefined && daysRemaining < 0 ? (
                                                            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200">
                                                                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-300">
                                                                    <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                                                                    <span>Expiré depuis {Math.abs(daysRemaining)} jour(s) ! ({new Date(service.next_due_date).toLocaleDateString()})</span>
                                                                </div>
                                                                <p className="text-[10.5px] text-rose-300/80 mt-1 leading-snug">
                                                                    ⚠️ {t('urgentLegalRisk')} Véhicule passible d'amende et de mise en fourrière immédiate.
                                                                </p>
                                                            </div>
                                                        ) : daysRemaining !== undefined && daysRemaining <= (service.alert_before_days || 30) ? (
                                                            <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/50 text-amber-200">
                                                                <div className="flex items-center justify-between gap-2 text-xs font-bold text-amber-300">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Clock size={13} className="text-amber-400" />
                                                                        <span>Expire dans {daysRemaining} jour(s)</span>
                                                                    </span>
                                                                    <span className="font-mono text-[11px]">{new Date(service.next_due_date).toLocaleDateString()}</span>
                                                                </div>
                                                                <p className="text-[10.5px] text-amber-300/80 mt-1">
                                                                    Prenez rendez-vous dans un centre de visite technique agréé sans tarder.
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 rounded-xl bg-gray-950 border border-gray-800 text-xs flex items-center justify-between">
                                                                <span className="text-gray-400 flex items-center gap-1.5">
                                                                    <Calendar size={13} className="text-emerald-400" />
                                                                    <span>Prochaine échéance :</span>
                                                                </span>
                                                                <span className="font-mono text-emerald-400 font-semibold">
                                                                    {new Date(service.next_due_date).toLocaleDateString()} ({daysRemaining} j restants)
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Progress Bar (Time or Distance) */}
                                                <div className="mt-3 space-y-1.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-400 font-mono text-[11px]">
                                                            {hasKmInterval ? (
                                                                <>Compteur : <span className="text-white font-bold">{currentKm.toLocaleString()} km</span></>
                                                            ) : (
                                                                <span>Échéance légale</span>
                                                            )}
                                                        </span>
                                                        <span className={`font-mono font-bold text-xs ${isOverdue ? 'text-rose-400' : isDueSoon ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                            {hasKmInterval ? (
                                                                remainingKm < 0
                                                                    ? `Dépassé de ${Math.abs(remainingKm).toLocaleString()} km`
                                                                    : `Dans ${remainingKm.toLocaleString()} km`
                                                            ) : (
                                                                daysRemaining !== undefined
                                                                    ? (daysRemaining < 0 ? `${Math.abs(daysRemaining)} j de retard` : `${daysRemaining} j restants`)
                                                                    : ''
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                                            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                                                        <span>
                                                            {service.last_service_date
                                                                ? `Dernière : ${new Date(service.last_service_date).toLocaleDateString()}`
                                                                : `Dernière : ${service.last_service_km.toLocaleString()} km`}
                                                        </span>
                                                        <span>
                                                            {service.next_due_date
                                                                ? `Date : ${new Date(service.next_due_date).toLocaleDateString()}`
                                                                : `Échéance : ${nextDueKm.toLocaleString()} km`}
                                                        </span>
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
                                                <span>{isMandatoryItem ? 'Valider Visite Effectuée' : t('markAsCompleted')}</span>
                                            </button>

                                            {/* Edit */}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenScheduleModal(service)}
                                                className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                                                title="Modifier le rappel"
                                            >
                                                <Edit3 size={14} />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSchedule(service.id)}
                                                className="p-2 rounded-xl bg-gray-800/80 hover:bg-rose-900/40 text-gray-400 hover:text-rose-400 transition-colors"
                                                title="Supprimer le rappel"
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
                TAB 2: SERVICE LOGS / HISTORY
               ══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'logs' && (
                <div className="rounded-3xl bg-gray-900/80 border border-gray-800 overflow-hidden shadow-xl">
                    <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="text-blue-400" />
                            <h3 className="font-bold text-white text-sm sm:text-base">{t('serviceHistory')}</h3>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                            {filteredLogs.length} intervention(s) enregistrée(s)
                        </span>
                    </div>

                    {filteredLogs.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 text-xs sm:text-sm">
                            {t('noLogsFound')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-950/60 text-gray-400 font-semibold border-b border-gray-800">
                                    <tr>
                                        <th className="px-4 py-3.5">Date</th>
                                        <th className="px-4 py-3.5">{t('vehicleCol')}</th>
                                        <th className="px-4 py-3.5">Intervention</th>
                                        <th className="px-4 py-3.5">Compteur (km)</th>
                                        <th className="px-4 py-3.5">Garage / Centre</th>
                                        <th className="px-4 py-3.5">Facture #</th>
                                        <th className="px-4 py-3.5 text-right">Coût</th>
                                        <th className="px-4 py-3.5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/60">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-800/40 transition-colors">
                                            <td className="px-4 py-3 font-mono text-gray-300">
                                                {new Date(log.service_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-white">{log.device_name || log.device_id}</div>
                                                {log.plate_number && (
                                                    <span className="font-mono text-[10px] text-gray-400 bg-gray-800 px-1 py-0.5 rounded">
                                                        {log.plate_number}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-gray-200">
                                                {log.service_type === 'technical_inspection' ? '📋 ' : '⚙️ '}
                                                {log.title}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-amber-300 font-bold">
                                                {log.service_km.toLocaleString()} km
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">
                                                {log.performed_by || '-'}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-gray-400">
                                                {log.invoice_number || '-'}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-right text-emerald-400 font-bold">
                                                {log.cost_mad ? `${Number(log.cost_mad).toLocaleString()} MAD` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                                                    title="Supprimer de l'historique"
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
                MODAL 1: VALIDATE / COMPLETE SERVICE
               ══════════════════════════════════════════════════════════════════════ */}
            {showCompleteModal && selectedService && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-emerald-400" />
                                <span>Valider l'Intervention Réalisée</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCompleteModal(false)}
                                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitComplete} className="p-6 space-y-4">
                            {/* Service Details Card */}
                            <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 text-xs space-y-1">
                                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                    {(selectedService.is_mandatory || selectedService.service_type === 'technical_inspection') ? '📋' : '⚙️'} {selectedService.title}
                                </div>
                                <div className="text-gray-400">
                                    Véhicule : <span className="text-gray-200 font-semibold">{selectedService.device_name || selectedService.device_id}</span>
                                    {selectedService.plate_number && <span className="font-mono ml-1.5">({selectedService.plate_number})</span>}
                                </div>
                                {(selectedService.is_mandatory || selectedService.service_type === 'technical_inspection') && (
                                    <div className="text-[11px] text-amber-400 pt-1 flex items-center gap-1">
                                        <Sparkles size={12} />
                                        <span>Après validation, la prochaine visite sera automatiquement programmée pour dans 1 an.</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Service Km */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Kilométrage actuel (km) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={completeForm.service_km}
                                        onChange={(e) => setCompleteForm({ ...completeForm, service_km: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                {/* Service Date */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Date de réalisation *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={completeForm.service_date}
                                        onChange={(e) => setCompleteForm({ ...completeForm, service_date: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Cost MAD */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Coût total (MAD)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={completeForm.cost_mad}
                                        onChange={(e) => setCompleteForm({ ...completeForm, cost_mad: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                {/* Next Interval */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        {(selectedService.interval_days && selectedService.interval_days > 0) ? 'Prochain cycle (jours)' : 'Prochain cycle (km)'}
                                    </label>
                                    {(selectedService.interval_days && selectedService.interval_days > 0) ? (
                                        <input
                                            type="number"
                                            min="30"
                                            value={completeForm.next_interval_days}
                                            onChange={(e) => setCompleteForm({ ...completeForm, next_interval_days: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                        />
                                    ) : (
                                        <input
                                            type="number"
                                            min="500"
                                            step="500"
                                            value={completeForm.next_interval_km}
                                            onChange={(e) => setCompleteForm({ ...completeForm, next_interval_km: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Garage / Centre agréé */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    {(selectedService.is_mandatory || selectedService.service_type === 'technical_inspection') ? 'Centre de Visite Technique Agréé' : 'Garage / Prestataire'}
                                </label>
                                <input
                                    type="text"
                                    value={completeForm.performed_by}
                                    onChange={(e) => setCompleteForm({ ...completeForm, performed_by: e.target.value })}
                                    placeholder={(selectedService.is_mandatory || selectedService.service_type === 'technical_inspection') ? 'Ex: Dekra Agadir, Salama Marrakech, SGS...' : 'Ex: Station Total, Garage Speedy...'}
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* N° Facture / N° Procès-verbal */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    {(selectedService.is_mandatory || selectedService.service_type === 'technical_inspection') ? 'N° Procès-Verbal / Certificat' : 'N° Facture / Bon'}
                                </label>
                                <input
                                    type="text"
                                    value={completeForm.invoice_number}
                                    onChange={(e) => setCompleteForm({ ...completeForm, invoice_number: e.target.value })}
                                    placeholder="Ex: VT-2026-98745"
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Notes & observations
                                </label>
                                <textarea
                                    rows={2}
                                    value={completeForm.notes}
                                    onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                                    placeholder="Remarques du contrôleur technique ou du mécanicien..."
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
                                    <span>Valider & Recommencer le Cycle</span>
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
                    <div className="w-full max-w-lg rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900/95 backdrop-blur z-10">
                            <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                                <Wrench size={16} className="text-blue-400" />
                                <span>{scheduleForm.id > 0 ? 'Modifier le Rappel' : 'Programmer un Rappel (Visite ou Entretien)'}</span>
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

                            {/* Service Type Preset */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Type d'intervention / Obligation
                                </label>
                                <select
                                    value={scheduleForm.service_type}
                                    onChange={(e) => handleServiceTypeChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                                >
                                    <optgroup label="🚨 Obligations Légales & Réglementaires">
                                        <option value="technical_inspection">📋 Visite Technique Annuelle Obligatoire (365 j)</option>
                                        <option value="insurance">🛡️ Assurance Véhicule Annuelle (365 j)</option>
                                    </optgroup>
                                    <optgroup label="🛢️ Vidange & Filtres">
                                        <option value="oil_change">🛢️ Vidange Huile Moteur (10 000 km)</option>
                                        <option value="oil_filter">⚙️ Filtre à Huile (10 000 km)</option>
                                        <option value="fuel_filter">⛽ Filtre à Carburant / Gasoil (20 000 km)</option>
                                        <option value="air_filter">💨 Filtre à Air & Habitacle (20 000 km)</option>
                                    </optgroup>
                                    <optgroup label="🛑 Freinage & Sécurité">
                                        <option value="brake_pads">🛑 Plaquettes de Frein (30 000 km)</option>
                                        <option value="brake_discs">🔘 Disques de Frein (60 000 km)</option>
                                        <option value="tires">🛞 Pneumatiques (Rotation / Changement) (40 000 km)</option>
                                    </optgroup>
                                    <optgroup label="🔄 Moteur & Transmission">
                                        <option value="timing_belt">🔄 Courroie de Distribution (80 000 km)</option>
                                        <option value="spark_plugs">⚡ Bougies d'Allumage (40 000 km)</option>
                                        <option value="coolant">❄️ Liquide de Refroidissement (40 000 km)</option>
                                    </optgroup>
                                    <optgroup label="🛠️ Autre">
                                        <option value="custom">🛠️ Autre / Service Personnalisé</option>
                                    </optgroup>
                                </select>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Intitulé du rappel *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={scheduleForm.title}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Mandatory checkbox */}
                            <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-white block">Contrôle Légal Obligatoire</span>
                                    <span className="text-[11px] text-gray-400">Imposé par les autorités (visite technique, assurance)</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={scheduleForm.is_mandatory}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, is_mandatory: e.target.checked })}
                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-gray-900 border-gray-700"
                                />
                            </div>

                            {/* Dual Interval Configuration: Km and/or Days */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Interval Days */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Intervalle temporel (jours)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={scheduleForm.interval_days}
                                        onChange={(e) => {
                                            const days = Number(e.target.value);
                                            let nextD = scheduleForm.next_due_date;
                                            if (days > 0) {
                                                const d = new Date();
                                                d.setDate(d.getDate() + days);
                                                nextD = d.toISOString().split('T')[0];
                                            }
                                            setScheduleForm({
                                                ...scheduleForm,
                                                interval_days: days,
                                                next_due_date: nextD
                                            });
                                        }}
                                        placeholder="Ex: 365 pour 1 an"
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                    />
                                    <span className="text-[10px] text-gray-500 mt-0.5 block">365 = 1 an (Visite Tech)</span>
                                </div>

                                {/* Next Due Date */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Date d'échéance exacte
                                    </label>
                                    <input
                                        type="date"
                                        value={scheduleForm.next_due_date}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, next_due_date: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                    <span className="text-[10px] text-gray-500 mt-0.5 block">Date limite légale</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Interval Km */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Intervalle distance (km)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="500"
                                        value={scheduleForm.interval_km}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, interval_km: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                    />
                                    <span className="text-[10px] text-gray-500 mt-0.5 block">0 si purement annuel</span>
                                </div>

                                {/* Last service km */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Dernière faite à (km)
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

                            <div className="grid grid-cols-2 gap-3">
                                {/* Alert before days */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Alerte à l'avance (jours)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={scheduleForm.alert_before_days}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, alert_before_days: Number(e.target.value) })}
                                        placeholder="Ex: 30"
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {/* Cost MAD */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Coût prévisionnel (MAD)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={scheduleForm.cost_mad}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, cost_mad: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Notes & Instructions
                                </label>
                                <textarea
                                    rows={2}
                                    value={scheduleForm.notes}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                                    placeholder="Ex: Centre de contrôle technique habituel, documents carte grise à fournir..."
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
                                    Enregistrer le Rappel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                MODAL 3: BATCH INITIALIZE PACK (WITH ANNUAL TECHNICAL INSPECTION)
               ══════════════════════════════════════════════════════════════════════ */}
            {showInitPackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-3xl bg-gray-900 border border-amber-500/30 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900/95 backdrop-blur z-10">
                            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
                                <Sparkles size={18} />
                                <span>{t('quickInitPresets')} (Pack Flotte Complet 8-en-1)</span>
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
                                Configure en 1 clic les **8 programmes obligatoires et d'entretien essentiels** pour votre véhicule :
                            </p>

                            <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 text-xs space-y-2 text-gray-300">
                                {/* Highlight: Visite technique */}
                                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300 font-bold">
                                    <span className="flex items-center gap-1.5">
                                        <ShieldAlert size={14} className="text-rose-400" />
                                        <span>📋 Visite Technique Annuelle Obligatoire</span>
                                    </span>
                                    <span className="font-mono text-xs">365 jours / 1 an</span>
                                </div>

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
                                    Les échéances kilométriques seront calculées à partir de cette valeur, et la visite technique est fixée dans 1 an.
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
                                    <span>Générer le Pack Complet (8 Rappels)</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
