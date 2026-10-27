"use client"

import { useState } from 'react';
import dynamic from 'next/dynamic';

const GoogleMapsView = dynamic(() => import('./GoogleMapsView'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-zinc-400">
            <div className="flex flex-col items-center gap-3">
                <div className="w-9 h-9 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading Google Maps...</span>
            </div>
        </div>
    )
});

const LeafletMapsView = dynamic(() => import('./LeafletMapsView'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-zinc-400">
            <div className="flex flex-col items-center gap-3">
                <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading OpenStreetMap...</span>
            </div>
        </div>
    )
});

export default function MapComponent() {
    // Default to Google Maps with active API key and billing
    const [engine, setEngine] = useState<'google' | 'leaflet'>('google');

    const handleSwitchEngine = (newEngine: 'google' | 'leaflet') => {
        setEngine(newEngine);
    };

    return (
        <div className="relative h-full w-full">
            {engine === 'google' ? (
                <GoogleMapsView onSwitchToLeaflet={() => handleSwitchEngine('leaflet')} />
            ) : (
                <LeafletMapsView onSwitchToGoogle={() => handleSwitchEngine('google')} />
            )}
        </div>
    );
}
