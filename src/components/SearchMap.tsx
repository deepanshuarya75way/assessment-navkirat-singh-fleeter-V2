"use client";

import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { dropIcon, pickupIcon } from "./MapIcons";
import LoadingSpinner from "./LoadingSpinner";
import { Navigation2 } from "lucide-react";

export type MapStop = {
  address: string;
  lat?: number;
  lon?: number;
};

interface Props {
  pickup: string;
  drop: string;
  stops: MapStop[];
  initialPickUp?: [number, number] | null;
  initialDrop?: [number, number] | null;
  onStopsChange?: (stops: MapStop[]) => void;
  onChange: (
    pickup: string,
    drop: string,
    pickupLat?: number,
    pickupLon?: number,
    dropLat?: number,
    dropLon?: number
  ) => void;
  onDistance: (d: number) => void;
  onSegments?: (segments: number[]) => void;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;
    map.invalidateSize();

    map.fitBounds(points, {
      padding:[72,72],
      maxZoom: 15,
      animate: true,
      duration: 1,
    });
  }, [map, points]);

  return null;
}

export default function SearchMap({
  pickup,
  drop,
  initialDrop,
  initialPickUp,
  onStopsChange,
  onSegments,
  stops,
  onChange,
  onDistance,
}: Props) {
  const [p1, setP1] = useState<[number, number] | null>(null);
  const [p2, setP2] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [waypoints, setWayPoints] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [km, setKm] = useState<number>(0);

  const skipNextGeocode = useRef(false);
  const userMovedMarkers = useRef(false);

  const geoCoding = async (q: string): Promise<[number, number] | null> => {
    try {
      const { data } = await axios.get(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`,
        { timeout: 4000 }
      );

      if (data?.features?.length) {
        const [lon, lat] = data.features[0].geometry.coordinates;
        return [lat, lon];
      }
    } catch {
      try {
        const { data } = await axios.get(
          "https://openstreetmap.org",
          {
            params: { q, format: "json", limit: 1 },
          }
        );
        if (Array.isArray(data) && data.length > 0) {
          return [Number(data[0].lat), Number(data[0].lon)];
        }
      } catch (fallbackErr) {
        console.error("Geocoding fallback failed:", fallbackErr);
      }
    }
    return null;
  };

  const reverseGeocoding = async (
    latitude: number,
    longitude: number
  ): Promise<string | undefined> => {
    try {
      const { data } = await axios.get(
        `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`,
        { timeout: 4000 }
      );

      if (data?.features?.length) {
        const place = data.features[0].properties;
        return [
          place?.name,
          place?.street,
          place?.city,
          place?.state,
          place?.country,
        ]
          .filter(Boolean)
          .join(", ");
      }
    } catch {
      try {
        const { data } = await axios.get(
          "https://openstreetmap.org",
          {
            params: { lat: latitude, lon: longitude, format: "json" },
          }
        );
        return data?.display_name;
      } catch (fallbackErr) {
        console.error("Reverse geocoding fallback failed:", fallbackErr);
      }
    }
    return undefined;
  };

  const loadRoute = async (p: [number, number][]) => {
    try {
      if (p.length < 2) return;

      const coords = p.map(([lat, lon]) => `${lon},${lat}`).join(";");

      const { data } = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`
      );

      if (!data?.routes?.length) return;
      const r = data.routes[0];
      if (!r) return;

      setRoute(
        r.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon])
      );

      const total = +(r.distance / 1000).toFixed(2);
      const segmentDistances = (r.legs || []).map(
        (leg: any) => +(leg.distance / 1000).toFixed(2)
      );

      setKm(total);
      onDistance(total);
      onSegments?.(segmentDistances);
    } catch (error) {
      console.error("Failed to load OSRM route:", error);
    }
  };

  const dragPickUp = async (lat: number, lon: number) => {
    userMovedMarkers.current = true;
    skipNextGeocode.current = true;

    const add = await reverseGeocoding(lat, lon);
    setP1([lat, lon]);

    if (p2) {
      await loadRoute([[lat, lon], ...waypoints, p2]);
    }

    onChange(add ?? pickup, drop, lat, lon, p2?.[0], p2?.[1]);
  };

  const dragDrop = async (lat: number, lon: number) => {
    userMovedMarkers.current = true;
    skipNextGeocode.current = true;

    const add = await reverseGeocoding(lat, lon);
    setP2([lat, lon]);

    if (p1) {
      await loadRoute([p1, ...waypoints, [lat, lon]]);
    }

    onChange(pickup, add ?? drop, p1?.[0], p1?.[1], lat, lon);
  };

  useEffect(() => {
    if (skipNextGeocode.current) {
      skipNextGeocode.current = false;
      return;
    }

    let mounted = true;

    const init = async () => {
      if (!pickup || !drop) {
        if (mounted) setLoading(true);
        return;
      }

      setLoading(true);

      const [a, b] = await Promise.all([
        userMovedMarkers.current && p1 ? p1 : initialPickUp ?? geoCoding(pickup),
        userMovedMarkers.current && p2 ? p2 : initialDrop ?? geoCoding(drop),
      ]);

      if (!mounted) return;

      if (!a || !b) {
        setLoading(false);
        return;
      }

      const validStops = (stops || []).filter(
        (s) => typeof s?.address === "string" && s.address.trim() !== ""
      );

      let hadMissingCoords = false;

      const middleCoords = await Promise.all(
        validStops.map(async (stop) => {
          if (stop.lat != null && stop.lon != null) {
            return [stop.lat, stop.lon] as [number, number];
          }
          hadMissingCoords = true;
          return geoCoding(stop.address);
        })
      );

      if (!mounted) return;

      const resolvedStops: MapStop[] = [];
      const validMiddle: [number, number][] = [];

      middleCoords.forEach((coord, idx) => {
        if (coord) {
          validMiddle.push(coord);
          resolvedStops.push({
            address: validStops[idx].address,
            lat: coord[0],
            lon: coord[1],
          });
        }
      });

      setWayPoints(validMiddle);

      if (hadMissingCoords) {
        onStopsChange?.(resolvedStops);
      }

      setP1(a);
      setP2(b);

      onChange(pickup, drop, a[0], a[1], b[0], b[1]);

      await loadRoute([a, ...validMiddle, b]);

      if (mounted) setLoading(false);
    };

    init();

    return () => {
      mounted = false;
    };
  }, [pickup, drop, stops]);

  if (loading) return <LoadingSpinner />;

  const allBoundsPoints: [number, number][] =
    p1 && p2 ? [p1, ...waypoints, p2] : [];

  return (
    <div style={{ width: "100%", height: "500px" }} className="relative">
      <MapContainer
        center={p1 ?? [0,0]}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {allBoundsPoints.length >= 2 && <FitBounds points={allBoundsPoints} />}

        {p1 && (
          <Marker
            position={p1}
            icon={pickupIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const m = e.target.getLatLng();
                dragPickUp(m.lat, m.lng);
              },
            }}
          />
        )}

        {waypoints.map((point, index) => (
          <CircleMarker
            key={`stop-${index}`}
            center={point}
            radius={13}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#16a34a",
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              Stop {index + 1}
            </Tooltip>
          </CircleMarker>
        ))}

        {p2 && (
          <Marker
            position={p2}
            icon={dropIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const m = e.target.getLatLng();
                dragDrop(m.lat, m.lng);
              },
            }}
          />
        )}

        {route.length > 0 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: "#0a0a0a",
              weight: 4,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}
      </MapContainer>

      <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-2 rounded-full border border-white bg-black px-4 py-2 shadow-lg">
        <Navigation2 size={14} className="text-white" />

        <span className="text-xs font-bold text-white">
          {km ? `${km.toFixed(1)} km` : "-- km"}
        </span>

        <span className="h-3 w-px bg-white" />

        <span className="text-xs text-white">
          {km ? `~${Math.max(3, Math.round((km / 25) * 60))} min` : "-- min"}
        </span>
      </div>
    </div>
  );
}
