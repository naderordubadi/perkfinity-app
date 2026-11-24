"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMerchantInitials } from "@/lib/utils";
import {
  LatLng,
  formatDistanceMiles,
  haversineMiles,
  isFiniteCoord,
  spreadOverlappingPins,
} from "@/lib/geo";

export interface MapMerchantItem {
  id: string;
  location_id?: string | null;
  merchant_name: string;
  business_name?: string;
  discount?: string;
  welcome_offer_text?: string | null;
  latest_offer_title?: string;
  logo_url: string | null;
  cover_photo_url?: string | null;
  promo_banner_url?: string | null;
  business_presence?: string;
  business_category?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  store_address?: string;
  latitude?: number | null;
  longitude?: number | null;
  geocode_precision?: string | null;
  is_fullpage_sponsored?: boolean;
  fullpage_sponsored_until?: string | null;
  locations?: Array<{
    location_id?: string;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    geocode_precision?: string | null;
    store_address?: string;
  }>;
  [key: string]: any;
}

interface MerchantsMapViewProps {
  merchants: MapMerchantItem[];
  isLight: boolean;
  userCoords: LatLng | null;
  hasActualGps: boolean;
  onRequestGps: () => void;
  onOpenMerchant: (merchant: any) => void;
  onSwitchToList: () => void;
  isOnlineFilterOnly?: boolean;
  hasActiveSearch?: boolean;
  hoveredMerchantId?: string | null;
  onHoverMerchant?: (merchantId: string | null) => void;
  height?: string;
  allowFullPage?: boolean;
  isFullPage?: boolean;
  onToggleFullPage?: () => void;
}

const OC_DEFAULT_CENTER: [number, number] = [-117.655, 33.612]; // Mission Viejo / South OC hub
const NEARBY_FIT_MILES = 15; // Focus starting / reset map tightly on nearby 15-mile radius
const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/liberty"; // Always Light Mode map for maximum street/pin contrast

function checkIsVip(m: MapMerchantItem): boolean {
  return Boolean(
    m.is_fullpage_sponsored &&
      (!m.fullpage_sponsored_until || new Date(m.fullpage_sponsored_until) >= new Date())
  );
}

export default function MerchantsMapView({
  merchants,
  isLight,
  userCoords,
  hasActualGps,
  onRequestGps,
  onOpenMerchant,
  onSwitchToList,
  isOnlineFilterOnly = false,
  hasActiveSearch = false,
  hoveredMerchantId = null,
  onHoverMerchant,
  height = "calc(100vh - 235px)",
  allowFullPage = false,
  isFullPage = false,
  onToggleFullPage,
}: MerchantsMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const maplibreRef = useRef<any>(null);
  const markersRef = useRef<Array<{ pinId: string; merchantId: string; marker: any; el: HTMLElement }>>([]);
  const userMarkerRef = useRef<any>(null);
  const lastFittedSigRef = useRef<string | null>(null);
  const selectedPinIdRef = useRef<string | null>(null);
  const onHoverMerchantRef = useRef(onHoverMerchant);
  onHoverMerchantRef.current = onHoverMerchant;

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  selectedPinIdRef.current = selectedPinId;
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapReady) return;
    const t = setTimeout(() => {
      try {
        mapRef.current?.resize();
      } catch {
        /* ignore */
      }
    }, 45);
    return () => clearTimeout(t);
  }, [isFullPage, mapReady]);

  // Expand multi-location merchants into individual mappable pins
  const pins = useMemo(() => {
    const rawPins: Array<{
      pinId: string;
      merchant: MapMerchantItem;
      lat: number;
      lng: number;
      precision: string | null;
      isVip: boolean;
      isMobile: boolean;
    }> = [];

    for (const m of merchants) {
      if (m.business_presence === "online") continue;
      const isVip = checkIsVip(m);
      const isMobile = m.business_presence === "mobile";

      if (Array.isArray(m.locations) && m.locations.length > 0) {
        m.locations.forEach((loc, idx) => {
          if (isFiniteCoord(loc.latitude, loc.longitude)) {
            rawPins.push({
              pinId: `${m.id}_${loc.location_id || idx}`,
              merchant: {
                ...m,
                store_address: loc.store_address || m.store_address,
                city: loc.city || m.city,
                zip_code: loc.postal_code || m.zip_code,
              },
              lat: Number(loc.latitude),
              lng: Number(loc.longitude),
              precision: loc.geocode_precision || m.geocode_precision || null,
              isVip,
              isMobile,
            });
          }
        });
      } else if (isFiniteCoord(m.latitude, m.longitude)) {
        rawPins.push({
          pinId: `${m.id}_${m.location_id || "primary"}`,
          merchant: m,
          lat: Number(m.latitude),
          lng: Number(m.longitude),
          precision: m.geocode_precision || null,
          isVip,
          isMobile,
        });
      }
    }

    return spreadOverlappingPins(rawPins);
  }, [merchants]);

  // Deterministic signature so parent re-renders (hover, carousel timer, etc.) NEVER rebuild pins or reset zoom!
  const pinsSignature = useMemo(
    () =>
      pins
        .map((p) => `${p.pinId}:${p.displayLat.toFixed(5)},${p.displayLng.toFixed(5)}:${p.isVip ? 1 : 0}`)
        .join("|"),
    [pins]
  );

  const selectedPin = useMemo(
    () => pins.find((p) => p.pinId === selectedPinId) || null,
    [pins, selectedPinId]
  );

  // Clear selection if filtered out
  useEffect(() => {
    if (selectedPinId && !pins.some((p) => p.pinId === selectedPinId)) {
      setSelectedPinId(null);
    }
  }, [pins, selectedPinId]);

  const hideCompetingPois = (map: any) => {
    try {
      const layers = map.getStyle()?.layers || [];
      for (const layer of layers) {
        if (typeof layer.id === "string" && layer.id.toLowerCase().includes("poi")) {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      }
    } catch {
      /* non-fatal */
    }
  };

  // Initialize MapLibre lazily on client
  useEffect(() => {
    let cancelled = false;
    let resizeObs: ResizeObserver | null = null;
    let attribTimer: ReturnType<typeof setTimeout> | null = null;

    const collapseAttrib = () => {
      try {
        const el = containerRef.current?.querySelector(".maplibregl-ctrl-attrib.maplibregl-compact");
        if (el && el.classList.contains("maplibregl-compact-show")) {
          el.classList.remove("maplibregl-compact-show");
          el.removeAttribute("open");
        }
      } catch {
        /* ignore */
      }
    };

    const setup = async () => {
      if (!containerRef.current || mapRef.current) return;
      const mod = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      const maplibregl: any = (mod as any).default || mod;
      if (typeof maplibregl.setWorkerUrl === "function") {
        maplibregl.setWorkerUrl("/maplibre-gl-worker.js");
      }
      maplibreRef.current = maplibregl;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_LIGHT,
        center: OC_DEFAULT_CENTER,
        zoom: 11,
        attributionControl: false,
      });

      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

      map.on("style.load", () => {
        hideCompetingPois(map);
      });

      map.on("load", () => {
        if (cancelled) return;
        hideCompetingPois(map);
        setMapReady(true);
        attribTimer = setTimeout(collapseAttrib, 2000);
      });

      map.on("click", () => {
        setSelectedPinId(null);
      });

      resizeObs = new ResizeObserver(() => {
        try {
          map.resize();
        } catch {
          /* ignore */
        }
      });
      resizeObs.observe(containerRef.current);

      mapRef.current = map;
    };

    setup();

    return () => {
      cancelled = true;
      if (attribTimer) clearTimeout(attribTimer);
      if (resizeObs) resizeObs.disconnect();
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* ignore */
        }
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, []);

  // Render blue GPS dot when actual device GPS is active
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || !mapReady) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (hasActualGps && userCoords) {
      const dot = document.createElement("div");
      dot.style.width = "16px";
      dot.style.height = "16px";
      dot.style.borderRadius = "50%";
      dot.style.background = "#3B82F6";
      dot.style.border = "3px solid #FFFFFF";
      dot.style.boxShadow = "0 0 0 6px rgba(59,130,246,0.25), 0 2px 8px rgba(0,0,0,0.35)";
      dot.title = "Your location";

      userMarkerRef.current = new maplibregl.Marker({ element: dot })
        .setLngLat([userCoords.lng, userCoords.lat])
        .addTo(map);
    }
  }, [hasActualGps, userCoords, mapReady]);

  // Render merchant pins & fit bounds cleanly on filter/search changes
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || !mapReady) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.marker.remove());
    markersRef.current = [];

    const supportsHover =
      typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

    pins.forEach((pin) => {
      const { merchant: m, displayLat, displayLng, isVip, isMobile, pinId } = pin;
      const offerLabel =
        m.latest_offer_title || m.discount || m.welcome_offer_text || "Member Perk";
      const nameLabel = m.merchant_name || m.business_name || "Merchant";

      const markerRoot = document.createElement("div");
      markerRoot.className = "pf-map-pin-root";
      markerRoot.style.cursor = "pointer";
      markerRoot.style.zIndex = isVip ? "20" : "10";

      const wrapper = document.createElement("div");
      wrapper.className = "pf-map-pin-wrap";
      wrapper.style.position = "relative";

      const bubble = document.createElement("div");
      bubble.className = "pf-map-pin-bubble";
      bubble.style.width = isVip ? "38px" : "32px";
      bubble.style.height = isVip ? "38px" : "32px";
      bubble.style.borderRadius = "50% 50% 50% 4px";
      bubble.style.transform = "rotate(-45deg)";
      bubble.style.display = "flex";
      bubble.style.alignItems = "center";
      bubble.style.justifyContent = "center";
      bubble.style.transition = "transform 0.18s ease, box-shadow 0.18s ease";
      bubble.style.background = isVip
        ? "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)"
        : "#0F172A";
      bubble.style.border = isVip
        ? "2.5px solid #FBBF24"
        : isMobile
        ? "2px dashed #38BDF8"
        : "2px solid #FFFFFF";
      bubble.style.boxShadow = isVip
        ? "0 6px 16px rgba(124,58,237,0.5)"
        : "0 4px 10px rgba(15,23,42,0.35)";

      const inner = document.createElement("div");
      inner.style.transform = "rotate(45deg)";
      inner.style.width = isVip ? "24px" : "20px";
      inner.style.height = isVip ? "24px" : "20px";
      inner.style.borderRadius = "50%";
      inner.style.background = "#FFFFFF";
      inner.style.display = "flex";
      inner.style.alignItems = "center";
      inner.style.justifyContent = "center";
      inner.style.overflow = "hidden";
      inner.style.fontSize = "9px";
      inner.style.fontWeight = "900";
      inner.style.color = "#5B3FA5";

      if (m.logo_url) {
        const img = document.createElement("img");
        img.src = m.logo_url;
        img.alt = "";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        img.onerror = () => {
          img.remove();
          inner.textContent = getMerchantInitials(nameLabel);
        };
        inner.appendChild(img);
      } else {
        inner.textContent = getMerchantInitials(nameLabel);
      }

      bubble.appendChild(inner);
      wrapper.appendChild(bubble);

      // Desktop-only hover tooltip (@media (hover: hover))
      if (supportsHover) {
        const tip = document.createElement("div");
        tip.style.display = "none";
        tip.style.position = "absolute";
        tip.style.bottom = "calc(100% + 8px)";
        tip.style.left = "50%";
        tip.style.transform = "translateX(-50%)";
        tip.style.background = "#FFFFFF";
        tip.style.color = "#0F172A";
        tip.style.padding = "6px 10px";
        tip.style.borderRadius = "10px";
        tip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.22)";
        tip.style.border = "1px solid rgba(15,23,42,0.12)";
        tip.style.whiteSpace = "nowrap";
        tip.style.pointerEvents = "none";
        tip.style.zIndex = "50";
        tip.style.fontSize = "11.5px";
        tip.style.fontFamily = "Outfit, sans-serif";
        tip.innerHTML = `<div style="font-weight:800;">${nameLabel.replace(/</g, "&lt;")}</div><div style="color:#15803D;font-weight:700;font-size:10.5px;">${offerLabel.replace(/</g, "&lt;")}</div>`;
        wrapper.appendChild(tip);

        wrapper.addEventListener("mouseenter", () => {
          tip.style.display = "block";
          markerRoot.style.zIndex = "45";
          bubble.style.transform = "rotate(-45deg) scale(1.15)";
          onHoverMerchantRef.current?.(m.id);
        });
        wrapper.addEventListener("mouseleave", () => {
          tip.style.display = "none";
          markerRoot.style.zIndex = isVip ? "20" : "10";
          if (selectedPinIdRef.current !== pinId) {
            bubble.style.transform = "rotate(-45deg) scale(1)";
          }
          onHoverMerchantRef.current?.(null);
        });
      }

      markerRoot.addEventListener("click", (e) => {
        e.stopPropagation();
        try {
          const attribEl = containerRef.current?.querySelector(".maplibregl-ctrl-attrib.maplibregl-compact");
          if (attribEl && attribEl.classList.contains("maplibregl-compact-show")) {
            attribEl.classList.remove("maplibregl-compact-show");
            attribEl.removeAttribute("open");
          }
        } catch {
          /* ignore */
        }
        setSelectedPinId(pinId);
        map.flyTo({
          center: [displayLng, displayLat],
          zoom: Math.max(map.getZoom(), 13.2),
          duration: 450,
        });
      });

      markerRoot.appendChild(wrapper);
      const marker = new maplibregl.Marker({ element: markerRoot, anchor: "bottom" })
        .setLngLat([displayLng, displayLat])
        .addTo(map);

      markersRef.current.push({ pinId, merchantId: m.id, marker, el: bubble });
    });

    // ONLY auto-fit camera when the set of visible pins genuinely changed (initial load or search/filter) — NEVER on hover or theme toggle!
    if (pins.length > 0 && lastFittedSigRef.current !== pinsSignature) {
      const isFirstFit = lastFittedSigRef.current === null;
      lastFittedSigRef.current = pinsSignature;
      fitToStartingBounds(isFirstFit ? 0 : 420);
    }
  }, [pinsSignature, mapReady]);

  // Highlight active/hovered pin visually
  useEffect(() => {
    markersRef.current.forEach(({ pinId, merchantId, el }) => {
      const isActive = pinId === selectedPinId || (hoveredMerchantId && merchantId === hoveredMerchantId);
      el.style.transform = isActive ? "rotate(-45deg) scale(1.22)" : "rotate(-45deg) scale(1)";
    });
  }, [selectedPinId, hoveredMerchantId]);

  const fitToStartingBounds = (durationMs = 450) => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl) return;

    if (pins.length === 0) {
      map.flyTo({ center: OC_DEFAULT_CENTER, zoom: 11, duration: durationMs });
      return;
    }

    const anchor: LatLng = userCoords || { lat: OC_DEFAULT_CENTER[1], lng: OC_DEFAULT_CENTER[0] };
    const nearbyPins = hasActiveSearch
      ? []
      : pins.filter((p) => haversineMiles(anchor, { lat: p.lat, lng: p.lng }) <= NEARBY_FIT_MILES);
    const fitTargets = nearbyPins.length > 0 ? nearbyPins : pins;

    if (fitTargets.length === 1) {
      map.flyTo({
        center: [fitTargets[0].displayLng, fitTargets[0].displayLat],
        zoom: 13.5,
        duration: durationMs,
      });
    } else {
      const bounds = new maplibregl.LngLatBounds();
      fitTargets.forEach((p) => bounds.extend([p.displayLng, p.displayLat]));
      if (nearbyPins.length > 0 && hasActualGps && userCoords) {
        bounds.extend([userCoords.lng, userCoords.lat]);
      }
      map.fitBounds(bounds, {
        padding: { top: 54, bottom: 130, left: 42, right: 42 },
        maxZoom: 14,
        duration: durationMs,
      });
    }
  };

  const handleResetView = () => {
    setSelectedPinId(null);
    fitToStartingBounds(450);
  };

  const handleRecenter = () => {
    const map = mapRef.current;
    if (hasActualGps && userCoords && map) {
      map.flyTo({ center: [userCoords.lng, userCoords.lat], zoom: 13, duration: 500 });
    } else {
      onRequestGps();
    }
  };

  // Compute selected merchant preview card fields (VIP-gated cover photo, zero clutter!)
  const preview = useMemo(() => {
    if (!selectedPin) return null;
    const m = selectedPin.merchant;
    const isVip = selectedPin.isVip;
    // STRICT MONETIZATION RULE: Only active VIPs with a cover/banner photo show the cover photo!
    const coverPhoto = isVip ? m.promo_banner_url || m.cover_photo_url || null : null;
    const name = m.merchant_name || m.business_name || "Merchant";
    const offer =
      m.latest_offer_title || m.discount || m.welcome_offer_text || "Exclusive Member Perk";
    const distMiles = userCoords
      ? haversineMiles(userCoords, { lat: selectedPin.lat, lng: selectedPin.lng })
      : null;
    const distLabel = formatDistanceMiles(distMiles);

    return { m, isVip, coverPhoto, name, offer, distLabel };
  }, [selectedPin, userCoords]);

  return (
    <div
      className="pf-map-shell"
      style={{
        position: "relative",
        width: "100%",
        height,
        minHeight: "340px",
        borderRadius: "20px",
        overflow: "hidden",
        border: isLight ? "1px solid rgba(15,23,42,0.12)" : "1px solid rgba(255,255,255,0.14)",
        boxShadow: isLight ? "0 8px 28px rgba(15,23,42,0.08)" : "0 8px 28px rgba(0,0,0,0.4)",
        background: "#E2E8F0",
      }}
    >
      <style>{`
        .pf-map-shell .maplibregl-ctrl-attrib.maplibregl-compact {
          background-color: rgba(255, 255, 255, 0.88) !important;
          margin: 8px !important;
        }
        .pf-map-shell .maplibregl-ctrl-attrib.maplibregl-compact-show .maplibregl-ctrl-attrib-inner {
          font-size: 10px !important;
          line-height: 20px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: calc(100vw - 96px) !important;
        }
      `}</style>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Refinement #3: Online-only filter notice */}
      {isOnlineFilterOnly && pins.length === 0 && (
        <div
          onClick={onSwitchToList}
          style={{
            position: "absolute",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(109,40,217,0.3)",
            color: "#0F172A",
            padding: "10px 16px",
            borderRadius: "999px",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
            whiteSpace: "nowrap",
          }}
        >
          Online-only brands have no map pins · <span style={{ color: "#6D28D9", textDecoration: "underline" }}>See List →</span>
        </div>
      )}

      {/* Top-Right Control Bar: Center Near Me + Reset Map + Expand */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          zIndex: 25,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <button
          type="button"
          onClick={handleRecenter}
          title="Center near me"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(15,23,42,0.14)",
            color: hasActualGps ? "#3B82F6" : "#0F172A",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleResetView}
          title="Reset to starting map view"
          style={{
            padding: "7px 12px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(15,23,42,0.14)",
            color: "#0F172A",
            fontSize: "0.75rem",
            fontWeight: "800",
            fontFamily: "Outfit, sans-serif",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          }}
        >
          <span style={{ fontSize: "0.86rem", lineHeight: 1 }}>↺</span> Reset Map
        </button>

        {allowFullPage && onToggleFullPage && (
          <button
            type="button"
            onClick={onToggleFullPage}
            title={isFullPage ? "Split view (List + Map)" : "Expand map"}
            aria-label="Toggle expanded map"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.96)",
              border: "1px solid rgba(15,23,42,0.14)",
              color: "#0F172A",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
            }}
          >
            {isFullPage ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Bottom Preview Card — VIP-Only Cover Photo, Minimal Details, Opens Exact List View Modal */}
      {preview && (
        <div
          onClick={() => onOpenMerchant(preview.m)}
          style={{
            position: "absolute",
            left: "12px",
            right: "12px",
            bottom: "12px",
            maxWidth: "420px",
            margin: "0 auto",
            zIndex: 30,
            background: isLight ? "#FFFFFF" : "#131C31",
            borderRadius: "18px",
            border: preview.isVip
              ? isLight
                ? "1.5px solid rgba(109,40,217,0.4)"
                : "1.5px solid rgba(139,92,246,0.55)"
              : isLight
              ? "1px solid rgba(15,23,42,0.14)"
              : "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            overflow: "hidden",
            cursor: "pointer",
            fontFamily: "Outfit, sans-serif",
          }}
        >
          {/* Close Preview X */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPinId(null);
            }}
            aria-label="Close preview"
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              zIndex: 5,
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: preview.coverPhoto
                ? "rgba(15,23,42,0.68)"
                : isLight
                ? "rgba(15,23,42,0.06)"
                : "rgba(255,255,255,0.1)",
              border: "none",
              color: preview.coverPhoto ? "#FFFFFF" : isLight ? "#475569" : "#CBD5E1",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>

          {/* Cover Photo — Strictly Shown ONLY for Active VIPs With Photo */}
          {preview.coverPhoto && (
            <div style={{ width: "100%", height: "128px", position: "relative", overflow: "hidden", background: "#1E1B4B" }}>
              <img
                src={preview.coverPhoto}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={(e) => {
                  const parent = e.currentTarget.parentElement;
                  if (parent) parent.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Compact Body: Small Logo + Name on 1 Line + Offer + 0.8 mi */}
          <div style={{ padding: preview.coverPhoto ? "10px 14px 12px" : "12px 38px 12px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: isLight ? "#EDE9FE" : "rgba(139,92,246,0.2)",
                  border: isLight ? "1px solid #DDD6FE" : "1px solid rgba(139,92,246,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {preview.m.logo_url ? (
                  <img
                    src={preview.m.logo_url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <span style={{ fontSize: "10px", fontWeight: 900, color: "#8B5CF6" }}>
                    {getMerchantInitials(preview.name)}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.94rem",
                  color: isLight ? "#0F172A" : "#FFFFFF",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 1,
                }}
              >
                {preview.name}
              </div>
              {preview.distLabel && (
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    color: isLight ? "#475569" : "#94A3B8",
                    flexShrink: 0,
                  }}
                >
                  {preview.distLabel}
                </span>
              )}
            </div>

            <div
              style={{
                marginTop: "5px",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: isLight ? "#15803D" : "#86EFAC",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              🎁 {preview.offer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
