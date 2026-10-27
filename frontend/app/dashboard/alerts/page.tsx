"use client"

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { socket } from '@/lib/socket';
import {
    AlertTriangle, ShieldAlert, CheckCircle, Check, X,
    Car, Gauge, Clock, Filter, BellRing
} from 'lucide-react';

interface AlertItem {
    id: number;
    tenant_id: number;
    device_id: string;
    vehicle_name?: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    lat: number;
    lng: number;
    speed: number;
    status: 'unacknowledged' | 'acknowledged' | 'resolved';
    timestamp: string;
    acknowledged_at?: string;
}

function severityBadge(sev: string) {
    if (sev === 'critical') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (sev === 'high') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (sev === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
}

function timeSince(dateStr: string): string {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'unacknowledged' | 'acknowledged' | 'resolved'>('all');
    const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

    const fetchAlerts = useCallback(async () => {
        try {
            const params: any = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (severityFilter !== 'all') params.severity = severityFilter;
            const res = await api.get('/alerts', { params });
            setAlerts(res.data);
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, severityFilter]);

    useEffect(() => {
        fetchAlerts();
        socket.connect();
        socket.on('alert', (newAlert: AlertItem) => {
            setAlerts(prev => [newAlert, ...prev]);
        });
        return () => {
            socket.off('alert');
        };
    }, [fetchAlerts]);

    const handleAcknowledge = async (id: number) => {
        try {
            await api.post(`/alerts/${id}/acknowledge`);
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
        } catch (err) {
            console.error('Error acknowledging alert:', err);
        }
    };

    const handleResolve = async (id: number) => {
        try {
            await api.post(`/alerts/${id}/resolve`);
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
        } catch (err) {
            console.error('Error resolving alert:', err);
        }
    };

    const unackCount = alerts.filter(a => a.status === 'unacknowledged').length;
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;

    return (
        <div className="h-full bg-gray-950 text-white overflow-y-auto">
            <div className="p-6 max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2.5">
                            <ShieldAlert className="text-red-400" size={26} />
                            Alerts & Operational Incidents
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5">Real-time safety, geofencing, and violation feed</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-400">{unackCount}</div>
                            <div className="text-xs text-gray-500">Unacknowledged</div>
                        </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400">
                            <BellRing size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-orange-400">{criticalCount}</div>
                            <div className="text-xs text-gray-500">Critical Incidents</div>
                        </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{alerts.length}</div>
                            <div className="text-xs text-gray-500">Total Logged</div>
                        </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2.5 rounded-lg bg-green-500/10 text-green-400">
                            <CheckCircle size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-400">
                                {alerts.filter(a => a.status === 'resolved').length}
                            </div>
                            <div className="text-xs text-gray-500">Resolved</div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center bg-gray-900 p-3 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mr-2">
                        <Filter size={14} /> Filters:
                    </div>
                    <div className="flex gap-1 bg-gray-800/80 p-1 rounded-lg">
                        {(['all', 'unacknowledged', 'acknowledged', 'resolved'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
                                className={`px-2.5 py-1 rounded text-xs capitalize font-medium transition-colors ${statusFilter === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1 bg-gray-800/80 p-1 rounded-lg">
                        {(['all', 'critical', 'high', 'medium', 'low'] as const).map(sev => (
                            <button
                                key={sev}
                                onClick={() => setSeverityFilter(sev)}
                                className={`px-2.5 py-1 rounded text-xs capitalize font-medium transition-colors ${severityFilter === sev ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                {sev}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Alerts List */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800/60">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 text-sm">Loading incident feed...</div>
                    ) : alerts.length === 0 ? (
                        <div className="p-16 text-center">
                            <CheckCircle size={44} className="mx-auto text-green-500 mb-3" />
                            <h3 className="font-semibold text-white">All Clear</h3>
                            <p className="text-gray-500 text-sm mt-1">No operational alerts matching current filter.</p>
                        </div>
                    ) : (
                        alerts.map(alert => (
                            <div key={alert.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-800/30 transition-colors">
                                <div className="flex items-start gap-3">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border shrink-0 mt-0.5 ${severityBadge(alert.severity)}`}>
                                        {alert.severity}
                                    </span>
                                    <div>
                                        <div className="font-semibold text-white text-sm flex items-center gap-2">
                                            {alert.message}
                                            {alert.status === 'unacknowledged' && (
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                                            <span className="flex items-center gap-1 text-gray-400">
                                                <Car size={12} /> {alert.vehicle_name || alert.device_id}
                                            </span>
                                            {alert.speed > 0 && (
                                                <span className="flex items-center gap-1 font-mono text-blue-400">
                                                    <Gauge size={12} /> {alert.speed.toFixed(0)} km/h
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} /> {timeSince(alert.timestamp)}
                                            </span>
                                            <span className="capitalize text-gray-400 font-medium">
                                                Status: {alert.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {alert.status === 'unacknowledged' && (
                                        <button
                                            onClick={() => handleAcknowledge(alert.id)}
                                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-yellow-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-yellow-500/20"
                                        >
                                            <Check size={14} /> Acknowledge
                                        </button>
                                    )}
                                    {alert.status !== 'resolved' && (
                                        <button
                                            onClick={() => handleResolve(alert.id)}
                                            className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-green-500/20"
                                        >
                                            <CheckCircle size={14} /> Resolve
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
