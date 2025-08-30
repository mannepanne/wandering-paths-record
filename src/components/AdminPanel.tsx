import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Shield, Database } from "lucide-react";

export const AdminPanel = () => {
  const [newPlaceUrl, setNewPlaceUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddPlace = async () => {
    if (!newPlaceUrl) return;
    setIsLoading(true);
    
    // Simulate processing
    setTimeout(() => {
      setIsLoading(false);
      setNewPlaceUrl("");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-geo font-bold text-foreground">Admin Panel</h1>
        <Badge variant="secondary" className="font-mono">Protected Area</Badge>
      </div>

      {/* Add New Place */}
      <Card className="border-2 border-accent">
        <CardHeader className="bg-gradient-earth">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Plus className="w-5 h-5" />
            Add New Place
          </CardTitle>
          <CardDescription>
            Enter a website URL to automatically extract place information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="https://example-restaurant.com"
                value={newPlaceUrl}
                onChange={(e) => setNewPlaceUrl(e.target.value)}
                className="border-charcoal"
              />
            </div>
            <Button
              variant="brutalist"
              onClick={handleAddPlace}
              disabled={!newPlaceUrl || isLoading}
              className="gap-2"
            >
              <Globe className="w-4 h-4" />
              {isLoading ? "Processing..." : "Extract & Add"}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>The system will automatically extract:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Business name and address</li>
              <li>Place type (restaurant, gallery, etc.)</li>
              <li>Public rating and reviews</li>
              <li>Cuisine type and must-try dishes (for restaurants)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Backend Setup Notice */}
      <Card className="border-2 border-deep-burgundy bg-gradient-earth">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Database className="w-5 h-5" />
            Backend Integration Required
          </CardTitle>
          <CardDescription>
            Connect to Supabase to enable full functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              To unlock the complete admin experience including:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Magic link authentication</li>
              <li>Database storage for places</li>
              <li>Automated metadata extraction</li>
              <li>Real-time updates</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              You'll need to connect this project to Supabase using Lovable's native integration.
            </p>
          </div>
          <Button variant="hero" className="gap-2">
            <Shield className="w-4 h-4" />
            Setup Supabase Integration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};