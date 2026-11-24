export interface LatLng {
  lat: number;
  lng: number;
}

// Offline Southern California & common OC ZIP centroids so distance badges work
// with 0 external API calls even before GPS permission is granted.
const ZIP_CENTROIDS: Record<string, LatLng> = {
  "92691": { lat: 33.6019, lng: -117.6581 }, // Mission Viejo South/Central
  "92692": { lat: 33.6285, lng: -117.6412 }, // Mission Viejo North/Lake
  "92688": { lat: 33.6409, lng: -117.5945 }, // Rancho Santa Margarita
  "92679": { lat: 33.6469, lng: -117.5801 }, // Trabuco / Coto de Caza
  "92630": { lat: 33.6368, lng: -117.6861 }, // Lake Forest
  "92610": { lat: 33.6782, lng: -117.6592 }, // Foothill Ranch
  "92653": { lat: 33.5997, lng: -117.7142 }, // Laguna Hills
  "92656": { lat: 33.5750, lng: -117.7278 }, // Aliso Viejo
  "92677": { lat: 33.5318, lng: -117.7076 }, // Laguna Niguel
  "92651": { lat: 33.5427, lng: -117.7854 }, // Laguna Beach
  "92629": { lat: 33.4672, lng: -117.6981 }, // Dana Point
  "92675": { lat: 33.5017, lng: -117.6626 }, // San Juan Capistrano
  "92672": { lat: 33.4274, lng: -117.6120 }, // San Clemente
  "92673": { lat: 33.4552, lng: -117.6184 }, // San Clemente North
  "92694": { lat: 33.5539, lng: -117.6368 }, // Ladera Ranch
  "92618": { lat: 33.6694, lng: -117.7431 }, // Irvine Spectrum
  "92620": { lat: 33.7042, lng: -117.7592 }, // Irvine North
  "92612": { lat: 33.6625, lng: -117.8267 }, // Irvine West
  "92602": { lat: 33.7336, lng: -117.7686 }, // Irvine
  "92604": { lat: 33.6795, lng: -117.7897 }, // Irvine
  "92606": { lat: 33.6881, lng: -117.8208 }, // Irvine
  "92660": { lat: 33.6311, lng: -117.8758 }, // Newport Beach
  "92626": { lat: 33.6769, lng: -117.9056 }, // Costa Mesa
  "92627": { lat: 33.6414, lng: -117.9187 }, // Costa Mesa
  "92648": { lat: 33.6784, lng: -117.9998 }, // Huntington Beach
  "92780": { lat: 33.7367, lng: -117.8132 }, // Tustin
  "92782": { lat: 33.7196, lng: -117.7954 }, // Tustin Ranch
  "92705": { lat: 33.7654, lng: -117.8235 }, // Santa Ana / North Tustin
  "90801": { lat: 33.7701, lng: -118.1937 }, // Long Beach
  "91006": { lat: 34.1397, lng: -118.0353 }, // Arcadia
};

export function getZipFallbackCoords(
  zip?: string | null,
  merchants?: Array<{ zip_code?: string | null; latitude?: number | null; longitude?: number | null }>
): LatLng | null {
  if (!zip) return null;
  const clean = zip.trim().slice(0, 5);
  if (ZIP_CENTROIDS[clean]) return ZIP_CENTROIDS[clean];

  if (merchants && merchants.length > 0) {
    const matches = merchants.filter(
      (m) => m.zip_code && m.zip_code.trim().slice(0, 5) === clean && isFiniteCoord(m.latitude, m.longitude)
    );
    if (matches.length > 0) {
      const sumLat = matches.reduce((s, m) => s + Number(m.latitude), 0);
      const sumLng = matches.reduce((s, m) => s + Number(m.longitude), 0);
      return { lat: sumLat / matches.length, lng: sumLng / matches.length };
    }
  }
  return null;
}

export function isFiniteCoord(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const lo = Number(lng);
  return Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 && (la !== 0 || lo !== 0);
}

export function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Formats distance in miles; suppresses badges > 100 mi so out-of-market visitors
 * never see noisy "2,140 mi" labels.
 */
export function formatDistanceMiles(miles: number | null | undefined): string | null {
  if (miles === null || miles === undefined || !Number.isFinite(miles) || miles < 0 || miles > 100) {
    return null;
  }
  if (miles < 0.1) return "0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/**
 * Spreads overlapping pins (same plaza suites or multiple mobile services in one city)
 * into a deterministic micro-ring so every merchant pin is individually visible and clickable.
 */
export function spreadOverlappingPins<
  T extends { pinId: string; lat: number; lng: number; precision?: string | null }
>(pins: T[]): Array<T & { displayLat: number; displayLng: number }> {
  const groups = new Map<string, T[]>();
  for (const p of pins) {
    // Group pins within ~15m bucket
    const key = `${p.lat.toFixed(4)}_${p.lng.toFixed(4)}`;
    const arr = groups.get(key) || [];
    arr.push(p);
    groups.set(key, arr);
  }

  const out: Array<T & { displayLat: number; displayLng: number }> = [];
  groups.forEach((group) => {
    if (group.length === 1) {
      out.push({ ...group[0], displayLat: group[0].lat, displayLng: group[0].lng });
      return;
    }
    const sorted = [...group].sort((a, b) => a.pinId.localeCompare(b.pinId));
    const isCityCentroid = sorted.some((x) => x.precision === "city" || x.precision === "zip");
    // ~140m radius for city-centroid mobile pins; ~38m radius for same-plaza storefront suites
    const radiusDeg = isCityCentroid ? 0.0013 : 0.00036;
    const cosLat = Math.max(0.4, Math.cos((sorted[0].lat * Math.PI) / 180));

    sorted.forEach((item, idx) => {
      const angle = (2 * Math.PI * idx) / sorted.length;
      const dLat = radiusDeg * Math.sin(angle);
      const dLng = (radiusDeg * Math.cos(angle)) / cosLat;
      out.push({
        ...item,
        displayLat: item.lat + dLat,
        displayLng: item.lng + dLng,
      });
    });
  });

  return out;
}
