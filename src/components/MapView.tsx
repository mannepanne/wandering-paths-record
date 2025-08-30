import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, List, Settings } from "lucide-react";

interface MapViewProps {
  isMapView: boolean;
  onViewToggle: () => void;
}

export const MapView = ({ isMapView, onViewToggle }: MapViewProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-geo font-semibold text-foreground">
          {isMapView ? "Map View" : "List View"}
        </h2>
        <Button
          variant="map"
          onClick={onViewToggle}
          className="gap-2"
        >
          {isMapView ? <List className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
          {isMapView ? "List View" : "Map View"}
        </Button>
      </div>

      {isMapView ? (
        <Card className="border-2 border-border">
          <CardContent className="p-0">
            <div className="h-96 bg-gradient-earth rounded-sm flex items-center justify-center relative overflow-hidden">
              <div className="text-center space-y-3">
                <MapPin className="w-12 h-12 text-olive-green mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-lg font-geo font-medium text-foreground">
                    Map Integration Ready
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Connect to Supabase to enable interactive map features with your saved places.
                  </p>
                </div>
                <Button variant="brutalist" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Setup Map
                </Button>
              </div>
              {/* Decorative geometric shapes */}
              <div className="absolute top-4 left-4 w-16 h-16 bg-burnt-orange/20 rotate-45"></div>
              <div className="absolute bottom-4 right-4 w-12 h-12 bg-deep-burgundy/20 rounded-full"></div>
              <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-olive-green/30 rotate-45"></div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};