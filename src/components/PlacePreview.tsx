import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  AlertCircle, 
  Edit3, 
  Globe, 
  MapPin, 
  Star,
  ChefHat,
  Save,
  X 
} from "lucide-react";
import { ExtractedRestaurantData, RestaurantExtractionResult } from "@/services/restaurantExtractor";

interface PlacePreviewProps {
  extractionResult: RestaurantExtractionResult;
  onSave: (restaurantData: ExtractedRestaurantData) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const priceRanges = [
  { value: "$", label: "$ - Budget-friendly" },
  { value: "$$", label: "$$ - Moderate" },
  { value: "$$$", label: "$$$ - Upscale" },
  { value: "$$$$", label: "$$$$ - Fine dining" },
];

const atmosphereTypes = [
  { value: "Casual", label: "Casual" },
  { value: "Fine Dining", label: "Fine Dining" },
  { value: "Romantic", label: "Romantic" },
  { value: "Family Friendly", label: "Family Friendly" },
  { value: "Trendy", label: "Trendy" },
  { value: "Traditional", label: "Traditional" },
];

export const PlacePreview = ({ extractionResult, onSave, onCancel, isSaving }: PlacePreviewProps) => {
  const [editedData, setEditedData] = useState<ExtractedRestaurantData>(
    extractionResult.data || { name: "", website: "" }
  );
  const [dishInput, setDishInput] = useState("");

  if (!extractionResult.success || !extractionResult.data) {
    return (
      <Card className="border-2 border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <CardTitle className="text-lg text-red-600">Extraction Failed</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-600">
              {extractionResult.error || "Failed to extract metadata from URL"}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Try Different URL
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAddDish = () => {
    if (dishInput.trim() && (!editedData.must_try_dishes || editedData.must_try_dishes.length < 10)) {
      setEditedData(prev => ({
        ...prev,
        must_try_dishes: [...(prev.must_try_dishes || []), dishInput.trim()]
      }));
      setDishInput("");
    }
  };

  const handleRemoveDish = (index: number) => {
    setEditedData(prev => ({
      ...prev,
      must_try_dishes: prev.must_try_dishes?.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(editedData);
  };

  return (
    <Card className="border-2 border-olive-green">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-olive-green" />
            <CardTitle className="text-lg">Review Extracted Information</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getConfidenceColor(extractionResult.confidence)} font-mono text-xs`}>
              {extractionResult.confidence} confidence
            </Badge>
          </div>
        </div>
        <CardDescription>
          {extractionResult.confidence === 'low' 
            ? "Limited information extracted. Please fill in the missing details below."
            : "Review and edit the information below before saving to your collection."
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Restaurant Name *</label>
          <Input
            value={editedData.name || ""}
            onChange={(e) => setEditedData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter restaurant name"
            className="border-charcoal"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Address *</label>
          <Input
            value={editedData.address || ""}
            onChange={(e) => setEditedData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Enter full address"
            className="border-charcoal"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Website</label>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <Input
              value={editedData.website || ""}
              onChange={(e) => setEditedData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://..."
              className="border-charcoal"
              readOnly
            />
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Public Rating</label>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={editedData.public_rating || ""}
              onChange={(e) => setEditedData(prev => ({ 
                ...prev, 
                public_rating: e.target.value ? parseFloat(e.target.value) : undefined 
              }))}
              placeholder="1.0 - 5.0"
              className="border-charcoal w-32"
            />
            <span className="text-sm text-muted-foreground">/ 5.0</span>
          </div>
        </div>

        {/* Restaurant-specific fields */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Cuisine Type</label>
            <Input
              value={editedData.cuisine || ""}
              onChange={(e) => setEditedData(prev => ({ ...prev, cuisine: e.target.value }))}
              placeholder="e.g., Italian, Asian, Nordic"
              className="border-charcoal"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Price Range</label>
            <Select 
              value={editedData.price_range || ""} 
              onValueChange={(value) => setEditedData(prev => ({ ...prev, price_range: value as '$' | '$$' | '$$$' | '$$$$' }))}
            >
              <SelectTrigger className="border-charcoal">
                <SelectValue placeholder="Select price range" />
              </SelectTrigger>
              <SelectContent>
                {priceRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Atmosphere</label>
          <Select 
            value={editedData.atmosphere || ""} 
            onValueChange={(value) => setEditedData(prev => ({ ...prev, atmosphere: value }))}
          >
            <SelectTrigger className="border-charcoal">
              <SelectValue placeholder="Select atmosphere" />
            </SelectTrigger>
            <SelectContent>
              {atmosphereTypes.map((atmosphere) => (
                <SelectItem key={atmosphere.value} value={atmosphere.value}>
                  {atmosphere.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Must-Try Dishes</label>
          <div className="flex gap-2">
            <Input
              value={dishInput}
              onChange={(e) => setDishInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDish()}
              placeholder="Add a signature dish..."
              className="border-charcoal"
            />
            <Button 
              type="button"
              variant="outline" 
              onClick={handleAddDish}
              disabled={!dishInput.trim()}
            >
              <ChefHat className="w-4 h-4" />
              Add
            </Button>
          </div>
          {editedData.must_try_dishes && editedData.must_try_dishes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {editedData.must_try_dishes.map((dish, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="font-mono text-xs flex items-center gap-1"
                >
                  {dish}
                  <button
                    onClick={() => handleRemoveDish(index)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Additional Restaurant Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Dietary Options</label>
            <Input
              value={editedData.dietary_options?.join(', ') || ""}
              onChange={(e) => setEditedData(prev => ({ 
                ...prev, 
                dietary_options: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : undefined 
              }))}
              placeholder="e.g., Vegetarian, Vegan, Gluten-free"
              className="border-charcoal"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Booking Required</label>
            <Select 
              value={editedData.booking_required === undefined ? "" : editedData.booking_required.toString()} 
              onValueChange={(value) => setEditedData(prev => ({ 
                ...prev, 
                booking_required: value === "" ? undefined : value === "true" 
              }))}
            >
              <SelectTrigger className="border-charcoal">
                <SelectValue placeholder="Booking requirement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes, booking required</SelectItem>
                <SelectItem value="false">No, walk-ins welcome</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Description</label>
          <Textarea
            value={editedData.description || ""}
            onChange={(e) => setEditedData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the restaurant..."
            className="border-charcoal resize-none"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!editedData.name || !editedData.address || isSaving}
            className="flex-1 gap-2"
            variant="brutalist"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Restaurant"}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};