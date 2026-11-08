export type Language = 'en' | 'fr' | 'ar';

export interface TranslationDictionary {
    // Navigation & Common
    home: string;
    dashboard: string;
    fleet: string;
    history: string;
    geofences: string;
    alerts: string;
    fuelEco: string;
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

    // Fleet / Vehicles Page
    fleetManagement: string;
    fleetManagementDesc: string;
    addVehicle: string;
    addNewVehicle: string;
    editVehicle: string;
    totalVehicles: string;
    allVehicles: string;
    searchVehiclesPlaceholder: string;
    statusCol: string;
    vehicleCol: string;
    driverCol: string;
    speedCol: string;
    lastUpdateCol: string;
    actionsCol: string;
    assignDriver: string;
    noDriver: string;
    unnamedVehicle: string;
    movingState: string;
    parkedState: string;
    offlineState: string;
    editAction: string;
    viewOnMap: string;
    viewHistoryAction: string;
    copyImei: string;
    deleteVehicle: string;
    deleteVehicleConfirmTitle: string;
    deleteVehicleConfirmDesc: string;
    vehiclePhoto: string;
    uploadPhoto: string;
    uploadPhotoHint: string;
    removePhoto: string;
    orChoosePreset: string;
    vehicleNameLabel: string;
    vehicleNamePlaceholder: string;
    driverNameLabel: string;
    driverNamePlaceholder: string;
    plateNumberLabel: string;
    plateNumberPlaceholder: string;
    modelBrandLabel: string;
    modelBrandPlaceholder: string;
    saveChanges: string;
    savingChanges: string;
    addingVehicleText: string;
    deviceImeiLabel: string;
    deviceImeiPlaceholder: string;
    noVehiclesFound: string;
    noVehiclesFoundDesc: string;
    addFirstVehicle: string;
    vehicleUpdatedSuccess: string;
    vehicleAddedSuccess: string;
    vehicleDeletedSuccess: string;

    // Maintenance & Oil Change (Vidange)
    maintenance: string;
    maintenanceSubtitle: string;
    newServiceSchedule: string;
    logCompletedService: string;
    quickInitPresets: string;
    quickInitDesc: string;
    vehicleOdometer: string;
    serviceType: string;
    serviceTitle: string;
    intervalKm: string;
    lastServiceKm: string;
    nextDueKm: string;
    remainingKm: string;
    dueSoonBadge: string;
    overdueBadge: string;
    okBadge: string;
    costMad: string;
    garagePerformedBy: string;
    invoiceNumber: string;
    markAsCompleted: string;
    serviceHistory: string;
    noServicesFound: string;
    noLogsFound: string;
    totalServices: string;
    servicesOk: string;
    servicesDueSoon: string;
    servicesOverdue: string;
    totalSpentMad: string;
    spent30dMad: string;
    deleteServiceConfirm: string;
    serviceCompletedSuccess: string;
    serviceCreatedSuccess: string;
    serviceDeletedSuccess: string;
    odometerUpdatedSuccess: string;
    editOdometer: string;
    filterByVehicle: string;
    allStatuses: string;
}

export const translations: Record<Language, TranslationDictionary> = {
    en: {
        home: "Home",
        dashboard: "Live Map",
        fleet: "Fleet",
        history: "History",
        geofences: "Geofences",
        alerts: "Alerts",
        fuelEco: "Fuel & Eco-Driving",
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
        copyright: "© 2026 Geofence GPS. All rights reserved.",

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
        haveAccount: "Already have an account?",

        // Fleet / Vehicles Page
        fleetManagement: "Fleet Management",
        fleetManagementDesc: "Monitor and manage your vehicles, drivers, photos and GPS trackers",
        addVehicle: "Add Vehicle",
        addNewVehicle: "Add New Vehicle",
        editVehicle: "Edit Vehicle",
        totalVehicles: "Total Vehicles",
        allVehicles: "All",
        searchVehiclesPlaceholder: "Search by name, driver, IMEI...",
        statusCol: "Status",
        vehicleCol: "Vehicle",
        driverCol: "Driver",
        speedCol: "Speed",
        lastUpdateCol: "Last Update",
        actionsCol: "Actions",
        assignDriver: "Assign driver",
        noDriver: "No driver",
        unnamedVehicle: "Unnamed Vehicle",
        movingState: "MOVING",
        parkedState: "PARKED",
        offlineState: "OFFLINE",
        editAction: "Edit",
        viewOnMap: "View on Map",
        viewHistoryAction: "View History",
        copyImei: "Copy IMEI",
        deleteVehicle: "Delete Vehicle",
        deleteVehicleConfirmTitle: "Delete this vehicle?",
        deleteVehicleConfirmDesc: "This action will permanently delete this vehicle and all its tracking history.",
        vehiclePhoto: "Vehicle Photo / Image",
        uploadPhoto: "Upload Photo",
        uploadPhotoHint: "PNG, JPG or WebP up to 8MB. Displayed across the dashboard and live map.",
        removePhoto: "Remove",
        orChoosePreset: "Or choose a preset model:",
        vehicleNameLabel: "Vehicle Name *",
        vehicleNamePlaceholder: "e.g. V7, Toyota Hilux, Delivery Van",
        driverNameLabel: "Driver Name",
        driverNamePlaceholder: "e.g. John Doe, Alex Smith",
        plateNumberLabel: "License Plate",
        plateNumberPlaceholder: "e.g. 12345-A-26",
        modelBrandLabel: "Model / Brand",
        modelBrandPlaceholder: "e.g. Dacia Duster 2024",
        saveChanges: "Save Changes",
        savingChanges: "Saving...",
        addingVehicleText: "Adding...",
        deviceImeiLabel: "Tracker IMEI Number *",
        deviceImeiPlaceholder: "e.g. 869706063068334",
        noVehiclesFound: "No vehicles found",
        noVehiclesFoundDesc: "Add a vehicle or adjust your search filter",
        addFirstVehicle: "Add your first vehicle",
        vehicleUpdatedSuccess: "Vehicle updated successfully!",
        vehicleAddedSuccess: "Vehicle added successfully!",
        vehicleDeletedSuccess: "Vehicle deleted successfully",

        // Maintenance & Oil Change (Vidange)
        maintenance: "Maintenance & Oil",
        maintenanceSubtitle: "Automated oil changes, wear parts tracking, and digital maintenance log",
        newServiceSchedule: "Schedule Service",
        logCompletedService: "Record Service",
        quickInitPresets: "Initialize Maintenance Pack",
        quickInitDesc: "Automatically configures the 7 standard maintenance schedules (oil, filters, brakes, tires, belt) based on current odometer",
        vehicleOdometer: "Current Odometer (km)",
        serviceType: "Service Type",
        serviceTitle: "Service Title",
        intervalKm: "Interval (km)",
        lastServiceKm: "Last Service at (km)",
        nextDueKm: "Next Due (km)",
        remainingKm: "Remaining",
        dueSoonBadge: "Due Soon",
        overdueBadge: "Overdue",
        okBadge: "Up to Date",
        costMad: "Cost (MAD)",
        garagePerformedBy: "Garage / Mechanic",
        invoiceNumber: "Invoice / Receipt #",
        markAsCompleted: "Mark Completed",
        serviceHistory: "Service History",
        noServicesFound: "No maintenance schedules found",
        noLogsFound: "No service history logged yet",
        totalServices: "Scheduled Services",
        servicesOk: "Up to Date",
        servicesDueSoon: "Due Soon",
        servicesOverdue: "Overdue",
        totalSpentMad: "Total Maintenance Cost",
        spent30dMad: "Last 30 Days",
        deleteServiceConfirm: "Are you sure you want to delete this maintenance schedule?",
        serviceCompletedSuccess: "Service intervention logged successfully!",
        serviceCreatedSuccess: "Maintenance schedule created successfully!",
        serviceDeletedSuccess: "Maintenance schedule deleted",
        odometerUpdatedSuccess: "Odometer updated successfully",
        editOdometer: "Edit Odometer",
        filterByVehicle: "Filter by Vehicle",
        allStatuses: "All Statuses",
    },

    fr: {
        home: "Accueil",
        dashboard: "Carte en direct",
        fleet: "Flotte",
        history: "Historique",
        geofences: "Géozones",
        alerts: "Alertes",
        fuelEco: "Éco-Carburant",
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
        copyright: "© 2026 Geofence GPS. Tous droits réservés.",

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
        haveAccount: "Vous avez déjà un compte ?",

        // Fleet / Vehicles Page
        fleetManagement: "Gestion de la Flotte",
        fleetManagementDesc: "Gérez vos véhicules, conducteurs, photos et traceurs GPS",
        addVehicle: "Ajouter un Véhicule",
        addNewVehicle: "Ajouter un Nouveau Véhicule",
        editVehicle: "Modifier le Véhicule",
        totalVehicles: "Total Véhicules",
        allVehicles: "Tous",
        searchVehiclesPlaceholder: "Rechercher nom, chauffeur, IMEI...",
        statusCol: "Statut",
        vehicleCol: "Véhicule",
        driverCol: "Conducteur",
        speedCol: "Vitesse",
        lastUpdateCol: "Dernière MaJ",
        actionsCol: "Actions",
        assignDriver: "Assigner chauffeur",
        noDriver: "Sans chauffeur",
        unnamedVehicle: "Véhicule Sans Nom",
        movingState: "EN ROUTE",
        parkedState: "ARRÊT",
        offlineState: "HORS LIGNE",
        editAction: "Modifier",
        viewOnMap: "Voir sur la Carte",
        viewHistoryAction: "Voir l'Historique",
        copyImei: "Copier IMEI",
        deleteVehicle: "Supprimer Véhicule",
        deleteVehicleConfirmTitle: "Supprimer ce véhicule ?",
        deleteVehicleConfirmDesc: "Cette action supprimera définitivement ce véhicule ainsi que tout son historique de trajets.",
        vehiclePhoto: "Photo / Image du Véhicule",
        uploadPhoto: "Télécharger une Photo",
        uploadPhotoHint: "PNG, JPG ou WebP jusqu'à 8 Mo. S'affichera sur le tableau de bord et la carte.",
        removePhoto: "Supprimer",
        orChoosePreset: "Ou choisissez un modèle prédéfini :",
        vehicleNameLabel: "Nom du Véhicule *",
        vehicleNamePlaceholder: "Ex: V7, Peugeot 208, Camion 01",
        driverNameLabel: "Nom du Conducteur / Chauffeur",
        driverNamePlaceholder: "Ex: Khalid Ait El Maati, Mohamed Alami",
        plateNumberLabel: "Matricule (Immatriculation)",
        plateNumberPlaceholder: "Ex: 12345-A-26",
        modelBrandLabel: "Modèle / Marque",
        modelBrandPlaceholder: "Ex: Dacia Duster 2024",
        saveChanges: "Enregistrer les modifications",
        savingChanges: "Enregistrement...",
        addingVehicleText: "Ajout en cours...",
        deviceImeiLabel: "Numéro IMEI du Traceur *",
        deviceImeiPlaceholder: "Ex: 869706063068334",
        noVehiclesFound: "Aucun véhicule trouvé",
        noVehiclesFoundDesc: "Ajoutez un véhicule ou modifiez votre filtre",
        addFirstVehicle: "Ajouter un véhicule",
        vehicleUpdatedSuccess: "Véhicule mis à jour avec succès !",
        vehicleAddedSuccess: "Véhicule ajouté avec succès !",
        vehicleDeletedSuccess: "Véhicule supprimé",

        // Maintenance & Oil Change (Vidange)
        maintenance: "Entretien & Vidange",
        maintenanceSubtitle: "Suivi des vidanges, pièces d'usure et carnet d'entretien digital",
        newServiceSchedule: "Programmer un Entretien",
        logCompletedService: "Enregistrer une Intervention",
        quickInitPresets: "Initialiser Pack Vidange",
        quickInitDesc: "Configure automatiquement les 7 entretiens standards (vidange, filtres, freins, pneus, courroie) selon l'odomètre actuel",
        vehicleOdometer: "Odomètre Actuel (km)",
        serviceType: "Type d'intervention",
        serviceTitle: "Intitulé du service",
        intervalKm: "Intervalle (km)",
        lastServiceKm: "Dernière intervention à (km)",
        nextDueKm: "Prochaine échéance (km)",
        remainingKm: "Restant",
        dueSoonBadge: "Échéance Proche",
        overdueBadge: "En Retard",
        okBadge: "À jour",
        costMad: "Coût (MAD)",
        garagePerformedBy: "Garage / Mécanicien",
        invoiceNumber: "N° Facture / Bon",
        markAsCompleted: "Valider l'Entretien",
        serviceHistory: "Carnet d'Entretien (Historique)",
        noServicesFound: "Aucun entretien programmé",
        noLogsFound: "Aucune intervention enregistrée pour le moment",
        totalServices: "Services programmés",
        servicesOk: "À jour",
        servicesDueSoon: "Échéance proche",
        servicesOverdue: "En retard",
        totalSpentMad: "Dépenses totales d'entretien",
        spent30dMad: "30 derniers jours",
        deleteServiceConfirm: "Êtes-vous sûr de vouloir supprimer cet entretien programmé ?",
        serviceCompletedSuccess: "Intervention enregistrée et reprogrammée avec succès !",
        serviceCreatedSuccess: "Entretien programmé avec succès !",
        serviceDeletedSuccess: "Entretien supprimé",
        odometerUpdatedSuccess: "Odomètre mis à jour avec succès",
        editOdometer: "Modifier Odomètre",
        filterByVehicle: "Filtrer par Véhicule",
        allStatuses: "Tous les statuts",
    },

    ar: {
        home: "الرئيسية",
        dashboard: "الخريطة المباشرة",
        fleet: "أسطول المركبات",
        history: "سجل الرحلات",
        geofences: "المناطق الجغرافية",
        alerts: "التنبيهات",
        fuelEco: "الوقود والقيادة الاقتصادية",
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
        copyright: "© 2026 Geofence GPS. جميع الحقوق محفوظة.",

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
        haveAccount: "لديك حساب بالفعل؟",

        // Fleet / Vehicles Page
        fleetManagement: "إدارة الأسطول",
        fleetManagementDesc: "إدارة المركبات، السائقين، الصور وأجهزة التتبع GPS",
        addVehicle: "إضافة مركبة",
        addNewVehicle: "إضافة مركبة جديدة",
        editVehicle: "تعديل المركبة",
        totalVehicles: "إجمالي المركبات",
        allVehicles: "الكل",
        searchVehiclesPlaceholder: "بحث بالاسم، السائق، رقم IMEI...",
        statusCol: "الحالة",
        vehicleCol: "المركبة",
        driverCol: "السائق",
        speedCol: "السرعة",
        lastUpdateCol: "آخر تحديث",
        actionsCol: "الإجراءات",
        assignDriver: "تعيين سائق",
        noDriver: "بدون سائق",
        unnamedVehicle: "مركبة بدون اسم",
        movingState: "متحرك",
        parkedState: "متوقف",
        offlineState: "غير متصل",
        editAction: "تعديل",
        viewOnMap: "عرض على الخريطة",
        viewHistoryAction: "عرض السجل",
        copyImei: "نسخ IMEI",
        deleteVehicle: "حذف المركبة",
        deleteVehicleConfirmTitle: "هل تريد حذف هذه المركبة؟",
        deleteVehicleConfirmDesc: "سيؤدي هذا الإجراء إلى حذف المركبة وسجل رحلاتها بشكل نهائي.",
        vehiclePhoto: "صورة المركبة",
        uploadPhoto: "رفع صورة",
        uploadPhotoHint: "صيغة PNG أو JPG أو WebP حتى 8 ميجابايت. تظهر على الخريطة ولوحة التحكم.",
        removePhoto: "حذف الصورة",
        orChoosePreset: "أو اختر نوع المركبة الجاهز:",
        vehicleNameLabel: "اسم المركبة *",
        vehicleNamePlaceholder: "مثال: V7، تويوتا، شاحنة 01",
        driverNameLabel: "اسم السائق",
        driverNamePlaceholder: "مثال: خالد أيت المعطي، محمد العلمي",
        plateNumberLabel: "رقم اللوحة / الترقيم",
        plateNumberPlaceholder: "مثال: 12345-أ-26",
        modelBrandLabel: "الموديل / الماركة",
        modelBrandPlaceholder: "مثال: داسيا داستر 2024",
        saveChanges: "حفظ التعديلات",
        savingChanges: "جاري الحفظ...",
        addingVehicleText: "جاري الإضافة...",
        deviceImeiLabel: "رقم IMEI للجهاز *",
        deviceImeiPlaceholder: "مثال: 869706063068334",
        noVehiclesFound: "لم يتم العثور على أي مركبة",
        noVehiclesFoundDesc: "قم بإضافة مركبة جديدة أو ضبط معايير البحث",
        addFirstVehicle: "أضف مركبتك الأولى",
        vehicleUpdatedSuccess: "تم تحديث بيانات المركبة بنجاح!",
        vehicleAddedSuccess: "تمت إضافة المركبة بنجاح!",
        vehicleDeletedSuccess: "تم حذف المركبة بنجاح",

        // Maintenance & Oil Change (Vidange)
        maintenance: "الصيانة وتغيير الزيت",
        maintenanceSubtitle: "متابعة تغيير زيت المحرك، قطع الغيار الاستهلاكية ودفتر الصيانة الإلكتروني",
        newServiceSchedule: "برمجة موعد صيانة",
        logCompletedService: "تسجيل عملية صيانة",
        quickInitPresets: "تفعيل باقة الصيانة الشاملة",
        quickInitDesc: "يقوم تلقائياً ببرمجة 7 مواعيد صيانة قياسية (تغيير الزيت، الفلاتر، الفرامل، الإطارات، الحزام) بناءً على العداد الحالي",
        vehicleOdometer: "عداد الكيلومترات الحالي (كم)",
        serviceType: "نوع الصيانة",
        serviceTitle: "عنوان الصيانة",
        intervalKm: "الفترة (كم)",
        lastServiceKm: "آخر صيانة عند (كم)",
        nextDueKm: "الموعد القادم (كم)",
        remainingKm: "المتبقي",
        dueSoonBadge: "اقترب الموعد",
        overdueBadge: "متأخر",
        okBadge: "محدث",
        costMad: "التكلفة (درهم)",
        garagePerformedBy: "المرآب / الميكانيكي",
        invoiceNumber: "رقم الفاتورة / الوصل",
        markAsCompleted: "تأكيد إتمام الصيانة",
        serviceHistory: "دفتر وسجل الصيانة",
        noServicesFound: "لا توجد مواعيد صيانة مبرمجة",
        noLogsFound: "لم يتم تسجيل أي عملية صيانة بعد",
        totalServices: "المواعيد المبرمجة",
        servicesOk: "محدثة",
        servicesDueSoon: "اقترب موعدها",
        servicesOverdue: "متأخرة",
        totalSpentMad: "إجمالي مصاريف الصيانة",
        spent30dMad: "آخر 30 يوماً",
        deleteServiceConfirm: "هل أنت متأكد من حذف هذا الموعد المبرمج؟",
        serviceCompletedSuccess: "تم تسجيل الصيانة وتحديث الدورة القادمة بنجاح!",
        serviceCreatedSuccess: "تمت برمجة الصيانة بنجاح!",
        serviceDeletedSuccess: "تم حذف الموعد المبرمج",
        odometerUpdatedSuccess: "تم تحديث عداد الكيلومترات بنجاح",
        editOdometer: "تعديل العداد",
        filterByVehicle: "تصفية حسب المركبة",
        allStatuses: "جميع الحالات",
    }
};

export const LANGUAGES: { code: Language; name: string; flag: string; dir: 'ltr' | 'rtl' }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
    { code: 'ar', name: 'العربية', flag: '🇲🇦', dir: 'rtl' },
];
