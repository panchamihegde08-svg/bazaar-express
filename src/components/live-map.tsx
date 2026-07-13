import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, LayerGroup } from "leaflet";

export type MapPoint = { lat: number; lng: number; label?: string; color?: string };

export function LiveMap({
  points,
  center,
  height = 320,
}: {
  points: MapPoint[];
  center?: { lat: number; lng: number };
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !ref.current) return;
      const first = points[0] ?? center ?? { lat: 28.6139, lng: 77.209 };
      if (!mapRef.current) {
        mapRef.current = L.map(ref.current, { zoomControl: true }).setView(
          [first.lat, first.lng],
          14,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapRef.current);
        markersRef.current = L.layerGroup().addTo(mapRef.current);
      }
      markersRef.current!.clearLayers();
      const bounds: [number, number][] = [];
      points.forEach((p) => {
        const color = p.color ?? "#22c55e";
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${color};width:18px;height:18px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 2px ${color};"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const m: Marker = L.marker([p.lat, p.lng], { icon });
        if (p.label) m.bindTooltip(p.label, { permanent: false });
        m.addTo(markersRef.current!);
        bounds.push([p.lat, p.lng]);
      });
      if (bounds.length === 1) {
        mapRef.current!.setView(bounds[0], 15);
      } else if (bounds.length > 1) {
        mapRef.current!.fitBounds(bounds, { padding: [40, 40] });
      }
    })();
    return () => {
      disposed = true;
    };
  }, [points, center]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={ref} style={{ height, width: "100%" }} className="rounded-lg overflow-hidden border" />;
}
