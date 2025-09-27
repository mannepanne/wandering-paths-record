import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  Heart,
  Sparkles,
  ThumbsDown,
  Meh,
  ThumbsUp,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b-2 border-border bg-card p-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <Button asChild variant="ghost" className="gap-2 self-start">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
                Back to Restaurants
              </Link>
            </Button>
            <h1 className="text-xl font-geo font-bold text-foreground sm:text-center">
              About Curated on hultberg.org
            </h1>
            <div className="hidden sm:block w-32" /> {/* Spacer for desktop centering */}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Introduction */}
          <Card className="border-2 border-deep-burgundy">
            <CardHeader className="bg-gradient-to-r from-deep-burgundy/10 to-deep-burgundy/5">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Sparkles className="w-5 h-5" />
                What is Curated?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-lg text-foreground leading-relaxed">
                A curated collection of restaurants, mainly in London, so I can
                remember which places I am excited about going to next. Built
                using Claude Code. Adding new restaurants and ratings is done
                using Claude based automation.
              </p>
            </CardContent>
          </Card>

          {/* Features Overview */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-olive-green">
              <CardHeader className="bg-gradient-to-r from-olive-green/10 to-olive-green/5">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <MapPin className="w-5 h-5" />
                  Smart data management
                </CardTitle>
                <CardDescription>
                  AI-enhanced restaurant and review extraction
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-2 text-sm">
                  <li>• Import from restaurant and review sites</li>
                  <li>• Multi-location chain support</li>
                  <li>• Automatic geocoding and mapping</li>
                  <li>• Google Reviews integration</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-warm-stone">
              <CardHeader className="bg-gradient-to-r from-warm-stone/10 to-warm-stone/5">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Star className="w-5 h-5" />
                  Tracking my visits
                </CardTitle>
                <CardDescription>
                  My own rating system, in addition to public reviews
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-2 text-sm">
                  <li>• Highlighting places I have yet to visit</li>
                  <li>• 5-level appreciation system</li>
                  <li>• Visit history and notes</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Appreciation System Explanation */}
          <Card className="border-2 border-burnt-orange">
            <CardHeader className="bg-gradient-to-r from-burnt-orange/10 to-burnt-orange/5">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Heart className="w-5 h-5" />
                The Curated appreciation scale
              </CardTitle>
              <CardDescription>
                An NPS inspired scale based on if I would recommend it to a
                friend, or excited to go again
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-foreground">
                Instead of traditional star ratings, I use a 5-level
                appreciation system that focuses on my personal dining
                experience and likelihood to return:
              </p>

              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge
                    variant="secondary"
                    className="bg-gray-100 text-gray-600 border-gray-200 min-w-20 justify-center"
                  >
                    <span className="text-lg">🤷</span>
                  </Badge>
                  <div>
                    <div className="font-medium">Unknown</div>
                    <div className="text-sm text-muted-foreground">
                      Schrödinger's restaurant... could be amazing, could be
                      terrible
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge
                    variant="secondary"
                    className="bg-red-100 text-red-700 border-red-200 min-w-20 justify-center"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </Badge>
                  <div>
                    <div className="font-medium">Skip</div>
                    <div className="text-sm text-muted-foreground">
                      I went here so you didn't have to - life's too short for
                      bad dining experiences
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-700 border-yellow-200 min-w-20 justify-center"
                  >
                    <Meh className="w-4 h-4" />
                  </Badge>
                  <div>
                    <div className="font-medium">Fine</div>
                    <div className="text-sm text-muted-foreground">
                      Perfectly fine, but won't return or recommend
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-700 border-blue-200 min-w-20 justify-center"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </Badge>
                  <div>
                    <div className="font-medium">Recommend</div>
                    <div className="text-sm text-muted-foreground">
                      Would recommend to friends but won't seek out again
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 border-green-200 min-w-20 justify-center"
                  >
                    <Trophy className="w-4 h-4" />
                  </Badge>
                  <div>
                    <div className="font-medium">Must visit!</div>
                    <div className="text-sm text-muted-foreground">
                      Will definitely return, people are missing out!
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-deep-burgundy/5 border border-deep-burgundy/20 rounded-lg">
                <h4 className="font-medium mb-2 text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  How it works
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>
                    • Places start as "Schrödingers cat..." ("Unknown") until
                    visited
                  </li>
                  <li>
                    • When marking a place as "Visited", I'm prompted to set my
                    appreciation level
                  </li>
                  <li>• My appreciation can evolve over multiple visits</li>
                  <li>
                    • Toggle back to "To Visit" and appreciation resets to
                    "Unknown"
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Tech Stack */}
          <Card className="border-2 border-charcoal">
            <CardHeader className="bg-gradient-to-r from-charcoal/10 to-charcoal/5">
              <CardTitle className="text-foreground">
                Built with Claude Code...
              </CardTitle>
              <CardDescription>
                ...and modern web technologies for a great experience
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Frontend</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>React + TypeScript</li>
                    <li>Tailwind CSS</li>
                    <li>shadcn/ui</li>
                    <li>Mapbox GL JS</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Backend</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>CloudFlare Workers</li>
                    <li>Supabase PostgreSQL</li>
                    <li>Claude 3.5 Sonnet</li>
                    <li>Google Maps API</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Features</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>AI Content Extraction</li>
                    <li>Smart Geo Search</li>
                    <li>Review Enrichment</li>
                    <li>Multi-location Support</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center py-8">
            <Button asChild size="lg" className="gap-2">
              <Link to="/">
                <MapPin className="w-4 h-4" />
                Explore Restaurants
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
