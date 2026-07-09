// ABOUT: Lightweight single-restaurant focus map for the Where Next? page.
// ABOUT: Shows markers + name callouts for one restaurant's locations; preview only, no navigation.

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Restaurant } from "@/types/place";
import { Card, CardContent } from "@/components/ui/card";
import { restaurantMarkers } from "@/lib/whereNext";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// London Bridge — the same neutral fallback centre the main map uses.
const LONDON_BRIDGE_COORDS: [number, number] = [-0.0877, 51.5074];

interface WhereNextMapProps {
  /** The restaurant to show. Null (or one without coordinates) renders an empty-state overlay. */
  restaurant: Restaurant | null;
  height?: string;
}

export const WhereNextMap = ({ restaurant, height = "h-full min-h-[20rem]" }: WhereNextMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  const markers = restaurant ? restaurantMarkers(restaurant) : [];
  const hasMarkers = markers.length > 0;

  // Initialise the map once.
  useEffect(() => {
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "your_mapbox_access_token_here") {
      setMapError("Mapbox access token not configured.");
      setIsMapLoading(false);
      return;
    }
    if (map.current || !mapContainer.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: LONDON_BRIDGE_COORDS,
        zoom: 11,
        attributionControl: false,
      });
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      map.current.on("load", () => setIsMapLoading(false));
      map.current.on("error", () => {
        setMapError("Failed to load map. Please check your connection and Mapbox token.");
        setIsMapLoading(false);
      });
    } catch {
      setMapError("Failed to initialise map.");
      setIsMapLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Redraw markers + callouts whenever the focused restaurant changes.
  useEffect(() => {
    if (!map.current || isMapLoading) return;

    markersRef.current.forEach((m) => m.remove());
    popupsRef.current.forEach((p) => p.remove());
    markersRef.current = [];
    popupsRef.current = [];

    if (!hasMarkers) return;

    markers.forEach(({ latitude, longitude, label }) => {
      const marker = new mapboxgl.Marker({ color: "#dc2626" })
        .setLngLat([longitude, latitude])
        .addTo(map.current!);
      // Always-open, preview-only callout: name label, no navigation, dismissable.
      const popup = new mapboxgl.Popup({ offset: 28, closeOnClick: false })
        .setLngLat([longitude, latitude])
        .setHTML(`<div class="p-1 text-sm font-semibold">${label}</div>`)
        .addTo(map.current!);
      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

    if (markers.length === 1) {
      map.current.easeTo({ center: [markers[0].longitude, markers[0].latitude], zoom: 14, duration: 800 });
    } else {
      const bounds = markers.reduce(
        (b, m) => b.extend([m.longitude, m.latitude] as [number, number]),
        new mapboxgl.LngLatBounds(
          [markers[0].longitude, markers[0].latitude],
          [markers[0].longitude, markers[0].latitude],
        ),
      );
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
    }
  }, [restaurant, isMapLoading, hasMarkers]); // eslint-disable-line react-hooks/exhaustive-deps

  if (mapError) {
    return (
      <Card className="border-2 border-border h-full">
        <CardContent className="p-8 flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground text-center">{mapError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border h-full">
      <CardContent className="p-0 h-full">
        <div className="relative h-full">
          <div ref={mapContainer} className={`${height} w-full rounded-sm`} />
          {isMapLoading && (
            <div className="absolute inset-0 bg-gradient-earth rounded-sm flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-olive-green"></div>
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}
          {!isMapLoading && !hasMarkers && (
            <div className="absolute inset-0 bg-background/80 rounded-sm flex items-center justify-center p-6">
              <p className="text-sm text-muted-foreground text-center font-geo">
                {restaurant
                  ? `No location on file for ${restaurant.name} yet.`
                  : "Pick a place to see it on the map."}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
