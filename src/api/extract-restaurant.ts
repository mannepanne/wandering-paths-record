// ABOUT: Local development API endpoint for restaurant extraction
// ABOUT: Structure matches Netlify functions for easy deployment transition

import { ClaudeExtractor, ExtractionCache, RestaurantExtractionResult } from '@/services/claudeExtractor';

// This interface matches what Netlify functions expect
interface APIRequest {
  url: string;
}

interface APIResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

// Universal restaurant extraction handler - works in both local development and production
export async function extractRestaurantLocal(request: APIRequest): Promise<RestaurantExtractionResult> {
  const { url } = request;
  
  if (!url) {
    return {
      success: false,
      error: 'URL is required'
    };
  }

  // Check cache first
  const cached = ExtractionCache.get(url);
  if (cached) {
    console.log('🎯 Using cached extraction for:', url);
    return {
      success: true,
      data: cached,
      confidence: 'high' // Assume cached data was high quality
    };
  }

  try {
    // Determine API endpoint based on environment
    const apiUrl = import.meta.env.DEV 
      ? 'http://localhost:3001/api/extract-restaurant'  // Local development (Express server)
      : '/api/extract-restaurant';                      // Production (Cloudflare Workers)

    console.log('🔍 Calling extraction API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    const result = await response.json();
    
    if (!response.ok) {
      // Handle specific error responses from our server
      return {
        success: false,
        error: result.error || `API request failed: ${response.status} ${response.statusText}`,
        isRateLimited: result.isRateLimited,
        retryAfter: result.retryAfter,
        isApiError: result.isApiError
      };
    }
    
    // Cache successful extractions
    if (result.success && result.data) {
      ExtractionCache.set(url, result.data);
    }
    
    return result;
    
  } catch (error) {
    console.error('Extraction failed:', error);
    return {
      success: false,
      error: `Extraction service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}. ${import.meta.env.DEV ? 'Make sure the local API server is running.' : 'Please try again later.'}`
    };
  }
}

// Netlify function structure (for future deployment)
export async function netlifyFunctionHandler(event: Record<string, unknown>, context: Record<string, unknown>): Promise<APIResponse> {
  // CORS headers for local development
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const request = JSON.parse(event.body || '{}');
    const result = await extractRestaurantLocal(request);
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// Export default for Netlify functions
export { netlifyFunctionHandler as handler };