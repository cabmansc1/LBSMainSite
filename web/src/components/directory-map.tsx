"use client";

import { useEffect, useRef } from "react";
import type { DirectoryBusiness } from "@/lib/directory";

/**
 * Directory map view, parity with the legacy directory.php Google Map.
 * The Maps JS key is public by design (it ships in the legacy page
 * source today); override with NEXT_PUBLIC_GOOGLE_MAPS_KEY and restrict
 * it to the production + staging domains in the Google Cloud console.
 */
const MAPS_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ??
  "AIzaSyBFLaij-Kfr-R59wnpzFzdak0HNGBHps-0";

/* Charleston area fallback center when nothing is geocoded yet. */
const DEFAULT_CENTER = { lat: 32.9, lng: -79.99 };

type GWindow = Window & {
  google?: any;
  __lbsMapsReady?: Promise<void>;
  __lbsMapsInit?: () => void;
};

function loadMapsApi(): Promise<void> {
  const w = window as GWindow;
  if (w.google?.maps) return Promise.resolve();
  if (w.__lbsMapsReady) return w.__lbsMapsReady;
  w.__lbsMapsReady = new Promise((resolve) => {
    w.__lbsMapsInit = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=__lbsMapsInit`;
    s.async = true;
    document.head.appendChild(s);
  });
  return w.__lbsMapsReady;
}

const escHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );

export function DirectoryMap({ businesses }: { businesses: DirectoryBusiness[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const mapped = businesses.filter((b) => b.lat != null && b.lng != null);

  useEffect(() => {
    let cancelled = false;
    loadMapsApi().then(() => {
      if (cancelled || !containerRef.current) return;
      const g = (window as GWindow).google;

      if (!mapRef.current) {
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        infoRef.current = new g.maps.InfoWindow();
      }

      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      const bounds = new g.maps.LatLngBounds();
      for (const b of mapped) {
        const marker = new g.maps.Marker({
          position: { lat: b.lat!, lng: b.lng! },
          map: mapRef.current,
          title: b.name,
        });
        marker.addListener("click", () => {
          infoRef.current.setContent(
            `<div style="font-family:inherit;max-width:230px;line-height:1.45">` +
              `<strong style="font-size:14px">${escHtml(b.name)}</strong><br>` +
              `<span style="color:#1287d8;font-size:12px;font-weight:600">${escHtml(b.category)}</span><br>` +
              (b.address
                ? `<span style="color:#64748b;font-size:12px">${escHtml(b.address)}</span><br>`
                : "") +
              `<a href="/business/${encodeURIComponent(b.slug)}" style="color:#1287d8;font-weight:600;font-size:13px">View Details</a>` +
              `</div>`,
          );
          infoRef.current.open(mapRef.current, marker);
        });
        markersRef.current.push(marker);
        bounds.extend(marker.getPosition());
      }

      if (markersRef.current.length > 0) {
        mapRef.current.fitBounds(bounds);
        if (markersRef.current.length === 1) mapRef.current.setZoom(14);
      } else {
        mapRef.current.setCenter(DEFAULT_CENTER);
        mapRef.current.setZoom(10);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses]);

  return (
    <div className="grid gap-2.5">
      <div
        ref={containerRef}
        className="h-[520px] rounded-2xl border border-line bg-surface"
        role="region"
        aria-label="Map of directory businesses"
      />
      <p className="text-[12.5px] text-muted">
        {mapped.length} of {businesses.length} businesses shown on the map.
        Listings without a street address appear in list view only.
      </p>
    </div>
  );
}
