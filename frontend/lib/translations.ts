export type Language = 'en' | 'fr' | 'ar';

export interface TranslationDictionary {
    // Navigation & Common
    home: string;
    dashboard: string;
    fleet: string;
    history: string;
    geofences: string;
    alerts: string;
    reports: string;
    settings: string;
    adminPanel: string;
    signIn: string;
    signOut: string;
    signUp: string;
    menu: string;
    live: string;
    offline: string;
    connected: string;
    search: string;
    actions: string;
    cancel: string;
    confirm: string;
    close: string;
    save: string;
    loading: string;

    // Landing Page
    systemOperational: string;
    heroTitleLine1: string;
    heroTitleLine2: string;
    heroSubtitle: string;
    launchDashboard: string;
    signInToFleet: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    copyright: string;

    // Telemetry & Vehicle Details
    activeFleet: string;
    totalFleet: string;
    moving: string;
    parked: string;
    idling: string;
    speed: string;
    ignition: string;
    engineOn: string;
    engineOff: string;
    battery: string;
    heading: string;
    coordinates: string;
    satellites: string;
    gsmSignal: string;
    lastSeen: string;
    cutEngine: string;
    resumeEngine: string;
    syncInterval: string;
    confirmCutEngine: string;
    confirmResumeEngine: string;
    follow: string;
    following: string;
    street: string;
    satellite: string;
    hybrid: string;
    roadmap: string;

    // History Replay
    tripSummary: string;
    selectVehicle: string;
    startDate: string;
    endDate: string;
    fetchHistory: string;
    routeReplay: string;
    distance: string;
    duration: string;
    maxSpeed: string;
    avgSpeed: string;
    filterTrip: string;
    dataTable: string;

    // Login & Auth
    gpsCommand: string;
    signInSubtitle: string;
    email: string;
    password: string;
    loginButton: string;
    loginFailed: string;
    noAccount: string;
    haveAccount: string;
}

export const translations: Record<Language, TranslationDictionary> = {
    en: {
        home: "Home",
        dashboard: "Live Map",
        fleet: "Fleet",
        history: "History",
        geofences: "Geofences",
        alerts: "Alerts",
        reports: "Reports",
        settings: "Settings",
        adminPanel: "Admin Panel",
        signIn: "Sign In",
        signOut: "Sign Out",
        signUp: "Sign Up",
        menu: "Menu",
        live: "Live",
        offline: "Offline",
        connected: "Connected",
        search: "Search by name, plate, IMEI...",
        actions: "Actions",
        cancel: "Cancel",
        confirm: "Confirm",
        close: "Close",
        save: "Save",
        loading: "Loading...",

        systemOperational: "System Online & Operational",
        heroTitleLine1: "The World's Most",
        heroTitleLine2: "Advanced GPS Platform",
        heroSubtitle: "Real-time telemetry, historical playback, and enterprise-grade fleet management. Designed for scale. Built for speed.",
        launchDashboard: "Launch Dashboard",
        signInToFleet: "Sign In to Fleet",
        feature1Title: "Real-time Precision",
        feature1Desc: "Sub-second latency updates via high-frequency Socket.io pipeline.",
        feature2Title: "Live Telemetry & Control",
        feature2Desc: "Monitor speed, battery, heading, with remote 2-way engine immobilizer.",
        feature3Title: "Enterprise Security",
        feature3Desc: "Encrypted route archival, geofence shields, and multi-tenant access control.",
        copyright: "© 2026 TrackPro GPS. All rights reserved.",

        activeFleet: "Active Fleet",
        totalFleet: "Total Fleet",
        moving: "Moving",
        parked: "Parked",
        idling: "Idling",
        speed: "Speed",
        ignition: "Ignition",
        engineOn: "Engine ON",
        engineOff: "Engine OFF",
        battery: "Battery",
        heading: "Heading",
        coordinates: "Coordinates",
        satellites: "Sats",
        gsmSignal: "GSM",
        lastSeen: "Last Seen",
        cutEngine: "Cut Engine",
        resumeEngine: "Resume",
        syncInterval: "30s Sync",
        confirmCutEngine: "⚠️ EMERGENCY WARNING: Are you sure you want to CUT THE ENGINE for this vehicle? This activates the fuel relay.",
        confirmResumeEngine: "Restore engine power and fuel pump relay to normal operation?",
        follow: "Follow",
        following: "Following",
        street: "Street",
        satellite: "Satellite",
        hybrid: "Hybrid",
        roadmap: "Road",

        tripSummary: "Trip Summary",
        selectVehicle: "Select Vehicle",
        startDate: "Start Date",
        endDate: "End Date",
        fetchHistory: "Fetch History",
        routeReplay: "Route Replay",
        distance: "Distance",
        duration: "Duration",
        maxSpeed: "Max Speed",
        avgSpeed: "Avg Speed",
        filterTrip: "Filter Trip",
        dataTable: "Data Table",

        gpsCommand: "GPS Command Center",
        signInSubtitle: "Sign in to your fleet management dashboard",
        email: "Email Address",
        password: "Password",
        loginButton: "Sign In",
        loginFailed: "Invalid email or password",
        noAccount: "Don't have an account?",
        haveAccount: "Already have an account?"
    },

    fr: {
        home: "Accueil",
        dashboard: "Carte en direct",
        fleet: "Flotte",
        history: "Historique",
        geofences: "Géozones",
        alerts: "Alertes",
        reports: "Rapports",
        settings: "Paramètres",
        adminPanel: "Administration",
        signIn: "Connexion",
        signOut: "Déconnexion",
        signUp: "Inscription",
        menu: "Menu",
        live: "En ligne",
        offline: "Hors ligne",
        connected: "Connecté",
        search: "Recherche par nom, immatriculation, IMEI...",
        actions: "Actions",
        cancel: "Annuler",
        confirm: "Confirmer",
        close: "Fermer",
        save: "Enregistrer",
        loading: "Chargement...",

        systemOperational: "Système en ligne et opérationnel",
        heroTitleLine1: "La Plateforme GPS",
        heroTitleLine2: "La Plus Avancée au Monde",
        heroSubtitle: "Télémétrie en temps réel, relecture d'itinéraires et gestion de flotte d'entreprise. Conçu pour la vitesse et la fiabilité.",
        launchDashboard: "Lancer le tableau de bord",
        signInToFleet: "Accéder à ma flotte",
        feature1Title: "Précision en temps réel",
        feature1Desc: "Mises à jour instantanées avec latence minimale via Socket.io.",
        feature2Title: "Télémétrie & Contrôle à distance",
        feature2Desc: "Surveillance de la vitesse, batterie, allumage et coupure moteur à distance.",
        feature3Title: "Sécurité Entreprise",
        feature3Desc: "Archivage sécurisé des trajets, alertes intelligentes et contrôle d'accès.",
        copyright: "© 2026 TrackPro GPS. Tous droits réservés.",

        activeFleet: "Flotte active",
        totalFleet: "Total Flotte",
        moving: "En mouvement",
        parked: "Stationné",
        idling: "Au ralenti",
        speed: "Vitesse",
        ignition: "Contact",
        engineOn: "Moteur Allumé",
        engineOff: "Moteur Éteint",
        battery: "Batterie",
        heading: "Cap",
        coordinates: "Coordonnées",
        satellites: "Sats",
        gsmSignal: "GSM",
        lastSeen: "Dernière vue",
        cutEngine: "Couper moteur",
        resumeEngine: "Rétablir",
        syncInterval: "Sync 30s",
        confirmCutEngine: "⚠️ AVERTISSEMENT D'URGENCE: Êtes-vous sûr de vouloir COUPER LE MOTEUR de ce véhicule ? Le relais de carburant sera désactivé.",
        confirmResumeEngine: "Rétablir l'alimentation du moteur et le relais de carburant ?",
        follow: "Suivre",
        following: "Suivi en cours",
        street: "Plan",
        satellite: "Satellite",
        hybrid: "Hybride",
        roadmap: "Route",

        tripSummary: "Résumé du trajet",
        selectVehicle: "Sélectionner un véhicule",
        startDate: "Date de début",
        endDate: "Date de fin",
        fetchHistory: "Afficher l'historique",
        routeReplay: "Relecture du trajet",
        distance: "Distance",
        duration: "Durée",
        maxSpeed: "Vitesse max",
        avgSpeed: "Vitesse moy.",
        filterTrip: "Filtrer le trajet",
        dataTable: "Tableau de données",

        gpsCommand: "Centre de commande GPS",
        signInSubtitle: "Connectez-vous à votre tableau de bord de gestion",
        email: "Adresse e-mail",
        password: "Mot de passe",
        loginButton: "Se connecter",
        loginFailed: "E-mail ou mot de passe invalide",
        noAccount: "Pas encore de compte ?",
        haveAccount: "Vous avez déjà un compte ?"
    },

    ar: {
        home: "الرئيسية",
        dashboard: "الخريطة المباشرة",
        fleet: "أسطول المركبات",
        history: "سجل الرحلات",
        geofences: "المناطق الجغرافية",
        alerts: "التنبيهات",
        reports: "التقارير",
        settings: "الإعدادات",
        adminPanel: "لوحة الإدارة",
        signIn: "تسجيل الدخول",
        signOut: "تسجيل الخروج",
        signUp: "إنشاء حساب",
        menu: "القائمة",
        live: "متصل",
        offline: "غير متصل",
        connected: "متصل بالخادم",
        search: "بحث بالاسم، رقم اللوحة، أو IMEI...",
        actions: "إجراءات",
        cancel: "إلغاء",
        confirm: "تأكيد",
        close: "إغلاق",
        save: "حفظ",
        loading: "جاري التحميل...",

        systemOperational: "النظام متصل ويعمل بكفاءة عالية",
        heroTitleLine1: "منصة التتبع وتحديد المواقع",
        heroTitleLine2: "الأكثر تطوراً واحترافية",
        heroSubtitle: "تتبع فوري للحظة باللحظة، إعادة تشغيل المسارات السابقة، وإدارة شاملة لأساطيل السيارات للشركات والأفراد بأعلى مستويات السرعة والدقة.",
        launchDashboard: "فتح لوحة التحكم",
        signInToFleet: "الدخول إلى النظام",
        feature1Title: "دقة فورية متناهية",
        feature1Desc: "تحديثات لحظية سريعة جداً بدون تأخير عبر بروتوكولات السوكيت الفورية.",
        feature2Title: "قياسات وتحكم عن بُعد",
        feature2Desc: "مراقبة السرعة، حالة تشغيل المحرك، مع ميزة إيقاف المحرك عن بُعد في الطوارئ.",
        feature3Title: "حماية وأمان عالي",
        feature3Desc: "حفظ وتشفير سجلات الرحلات، تنبيهات السياج الجغرافي، وإدارة مستخدمين متعددة.",
        copyright: "© 2026 TrackPro GPS. جميع الحقوق محفوظة.",

        activeFleet: "المركبات النشطة",
        totalFleet: "إجمالي الأسطول",
        moving: "متحرك",
        parked: "متوقف",
        idling: "في وضع السكون",
        speed: "السرعة",
        ignition: "حالة المحرك",
        engineOn: "المحرك يعمل",
        engineOff: "المحرك متوقف",
        battery: "البطارية",
        heading: "الاتجاه",
        coordinates: "الإحداثيات",
        satellites: "أقمار",
        gsmSignal: "إشارة GSM",
        lastSeen: "آخر ظهور",
        cutEngine: "إيقاف المحرك",
        resumeEngine: "تشغيل المحرك",
        syncInterval: "تحديث 30ث",
        confirmCutEngine: "⚠️ تحذير طوارئ: هل أنت متأكد من رغبتك في إيقاف محرك هذه المركبة عن بُعد؟ سيتم تفعيل قاطع الوقود والكهرباء فوراً.",
        confirmResumeEngine: "هل تريد إعادة تشغيل وتوصيل دورة الوقود والمحرك إلى الوضع الطبيعي؟",
        follow: "متابعة",
        following: "قيد المتابعة",
        street: "شوارع",
        satellite: "قمر صناعي",
        hybrid: "هجين",
        roadmap: "خريطة",

        tripSummary: "ملخص الرحلة",
        selectVehicle: "اختر المركبة",
        startDate: "تاريخ البداية",
        endDate: "تاريخ النهاية",
        fetchHistory: "عرض السجل",
        routeReplay: "إعادة تشغيل المسار",
        distance: "المسافة",
        duration: "المدة",
        maxSpeed: "أقصى سرعة",
        avgSpeed: "متوسط السرعة",
        filterTrip: "تصفية الرحلة",
        dataTable: "جدول البيانات",

        gpsCommand: "مركز التحكم في التتبع",
        signInSubtitle: "سجل الدخول إلى لوحة إدارة ومراقبة الأسطول",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
        loginButton: "دخول",
        loginFailed: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        noAccount: "ليس لديك حساب؟",
        haveAccount: "لديك حساب بالفعل؟"
    }
};

export const LANGUAGES: { code: Language; name: string; flag: string; dir: 'ltr' | 'rtl' }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
    { code: 'ar', name: 'العربية', flag: '🇲🇦', dir: 'rtl' },
];
