/**
 * Trajectory Filter & GPS Jump/Spike Cleaner
 * Eliminates abnormal teleportation jumps, multipath reflections, and GPS drift glitches.
 */

export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's mean radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat !== 0 &&
        lng !== 0 &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
}

/**
 * Filter out abnormal GPS teleportation jumps, multipath glitches, and spike outliers.
 * 
 * @param positions Chronologically ordered list of GPS positions
 * @param maxSpeedKmh Maximum realistic vehicle speed in km/h (default: 180 km/h)
 */
export function filterGpsSpikes<T extends { lat: number; lng: number; timestamp: string | Date; speed?: number }>(
    positions: T[],
    maxSpeedKmh: number = 180
): T[] {
    if (!positions || positions.length <= 1) return positions || [];

    const maxSpeedMs = (maxSpeedKmh * 1000) / 3600; // ~50 m/s for 180 km/h
    const filtered: T[] = [];

    // Find the first valid starting point
    let startIndex = 0;
    while (startIndex < positions.length && !isValidCoordinate(positions[startIndex].lat, positions[startIndex].lng)) {
        startIndex++;
    }

    if (startIndex >= positions.length) return [];
    filtered.push(positions[startIndex]);

    for (let i = startIndex + 1; i < positions.length; i++) {
        const curr = positions[i];

        // 1. Sanity check on latitude / longitude
        if (!isValidCoordinate(curr.lat, curr.lng)) {
            continue;
        }

        const prev = filtered[filtered.length - 1];
        const prevTime = new Date(prev.timestamp).getTime();
        const currTime = new Date(curr.timestamp).getTime();
        const deltaSeconds = Math.max(0.5, (currTime - prevTime) / 1000);

        const distMeters = getDistanceMeters(prev.lat, prev.lng, curr.lat, curr.lng);
        const calculatedSpeedMs = distMeters / deltaSeconds;

        // 2. Physical Speed Plausibility Check
        if (calculatedSpeedMs <= maxSpeedMs) {
            filtered.push(curr);
        } else {
            // Speed between prev and curr is impossible (e.g. 1000 km/h).
            // Check look-ahead: is the NEXT point (i + 1) back near prev?
            if (i + 1 < positions.length) {
                const next = positions[i + 1];
                if (isValidCoordinate(next.lat, next.lng)) {
                    const nextTime = new Date(next.timestamp).getTime();
                    const deltaNextSec = Math.max(0.5, (nextTime - prevTime) / 1000);
                    const distToNext = getDistanceMeters(prev.lat, prev.lng, next.lat, next.lng);
                    const speedToNext = distToNext / deltaNextSec;

                    // If jumping back to normal, 'curr' is a confirmed spike glitch -> ignore it!
                    if (speedToNext <= maxSpeedMs) {
                        continue;
                    }
                }
            }

            // 3. Long disconnection window exception
            // If GPS was disconnected for > 10 minutes, the vehicle legitimately traveled far
            if (deltaSeconds > 600) {
                filtered.push(curr);
            }
            // Otherwise, discard the abnormal jump!
        }
    }

    return filtered;
}
