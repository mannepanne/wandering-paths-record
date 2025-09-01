// ABOUT: React hook for restaurant data extraction workflow
// ABOUT: Manages extraction state, progress tracking, and form integration

import { useState, useCallback } from 'react';
import { extractRestaurantLocal } from '@/api/extract-restaurant';
import { ExtractionProgress, RestaurantExtractionResult, ExtractedRestaurantData } from '@/services/claudeExtractor';

export interface ExtractionState {
  isExtracting: boolean;
  progress: string;
  error?: string;
  result?: ExtractedRestaurantData;
  isNotRestaurant?: boolean;
  detectedType?: string;
}

export function useRestaurantExtraction() {
  const [state, setState] = useState<ExtractionState>({
    isExtracting: false,
    progress: ''
  });

  const extractFromUrl = useCallback(async (url: string): Promise<ExtractedRestaurantData | null> => {
    // Validate URL
    try {
      new URL(url);
    } catch {
      setState({
        isExtracting: false,
        progress: '',
        error: 'Please enter a valid URL'
      });
      return null;
    }

    setState({
      isExtracting: true,
      progress: 'Starting extraction...',
      error: undefined,
      result: undefined
    });

    try {
      // Create progress simulation since we can't get real-time updates from the service
      const progressSteps = [
        'Fetching website content...',
        'Analyzing business type...',
        'Extracting restaurant details...',
        'Enhancing with review data...',
        'Finalizing extraction...'
      ];

      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length - 1) {
          currentStep++;
          setState(prev => ({
            ...prev,
            progress: progressSteps[currentStep]
          }));
        }
      }, 3000); // Update every 3 seconds

      // Call extraction service
      const result: RestaurantExtractionResult = await extractRestaurantLocal({ url });
      
      clearInterval(progressInterval);

      if (!result.success) {
        if (result.isNotRestaurant) {
          setState({
            isExtracting: false,
            progress: '',
            error: result.message,
            isNotRestaurant: true,
            detectedType: result.detectedType
          });
        } else {
          setState({
            isExtracting: false,
            progress: '',
            error: result.error || 'Extraction failed. Please try again.'
          });
        }
        return null;
      }

      setState({
        isExtracting: false,
        progress: 'Extraction complete!',
        result: result.data
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, progress: '' }));
      }, 3000);

      return result.data || null;

    } catch (error) {
      setState({
        isExtracting: false,
        progress: '',
        error: 'Network error. Please check your connection and try again.'
      });
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined, isNotRestaurant: false }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isExtracting: false,
      progress: ''
    });
  }, []);

  return {
    ...state,
    extractFromUrl,
    clearError,
    reset
  };
}