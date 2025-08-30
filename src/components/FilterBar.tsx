import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";

interface FilterBarProps {
  selectedType: string;
  selectedStatus: string;
  onTypeChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  placeCount: number;
}

const placeTypes = [
  { value: "all", label: "All Places" },
  { value: "restaurant", label: "Restaurants" },
  { value: "gallery", label: "Galleries" },
  { value: "library", label: "Libraries" },
  { value: "bookshop", label: "Bookshops" },
  { value: "exhibition", label: "Exhibitions" },
  { value: "monument", label: "Monuments" },
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "must-visit", label: "Must Visit" },
  { value: "visited", label: "Visited" },
];

export const FilterBar = ({ 
  selectedType, 
  selectedStatus, 
  onTypeChange, 
  onStatusChange, 
  placeCount 
}: FilterBarProps) => {
  return (
    <div className="bg-card border-2 border-border p-4 rounded-sm card-shadow">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="font-geo font-medium text-foreground">Filters</span>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Type:</span>
            <Select value={selectedType} onValueChange={onTypeChange}>
              <SelectTrigger className="w-40 border-charcoal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {placeTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Status:</span>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="w-32 border-charcoal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Badge variant="secondary" className="font-mono">
            {placeCount} places
          </Badge>
        </div>
      </div>
    </div>
  );
};