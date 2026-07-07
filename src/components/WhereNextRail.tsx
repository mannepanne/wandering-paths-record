// ABOUT: A single labelled "rail" on the Where Next? page — a titled vertical stack of cards.
// ABOUT: Renders read-only PlaceCards; hides itself when it has no places to show.

import { ReactNode } from "react";
import { Restaurant } from "@/types/place";
import { PlaceCard } from "@/components/PlaceCard";

interface WhereNextRailProps {
  title: string;
  subtitle: string;
  places: Restaurant[];
  /** Optional trailing control, e.g. the Surprise me reroll button. */
  action?: ReactNode;
}

export const WhereNextRail = ({ title, subtitle, places, action }: WhereNextRailProps) => {
  if (places.length === 0) return null;

  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-geo font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="space-y-4">
        {places.map((place) => (
          // No edit/status/appreciation handlers — cards are read-only here.
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>
    </section>
  );
};
