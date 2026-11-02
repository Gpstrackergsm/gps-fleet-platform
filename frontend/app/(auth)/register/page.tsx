"use client";

import React, { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/lib/LanguageContext';
import {
    Car,
    Mail,
    Building2,
    Phone,
    Lock,
    Eye,
    EyeOff,
    ShieldCheck,
    ArrowLeft,
    RefreshCw,
    CheckCircle2,
    Sparkles,
} from 'lucide-react';

const REGISTER_I18N = {
    fr: {
        createTitle: 'Créer un Compte',
        createSub: 'Lancez votre plateforme de gestion de flotte GPS',
        companyLabel: "Nom de l'entreprise / Flotte",
        companyPlaceholder: 'Ex: Atlas Transport SARL',
        phoneLabel: 'Téléphone (Optionnel)',
        phonePlaceholder: '+212 6 00 00 00 00',
        emailLabel: 'Adresse Email professionnelle',
        emailPlaceholder: 'contact@entreprise.ma',
        passwordLabel: 'Mot de passe (min. 6 caractères)',
        confirmPasswordLabel: 'Confirmer le mot de passe',
        sendCodeBtn: 'Recevoir le code de vérification',
        sendingCode: 'Envoi du code en cours...',
        alreadyAccount: 'Vous avez déjà un compte ?',
        signInLink: 'Se connecter',
        verifyTitle: 'Vérification par Code',
        verifySub: 'Entrez le code de sécurité à 6 chiffres généré pour',
        verifyBtn: 'Vérifier et Activer mon Compte',
        verifying: 'Vérification...',
        resendIn: 'Renvoyer un code dans',
        resendBtn: 'Renvoyer un nouveau code',
        resending: 'Renvoi...',
        backToForm: "Modifier l'adresse email",
        passwordMismatch: 'Les mots de passe ne correspondent pas.',
        passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères.',
        requiredFields: 'Veuillez remplir tous les champs obligatoires.',
        incompleteCode: 'Veuillez saisir les 6 chiffres du code de vérification.',
        emailSentBadge: 'Un code à 6 chiffres a été envoyé à votre boîte mail.',
        instantCodeLabel: 'Code de vérification généré instantanément :',
        autoFillBtn: 'Utiliser ce code',
        successTitle: 'Compte vérifié avec succès !',
        successSub: 'Redirection vers votre tableau de bord GPS...',
    },
    en: {
        createTitle: 'Create Account',
        createSub: 'Launch your enterprise GPS fleet tracking platform',
        companyLabel: 'Company / Fleet Name',
        companyPlaceholder: 'e.g. Atlas Logistics Ltd',
        phoneLabel: 'Phone Number (Optional)',
        phonePlaceholder: '+212 6 00 00 00 00',
        emailLabel: 'Work Email Address',
        emailPlaceholder: 'name@company.com',
        passwordLabel: 'Password (min. 6 characters)',
        confirmPasswordLabel: 'Confirm Password',
        sendCodeBtn: 'Send Verification Code',
        sendingCode: 'Sending code...',
        alreadyAccount: 'Already have an account?',
        signInLink: 'Sign in',
        verifyTitle: 'Verify Your Account',
        verifySub: 'Enter the 6-digit security code generated for',
        verifyBtn: 'Verify & Activate Account',
        verifying: 'Verifying...',
        resendIn: 'Resend code in',
        resendBtn: 'Resend new code',
        resending: 'Resending...',
        backToForm: 'Change email address',
        passwordMismatch: 'Passwords do not match.',
        passwordTooShort: 'Password must be at least 6 characters.',
        requiredFields: 'Please fill in all required fields.',
        incompleteCode: 'Please enter all 6 digits of the verification code.',
        emailSentBadge: 'A 6-digit code has been sent to your email inbox.',
        instantCodeLabel: 'Instant verification code generated:',
        autoFillBtn: 'Auto-fill code',
        successTitle: 'Account Verified Successfully!',
        successSub: 'Redirecting to your live GPS dashboard...',
    },
    ar: {
        createTitle: 'إنشاء حساب جديد',
        createSub: 'ابدأ إدارة أسطول مركباتك بنظام التتبع الذكي',
        companyLabel: 'اسم الشركة / الأسطول',
        companyPlaceholder: 'مثال: شركة أطلس للنقل',
        phoneLabel: 'رقم الهاتف (اختياري)',
        phonePlaceholder: '+212 6 00 00 00 00',
        emailLabel: 'البريد الإلكتروني',
        emailPlaceholder: 'contact@company.ma',
        passwordLabel: 'كلمة المرور (6 أحرف على الأقل)',
        confirmPasswordLabel: 'تأكيد كلمة المرور',
        sendCodeBtn: 'إرسال رمز التحقق',
        sendingCode: 'جاري إرسال الرمز...',
        alreadyAccount: 'لديك حساب بالفعل؟',
        signInLink: 'تسجيل الدخول',
        verifyTitle: 'تأكيد الحساب برمز التحقق',
        verifySub: 'أدخل رمز الأمان المكون من 6 أرقام الخاص بـ',
        verifyBtn: 'تأكيد وتفعيل الحساب',
        verifying: 'جاري التحقق...',
        resendIn: 'إعادة إرسال الرمز خلال',
        resendBtn: 'إعادة إرسال رمز جديد',
        resending: 'جاري الإرسال...',
        backToForm: 'تعديل البريد الإلكتروني',
        passwordMismatch: 'كلمتا المرور غير متطابقتين.',
        passwordTooShort: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
        requiredFields: 'يرجى ملء جميع الحقول المطلوبة.',
        incompleteCode: 'يرجى إدخال الأرقام الستة لرمز التحقق.',
        emailSentBadge: 'تم إرسال رمز مكون من 6 أرقام إلى بريدك الإلكتروني.',
        instantCodeLabel: 'رمز التحقق الفوري الخاص بك:',
        autoFillBtn: 'ملء الرمز تلقائياً',
        successTitle: 'تم تفعيل الحساب بنجاح!',
        successSub: 'جاري تحويلك إلى لوحة التحكم...',
    },
};

export default function RegisterPage() {
    const { language, isRTL } = useLanguage();
    const L = REGISTER_I18N[language] || REGISTER_I18N.fr;

    // Step state: 'form' | 'verify' | 'success'
    const [step, setStep] = useState<'form' | 'verify' | 'success'>('form');

    // Form fields
    const [companyName, setCompanyName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Verification state
    const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [countdown, setCountdown] = useState(60);
    const [emailDelivered, setEmailDelivered] = useState(true);
    const [fallbackCode, setFallbackCode] = useState<string | null>(null);

    // UI status
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');

    // Countdown timer for Resend button in 'verify' step
    useEffect(() => {
        if (step !== 'verify' || countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [step, countdown]);

    // Step 1: Send 6-digit verification code
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!companyName.trim() || !email.trim() || !password) {
            setError(L.requiredFields);
            return;
        }
        if (password.length < 6) {
            setError(L.passwordTooShort);
            return;
        }
        if (password !== confirmPassword) {
            setError(L.passwordMismatch);
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/register/send-code', {
                companyName: companyName.trim(),
                phone: phone.trim(),
                email: email.trim().toLowerCase(),
                password,
            });

            setEmailDelivered(Boolean(res.data?.emailDelivered));
            setFallbackCode(res.data?.verificationCode || null);
            setDigits(['', '', '', '', '', '']);
            setCountdown(60);
            setStep('verify');
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 150);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erreur lors de la création du compte.');
        } finally {
            setLoading(false);
        }
    };

    // Handle individual digit input
    const handleDigitChange = (index: number, value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (!cleaned) {
            const next = [...digits];
            next[index] = '';
            setDigits(next);
            return;
        }

        // If user pasted or typed multiple digits
        if (cleaned.length > 1) {
            const chars = cleaned.slice(0, 6).split('');
            const next = [...digits];
            chars.forEach((ch, idx) => {
                if (index + idx < 6) {
                    next[index + idx] = ch;
                }
            });
            setDigits(next);
            const focusIdx = Math.min(5, index + chars.length);
            inputRefs.current[focusIdx]?.focus();
            return;
        }

        const next = [...digits];
        next[index] = cleaned;
        setDigits(next);

        if (index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const next = ['', '', '', '', '', ''];
        pasted.split('').forEach((ch, i) => {
            next[i] = ch;
        });
        setDigits(next);
        inputRefs.current[Math.min(5, pasted.length - 1)]?.focus();
    };

    // Step 2: Verify 6-digit code
    const handleVerifyCode = async (e?: React.FormEvent, codeOverride?: string) => {
        if (e) e.preventDefault();
        setError('');

        const fullCode = codeOverride || digits.join('');
        if (fullCode.length !== 6) {
            setError(L.incompleteCode);
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/register/verify-code', {
                email: email.trim().toLowerCase(),
                code: fullCode,
            });

            if (res.data?.token) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('role', res.data.user?.role || 'user');
            }
            setStep('success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1200);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Code de vérification invalide.');
        } finally {
            setLoading(false);
        }
    };

    // Resend new 6-digit code
    const handleResendCode = async () => {
        if (countdown > 0 || resending) return;
        setResending(true);
        setError('');
        try {
            const res = await api.post('/auth/register/resend-code', {
                email: email.trim().toLowerCase(),
            });
            setEmailDelivered(Boolean(res.data?.emailDelivered));
            setFallbackCode(res.data?.verificationCode || null);
            setDigits(['', '', '', '', '', '']);
            setCountdown(60);
            inputRefs.current[0]?.focus();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Impossible de renvoyer le code.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className={`flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 py-16 relative overflow-hidden ${isRTL ? 'font-sans' : ''}`}
        >
            {/* Top Bar with Brand Link and Language Switcher */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                        <Car size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-white text-sm">
                        TrackPro<span className="text-blue-500">.</span>
                    </span>
                </Link>

                <LanguageSelector />
            </div>

            {/* Background Glow */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519681393798-3828fb4090bb?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-15 pointer-events-none" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-600/15 blur-[130px] rounded-full pointer-events-none" />

            <AnimatePresence mode="wait">
                {step === 'form' && (
                    <motion.div
                        key="step-form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="z-10 w-full max-w-md space-y-6 p-7 sm:p-8 bg-zinc-900/85 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-2xl"
                    >
                        {/* Step Indicator */}
                        <div className="flex items-center justify-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <Sparkles size={12} /> 1 / 2 • {L.createTitle}
                            </span>
                        </div>

                        <div className="text-center">
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                {L.createTitle}
                            </h2>
                            <p className="mt-1.5 text-xs sm:text-sm text-zinc-400">
                                {L.createSub}
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={handleSendCode}>
                            {/* Company Name */}
                            <div>
                                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                                    {L.companyLabel} *
                                </label>
                                <div className="relative">
                                    <Building2
                                        size={16}
                                        className={`absolute top-1/2 -translate-y-1/2 text-zinc-500 ${isRTL ? 'right-3.5' : 'left-3.5'}`}
                                    />
                                    <Input
                                        value={companyName}
                                        onChange={e => setCompanyName(e.target.value)}
                                        placeholder={L.companyPlaceholder}
                                        className={`bg-zinc-800/90 border-zinc-700 text-white placeholder:text-zinc-500 h-11 ${isRTL ? 'pr-10' : 'pl-10'}`}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                                    {L.phoneLabel}
                                </label>
                                <div className="relative">
                                    <Phone
                                        size={16}
                                        className={`absolute top-1/2 -translate-y-1/2 text-zinc-500 ${isRTL ? 'right-3.5' : 'left-3.5'}`}
                                    />
                                    <Input
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder={L.phonePlaceholder}
                                        className={`bg-zinc-800/90 border-zinc-700 text-white placeholder:text-zinc-500 h-11 ${isRTL ? 'pr-10' : 'pl-10'}`}
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                                    {L.emailLabel} *
                                </label>
                                <div className="relative">
                                    <Mail
                                        size={16}
                                        className={`absolute top-1/2 -translate-y-1/2 text-zinc-500 ${isRTL ? 'right-3.5' : 'left-3.5'}`}
                                    />
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder={L.emailPlaceholder}
                                        className={`bg-zinc-800/90 border-zinc-700 text-white placeholder:text-zinc-500 h-11 ${isRTL ? 'pr-10' : 'pl-10'}`}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                                    {L.passwordLabel} *
                                </label>
                                <div className="relative">
                                    <Lock
                                        size={16}
                                        className={`absolute top-1/2 -translate-y-1/2 text-zinc-500 ${isRTL ? 'right-3.5' : 'left-3.5'}`}
                                    />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`bg-zinc-800/90 border-zinc-700 text-white placeholder:text-zinc-500 h-11 ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className={`absolute top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 ${isRTL ? 'left-3.5' : 'right-3.5'}`}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                                    {L.confirmPasswordLabel} *
                                </label>
                                <div className="relative">
                                    <Lock
                                        size={16}
                                        className={`absolute top-1/2 -translate-y-1/2 text-zinc-500 ${isRTL ? 'right-3.5' : 'left-3.5'}`}
                                    />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`bg-zinc-800/90 border-zinc-700 text-white placeholder:text-zinc-500 h-11 ${isRTL ? 'pr-10' : 'pl-10'}`}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-6 text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all"
                                disabled={loading}
                            >
                                {loading ? L.sendingCode : L.sendCodeBtn}
                            </Button>

                            <div className="text-center text-xs sm:text-sm pt-1">
                                <span className="text-zinc-500">{L.alreadyAccount} </span>
                                <Link href="/login" className="font-semibold text-blue-500 hover:text-blue-400">
                                    {L.signInLink}
                                </Link>
                            </div>
                        </form>
                    </motion.div>
                )}

                {step === 'verify' && (
                    <motion.div
                        key="step-verify"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="z-10 w-full max-w-md space-y-6 p-7 sm:p-8 bg-zinc-900/85 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-2xl"
                    >
                        {/* Step Indicator */}
                        <div className="flex items-center justify-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck size={13} /> 2 / 2 • {L.verifyTitle}
                            </span>
                        </div>

                        <div className="text-center space-y-1.5">
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                {L.verifyTitle}
                            </h2>
                            <p className="text-xs sm:text-sm text-zinc-400">
                                {L.verifySub}{' '}
                                <span className="text-blue-400 font-semibold break-all">{email}</span>
                            </p>
                        </div>

                        {/* Delivery banner */}
                        {emailDelivered ? (
                            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs text-center">
                                {L.emailSentBadge}
                            </div>
                        ) : fallbackCode ? (
                            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] text-amber-300/90 font-medium">
                                        {L.instantCodeLabel}
                                    </p>
                                    <p className="font-mono text-lg font-extrabold tracking-widest text-amber-400 mt-0.5">
                                        {fallbackCode}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const chars = fallbackCode.slice(0, 6).split('');
                                        setDigits(chars);
                                        handleVerifyCode(undefined, fallbackCode);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shrink-0"
                                >
                                    {L.autoFillBtn}
                                </button>
                            </div>
                        ) : null}

                        <form onSubmit={e => handleVerifyCode(e)} className="space-y-6">
                            {/* 6-Digit OTP Boxes */}
                            <div dir="ltr" className="flex items-center justify-center gap-2 sm:gap-3">
                                {digits.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => {
                                            inputRefs.current[idx] = el;
                                        }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={digit}
                                        onChange={e => handleDigitChange(idx, e.target.value)}
                                        onKeyDown={e => handleKeyDown(idx, e)}
                                        onPaste={handlePaste}
                                        className="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-extrabold font-mono rounded-xl bg-zinc-800/90 border border-zinc-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all"
                                    />
                                ))}
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-6 text-sm rounded-xl shadow-lg shadow-blue-600/25"
                                disabled={loading || digits.join('').length !== 6}
                            >
                                {loading ? L.verifying : L.verifyBtn}
                            </Button>
                        </form>

                        {/* Resend & Back controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800 text-xs">
                            <button
                                type="button"
                                onClick={() => {
                                    setError('');
                                    setStep('form');
                                }}
                                className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft size={14} />
                                <span>{L.backToForm}</span>
                            </button>

                            {countdown > 0 ? (
                                <span className="text-zinc-500">
                                    {L.resendIn} <strong className="text-zinc-300">{countdown}s</strong>
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={resending}
                                    className="inline-flex items-center gap-1.5 font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                                    <span>{resending ? L.resending : L.resendBtn}</span>
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {step === 'success' && (
                    <motion.div
                        key="step-success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="z-10 w-full max-w-md p-8 bg-zinc-900/90 backdrop-blur-xl rounded-2xl border border-emerald-500/30 shadow-2xl text-center space-y-4"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                            <CheckCircle2 size={34} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">{L.successTitle}</h3>
                        <p className="text-sm text-zinc-400">{L.successSub}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
