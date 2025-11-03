// ABOUT: Google Maps review enrichment service using MCP Google Maps server
// ABOUT: Fetches reviews, generates AI summaries, and updates restaurant records

import { Restaurant } from '@/types/place';
import { CLAUDE_MODEL_VERSION, CLAUDE_MAX_TOKENS } from '@/config/claude';

export interface ReviewEnrichmentProgress {
  step: string;
  details?: string;
  current?: number;
  total?: number;
}

export interface GooglePlaceReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
}

export interface GooglePlaceDetails {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  reviews?: GooglePlaceReview[];
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface ReviewSummary {
  summary: string;
  popularDishes: string[];
  sentiment: 'positive' | 'mixed' | 'negative';
  confidence: 'high' | 'medium' | 'low';
}

export interface EnrichmentResult {
  success: boolean;
  restaurantId: string;
  restaurantName: string;
  message?: string;
  error?: string;
  data?: {
    rating?: number;
    ratingCount?: number;
    reviewSummary?: string;
    latestReviewDate?: string;
    extractedDishes?: string[];
  };
}

export class ReviewEnrichmentService {
  private claudeApiKey: string;
  private googleMapsApiKey: string;

  constructor(claudeApiKey: string, googleMapsApiKey: string) {
    this.claudeApiKey = claudeApiKey;
    this.googleMapsApiKey = googleMapsApiKey;
  }

  async enrichRestaurant(
    restaurant: Restaurant,
    progressCallback?: (progress: ReviewEnrichmentProgress) => void
  ): Promise<EnrichmentResult> {
    try {
      progressCallback?.({
        step: `Searching Google Maps for "${restaurant.name}"...`,
        details: restaurant.address
      });

      // Step 1: Find restaurant in Google Places
      const placeDetails = await this.findRestaurantInGooglePlaces(restaurant);
      if (!placeDetails) {
        return {
          success: false,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          message: 'Restaurant not found in Google Places'
        };
      }

      progressCallback?.({
        step: `Found on Google Maps! Analyzing ${placeDetails.user_ratings_total || 0} reviews...`,
        details: `Rating: ${placeDetails.rating || 'N/A'}/5`
      });

      // Step 2: Handle rating data even if no reviews available
      console.log(`📊 Restaurant has ${placeDetails.user_ratings_total || 0} total reviews, ${placeDetails.reviews?.length || 0} detailed reviews available`);

      if (!placeDetails.reviews || placeDetails.reviews.length === 0) {
        console.log(`⚠️ No detailed reviews available for ${restaurant.name}, but saving rating data if available`);

        return {
          success: true,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          message: `Found restaurant with ${placeDetails.user_ratings_total || 0} reviews but no detailed review text available`,
          data: {
            rating: placeDetails.rating,
            ratingCount: placeDetails.user_ratings_total || 0,
            reviewSummary: `Restaurant found on Google Maps with ${placeDetails.rating ? `${placeDetails.rating}/5 rating` : 'no rating'} from ${placeDetails.user_ratings_total || 0} reviews. No detailed review text available for AI analysis.`,
            latestReviewDate: new Date().toISOString(),
            extractedDishes: []
          }
        };
      }

      progressCallback?.({
        step: 'Generating AI summary of reviews...',
        details: `Processing ${placeDetails.reviews.length} reviews`
      });

      // Step 3: Generate AI summary
      const reviewSummary = await this.generateReviewSummary(
        placeDetails.reviews,
        restaurant.name
      );

      progressCallback?.({
        step: 'Enrichment complete!',
        details: `Found ${reviewSummary.popularDishes.length} popular dishes`
      });

      // Step 4: Calculate latest review date
      const latestReviewDate = this.getLatestReviewDate(placeDetails.reviews);

      return {
        success: true,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        data: {
          rating: placeDetails.rating,
          ratingCount: placeDetails.user_ratings_total || 0,
          reviewSummary: reviewSummary.summary,
          latestReviewDate,
          extractedDishes: reviewSummary.popularDishes
        }
      };

    } catch (error) {
      console.error('Review enrichment failed:', error);
      return {
        success: false,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        error: `Enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async enrichMultipleRestaurants(
    restaurants: Restaurant[],
    progressCallback?: (progress: ReviewEnrichmentProgress) => void
  ): Promise<EnrichmentResult[]> {
    const results: EnrichmentResult[] = [];
    const total = restaurants.length;

    for (let i = 0; i < restaurants.length; i++) {
      const restaurant = restaurants[i];

      progressCallback?.({
        step: `Processing restaurant ${i + 1} of ${total}`,
        details: restaurant.name,
        current: i + 1,
        total
      });

      const result = await this.enrichRestaurant(restaurant, (individualProgress) => {
        // Preserve the main counter while showing individual progress details
        progressCallback?.({
          ...individualProgress,
          current: i + 1,
          total
        });
      });
      results.push(result);

      // Add delay between requests to respect API rate limits
      if (i < restaurants.length - 1) {
        await this.delay(5000); // 5 second delay between restaurants
      }
    }

    return results;
  }

  private async findRestaurantInGooglePlaces(restaurant: Restaurant): Promise<GooglePlaceDetails | null> {
    try {
      // Build search query - use restaurant name and primary location
      const searchQuery = this.buildSearchQuery(restaurant);

      // Use our API proxy instead of direct Google Maps API
      const searchUrl = `/api/google-maps?endpoint=textsearch&query=${encodeURIComponent(searchQuery)}`;

      console.log(`🔍 Searching Google Places for: "${searchQuery}"`);

      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) {
        throw new Error(`Google Places search failed: ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();

      if (searchData.error) {
        throw new Error(`Google Places API error: ${searchData.error}`);
      }

      if (!searchData.results || searchData.results.length === 0) {
        console.log(`❌ No Google Places results found for: ${searchQuery}`);
        return null;
      }

      // Get the first result (most relevant)
      const place = searchData.results[0];
      console.log(`✅ Found place: ${place.name} (${place.place_id})`);

      // Get detailed place information including reviews using our API proxy
      const detailsUrl = `/api/google-maps?endpoint=details&place_id=${encodeURIComponent(place.place_id)}`;

      const detailsResponse = await fetch(detailsUrl);
      if (!detailsResponse.ok) {
        throw new Error(`Google Places details failed: ${detailsResponse.statusText}`);
      }

      const detailsData = await detailsResponse.json();

      if (detailsData.error) {
        throw new Error(`Google Places API error: ${detailsData.error}`);
      }

      if (!detailsData.result) {
        return null;
      }

      console.log(`📊 Place details: Rating ${detailsData.result.rating}/5 (${detailsData.result.user_ratings_total} reviews)`);
      console.log(`📝 Reviews available: ${detailsData.result.reviews?.length || 0}`);

      return detailsData.result;

    } catch (error) {
      console.error('Google Places search failed:', error);
      return null;
    }
  }

  private buildSearchQuery(restaurant: Restaurant): string {
    // Start with restaurant name
    let query = restaurant.name;

    // Add location context for better matching
    if (restaurant.locations && restaurant.locations.length > 0) {
      // Use the first location for search context
      const firstLocation = restaurant.locations[0];
      if (firstLocation.city) {
        query += ` ${firstLocation.city}`;
      }
      // Add neighborhood for more specific matching
      if (firstLocation.location_name && firstLocation.location_name !== firstLocation.city) {
        query += ` ${firstLocation.location_name}`;
      }
    } else if (restaurant.address) {
      // Fallback to address summary
      query += ` ${restaurant.address}`;
    }

    // Add "restaurant" to help with disambiguation
    query += ' restaurant';

    return query;
  }

  private async generateReviewSummary(
    reviews: GooglePlaceReview[],
    restaurantName: string
  ): Promise<ReviewSummary> {
    // Sort reviews by time (newest first) and take up to 15
    // Note: Google Places API typically returns max 5 reviews, but we're ready for more if available
    const recentReviews = reviews
      .sort((a, b) => b.time - a.time)
      .slice(0, 15);

    // Combine review texts
    const reviewTexts = recentReviews
      .map(review => `"${review.text}" (${review.rating}/5 stars)`)
      .join('\n\n');

    const prompt = `
Analyze these Google Maps reviews for ${restaurantName} and create a balanced summary:

REVIEWS:
${reviewTexts}

Generate a JSON response with:
{
  "summary": "2-3 sentence balanced summary highlighting key strengths and any notable concerns",
  "popularDishes": ["dish1", "dish2", "dish3"],
  "sentiment": "positive|mixed|negative",
  "confidence": "high|medium|low"
}

GUIDELINES:
- Summary should be balanced and honest, not just positive
- Include both strengths and weaknesses if mentioned
- Popular dishes should be specific menu items mentioned multiple times
- Extract maximum 3 most mentioned dishes
- Sentiment: positive (mostly 4-5 stars), mixed (varied ratings), negative (mostly 1-3 stars)
- Confidence: high (10+ reviews, clear patterns), medium (5-9 reviews), low (<5 reviews or unclear)
`;

    let response = '';
    try {
      response = await this.callClaudeApi(prompt);
      console.log('🤖 Claude response for review analysis:', response.substring(0, 200) + '...');

      // Extract JSON from Claude's response (sometimes it includes extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || 'Unable to generate summary',
        popularDishes: parsed.popularDishes || [],
        sentiment: parsed.sentiment || 'mixed',
        confidence: parsed.confidence || 'low'
      };
    } catch (error) {
      console.error('Review summary generation failed:', error);
      console.error('Raw Claude response:', response);
      console.error('Response length:', response.length);
      console.error('First 500 chars:', response.substring(0, 500));

      // Try to provide more specific error information
      let errorSummary = 'Unable to analyze reviews at this time';
      if (response.length === 0) {
        errorSummary += ' - empty API response';
      } else if (!response.includes('{')) {
        errorSummary += ' - non-JSON response from AI';
      } else {
        errorSummary += ' - AI response parsing failed';
      }

      return {
        summary: errorSummary,
        popularDishes: [],
        sentiment: 'mixed',
        confidence: 'low'
      };
    }
  }

  private async callClaudeApi(prompt: string, retries = 3): Promise<string> {
    const maxRetries = retries;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 Claude API attempt ${attempt}/${maxRetries}`);

        // Use our API proxy instead of direct Claude API calls
        const response = await fetch('/api/claude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: CLAUDE_MODEL_VERSION,
            max_tokens: CLAUDE_MAX_TOKENS.REVIEW_SUMMARY,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Claude API HTTP error:', response.status, response.statusText);
          console.error('Claude API error body:', errorText);

          // Check if this is a retryable error (overload, rate limit, server error)
          const isRetryable = response.status === 529 || // Overloaded
                             response.status === 503 || // Service unavailable
                             response.status === 502 || // Bad gateway
                             response.status === 500 || // Internal server error
                             response.status === 429;   // Too many requests

          if (isRetryable && attempt < maxRetries) {
            // Custom retry delays: 7s after first failure, 10s after second failure
            const delay = attempt === 1 ? 7000 : 10000;
            console.log(`⏳ Retrying in ${delay/1000}s due to ${response.status} error... (attempt ${attempt + 1}/${maxRetries})`);
            await this.delay(delay);
            lastError = new Error(`Claude API error: ${response.status} - ${errorText}`);
            continue;
          }

          throw new Error(`Claude API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Claude API success on attempt', attempt);

        if (result.error) {
          console.error('Claude API returned error:', result.error);
          throw new Error(`Claude API error: ${result.error}`);
        }

        if (!result.content || !result.content[0] || !result.content[0].text) {
          console.error('Unexpected Claude API response structure:', result);
          throw new Error('Invalid response structure from Claude API');
        }

        return result.content[0].text;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          console.error(`❌ Claude API failed after ${maxRetries} attempts`);
          throw lastError;
        }

        // For non-HTTP errors, still try to retry with custom delays
        const delay = attempt === 1 ? 7000 : 10000; // Same delays as HTTP errors
        console.log(`⏳ Retrying in ${delay/1000}s due to error: ${lastError.message} (attempt ${attempt + 1}/${maxRetries})`);
        await this.delay(delay);
      }
    }

    throw lastError || new Error('Claude API failed after all retries');
  }

  private getLatestReviewDate(reviews: GooglePlaceReview[]): string {
    if (!reviews || reviews.length === 0) {
      return new Date().toISOString();
    }

    // Find the most recent review timestamp
    const latestTimestamp = Math.max(...reviews.map(review => review.time * 1000));
    return new Date(latestTimestamp).toISOString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method to get restaurants that need review enrichment
  static getNeedsEnrichment(restaurants: Restaurant[]): Restaurant[] {
    return restaurants.filter(restaurant => {
      // Restaurant needs enrichment if:
      // 1. No review summary exists, OR
      // 2. Review summary is older than 30 days, OR
      // 3. No public rating count exists

      const hasOldSummary = restaurant.public_review_summary_updated_at &&
        (new Date().getTime() - new Date(restaurant.public_review_summary_updated_at).getTime()) > (30 * 24 * 60 * 60 * 1000);

      return !restaurant.public_review_summary ||
             hasOldSummary ||
             !restaurant.public_rating_count;
    });
  }
}