/**
 * Composant carte Leaflet pour afficher les actions géographiques PDFCP
 * Compatible avec le type PdfcpActionGeoRow (Supabase)
 */

import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PdfcpActionGeoRow, getGeoConfig } from '@/hooks/usePdfcpActionsGeo';

// Fix pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface PdfcpMapViewerProps {
  actions: PdfcpActionGeoRow[];
  selectedActionId?: string;
  onActionClick?: (action: PdfcpActionGeoRow) => void;
  className?: string;
}

const createCustomIcon = (color: string): L.DivIcon => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const PdfcpMapViewer: React.FC<PdfcpMapViewerProps> = ({
  actions,
  selectedActionId,
  onActionClick,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Map<string, L.Layer>>(new Map());

  const defaultCenter: L.LatLngTuple = [32.0, -6.0];
  const defaultZoom = 6;

  const initialCenter = useMemo(() => {
    if (actions.length === 0) return defaultCenter;
    const valid = actions.filter(a => a.centroid_lat != null && a.centroid_lng != null);
    if (valid.length === 0) return defaultCenter;
    const avgLat = valid.reduce((s, a) => s + a.centroid_lat, 0) / valid.length;
    const avgLng = valid.reduce((s, a) => s + a.centroid_lng, 0) / valid.length;
    return [avgLat, avgLng] as L.LatLngTuple;
  }, [actions]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: actions.length > 0 ? 10 : defaultZoom,
      scrollWheelZoom: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    layersRef.current.forEach(layer => map.removeLayer(layer));
    layersRef.current.clear();

    const allBounds: L.LatLngBounds[] = [];

    actions.forEach(action => {
      if (!action.geometry) return;
      const config = getGeoConfig(action.action_type);
      const isSelected = action.id === selectedActionId;

      if (action.geometry.type === 'Polygon') {
        const coords = ((action.geometry as any).coordinates[0] as [number, number][]).map(c => [c[1], c[0]] as L.LatLngTuple);
        const polygon = L.polygon(coords, {
          color: config.color,
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 1 : 0.8,
          fillColor: config.color,
          fillOpacity: isSelected ? 0.4 : 0.2,
        });
        polygon.bindPopup(`
          <div style="font-size:14px;">
            <div style="font-weight:600;">${config.icon} ${config.label}</div>
            <div style="color:#666;margin-top:4px;">${action.titre}</div>
            ${action.surface_realisee_ha ? `<div style="font-size:12px;margin-top:4px;">Surface: ${action.surface_realisee_ha} ha</div>` : ''}
          </div>
        `);
        if (onActionClick) polygon.on('click', () => onActionClick(action));
        polygon.addTo(map);
        layersRef.current.set(action.id, polygon);
        allBounds.push(polygon.getBounds());
      } else if (action.geometry.type === 'LineString') {
        const coords = ((action.geometry as any).coordinates as [number, number][]).map(c => [c[1], c[0]] as L.LatLngTuple);
        const polyline = L.polyline(coords, {
          color: config.color,
          weight: isSelected ? 5 : 3,
          opacity: isSelected ? 1 : 0.8,
          dashArray: isSelected ? undefined : '10, 5',
        });
        polyline.bindPopup(`
          <div style="font-size:14px;">
            <div style="font-weight:600;">${config.icon} ${config.label}</div>
            <div style="color:#666;margin-top:4px;">${action.titre}</div>
            ${action.longueur_realisee_km ? `<div style="font-size:12px;margin-top:4px;">Longueur: ${action.longueur_realisee_km.toFixed(2)} km</div>` : ''}
          </div>
        `);
        if (onActionClick) polyline.on('click', () => onActionClick(action));
        polyline.addTo(map);
        layersRef.current.set(action.id, polyline);
        allBounds.push(polyline.getBounds());
      } else if (action.geometry.type === 'Point') {
        const coords = (action.geometry as any).coordinates as [number, number];
        const marker = L.marker([coords[1], coords[0]], { icon: createCustomIcon(config.color) });
        marker.bindPopup(`
          <div style="font-size:14px;">
            <div style="font-weight:600;">${config.icon} ${config.label}</div>
            <div style="color:#666;margin-top:4px;">${action.titre}</div>
            ${action.description ? `<div style="font-size:12px;margin-top:4px;">${action.description}</div>` : ''}
          </div>
        `);
        if (onActionClick) marker.on('click', () => onActionClick(action));
        marker.addTo(map);
        layersRef.current.set(action.id, marker);
        allBounds.push(L.latLngBounds([marker.getLatLng(), marker.getLatLng()]));
      }
    });

    if (allBounds.length > 0 && !selectedActionId) {
      let combined = allBounds[0];
      for (let i = 1; i < allBounds.length; i++) combined = combined.extend(allBounds[i]);
      map.fitBounds(combined, { padding: [50, 50] });
    }
  }, [actions, onActionClick]);

  // Selection highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedActionId) return;

    const action = actions.find(a => a.id === selectedActionId);
    if (!action || !action.geometry) return;

    layersRef.current.forEach((layer, id) => {
      const isSelected = id === selectedActionId;
      if (layer instanceof L.Polygon) {
        layer.setStyle({ weight: isSelected ? 4 : 2, opacity: isSelected ? 1 : 0.8, fillOpacity: isSelected ? 0.4 : 0.2 });
      } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        layer.setStyle({ weight: isSelected ? 5 : 3, opacity: isSelected ? 1 : 0.8, dashArray: isSelected ? undefined : '10, 5' });
      }
    });

    if (action.geometry.type === 'Point') {
      const coords = (action.geometry as any).coordinates as [number, number];
      map.setView([action.centroid_lat ?? coords[1], action.centroid_lng ?? coords[0]], 15, { animate: true });
    } else if (action.geometry.type === 'Polygon') {
      const coords = ((action.geometry as any).coordinates[0] as [number, number][]).map(c => [c[1], c[0]] as L.LatLngTuple);
      map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], animate: true });
    } else if (action.geometry.type === 'LineString') {
      const coords = ((action.geometry as any).coordinates as [number, number][]).map(c => [c[1], c[0]] as L.LatLngTuple);
      map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], animate: true });
    }
  }, [selectedActionId, actions]);

  return (
    <div className={`rounded-xl overflow-hidden border border-border ${className}`}>
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%', minHeight: '400px' }} />
    </div>
  );
};

export default PdfcpMapViewer;
