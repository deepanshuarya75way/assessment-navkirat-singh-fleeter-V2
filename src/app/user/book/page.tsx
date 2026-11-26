"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bike,
  CarFront,
  LocateFixed,
  PhoneCall,
  Send,
  Truck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import axios from "axios";

export type VehicleKey = "Bike" | "Auto" | "Car" | "Loading" | "Truck";

type VehicleCard = {
  key: VehicleKey;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
};

type LocationSuggestion = {
  title: string;
  subtitle: string;
  country: string;
  lat?: number;
  lng?: number;
};
type RideStop  = {
  address : string,
  lat? : number,
  lon? : number
}

const GEO_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_KEY;
const geocodeStop = async (address: string): Promise<RideStop> => {
  const { data } = await axios.get(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`
  );
  
  // Change data?.feature?.[0] to data?.features?.[0]
  const feature = data?.features?.[0];
  
  if (!feature) throw new Error("Could not find location");

  const [lon, lat] = feature.geometry.coordinates;
  const props = feature.properties ?? {};

  return {
    address:
      [props.name, props.street, props.city, props.state]
        .filter(Boolean)
        .join(", ") || address,
    lat,
    lon,
  };
};

// ✅ GEOAPIFY AUTOCOMPLETE
const getCurrentAddress = async (q: string) => {
  try {
    const { data } = await axios.get(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`
    );

    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// ✅ GEOAPIFY REVERSE GEOCODING
const getReverseAddress = async (lat: number, lon: number) => {
  try {
    const { data } = await axios.get(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY}`,
    );
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const vehicles: VehicleCard[] = [
  { key: "Bike", label: "Bike", subtitle: "Quick & affordable", icon: <Bike className="h-5 w-5" /> },
  { key: "Auto", label: "Auto", subtitle: "Everyday rides", icon: <CarFront className="h-5 w-5" /> },
  { key: "Car", label: "Car", subtitle: "Comfort rides", icon: <CarFront className="h-5 w-5" /> },
  { key: "Loading", label: "Loading", subtitle: "Small cargo", icon: <Truck className="h-5 w-5" /> },
  { key: "Truck", label: "Truck", subtitle: "Heavy transport", icon: <Truck className="h-5 w-5" /> },
];

function StepBadge({ step }: { step: number }) {
  return (
    <div className="grid h-7 w-7 place-items-center rounded-full bg-green-600 text-[12px] font-bold text-white shadow-sm">
      {step}
    </div>
  );
}

function SectionCard({
  title,
  step,
  children,
}: {
  title: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="border-b border-zinc-100 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <StepBadge step={step} />
          <h2 className="text-[13px] font-bold tracking-[0.2em] text-zinc-500">
            {title}
          </h2>
        </div>
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </div>
  );
}

function VehicleTile({
  active,
  vehicle,
  onClick,
}: {
  active: boolean;
  vehicle: VehicleCard;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-[78px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
        active
          ? "border-zinc-900 bg-green-600 text-white shadow-[0_14px_30px_rgba(0,0,0,0.18)]"
          : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50"
      )}
    >
      <div
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl p-3 transition-all",
          active ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-700"
        )}
      >
        {vehicle.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold leading-tight">
          {vehicle.label}
        </div>
        <div
          className={cn(
            "mt-0.5 truncate text-[12px] leading-tight",
            active ? "text-white/70" : "text-zinc-400"
          )}
        >
          {vehicle.subtitle}
        </div>
      </div>
    </button>
  );
}

function GreenInput({
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  type?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-zinc-200 bg-white px-4 py-4 shadow-sm transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-auto border-0 bg-transparent p-0 text-[15px] font-medium text-zinc-900 shadow-none outline-none placeholder:text-zinc-400 focus-visible:ring-0"
      />
    </div>
  );
}

function RouteField({
  label,
  value,
  onChange,
  action,
  placeholder,
  onClick,
}: {
  label: "Pickup" | "Drop";
  value: string;
  onChange: (value: string) => void;
  action: React.ReactNode;
  placeholder: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-[22px] border border-zinc-200 bg-white px-4 py-4 shadow-sm transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700">
          {label === "Pickup" ? "P" : "D"}
        </span>
        <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          {label}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 flex-1 border-0 bg-emerald-50/50 px-4 text-[14px] font-medium text-zinc-900 shadow-none outline-none placeholder:text-zinc-400"
        />

        <button
          type="button"
          onClick={onClick}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        >
          {action}
        </button>
      </div>
    </div>
  );
}

function SuggestionList({
  suggestions,
  onSelect,
}: {
  suggestions: LocationSuggestion[];
  onSelect: (location: LocationSuggestion) => void;
}) {
  if (!suggestions.length) return null;

  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      {suggestions.map((location, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(location)}
          className="flex w-full flex-col gap-1 border-b border-zinc-100 px-4 py-3 text-left hover:bg-emerald-50"
        >
          <div className="text-[14px] font-semibold text-zinc-900">
            {location.title}
          </div>
          <div className="text-[12px] text-zinc-500">
            {location.subtitle}
          </div>
        </button>
      ))}
    </div>
  );
}

export default function BookRidePage() {
  const router = useRouter();

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleKey>("Bike");

  const [mobile, setMobile] = useState("1213456789");

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");

  const [pickUpSuggestions, setPickUpSuggestions] = useState<LocationSuggestion[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<LocationSuggestion[]>([]);

  const [pickUpLatitude, setPickUpLatitude] = useState<number>();
  const [pickUpLongitude, setPickUpLongitude] = useState<number>();

  const [dropLatitude, setDropLatitude] = useState<number>();
  const [dropLongitude, setDropLongitude] = useState<number>();
  const [stops, setStops] = useState<RideStop[]>([])
  const [resolvingStops, setResolvingStops] = useState(false)

  const updateStop = (index : number, address : string) => {
    setStops(curr => curr.map((stop,i) => i === index ? {address} : stop))
  }

  const resolveStop = async (index : number) => {
    const address = stops[index]?.address?.trim()
    if (!address) return
    try{
      const resolved = await geocodeStop(address)
      setStops(curr => curr.map((stop,i) => i === index ? resolved : stop))
    } catch (error){
      console.error(error);
      
    }
  }
  const formatLocation = (feature: any): LocationSuggestion => {
    const p = feature?.properties ?? {};
    return {
      title: p.address_line1 || p.name || "Unknown",
      subtitle: [p.address_line2, p.city, p.country].filter(Boolean).join(", "),
      country: p.country,
      lat: p.lat,
      lng: p.lon,
    };
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;

      const data = await getReverseAddress(latitude, longitude);
      const place = data?.features?.[0]?.properties;

      const address = [
        place?.address_line1,
        place?.city,
        place?.country,
      ]
        .filter(Boolean)
        .join(", ");

      setPickup(address);
      setPickUpLatitude(latitude);
      setPickUpLongitude(longitude);
      setPickUpSuggestions([]);
    });
  };

  useEffect(() => {
    if (!pickup) return setPickUpSuggestions([]);

    const t = setTimeout(async () => {
      const data = await getCurrentAddress(pickup);

      const list =
        data?.features?.map(formatLocation) || [];

      setPickUpSuggestions(list);
    }, 400);

    return () => clearTimeout(t);
  }, [pickup]);

  useEffect(() => {
    if (!drop) return setDropSuggestions([]);

    const t = setTimeout(async () => {
      const data = await getCurrentAddress(drop);

      const list =
        data?.features?.map(formatLocation) || [];

      setDropSuggestions(list);
    }, 400);

    return () => clearTimeout(t);
  }, [drop]);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
  <div className="mx-auto max-w-[560px] px-4 py-6 space-y-4">
    {/* Vehicle */}
    <SectionCard title="CHOOSE VEHICLE" step={1}>
      <div className="grid grid-cols-2 gap-3">
        {vehicles.map((v) => (
          <VehicleTile
            key={v.key}
            vehicle={v}
            active={selectedVehicle === v.key}
            onClick={() => setSelectedVehicle(v.key)}
          />
        ))}
      </div>
    </SectionCard>

    {/* Mobile */}
    <SectionCard title="MOBILE" step={2}>
      <GreenInput
        value={mobile}
        onChange={setMobile}
        placeholder="Enter mobile"
        icon={<PhoneCall className="h-4 w-4" />}
      />
    </SectionCard>

    {/* Route */}
    <SectionCard title="ROUTE" step={3}>
      <div className="space-y-3">
        <RouteField
          label="Pickup"
          value={pickup}
          onChange={setPickup}
          placeholder="Pickup location"
          action={<LocateFixed className="h-4 w-4" />}
          onClick={getCurrentLocation}
        />
        <SuggestionList
          suggestions={pickUpSuggestions}
          onSelect={(loc) => {
            setPickup(loc.subtitle);
            setPickUpLatitude(loc.lat);
            setPickUpLongitude(loc.lng);
            setPickUpSuggestions([]);
          }}
        />

        <RouteField
          label="Drop"
          value={drop}
          onChange={setDrop}
          placeholder="Drop location"
          action={<Send className="h-4 w-4 -rotate-45" />}
          onClick={() => {}}
        />
        <SuggestionList
          suggestions={dropSuggestions}
          onSelect={(loc) => {
            setDrop(loc.subtitle);
            setDropLatitude(loc.lat);
            setDropLongitude(loc.lng);
            setDropSuggestions([]);
          }}
        />
      </div>

      {/* Intermediate Stops */}
      <div className="mt-4 rounded-2xl border border-dashed border-emerald-400 bg-emerald-50/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-zinc-900">Intermediate Stops</p>
            <p className="text-xs text-zinc-500">Add up to 3 stops</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700">
            {stops.length}/3
          </span>
        </div>

        <div className="space-y-2">
          {stops.map((stop, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 shadow-sm"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                {index + 1}
              </span>
              <input
                type="text"
                value={stop.address}
                placeholder={`Enter stop ${index + 1} address`}
                onChange={(e) => updateStop(index, e.target.value)}
                onBlur={() => resolveStop(index)}
                className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setStops((curr) => curr.filter((_, i) => i !== index))
                }
                className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50"
                title="Remove stop"
              >
                x
              </button>
            </div>
          ))}

          {stops.length < 3 && (
            <button
              type="button"
              onClick={() => setStops((curr) => [...curr, { address: "" }])}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              <span className="text-base leading-none">+</span> Add a stop
            </button>
          )}
        </div>
      </div>
    </SectionCard>

    {/* Continue */}
    <button
      type="button"
      onClick={async () => {
        // if (!pickup || !drop || pickUpLatitude == null || dropLatitude == null || dropLongitude == null){
        //   console.log(pickup, drop, pickUpLatitude, pickUpLongitude, dropLatitude, dropLongitude);
          
        //   alert("invalid")
        //   return
        // }
        if (stops.some(stop => !stop.address.trim())){
          alert("invalid stop")
          return
        }
        setResolvingStops(true)
        try{
          const resolvedStops = await Promise.all(stops.map(async stop => stop.lat != null && stop.lon != null ? stop : await geocodeStop(stop.address)))
          const query = new URLSearchParams({
          pickup,
          drop,
          vehicle: selectedVehicle ?? "",
          mobile,
          pickuplat: pickUpLatitude != null ? String(pickUpLatitude) : "",
          pickuplon: pickUpLongitude != null ? String(pickUpLongitude) : "",
          droplat: dropLatitude != null ? String(dropLatitude) : "",
          droplon: dropLongitude != null ? String(dropLongitude) : "",
          stops: JSON.stringify(resolvedStops),
        });
         router.push(`/user/search?${query.toString()}`);
        } catch (error){
          console.error(error);
        }
      }}
      disabled={resolvingStops}
      className="h-14 w-full rounded-2xl bg-green-600 font-bold text-white shadow-lg transition hover:bg-green-700"
    >
      {resolvingStops ? "Locating Stops..." : "Continue"}
    </button>
  </div>
</div>

  );
}