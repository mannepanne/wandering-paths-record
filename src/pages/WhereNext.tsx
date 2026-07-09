// ABOUT: The "Where next?" inspiration page — surfaces to-visit places to go next.
// ABOUT: Presents rails (freshly added, aging, acclaimed, surprise) computed client-side.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { restaurantService } from "@/services/restaurants";
import { WhereNextRail } from "@/components/WhereNextRail";
import {
  freshlyAdded,
  agingList,
  acclaimedUnvisited,
  surpriseCandidates,
  nextSurprise,
} from "@/lib/whereNext";

const WhereNext = () => {
  const {
    data: places = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["restaurants", "where-next"],
    queryFn: () => restaurantService.getAllRestaurantsWithLocations(),
  });

  // Surprise me: a bumpable random index + the id currently shown, so reroll changes the pick.
  const [surpriseSeed, setSurpriseSeed] = useState(() => Math.floor(Math.random() * 100000));
  const [surpriseId, setSurpriseId] = useState<string | null>(null);

  const fresh = useMemo(() => freshlyAdded(places), [places]);
  const aging = useMemo(() => agingList(places), [places]);
  const acclaimed = useMemo(() => acclaimedUnvisited(places), [places]);
  const candidates = useMemo(() => surpriseCandidates(places), [places]);
  const surprise = useMemo(
    () => nextSurprise(candidates, surpriseId, surpriseSeed),
    [candidates, surpriseId, surpriseSeed],
  );

  const reroll = () => {
    setSurpriseId(surprise?.id ?? null);
    setSurpriseSeed(Math.floor(Math.random() * 100000));
  };

  const header = (
    <nav className="border-b-2 border-border bg-card p-4">
      <div className="container mx-auto flex justify-between items-center gap-4 max-w-6xl">
        <h1 className="text-xl font-geo font-bold text-foreground">Where next?</h1>
        <Button asChild variant="brutalist" size="sm" className="gap-2">
          <Link to="/">
            <ArrowLeft className="w-4 h-4" />
            Back to list
          </Link>
        </Button>
      </div>
    </nav>
  );

  const body = () => {
    if (isLoading) {
      return (
        <Card className="border-2 border-border">
          <CardContent className="py-12 text-center">
            <div className="text-lg font-geo font-medium text-foreground">Finding ideas...</div>
          </CardContent>
        </Card>
      );
    }
    if (error) {
      return (
        <Card className="border-2 border-border border-red-200">
          <CardContent className="py-12 text-center">
            <div className="text-lg font-geo font-medium text-red-600 mb-2">
              Couldn't load your places
            </div>
            <p className="text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      );
    }
    if (candidates.length === 0) {
      return (
        <Card className="border-2 border-border">
          <CardContent className="py-12 text-center">
            <div className="text-lg font-geo font-medium text-foreground mb-2">
              You've been everywhere!
            </div>
            <p className="text-muted-foreground">
              No unvisited places left — add some new spots to get fresh ideas.
            </p>
          </CardContent>
        </Card>
      );
    }

    // The three columns; each hides itself when empty, so filter before laying out.
    const columns = [
      { key: "fresh", title: "Freshly added", subtitle: "The latest spots on your list", places: fresh },
      { key: "acclaimed", title: "Acclaimed & unvisited", subtitle: "Highly rated, still to visit", places: acclaimed },
      { key: "aging", title: "Been waiting a while", subtitle: "Longest on your list — go before you forget", places: aging },
    ].filter((c) => c.places.length > 0);

    // Static class per column count so Tailwind's JIT keeps them.
    const gridColsClass =
      { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3" }[columns.length] ?? "md:grid-cols-3";

    return (
      <div className="space-y-12">
        {/* Surprise me — its own hero row */}
        <div className="max-w-sm">
          <WhereNextRail
            title="Surprise me"
            subtitle="One pick at random — reroll for another"
            places={surprise ? [surprise] : []}
            action={
              <Button variant="brutalist" size="sm" className="gap-2" onClick={reroll}>
                <Shuffle className="w-4 h-4" />
                Reroll
              </Button>
            }
          />
        </div>

        {/* Three columns side by side */}
        <div className={`grid grid-cols-1 ${gridColsClass} gap-6 items-start`}>
          {columns.map((c) => (
            <WhereNextRail key={c.key} title={c.title} subtitle={c.subtitle} places={c.places} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {header}
      <div className="container mx-auto px-4 py-8 max-w-6xl">{body()}</div>
    </div>
  );
};

export default WhereNext;
