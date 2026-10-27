"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
    Search, User, Car, ArrowRight, Plus, Building2,
    Mail, Phone, Trash2, Pencil, RefreshCw, KeyRound,
    AlertCircle, CheckCircle2, Shield
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
    const router = useRouter();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        companyName: "",
        email: "",
        password: "",
        phone: ""
    });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState("");

    // Edit Modal State
    const [editingClient, setEditingClient] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({
        companyName: "",
        email: "",
        password: "",
        phone: ""
    });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");

    // Delete State
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/clients');
            setClients(res.data);
        } catch (err) {
            console.error("Failed to fetch clients", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError("");

        try {
            await api.post('/admin/clients', createForm);
            setCreateForm({ companyName: "", email: "", password: "", phone: "" });
            setShowCreateModal(false);
            fetchClients();
        } catch (err: any) {
            setCreateError(err.response?.data?.error || "Failed to create client");
        } finally {
            setCreateLoading(false);
        }
    };

    const openEditModal = (client: any) => {
        setEditingClient(client);
        setEditForm({
            companyName: client.company_name || "",
            email: client.email || "",
            password: "",
            phone: client.phone || ""
        });
        setEditError("");
    };

    const handleUpdateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClient) return;

        setEditLoading(true);
        setEditError("");

        try {
            await api.put(`/admin/clients/${editingClient.id}`, editForm);
            setEditingClient(null);
            fetchClients();
        } catch (err: any) {
            setEditError(err.response?.data?.error || "Failed to update client");
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteClient = async (clientId: number, companyName: string) => {
        if (!confirm(`Are you sure you want to delete client "${companyName}"?\n\nThis will permanently delete all vehicles, IMEI assignments, and tracking history for this company.`)) {
            return;
        }

        setDeletingId(clientId);
        try {
            await api.delete(`/admin/clients/${clientId}`);
            fetchClients();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to delete client");
        } finally {
            setDeletingId(null);
        }
    };

    const filteredClients = clients.filter(c => {
        const query = searchQuery.toLowerCase();
        return (
            c.company_name?.toLowerCase().includes(query) ||
            c.email?.toLowerCase().includes(query) ||
            c.phone?.toLowerCase().includes(query)
        );
    });

    const totalVehicles = clients.reduce((acc, c) => acc + (parseInt(c.vehicle_count) || 0), 0);

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                        <Building2 className="text-blue-500" />
                        Client & Vehicle Management
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        Create client accounts, assign GPS trackers by IMEI, and configure vehicle telemetry.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchClients}
                        className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        title="Refresh List"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-blue-600/20"
                    >
                        <Plus size={18} />
                        Add New Client
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs uppercase font-medium text-zinc-400">Total Clients</p>
                    <p className="text-2xl font-bold text-white mt-1">{clients.length}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs uppercase font-medium text-zinc-400">Tracked Vehicles</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{totalVehicles}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs uppercase font-medium text-zinc-400">GPS Hardware</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">TK103 / Universal</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs uppercase font-medium text-zinc-400">TCP Ingestion Port</p>
                    <p className="text-2xl font-bold text-zinc-300 mt-1 font-mono">5001</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
                <Search size={18} className="text-zinc-500 shrink-0" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by company name, email, or contact phone..."
                    className="bg-transparent border-none text-white text-sm w-full focus:outline-none placeholder:text-zinc-500"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="text-xs text-zinc-500 hover:text-white"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Clients Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                        <User size={16} className="text-blue-400" />
                        Client Accounts ({filteredClients.length})
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-800/60 text-zinc-300 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-3.5">Company / Client</th>
                                <th className="px-6 py-3.5">Login Email</th>
                                <th className="px-6 py-3.5">Contact Phone</th>
                                <th className="px-6 py-3.5 text-center">Assigned Vehicles</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {filteredClients.map((client) => (
                                <tr
                                    key={client.id}
                                    className="hover:bg-zinc-800/40 transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                                                {client.company_name?.charAt(0).toUpperCase() || "C"}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                                    {client.company_name}
                                                </p>
                                                <p className="text-[11px] text-zinc-500">
                                                    Tenant #{client.tenant_id}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-zinc-300">
                                        {client.email}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-zinc-300">
                                        {client.phone || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => router.push(`/admin/clients/${client.id}`)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-blue-500 hover:text-blue-400 transition-colors"
                                        >
                                            <Car size={13} className="text-blue-400" />
                                            <span>{client.vehicle_count} {client.vehicle_count === 1 ? "Vehicle" : "Vehicles"}</span>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => router.push(`/admin/clients/${client.id}`)}
                                                className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                                            >
                                                <span>Manage IMEI</span>
                                                <ArrowRight size={13} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(client)}
                                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                                title="Edit Client"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClient(client.id, client.company_name)}
                                                disabled={deletingId === client.id}
                                                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
                                                title="Delete Client"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClients.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        <Building2 className="mx-auto text-zinc-600 mb-2" size={32} />
                                        <p className="font-medium text-zinc-300">No clients registered yet</p>
                                        <p className="text-xs text-zinc-500 mt-1">Click "Add New Client" above to create your first client company.</p>
                                    </td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        <RefreshCw className="animate-spin mx-auto text-blue-500 mb-2" size={24} />
                                        Loading clients...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE CLIENT MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Building2 className="text-blue-500" size={20} />
                                    Add New Client
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">Creates a client tenant and login credentials.</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-zinc-500 hover:text-white text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateClient} className="p-6 space-y-4">
                            {createError && (
                                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg flex items-center gap-2 text-xs text-red-400">
                                    <AlertCircle size={15} className="shrink-0" />
                                    <span>{createError}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1.5">
                                    Company / Client Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Souss Transport SARL"
                                    value={createForm.companyName}
                                    onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1.5">
                                    Client Email (Login ID) *
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g. contact@sousstransport.com"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1.5">
                                    Initial Password * (min 6 chars)
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    placeholder="••••••••"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1.5">
                                    Contact Phone Number
                                </label>
                                <input
                                    type="tel"
                                    placeholder="e.g. 0612345678"
                                    value={createForm.phone}
                                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                                >
                                    {createLoading ? "Creating..." : "Create Client"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT CLIENT MODAL */}
            {editingClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Pencil className="text-yellow-500" size={18} />
                                    Edit Client
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">{editingClient.company_name}</p>
                            </div>
                            <button
                                onClick={() => setEditingClient(null)}
                                className="text-zinc-500 hover:text-white text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleUpdateClient} className="p-6 space-y-4">
                            {editError && (
                                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg flex items-center gap-2 text-xs text-red-400">
                                    <AlertCircle size={15} className="shrink-0" />
                                    <span>{editError}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1.5">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.companyName}
                                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1.5">
                                    Login Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1.5">
                                    Contact Phone
                                </label>
                                <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-1.5">
                                    Reset Password (leave empty to keep current)
                                </label>
                                <input
                                    type="password"
                                    placeholder="Enter new password"
                                    value={editForm.password}
                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingClient(null)}
                                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                                >
                                    {editLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
