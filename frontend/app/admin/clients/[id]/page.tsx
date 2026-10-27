"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Smartphone, Plus, Car, Trash2, MapPin,
    Pencil, Copy, Check, Phone, User, Shield, Info,
    Truck, Navigation, Activity, Calendar
} from "lucide-react";

export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.id;

    const [client, setClient] = useState<any>(null);
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        deviceId: "",
        name: "",
        simPhone: "",
        plateNumber: "",
        model: "",
        vehicleType: "car",
        driverName: "",
        driverPhone: "",
        notes: ""
    });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [copiedImei, setCopiedImei] = useState<string | null>(null);

    useEffect(() => {
        fetchClientDetails();
    }, [clientId]);

    const fetchClientDetails = async () => {
        try {
            const res = await api.get(`/admin/clients/${clientId}`);
            setClient(res.data.client);
            setDevices(res.data.devices);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load client details.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedImei(text);
        setTimeout(() => setCopiedImei(null), 2000);
    };

    const openAddModal = () => {
        setEditingDevice(null);
        setFormData({
            deviceId: "",
            name: "",
            simPhone: "",
            plateNumber: "",
            model: "",
            vehicleType: "car",
            driverName: "",
            driverPhone: "",
            notes: ""
        });
        setFormError("");
        setShowModal(true);
    };

    const openEditModal = (device: any) => {
        setEditingDevice(device);
        setFormData({
            deviceId: device.device_id || "",
            name: device.name || "",
            simPhone: device.sim_phone || "",
            plateNumber: device.plate_number || "",
            model: device.model || "",
            vehicleType: device.vehicle_type || "car",
            driverName: device.driver_name || "",
            driverPhone: device.driver_phone || "",
            notes: device.notes || ""
        });
        setFormError("");
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitLoading(true);
        setFormError("");

        try {
            if (editingDevice) {
                // Update
                await api.put(`/admin/devices/${editingDevice.id}`, {
                    ...formData,
                    tenantId: client.tenant_id
                });
            } else {
                // Create
                await api.post('/admin/devices', {
                    ...formData,
                    tenantId: client.tenant_id
                });
            }

            setShowModal(false);
            fetchClientDetails();
        } catch (err: any) {
            setFormError(err.response?.data?.error || "Failed to save vehicle");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (deviceId: number, name: string) => {
        if (!confirm(`Are you sure you want to delete vehicle "${name}"?\n\nThis will remove the tracker and its telemetry history.`)) {
            return;
        }

        try {
            await api.delete(`/admin/devices/${deviceId}`);
            fetchClientDetails();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to delete device");
        }
    };

    if (loading) {
        return <div className="p-8 text-zinc-400">Loading client and vehicle directory...</div>;
    }

    if (error || !client) {
        return (
            <div className="p-8">
                <p className="text-red-400 font-medium">{error || "Client not found."}</p>
                <button
                    onClick={() => router.push('/admin')}
                    className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm"
                >
                    Back to Clients
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Header & Back Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/admin')}
                        className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors"
                        title="Back to Clients"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-bold text-white">{client.company_name}</h1>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800">
                                Tenant #{client.tenant_id}
                            </span>
                        </div>
                        <p className="text-zinc-400 text-sm mt-0.5">
                            Account: <span className="text-zinc-300 font-mono">{client.email}</span>
                            {client.phone && <span className="ml-3">Phone: <span className="text-zinc-300 font-mono">{client.phone}</span></span>}
                        </p>
                    </div>
                </div>

                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-green-600/20 shrink-0"
                >
                    <Plus size={18} />
                    Add Tracker / Vehicle
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs uppercase font-medium text-zinc-400">Total Vehicles</p>
                    <p className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                        <Car size={22} className="text-blue-500" />
                        {devices.length}
                    </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs uppercase font-medium text-zinc-400">Online Trackers</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                        {devices.filter(d => d.status === 'online').length}
                    </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs uppercase font-medium text-zinc-400">Moving</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">
                        {devices.filter(d => d.current_state === 'moving').length}
                    </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs uppercase font-medium text-zinc-400">Parked / Idle</p>
                    <p className="text-2xl font-bold text-yellow-400 mt-1">
                        {devices.filter(d => d.current_state === 'parked' || d.current_state === 'idling').length}
                    </p>
                </div>
            </div>

            {/* Vehicles Directory Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                        <Smartphone size={16} className="text-green-500" />
                        Registered Trackers & Vehicles ({devices.length})
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-800/60 text-zinc-300 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-3.5">Vehicle & Model</th>
                                <th className="px-6 py-3.5">IMEI (Tracker ID)</th>
                                <th className="px-6 py-3.5">License Plate</th>
                                <th className="px-6 py-3.5">SIM Phone Number</th>
                                <th className="px-6 py-3.5">Assigned Driver</th>
                                <th className="px-6 py-3.5 text-center">Status</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {devices.map((device) => (
                                <tr key={device.id} className="hover:bg-zinc-800/40 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-green-900/20 border border-green-800/30 flex items-center justify-center text-green-400">
                                                <Car size={16} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{device.name}</p>
                                                <p className="text-xs text-zinc-400">
                                                    {device.model || device.vehicle_type?.toUpperCase() || "Standard"}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-mono text-xs text-zinc-200 bg-zinc-800/60 px-2.5 py-1 rounded w-fit border border-zinc-700/50">
                                            <span>{device.device_id}</span>
                                            <button
                                                onClick={() => handleCopy(device.device_id)}
                                                className="text-zinc-500 hover:text-white"
                                                title="Copy IMEI"
                                            >
                                                {copiedImei === device.device_id ? (
                                                    <Check size={12} className="text-green-400" />
                                                ) : (
                                                    <Copy size={12} />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs font-semibold text-white">
                                        {device.plate_number ? (
                                            <span className="px-2 py-0.5 bg-zinc-800 rounded border border-zinc-700">
                                                {device.plate_number}
                                            </span>
                                        ) : (
                                            <span className="text-zinc-600">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-blue-400">
                                        {device.sim_phone ? (
                                            <a href={`tel:${device.sim_phone}`} className="hover:underline flex items-center gap-1">
                                                <Phone size={12} />
                                                {device.sim_phone}
                                            </a>
                                        ) : (
                                            <span className="text-zinc-600">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-zinc-300">
                                        {device.driver_name ? (
                                            <div>
                                                <p className="font-medium text-white">{device.driver_name}</p>
                                                {device.driver_phone && (
                                                    <p className="text-zinc-400 font-mono text-[11px]">{device.driver_phone}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-zinc-600">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            device.status === 'online'
                                                ? 'bg-green-900/30 text-green-400 border-green-800'
                                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`} />
                                            {device.status === 'online' ? 'Online' : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => router.push(`/dashboard?device=${device.device_id}`)}
                                                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-950/20 rounded-lg transition-colors"
                                                title="View on Live Map"
                                            >
                                                <MapPin size={16} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(device)}
                                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                                title="Edit Vehicle"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(device.id, device.name)}
                                                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
                                                title="Delete Vehicle"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {devices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                                        <Car className="mx-auto text-zinc-600 mb-2" size={32} />
                                        <p className="font-medium text-zinc-300">No vehicles assigned to this client yet</p>
                                        <p className="text-xs text-zinc-500 mt-1">Click "Add Tracker / Vehicle" above to register an IMEI.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD / EDIT VEHICLE MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Car className="text-green-500" size={20} />
                                    {editingDevice ? "Edit Vehicle & Tracker" : "Add Tracker / Vehicle"}
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Assigning to <span className="text-white font-medium">{client.company_name}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-zinc-500 hover:text-white text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            {formError && (
                                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-400">
                                    {formError}
                                </div>
                            )}

                            {/* Section 1: GPS Hardware */}
                            <div className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-700/50 space-y-3">
                                <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Smartphone size={14} />
                                    GPS Tracker Hardware (TK103)
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1">
                                            Tracker IMEI (Device ID) *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. 123456789012345"
                                            value={formData.deviceId}
                                            onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-green-500"
                                        />
                                        <p className="text-[10px] text-zinc-400 mt-1">15-digit IMEI printed on the tracker</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1">
                                            SIM Card Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="e.g. 0612345678"
                                            value={formData.simPhone}
                                            onChange={(e) => setFormData({ ...formData, simPhone: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-green-500"
                                        />
                                        <p className="text-[10px] text-zinc-400 mt-1">SIM phone for SMS commands / config</p>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Vehicle Details */}
                            <div className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-700/50 space-y-3">
                                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Car size={14} />
                                    Vehicle Identification
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1">
                                            Vehicle Name / Label *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Mercedes Sprinter 04"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1">
                                            License Plate Number
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 54321-A-26"
                                            value={formData.plateNumber}
                                            onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1">
                                            Vehicle Type
                                        </label>
                                        <select
                                            value={formData.vehicleType}
                                            onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="car">Car / Sedan</option>
                                            <option value="truck">Truck / Semi</option>
                                            <option value="van">Van / Commercial</option>
                                            <option value="motorcycle">Motorcycle</option>
                                            <option value="bus">Bus / Minibus</option>
                                            <option value="heavy_equipment">Heavy Machinery</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1">
                                            Make / Model
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Toyota Hilux 2.8 D-4D"
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Driver & Notes */}
                            <div className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-700/50 space-y-3">
                                <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <User size={14} />
                                    Driver Assignment & Notes
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1">
                                            Driver Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Rachid Benali"
                                            value={formData.driverName}
                                            onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1">
                                            Driver Contact Phone
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="e.g. 0698765432"
                                            value={formData.driverPhone}
                                            onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-yellow-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1">
                                        Installation Notes
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Installed behind fuse box. Fuel pump relay connected."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                                >
                                    {submitLoading ? "Saving..." : editingDevice ? "Save Changes" : "Register Vehicle"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
