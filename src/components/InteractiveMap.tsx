import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Create simple circle PNG marker using Canvas
  const createCircleMarker = (color: string): Promise<ImageData> => {
    return new Promise((resolve) => {
      const size = 32; // Standard power of 2 size
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Draw outer circle (white border)
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.arc(size / 2, size / 2, 14, 0, Math.PI * 2);
      ctx.fill();

      // Draw inner circle (colored)
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(size / 2, size / 2, 11, 0, Math.PI * 2);
      ctx.fill();

      // Get ImageData instead of Canvas
      const imageData = ctx.getImageData(0, 0, size, size);
      resolve(imageData);
    });
  };

  // Initialize map
  useEffect(() => {
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_access_token_here') {
      setMapError('Mapbox access token not configured. Please add VITE_MAPBOX_ACCESS_TOKEN to your .env file.');
      setIsMapLoading(false);
      return;
    }

    if (map.current || !mapContainer.current) return;

    // Create global navigation function for popup buttons
    (window as any).navigateToRestaurant = (restaurantId: string) => {
      navigate(`/restaurant/${restaurantId}`);
    };

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      // Determine initial center
      const initialCenter: [number, number] = userLocation
        ? [userLocation.lng, userLocation.lat]
        : LONDON_BRIDGE_COORDS;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // More basic style with better CORS compatibility
        center: initialCenter,
        zoom: userLocation ? 14 : 11, // London-focused zoom level when no user location
        attributionControl: false,
        crossSourceCollisions: false // Reduce resource conflicts
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add attribution in bottom right
      map.current.addControl(new mapboxgl.AttributionControl({
        compact: true
      }), 'bottom-right');

      map.current.on('load', async () => {
        console.log('🎯 Loading custom marker images...');

        try {
          // Create Canvas-based circle markers
          const redImageData = await createCircleMarker('#dc2626');
          const blueImageData = await createCircleMarker('#2563eb');

          // Add images to map using proper ImageData format
          map.current!.addImage('red-droplet', redImageData, { pixelRatio: 1, sdf: false });
          map.current!.addImage('blue-droplet', blueImageData, { pixelRatio: 1, sdf: false });

          console.log('✅ Canvas circle markers loaded successfully');

        } catch (error) {
          console.error('❌ Failed to create canvas markers:', error);
        }

        setIsMapLoading(false);
        console.log('🗺️ Mapbox map loaded successfully');
      });

      map.current.on('error', (e) => {
        console.error('❌ Mapbox error:', e);

        // Handle specific CORS errors more gracefully
        if (e.error && e.error.message && e.error.message.includes('CORS')) {
          setMapError('Map loading issue detected. Please add localhost:8080 to your Mapbox token URL restrictions.');
        } else {
          setMapError('Failed to load map. Please check your internet connection and Mapbox token configuration.');
        }
        setIsMapLoading(false);
      });

    } catch (error) {
      console.error('❌ Failed to initialize Mapbox:', error);
      setMapError('Failed to initialize map. Please check your Mapbox configuration.');
      setIsMapLoading(false);
    }

    return () => {
      // Clean up global navigation function
      delete (window as any).navigateToRestaurant;
      map.current?.remove();
      map.current = null;
    };
  }, [navigate]);

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
      map.current.removeLayer('restaurant-labels');
      map.current.removeSource('restaurants');
    }

    // Prepare GeoJSON data for clustering - create markers for ALL individual restaurant locations
    const allLocationMarkers: Array<{
      restaurant: Restaurant;
      location: RestaurantAddress;
    }> = [];

    // Flatten all restaurant locations into individual markers
    restaurants.forEach(restaurant => {
      if (restaurant.locations && restaurant.locations.length > 0) {
        // Multi-location restaurant: create marker for each location
        restaurant.locations.forEach(location => {
          if (location.latitude && location.longitude) {
            allLocationMarkers.push({ restaurant, location });
          } else {
            console.log(`⚠️ Skipping location "${location.location_name}" of "${restaurant.name}" - missing coordinates (${location.latitude}, ${location.longitude})`);
          }
        });
      } else if (restaurant.latitude && restaurant.longitude) {
        // Single-location restaurant: use restaurant-level coordinates
        const syntheticLocation: RestaurantAddress = {
          id: `${restaurant.id}-primary`,
          restaurant_id: restaurant.id,
          location_name: 'Main Location',
          full_address: restaurant.address,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          created_at: restaurant.created_at,
          updated_at: restaurant.updated_at
        };
        allLocationMarkers.push({ restaurant, location: syntheticLocation });
      } else {
        console.log(`⚠️ Skipping restaurant "${restaurant.name}" - missing coordinates (${restaurant.latitude}, ${restaurant.longitude})`);
      }
    });
    
    if (allLocationMarkers.length === 0) {
      console.log('📍 No restaurant locations with coordinates found');
      return;
    }

    console.log(`📍 Displaying ${allLocationMarkers.length} individual restaurant locations on map`);

    // Debug: Check for duplicate coordinates
    const coordMap = new Map();
    allLocationMarkers.forEach(({ restaurant, location }) => {
      const coordKey = `${location.latitude},${location.longitude}`;
      if (!coordMap.has(coordKey)) {
        coordMap.set(coordKey, []);
      }
      coordMap.get(coordKey).push(`${restaurant.name} (${location.location_name})`);
    });
    
    // Log any duplicate coordinates
    coordMap.forEach((names, coord) => {
      if (names.length > 1) {
        console.log(`🔍 Multiple locations at ${coord}:`, names);
      }
    });

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: allLocationMarkers.map(({ restaurant, location }) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [location.longitude!, location.latitude!]
        },
        properties: {
          id: location.id,
          restaurant_id: restaurant.id,
          name: restaurant.name,
          location_name: location.location_name,
          cuisine: restaurant.cuisine,
          status: restaurant.status,
          address: location.full_address,
          price_range: restaurant.price_range,
          public_rating: restaurant.public_rating,
          website: restaurant.website,
          phone: location.phone,
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
        'circle-color': '#dc2626', // Red for all clusters
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
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    // Add circle markers
    map.current.addLayer({
      id: 'restaurant-points',
      type: 'circle',
      source: 'restaurants',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'markerColor'],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 1.0
      }
    });

    console.log('✅ Large circle markers added successfully');

    // Add restaurant name labels (visible at close zoom levels)
    map.current.addLayer({
      id: 'restaurant-labels',
      type: 'symbol',
      source: 'restaurants',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': {
          base: 1,
          stops: [
            [4, 0],     // Hidden at very wide zoom (continent/world view)
            [5, 9],     // Small at zoom 5 (country/region view)
            [8, 11],    // Medium at zoom 8 (city view)
            [12, 13],   // Large at zoom 12 (neighborhood view)
            [16, 15]    // Extra large at close zoom (street/building view)
          ]
        },
        'text-offset': [0, 1.8], // Position below marker
        'text-anchor': 'top',
        'text-max-width': 10,
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': '#1c1917', // Charcoal from design system
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
        'text-halo-blur': 1
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

    // Click handlers for individual restaurants (both fallback and droplet markers)
    const handleRestaurantClick = (e: any) => {
      const features = e.features;
      if (!features || features.length === 0) return;

      const feature = features[0];
      const properties = feature.properties!;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      // Create popup content with location-specific information
      const popupContent = `
        <div class="p-3 min-w-64">
          <h3 class="font-semibold text-lg mb-1">${properties.name}</h3>
          ${properties.location_name && properties.location_name !== 'Main Location' ? `<p class="text-sm font-medium text-blue-600 mb-2">${properties.location_name}</p>` : ''}
          <div class="space-y-1 text-sm">
            <p><strong>Cuisine:</strong> ${properties.cuisine || 'Not specified'}</p>
            <p><strong>Status:</strong> <span class="inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(properties.status)}">${properties.status === 'to-visit' ? 'To Visit' : 'Visited'}</span></p>
            <p><strong>Address:</strong> ${properties.address}</p>
            ${properties.phone ? `<p><strong>Phone:</strong> ${properties.phone}</p>` : ''}
            ${properties.price_range ? `<p><strong>Price:</strong> ${properties.price_range}</p>` : ''}
            ${properties.public_rating ? `<p><strong>Rating:</strong> ${properties.public_rating}/5</p>` : ''}
          </div>
          <div class="mt-2 space-y-1">
            <button onclick="window.navigateToRestaurant('${properties.restaurant_id}')" class="inline-block text-blue-600 hover:text-blue-800 text-sm cursor-pointer bg-none border-none underline">More Details →</button>
            ${properties.website ? `<br><a href="${properties.website}" target="_blank" rel="noopener noreferrer" class="inline-block text-blue-600 hover:text-blue-800 text-sm">Visit Website →</a>` : ''}
          </div>
        </div>
      `;

      // Create and show popup
      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map.current!);
    };

    // Add click handler for restaurant markers
    map.current.on('click', 'restaurant-points', handleRestaurantClick);

    // Change cursor on hover
    map.current.on('mouseenter', 'restaurant-clusters', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });
    
    map.current.on('mouseleave', 'restaurant-clusters', () => {
      map.current!.getCanvas().style.cursor = '';
    });

    // Add hover handlers for restaurant markers
    map.current.on('mouseenter', 'restaurant-points', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'restaurant-points', () => {
      map.current!.getCanvas().style.cursor = '';
    });

    // Adjust map bounds to show all markers if there are any and not in Near Me mode
    if (allLocationMarkers.length > 0 && !isNearMeActive) {
      const coordinates = allLocationMarkers.map(({ location }) => [location.longitude!, location.latitude!] as [number, number]);
      
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
        return '#2563eb'; // Bright blue for visited
      case 'to-visit':
        return '#dc2626'; // Red for to-visit
      default:
        return '#6b7280'; // Gray for unknown
    }
  };

  // Helper function to get status badge classes
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'visited':
        return 'bg-blue-100 text-blue-800';
      case 'to-visit':
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
        {/* Map Legend */}
        <div className="p-4 bg-muted/30 border-b">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#2563eb] border-2 border-white"></div>
                <span>Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#dc2626] border-2 border-white"></div>
                <span>Must Visit</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground font-mono">
              Showing: {(() => {
                // Calculate total number of locations being displayed
                let totalLocations = 0;
                restaurants.forEach(restaurant => {
                  if (restaurant.locations && restaurant.locations.length > 0) {
                    // Count locations with valid coordinates
                    restaurant.locations.forEach(location => {
                      if (location.latitude && location.longitude) {
                        totalLocations++;
                      }
                    });
                  } else if (restaurant.latitude && restaurant.longitude) {
                    // Single-location restaurant with restaurant-level coordinates
                    totalLocations++;
                  }
                });
                return totalLocations;
              })()} places
            </div>
          </div>
        </div>
        
        <div className="relative">
          <div
            ref={mapContainer}
            className="h-[70vh] md:h-96 w-full rounded-sm"
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