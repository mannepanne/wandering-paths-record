import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonalAppreciation, APPRECIATION_LEVELS } from "@/types/place";

interface AppreciationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (appreciation: PersonalAppreciation) => void;
  onSkip: () => void;
  restaurantName: string;
  title?: string;
}

export const AppreciationPicker = ({
  isOpen,
  onClose,
  onSelect,
  onSkip,
  restaurantName,
  title = "How did you like this restaurant?"
}: AppreciationPickerProps) => {
  const [selectedAppreciation, setSelectedAppreciation] = useState<PersonalAppreciation | null>(null);

  const handleSelect = (appreciation: PersonalAppreciation) => {
    setSelectedAppreciation(appreciation);
    // Add a small delay to show selection, then close
    setTimeout(() => {
      onSelect(appreciation);
      setSelectedAppreciation(null);
    }, 200);
  };

  const handleSkip = () => {
    onSkip();
    setSelectedAppreciation(null);
  };

  const handleClose = () => {
    onClose();
    setSelectedAppreciation(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-geo">
            {title}
          </DialogTitle>
          <CardDescription className="text-sm">
            <strong>{restaurantName}</strong>
          </CardDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {(Object.values(APPRECIATION_LEVELS).filter(level => level.value !== 'unknown')).map((level) => (
            <Button
              key={level.value}
              variant={selectedAppreciation === level.value ? "default" : "outline"}
              size="lg"
              onClick={() => handleSelect(level.value)}
              className={`
                w-full justify-start p-4 h-auto text-left transition-all duration-200
                ${selectedAppreciation === level.value ? 'ring-2 ring-offset-2' : ''}
                hover:scale-[1.02] active:scale-[0.98]
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5 flex-shrink-0">
                  {level.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {level.label}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {level.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>

        <div className="flex justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-xs"
          >
            Skip for now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-xs"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};