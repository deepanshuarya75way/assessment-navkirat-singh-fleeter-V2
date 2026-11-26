"use client";

import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Car,
  MapPin,
  Navigation,
  Sparkles,
} from "lucide-react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import React, {
  Suspense,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import VehicleCard from "@/components/VehicleCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { MapStop } from "@/components/SearchMap";
import { itemAxisPredicate } from "recharts/types/state/selectors/axisSelectors";

const SearchMap = dynamic(
  () => import("@/components/SearchMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-[#f0fdf4]" />
    ),
  }
);

interface IVehicle {
  owner?: string;
  _id?: string;
  type: "bike" | "car" | "auto" | "truck" | "van";
  vehicleModel: string;
  number: string;
  imageUrl: string;
  baseFare: number;
  pricePerKm: number;
  waitingCharge: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();

  const vehicle = params.get("vehicle");
  const mobile = params.get("mobile") ?? "";

  const [pickUp, setPickUp] = useState(params.get("pickup") ?? "");
  const [drop, setDrop] = useState(params.get("drop") ?? "");

  const [segmentKm, setSegmentKm] = useState<number[]>([]);
  const [km, setKm] = useState<number>(0);

  const [stops, setStops] = useState<MapStop[]>(() => {
    try {
      const raw = params.get("stops");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [pickUpLat, setPickUpLat] = useState<number | null>(() => {
    const v = params.get("pickuplat");
    return v ? Number(v) : null;
  });

  const [pickUpLon, setPickUpLon] = useState<number | null>(() => {
    const v = params.get("pickuplon");
    return v ? Number(v) : null;
  });

  const [dropLat, setDropLat] = useState<number | null>(() => {
    const v = params.get("droplat");
    return v ? Number(v) : null;
  });

  const [dropLon, setDropLon] = useState<number | null>(() => {
    const v = params.get("droplon");
    return v ? Number(v) : null;
  });

  const [vehicles, setVehicles] = useState<IVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const getNearByVehicle = async (
    latitude: number,
    longitude: number,
    vehicleType: string | null
  ) => {
    try {
      setLoadingVehicles(true);

      const { data } = await axios.get("/api/vehicles/near-by", {
        params: {
          latitude,
          longitude,
          vehicleType,
        },
      });
      // console.log(data);
      
      const list =
        data?.vehicles ??
        data?.data ??
        (Array.isArray(data) ? data : []);

      setVehicles(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    if (pickUpLat == null || pickUpLon == null) {
      return;
    }

    getNearByVehicle(pickUpLat, pickUpLon, vehicle);
  }, [pickUpLat, pickUpLon, vehicle]);

  if (loadingVehicles && vehicles.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#f8fffb] to-[#f0fdf4] text-gray-900">
      {/* BACK BUTTON */}
      <div className="absolute left-5 top-5 z-50">
        <button
          onClick={() => router.back()}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#bbf7d0] bg-white shadow-md transition hover:bg-[#f0fdf4]"
        >
          <ArrowLeft size={18} className="text-[#16a34a]" />
        </button>
      </div>

      {/* MAP */}
      <div className="relative h-[50vh] w-full">
        <SearchMap
          pickup={pickUp}
          drop={drop}
          stops={stops}
          initialPickUp={
            pickUpLat != null && pickUpLon != null
              ? [pickUpLat, pickUpLon]
              : null
          }
          initialDrop={
            dropLat != null && dropLon != null ? [dropLat, dropLon] : null
          }
          onStopsChange={setStops}
          onSegments={setSegmentKm}
          onDistance={setKm}
          onChange={(
            pickupAddress,
            dropAddress,
            pickupLatitude,
            pickupLongitude,
            dropLatitude,
            dropLongitude
          ) => {
            setPickUp(pickupAddress);
            setDrop(dropAddress);

            if (pickupLatitude !== undefined) {
              setPickUpLat(pickupLatitude);
            }
            if (pickupLongitude !== undefined) {
              setPickUpLon(pickupLongitude);
            }
            if (dropLatitude !== undefined) {
              setDropLat(dropLatitude);
            }
            if (dropLongitude !== undefined) {
              setDropLon(dropLongitude);
            }
          }}
        />
      </div>

      {/* BOTTOM SHEET */}
      <div className="relative z-20 -mt-20 min-h-[52vh] rounded-t-[28px] border-t border-[#bbf7d0] bg-white pb-20 pt-5 shadow-[0_-8px_40px_rgba(34,197,94,0.08)]">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          {/* PICKUP / DROP */}
          <div className="mb-6 overflow-hidden rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4]">
            {/* PICKUP */}
            <div className="flex gap-3 border-b border-[#dcfce7] px-4 py-3">
              <div className="flex flex-col items-center pt-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                <div className="w-px flex-1 bg-[#bbf7d0]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#16a34a]">
                  Pickup
                </p>
                <p className="truncate text-sm font-semibold text-gray-900">
                  {pickUp}
                </p>
              </div>

              <MapPin size={14} className="mt-1.5 text-[#16a34a]" />
            </div>

            {/* DROP */}
            <div className="flex gap-3 px-4 py-3">
              <div className="flex flex-col items-center pt-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#16a34a]">
                  Drop
                </p>
                <p className="truncate text-sm font-semibold text-gray-900">
                  {drop}
                </p>
              </div>

              <Navigation size={14} className="mt-1.5 text-[#16a34a]" />
            </div>
          </div>

          {/* INTERMEDIATE STOPS */}
          {stops.length > 0 && (
            <div className="mb-6 rounded-2xl border border-[#bbf7d0] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">Intermediate Stops</h3>
                  <p className="text-xs text-gray-500">
                    Drag the numbered pins on the map to adjust
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#16a34a]">
                  {stops.length}/3
                </span>
              </div>

              <div className="space-y-2">
                {stops.map((stop, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[#f8fffb] px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green-600 text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      <p className="truncate text-sm font-medium text-gray-800">
                        {stop.address}
                      </p>
                    </div>

                    {segmentKm[idx] !== undefined && (
                      <span className="shrink-0 text-xs font-semibold text-[#16a34a]">
                        {segmentKm[idx]} km
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROUTE SUMMARY BAR */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#bbf7d0] bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#16a34a]" />
              <span className="text-sm font-semibold text-gray-800">
                Total Distance: <span className="text-[#16a34a]">{km} km</span>
              </span>
            </div>

            {segmentKm.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {segmentKm.map((seg, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-[#f0fdf4] px-2.5 py-0.5 font-medium text-[#16a34a]"
                  >
                    Leg {i + 1}: {seg} km
                  </span>
                ))}
              </div>
            )}
          </div>

                    {/* AVAILABLE VEHICLES */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car size={18} className="text-[#16a34a]" />
                <h2 className="text-base font-bold text-gray-900">
                  Available Vehicles
                </h2>
              </div>
              <span className="text-xs font-medium text-gray-500">
                {vehicles.length} found
              </span>
            </div>

            {loadingVehicles ? (
              <div className="py-10">
                <LoadingSpinner />
              </div>
            ) : vehicles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#bbf7d0] bg-[#f8fffb] p-8 text-center">
                <p className="text-sm font-medium text-gray-600">
                  No vehicles available near your pickup location.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {vehicles.map((v) => (
                <VehicleCard
                  key={v._id || v.number}
                  vehicle={v}
                  distance={km}
                  segmentDistances={segmentKm}
                  onBook={() => {
                    const totalFare = +(v.baseFare + v.pricePerKm * km).toFixed(2);

                    const url = new URLSearchParams({
                      pickup: pickUp,
                      drop,
                      vehicle: v.type,
                      vehicleId: v._id ?? "",
                      driverId: v.owner ?? "",
                      fare: String(totalFare),
                      mobile,
                      pickUpLat: pickUpLat != null ? String(pickUpLat) : "",
                      pickUpLon: pickUpLon != null ? String(pickUpLon) : "",
                      dropLat: dropLat != null ? String(dropLat) : "",
                      dropLon: dropLon != null ? String(dropLon) : "",
                      distance: String(km),
                      stops: JSON.stringify(stops),
                      segmentDistances: JSON.stringify(segmentKm),
                    });

                    router.push(`/user/checkout?${url.toString()}`);
                  }}
                />

                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SearchContent />
    </Suspense>
  );
}
