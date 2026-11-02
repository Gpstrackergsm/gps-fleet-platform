"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/LanguageContext";
import {
    Save,
    Building,
    Mail,
    Phone,
    Lock,
    Eye,
    EyeOff,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    KeyRound,
} from "lucide-react";

const SETTINGS_I18N = {
    fr: {
        title: "Paramètres du Compte",
        subtitle: "Gérez les informations de votre entreprise et la sécurité de votre mot de passe.",
        profileCardTitle: "Informations de l'Entreprise",
        profileCardSub: "Mettez à jour le nom de votre flotte et votre numéro de contact.",
        emailLabel: "Adresse Email du compte",
        companyLabel: "Nom de l'entreprise / Flotte",
        companyPlaceholder: "Nom de votre société",
        phoneLabel: "Téléphone de contact",
        phonePlaceholder: "+212 6 00 00 00 00",
        saveProfileBtn: "Enregistrer les informations",
        saving: "Enregistrement...",
        profileSaved: "Informations mises à jour avec succès !",
        profileError: "Impossible de mettre à jour le profil.",
        passwordCardTitle: "Changer le Mot de Passe",
        passwordCardSub: "Pour votre sécurité, saisissez votre mot de passe actuel avant d'en définir un nouveau.",
        currentPasswordLabel: "Mot de passe actuel",
        currentPasswordPlaceholder: "Saisissez votre mot de passe actuel",
        newPasswordLabel: "Nouveau mot de passe (min. 6 caractères)",
        newPasswordPlaceholder: "Nouveau mot de passe",
        confirmPasswordLabel: "Confirmer le nouveau mot de passe",
        confirmPasswordPlaceholder: "Répétez le nouveau mot de passe",
        updatePasswordBtn: "Mettre à jour le mot de passe",
        updatingPassword: "Mise à jour...",
        passwordUpdated: "Votre mot de passe a été modifié avec succès !",
        passwordMismatch: "Les nouveaux mots de passe ne correspondent pas.",
        passwordTooShort: "Le nouveau mot de passe doit contenir au moins 6 caractères.",
        passwordRequired: "Veuillez remplir tous les champs de mot de passe.",
    },
    en: {
        title: "Account Settings",
        subtitle: "Manage your company details and account password security.",
        profileCardTitle: "Company Information",
        profileCardSub: "Update your fleet organization name and contact phone number.",
        emailLabel: "Account Email Address",
        companyLabel: "Company / Fleet Name",
        companyPlaceholder: "Enter company name",
        phoneLabel: "Contact Phone",
        phonePlaceholder: "+212 6 00 00 00 00",
        saveProfileBtn: "Save Profile Info",
        saving: "Saving...",
        profileSaved: "Profile updated successfully!",
        profileError: "Failed to update profile.",
        passwordCardTitle: "Change Password",
        passwordCardSub: "For your security, enter your current password before setting a new one.",
        currentPasswordLabel: "Current Password",
        currentPasswordPlaceholder: "Enter your current password",
        newPasswordLabel: "New Password (min. 6 characters)",
        newPasswordPlaceholder: "Enter new password",
        confirmPasswordLabel: "Confirm New Password",
        confirmPasswordPlaceholder: "Re-enter new password",
        updatePasswordBtn: "Update Password",
        updatingPassword: "Updating...",
        passwordUpdated: "Your password has been updated successfully!",
        passwordMismatch: "New passwords do not match.",
        passwordTooShort: "New password must be at least 6 characters.",
        passwordRequired: "Please fill in all password fields.",
    },
    ar: {
        title: "إعدادات الحساب",
        subtitle: "إدارة معلومات الشركة وتغيير كلمة المرور الخاصة بحسابك.",
        profileCardTitle: "معلومات الشركة",
        profileCardSub: "قم بتحديث اسم الأسطول ورقم الهاتف الخاص بك.",
        emailLabel: "البريد الإلكتروني للحساب",
        companyLabel: "اسم الشركة / الأسطول",
        companyPlaceholder: "أدخل اسم الشركة",
        phoneLabel: "رقم الهاتف",
        phonePlaceholder: "+212 6 00 00 00 00",
        saveProfileBtn: "حفظ المعلومات",
        saving: "جاري الحفظ...",
        profileSaved: "تم تحديث المعلومات بنجاح!",
        profileError: "تعذر تحديث الملف الشخصي.",
        passwordCardTitle: "تغيير كلمة المرور",
        passwordCardSub: "لأمان حسابك، يرجى إدخال كلمة المرور الحالية قبل تعيين كلمة مرور جديدة.",
        currentPasswordLabel: "كلمة المرور الحالية",
        currentPasswordPlaceholder: "أدخل كلمة المرور الحالية",
        newPasswordLabel: "كلمة المرور الجديدة (6 أحرف على الأقل)",
        newPasswordPlaceholder: "أدخل كلمة المرور الجديدة",
        confirmPasswordLabel: "تأكيد كلمة المرور الجديدة",
        confirmPasswordPlaceholder: "أعد إدخال كلمة المرور الجديدة",
        updatePasswordBtn: "تحديث كلمة المرور",
        updatingPassword: "جاري التحديث...",
        passwordUpdated: "تم تغيير كلمة المرور بنجاح!",
        passwordMismatch: "كلمتا المرور الجديدتان غير متطابقتين.",
        passwordTooShort: "يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل.",
        passwordRequired: "يرجى ملء جميع حقول كلمة المرور.",
    },
};

export default function SettingsPage() {
    const { language, isRTL } = useLanguage();
    const L = SETTINGS_I18N[language] || SETTINGS_I18N.fr;

    // Profile state
    const [email, setEmail] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [phone, setPhone] = useState("");
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error" | ""; message: string }>({
        type: "",
        message: "",
    });

    // Change Password state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPasswords, setShowPasswords] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdStatus, setPwdStatus] = useState<{ type: "success" | "error" | ""; message: string }>({
        type: "",
        message: "",
    });

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const res = await api.get("/auth/profile");
                if (res.data) {
                    setEmail(res.data.email || "");
                    setCompanyName(res.data.companyName || "");
                    setPhone(res.data.phone || "");
                }
            } catch (err) {
                console.warn("Could not load profile:", err);
            }
        };
        loadProfile();
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileStatus({ type: "", message: "" });

        try {
            await api.put("/auth/profile", {
                companyName: companyName.trim() || undefined,
                phone: phone.trim(),
            });
            setProfileStatus({ type: "success", message: L.profileSaved });
        } catch (err: any) {
            setProfileStatus({
                type: "error",
                message: err.response?.data?.error || L.profileError,
            });
        } finally {
            setProfileLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdStatus({ type: "", message: "" });

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPwdStatus({ type: "error", message: L.passwordRequired });
            return;
        }
        if (newPassword.length < 6) {
            setPwdStatus({ type: "error", message: L.passwordTooShort });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwdStatus({ type: "error", message: L.passwordMismatch });
            return;
        }

        setPwdLoading(true);
        try {
            await api.post("/auth/change-password", {
                currentPassword,
                newPassword,
            });
            setPwdStatus({ type: "success", message: L.passwordUpdated });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setPwdStatus({
                type: "error",
                message: err.response?.data?.error || "Erreur lors du changement de mot de passe.",
            });
        } finally {
            setPwdLoading(false);
        }
    };

    return (
        <div
            dir={isRTL ? "rtl" : "ltr"}
            className="h-full overflow-y-auto bg-gray-950 p-4 sm:p-8 pb-24"
        >
            <div className="max-w-3xl mx-auto space-y-6">
                <header>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">{L.title}</h2>
                    <p className="text-sm text-gray-400 mt-1">{L.subtitle}</p>
                </header>

                {/* ── Card 1:Change Password ── */}
                <div className="bg-gray-900 border border-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg space-y-6">
                    <div className="flex items-start justify-between gap-4 border-b border-gray-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{L.passwordCardTitle}</h3>
                                <p className="text-xs text-gray-400">{L.passwordCardSub}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowPasswords((v) => !v)}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs flex items-center gap-1.5 transition-colors"
                        >
                            {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-2">
                                <Lock size={14} className="text-gray-400" />
                                {L.currentPasswordLabel}
                            </label>
                            <Input
                                type={showPasswords ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder={L.currentPasswordPlaceholder}
                                className="bg-gray-800 border-gray-700 text-white h-11"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-blue-400" />
                                    {L.newPasswordLabel}
                                </label>
                                <Input
                                    type={showPasswords ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder={L.newPasswordPlaceholder}
                                    className="bg-gray-800 border-gray-700 text-white h-11"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-emerald-400" />
                                    {L.confirmPasswordLabel}
                                </label>
                                <Input
                                    type={showPasswords ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder={L.confirmPasswordPlaceholder}
                                    className="bg-gray-800 border-gray-700 text-white h-11"
                                    required
                                />
                            </div>
                        </div>

                        {pwdStatus.message && (
                            <div
                                className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                                    pwdStatus.type === "success"
                                        ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-400"
                                        : "bg-red-950/60 border-red-500/30 text-red-400"
                                }`}
                            >
                                {pwdStatus.type === "success" ? (
                                    <CheckCircle2 size={16} className="shrink-0" />
                                ) : (
                                    <AlertCircle size={16} className="shrink-0" />
                                )}
                                <span>{pwdStatus.message}</span>
                            </div>
                        )}

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={pwdLoading}
                                className="w-full sm:w-auto px-6 h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 rounded-xl"
                            >
                                <KeyRound size={17} />
                                {pwdLoading ? L.updatingPassword : L.updatePasswordBtn}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* ── Card 2: Company & Contact Info ── */}
                <div className="bg-gray-900 border border-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg space-y-6">
                    <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <Building size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{L.profileCardTitle}</h3>
                            <p className="text-xs text-gray-400">{L.profileCardSub}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        {email && (
                            <div>
                                <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-2">
                                    <Mail size={14} />
                                    {L.emailLabel}
                                </label>
                                <Input
                                    value={email}
                                    disabled
                                    className="bg-gray-800/60 border-gray-800 text-gray-400 h-11 cursor-not-allowed"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-2">
                                    <Building size={14} className="text-gray-400" />
                                    {L.companyLabel}
                                </label>
                                <Input
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder={L.companyPlaceholder}
                                    className="bg-gray-800 border-gray-700 text-white h-11"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-2">
                                    <Phone size={14} className="text-gray-400" />
                                    {L.phoneLabel}
                                </label>
                                <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder={L.phonePlaceholder}
                                    className="bg-gray-800 border-gray-700 text-white h-11"
                                />
                            </div>
                        </div>

                        {profileStatus.message && (
                            <div
                                className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                                    profileStatus.type === "success"
                                        ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-400"
                                        : "bg-red-950/60 border-red-500/30 text-red-400"
                                }`}
                            >
                                {profileStatus.type === "success" ? (
                                    <CheckCircle2 size={16} className="shrink-0" />
                                ) : (
                                    <AlertCircle size={16} className="shrink-0" />
                                )}
                                <span>{profileStatus.message}</span>
                            </div>
                        )}

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={profileLoading}
                                className="w-full sm:w-auto px-6 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 rounded-xl"
                            >
                                <Save size={17} />
                                {profileLoading ? L.saving : L.saveProfileBtn}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
