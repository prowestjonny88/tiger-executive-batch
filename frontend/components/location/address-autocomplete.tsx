"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { loadGoogleMapsPlaces, type GooglePlaceSelection } from "../../lib/google-maps";

type AddressAutocompleteProps = {
  label: string;
  value: string;
  placeholder?: string;
  onAddressChange: (value: string) => void;
  onPlaceSelect: (place: GooglePlaceSelection) => void;
};

export function AddressAutocomplete({
  label,
  value,
  placeholder = "Start typing your home address in Malaysia.",
  onAddressChange,
  onPlaceSelect,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "manual">("loading");

  useEffect(() => {
    let listener: { remove: () => void } | null = null;
    let cancelled = false;

    loadGoogleMapsPlaces()
      .then((google) => {
        if (cancelled || !inputRef.current) return;
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "my" },
          fields: ["formatted_address", "geometry.location", "place_id"],
          types: ["address"],
        });

        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;
          if (!place.formatted_address || !place.place_id || !location) return;
          onPlaceSelect({
            formatted_address: place.formatted_address,
            place_id: place.place_id,
            location_lat: location.lat(),
            location_lng: location.lng(),
          });
        });

        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("manual");
      });

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [onPlaceSelect]);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</Label>
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => onAddressChange(event.target.value)}
        className="rounded-xl"
        placeholder={placeholder}
        autoComplete="street-address"
      />
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-500">
          Please confirm the suggested address before continuing.
        </p>
        {status === "manual" && (
          <p className="text-xs font-semibold text-amber-700">
            Address suggestions are unavailable. Type the full home address manually.
          </p>
        )}
      </div>
    </div>
  );
}
