type GoogleMapsLatLng = {
  lat: () => number;
  lng: () => number;
};

type GoogleMapsPlaceResult = {
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location?: GoogleMapsLatLng;
  };
};

type GoogleMapsAutocompleteListener = {
  remove: () => void;
};

type GoogleMapsAutocomplete = {
  addListener: (eventName: "place_changed", handler: () => void) => GoogleMapsAutocompleteListener;
  getPlace: () => GoogleMapsPlaceResult;
};

type GoogleMapsAutocompleteConstructor = new (
  input: HTMLInputElement,
  options: {
    componentRestrictions: { country: "my" };
    fields: Array<"formatted_address" | "geometry.location" | "place_id">;
    types?: string[];
  }
) => GoogleMapsAutocomplete;

type GoogleMapsBrowserApi = {
  maps: {
    places: {
      Autocomplete: GoogleMapsAutocompleteConstructor;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleMapsBrowserApi;
    __chargerdocGoogleMapsPlacesPromise?: Promise<GoogleMapsBrowserApi>;
  }
}

export type GooglePlaceSelection = {
  formatted_address: string;
  place_id: string;
  location_lat: number;
  location_lng: number;
};

export function loadGoogleMapsPlaces() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps is only available in the browser."));
  }

  if (window.google?.maps?.places?.Autocomplete) {
    return Promise.resolve(window.google);
  }

  if (window.__chargerdocGoogleMapsPlacesPromise) {
    return window.__chargerdocGoogleMapsPlacesPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Google Maps browser key is not configured."));
  }

  window.__chargerdocGoogleMapsPlacesPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-chargerdoc-google-maps="places"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.google?.maps?.places?.Autocomplete) resolve(window.google);
        else reject(new Error("Google Places Autocomplete did not initialize."));
      });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps script failed to load.")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.chargerdocGoogleMaps = "places";
    script.onload = () => {
      if (window.google?.maps?.places?.Autocomplete) resolve(window.google);
      else reject(new Error("Google Places Autocomplete did not initialize."));
    };
    script.onerror = () => reject(new Error("Google Maps script failed to load."));
    document.head.appendChild(script);
  });

  return window.__chargerdocGoogleMapsPlacesPromise;
}
