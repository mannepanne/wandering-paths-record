import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Restaurant } from '@/types/place';
import { Card, CardContent } from '@/components/ui/card';

// Configure Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface InteractiveMapProps {
  restaurants: Restaurant[];
  userLocation?: { lat: number; lng: number } | null;
  isNearMeActive?: boolean;
}

// London Bridge coordinates as fallback
const LONDON_BRIDGE_COORDS: [number, number] = [-0.0877, 51.5074];

export const InteractiveMap = ({ 
  restaurants, 
  userLocation,
  isNearMeActive = false 
}: InteractiveMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_access_token_here') {
      setMapError('Mapbox access token not configured. Please add VITE_MAPBOX_ACCESS_TOKEN to your .env file.');
      setIsMapLoading(false);
      return;
    }

    if (map.current || !mapContainer.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      // Determine initial center
      const initialCenter: [number, number] = userLocation 
        ? [userLocation.lng, userLocation.lat]
        : LONDON_BRIDGE_COORDS;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11', // Clean light style matching our design
        center: initialCenter,
        zoom: userLocation ? 14 : 10, // Closer zoom if user location available
        attributionControl: false
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add attribution in bottom right
      map.current.addControl(new mapboxgl.AttributionControl({
        compact: true
      }), 'bottom-right');

      map.current.on('load', () => {
        setIsMapLoading(false);
        console.log('🗺️ Mapbox map loaded successfully');
      });

      map.current.on('error', (e) => {
        console.error('❌ Mapbox error:', e);
        setMapError('Failed to load map. Please check your internet connection.');
        setIsMapLoading(false);
      });

    } catch (error) {
      console.error('❌ Failed to initialize Mapbox:', error);
      setMapError('Failed to initialize map. Please check your Mapbox configuration.');
      setIsMapLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map center when user location changes
  useEffect(() => {
    if (!map.current || !userLocation) return;

    console.log('🎯 Centering map on user location:', userLocation);
    map.current.easeTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 14,
      duration: 1000
    });
  }, [userLocation]);

  // Update markers and clustering when restaurants change
  useEffect(() => {
    if (!map.current || isMapLoading) return;

    console.log(`📍 Setting up ${restaurants.length} restaurants on map`);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Remove existing clustering sources and layers
    if (map.current.getSource('restaurants')) {
      map.current.removeLayer('restaurant-clusters');
      map.current.removeLayer('cluster-count');
      map.current.removeLayer('restaurant-points');
      map.current.removeSource('restaurants');
    }

    // Prepare GeoJSON data for clustering
    const validRestaurants = restaurants.filter(r => r.latitude && r.longitude);
    
    if (validRestaurants.length === 0) {
      console.log('📍 No restaurants with coordinates found');
      return;
    }

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: validRestaurants.map(restaurant => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [restaurant.longitude!, restaurant.latitude!]
        },
        properties: {
          id: restaurant.id,
          name: restaurant.name,
          cuisine: restaurant.cuisine,
          status: restaurant.status,
          address: restaurant.address,
          price_range: restaurant.price_range,
          public_rating: restaurant.public_rating,
          website: restaurant.website,
          markerColor: getMarkerColor(restaurant)
        }
      }))
    };

    // Add source for clustering
    map.current.addSource('restaurants', {
      type: 'geojson',
      data: geojsonData,
      cluster: true,
      clusterMaxZoom: 14, // Max zoom to cluster points on
      clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
    });

    // Add cluster circles
    map.current.addLayer({
      id: 'restaurant-clusters',
      type: 'circle',
      source: 'restaurants',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#f59e0b', // Yellow for small clusters (1-5)
          5,
          '#ea580c', // Orange for medium clusters (5-10)
          10,
          '#dc2626'  // Red for large clusters (10+)
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20, // 20px radius for small clusters
          5,
          25, // 25px for medium
          10,
          30  // 30px for large
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff'
      }
    });

    // Add cluster count labels
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'restaurants',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    // Add individual restaurant points (unclustered)
    map.current.addLayer({
      id: 'restaurant-points',
      type: 'circle',
      source: 'restaurants',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'markerColor'],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff'
      }
    });

    // Click handlers for clusters and individual points
    map.current.on('click', 'restaurant-clusters', (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: ['restaurant-clusters']
      });

      const clusterId = features[0].properties!.cluster_id;
      
      (map.current!.getSource('restaurants') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
        clusterId,
        (err, zoom) => {
          if (err) return;

          map.current!.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom
          });
        }
      );
    });

    // Click handler for individual restaurants
    map.current.on('click', 'restaurant-points', (e) => {
      const features = e.features;
      if (!features || features.length === 0) return;

      const feature = features[0];
      const properties = feature.properties!;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      // Create popup content
      const popupContent = `
        <div class="p-3 min-w-64">
          <h3 class="font-semibold text-lg mb-2">${properties.name}</h3>
          <div class="space-y-1 text-sm">
            <p><strong>Cuisine:</strong> ${properties.cuisine || 'Not specified'}</p>
            <p><strong>Status:</strong> <span class="inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(properties.status)}">${properties.status === 'must-visit' ? 'Must Visit' : 'Visited'}</span></p>
            <p><strong>Address:</strong> ${properties.address}</p>
            ${properties.price_range ? `<p><strong>Price:</strong> ${properties.price_range}</p>` : ''}
            ${properties.public_rating ? `<p><strong>Rating:</strong> ${properties.public_rating}/5</p>` : ''}
          </div>
          ${properties.website ? `<a href="${properties.website}" target="_blank" rel="noopener noreferrer" class="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm">Visit Website →</a>` : ''}
        </div>
      `;

      // Create and show popup
      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map.current!);
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'restaurant-clusters', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });
    
    map.current.on('mouseleave', 'restaurant-clusters', () => {
      map.current!.getCanvas().style.cursor = '';
    });

    map.current.on('mouseenter', 'restaurant-points', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });
    
    map.current.on('mouseleave', 'restaurant-points', () => {
      map.current!.getCanvas().style.cursor = '';
    });

    // Adjust map bounds to show all markers if there are any and not in Near Me mode
    if (validRestaurants.length > 0 && !isNearMeActive) {
      const coordinates = validRestaurants.map(r => [r.longitude!, r.latitude!] as [number, number]);
      
      if (coordinates.length > 0) {
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
        
        map.current!.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15
        });
      }
    }

  }, [restaurants, isMapLoading, isNearMeActive]);

  // Helper function to get marker color based on restaurant status
  const getMarkerColor = (restaurant: Restaurant): string => {
    switch (restaurant.status) {
      case 'visited':
        return '#6366f1'; // Indigo for visited
      case 'must-visit':
        return '#f59e0b'; // Amber for must-visit
      default:
        return '#6b7280'; // Gray for unknown
    }
  };

  // Helper function to get status badge classes
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'visited':
        return 'bg-blue-100 text-blue-800';
      case 'must-visit':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (mapError) {
    return (
      <Card className="border-2 border-border">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="text-red-600 font-semibold">Map Error</div>
            <p className="text-sm text-muted-foreground">{mapError}</p>
            <p className="text-xs text-muted-foreground">
              To enable maps, sign up for a free Mapbox account at mapbox.com and add your access token to the .env file.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border">
      <CardContent className="p-0">
        <div className="relative">
          <div
            ref={mapContainer}
            className="h-96 w-full rounded-sm"
            style={{ minHeight: '384px' }}
          />
          {isMapLoading && (
            <div className="absolute inset-0 bg-gradient-earth rounded-sm flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-olive-green"></div>
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};