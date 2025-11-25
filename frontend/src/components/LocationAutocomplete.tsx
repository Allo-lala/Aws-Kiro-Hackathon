import React, { useState, useEffect, useRef } from 'react';
import { Location, PlaceSuggestion, RecentLocation } from '../types/models';
import { geoapifyService, GeoapifyError } from '../services/geoapifyService';
import { useDebounce } from '../hooks/useDebounce';
import { loadRecentLocations, saveRecentLocation } from '../utils/recentLocations';
import './LocationAutocomplete.css';

/**
 * Props for LocationAutocomplete component
 */
export interface LocationAutocompleteProps {
  label: string;
  placeholder?: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  disabled?: boolean;
  showCurrentLocation?: boolean;
  error?: string;
}

/**
 * LocationAutocomplete Component
 * 
 * Provides an intelligent location search interface with autocomplete suggestions.
 * Users can search for locations by typing place names, addresses, or landmarks.
 */
export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  label,
  placeholder = 'Search for a location...',
  value,
  onChange,
  disabled = false,
  showCurrentLocation = false,
  error,
}) => {
  // Component state
  const [inputValue, setInputValue] = useState<string>('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [lastFailedQuery, setLastFailedQuery] = useState<string>('');
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  
  // Debounce the input value to prevent excessive API calls
  const debouncedInputValue = useDebounce(inputValue, 300);

  // Load recent locations on component mount
  useEffect(() => {
    const recent = loadRecentLocations();
    setRecentLocations(recent);
  }, []);

  // Click-outside detection to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    // Add event listeners for both mouse and touch events
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Prevent page scrolling when dropdown is open on mobile
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Prevent scrolling on mobile
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        // Restore scrolling
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Update input value when value prop changes
  useEffect(() => {
    if (value?.name) {
      setInputValue(value.name);
    } else if (value === null) {
      setInputValue('');
    }
  }, [value]);

  // Fetch suggestions when debounced input changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Only search if we have 3+ characters
      if (debouncedInputValue.trim().length < 3) {
        setSuggestions([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
        setInternalError(null);
        setLastFailedQuery('');
        return;
      }

      setIsLoading(true);
      setInternalError(null);
      setLastFailedQuery('');

      try {
        const results = await geoapifyService.autocomplete(debouncedInputValue, {
          limit: 5,
          lang: 'en',
        });
        
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHighlightedIndex(-1); // Reset highlight when new results arrive
        
        // Announce results to screen readers
        if (liveRegionRef.current) {
          if (results.length === 0) {
            liveRegionRef.current.textContent = 'No locations found. Try a different search term.';
          } else {
            liveRegionRef.current.textContent = `${results.length} location${results.length === 1 ? '' : 's'} found. Use arrow keys to navigate.`;
          }
        }
      } catch (err) {
        if (err instanceof GeoapifyError) {
          setInternalError(err.message);
        } else {
          setInternalError('An unexpected error occurred while searching for locations.');
        }
        setSuggestions([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
        setLastFailedQuery(debouncedInputValue);
        
        // Announce error to screen readers
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = 'Error loading location suggestions.';
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedInputValue]);

  /**
   * Announce highlighted item to screen readers
   */
  const announceHighlightedItem = (index: number, isRecent: boolean) => {
    if (!liveRegionRef.current) return;
    
    if (isRecent && index >= 0 && index < recentLocations.length) {
      const location = recentLocations[index];
      liveRegionRef.current.textContent = `${location.name || 'Unnamed Location'}${location.address ? ', ' + location.address : ''}`;
    } else if (!isRecent && index >= 0 && index < suggestions.length) {
      const suggestion = suggestions[index];
      liveRegionRef.current.textContent = `${suggestion.name}, ${suggestion.address}`;
    }
  };

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // If input is cleared, clear the location
    if (newValue.trim() === '') {
      onChange(null);
      setSuggestions([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  /**
   * Handle input focus - show recent locations if available
   */
  const handleInputFocus = () => {
    // Show recent locations when input receives focus and input is empty
    if (inputValue.trim() === '' && recentLocations.length > 0) {
      setIsOpen(true);
      setHighlightedIndex(-1);
      
      // Announce recent locations to screen readers
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `${recentLocations.length} recent location${recentLocations.length === 1 ? '' : 's'} available. Use arrow keys to navigate.`;
      }
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Determine which items are shown (recent locations or suggestions)
    const showingRecent = inputValue.trim() === '' && recentLocations.length > 0;
    const showingSuggestions = suggestions.length > 0;
    const totalItems = showingRecent ? recentLocations.length : (showingSuggestions ? suggestions.length : 0);

    if (!isOpen || totalItems === 0) {
      // If dropdown is closed and user presses Escape, just ensure it stays closed
      if (e.key === 'Escape') {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault(); // Prevent cursor movement in input
        setHighlightedIndex((prev) => {
          const newIndex = prev < totalItems - 1 ? prev + 1 : 0;
          // Announce the highlighted item to screen readers
          announceHighlightedItem(newIndex, showingRecent);
          return newIndex;
        });
        break;

      case 'ArrowUp':
        e.preventDefault(); // Prevent cursor movement in input
        setHighlightedIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : totalItems - 1;
          // Announce the highlighted item to screen readers
          announceHighlightedItem(newIndex, showingRecent);
          return newIndex;
        });
        break;

      case 'Enter':
        e.preventDefault(); // Prevent form submission
        if (highlightedIndex >= 0 && highlightedIndex < totalItems) {
          if (showingRecent) {
            handleRecentLocationSelect(recentLocations[highlightedIndex]);
          } else if (showingSuggestions) {
            handleSuggestionSelect(suggestions[highlightedIndex]);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      default:
        break;
    }
  };

  /**
   * Handle suggestion selection
   */
  const handleSuggestionSelect = (suggestion: PlaceSuggestion, event?: React.MouseEvent | React.TouchEvent) => {
    // Prevent default behavior for touch events to avoid double-firing
    if (event) {
      event.preventDefault();
    }
    
    const location: Location = {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      name: suggestion.name,
      address: suggestion.address,
    };
    
    // Save to recent locations
    saveRecentLocation(location);
    
    // Update recent locations state
    const updatedRecent = loadRecentLocations();
    setRecentLocations(updatedRecent);
    
    setInputValue(suggestion.name);
    onChange(location);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  /**
   * Handle recent location selection
   */
  const handleRecentLocationSelect = (location: RecentLocation, event?: React.MouseEvent | React.TouchEvent) => {
    // Prevent default behavior for touch events to avoid double-firing
    if (event) {
      event.preventDefault();
    }
    
    // Save to recent locations (updates timestamp and search count)
    saveRecentLocation(location);
    
    // Update recent locations state
    const updatedRecent = loadRecentLocations();
    setRecentLocations(updatedRecent);
    
    setInputValue(location.name || 'Recent Location');
    onChange(location);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  /**
   * Handle clear button click
   */
  const handleClear = () => {
    setInputValue('');
    onChange(null);
    setSuggestions([]);
    setIsOpen(false);
    setInternalError(null);
    setHighlightedIndex(-1);
    setLastFailedQuery('');
    
    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Handle retry button click
   * Retries the last failed search query
   */
  const handleRetry = async () => {
    if (!lastFailedQuery) {
      return;
    }

    setIsLoading(true);
    setInternalError(null);

    try {
      const results = await geoapifyService.autocomplete(lastFailedQuery, {
        limit: 5,
        lang: 'en',
      });
      
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setHighlightedIndex(-1);
      setLastFailedQuery('');
    } catch (err) {
      if (err instanceof GeoapifyError) {
        setInternalError(err.message);
      } else {
        setInternalError('An unexpected error occurred while searching for locations.');
      }
      setSuggestions([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
      // Keep lastFailedQuery so user can retry again
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle "Use Current Location" button click
   * Uses browser geolocation API to get user's current position
   */
  const handleCurrentLocation = async () => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      setInternalError('Geolocation is not supported by your browser.');
      return;
    }

    setIsGettingLocation(true);
    setInternalError(null);

    // Request current position
    navigator.geolocation.getCurrentPosition(
      // Success callback
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocode to get place name
          const location = await geoapifyService.reverseGeocode(latitude, longitude);
          
          // Save to recent locations
          saveRecentLocation(location);
          
          // Update recent locations state
          const updatedRecent = loadRecentLocations();
          setRecentLocations(updatedRecent);
          
          // Update component state
          setInputValue(location.name || 'Current Location');
          onChange(location);
          setIsOpen(false);
          setSuggestions([]);
          setHighlightedIndex(-1);
        } catch (err) {
          if (err instanceof GeoapifyError) {
            setInternalError(err.message);
          } else {
            setInternalError('Unable to determine your location name. Please try again.');
          }
        } finally {
          setIsGettingLocation(false);
        }
      },
      // Error callback
      (error) => {
        setIsGettingLocation(false);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setInternalError('Location access denied. Please enable location permissions in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setInternalError('Unable to determine your location. Please enter a location manually.');
            break;
          case error.TIMEOUT:
            setInternalError('Location request timed out. Please try again or enter a location manually.');
            break;
          default:
            setInternalError('An error occurred while getting your location. Please try again.');
            break;
        }
      },
      // Options
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0, // Don't use cached position
      }
    );
  };

  // Determine which error to display
  const displayError = error || internalError;

  return (
    <div ref={wrapperRef} className="location-autocomplete">
      {/* ARIA live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        className="location-autocomplete__sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
      
      <label htmlFor={`location-input-${label}`} className="location-autocomplete__label">
        {label}
      </label>
      
      {/* Use Current Location button */}
      {showCurrentLocation && (
        <button
          type="button"
          className="location-autocomplete__current-location"
          onClick={handleCurrentLocation}
          disabled={disabled || isGettingLocation}
          aria-label="Use current location"
        >
          <span className="location-autocomplete__current-location-icon">📍</span>
          {isGettingLocation ? 'Getting location...' : 'Use Current Location'}
        </button>
      )}
      
      <div className="location-autocomplete__input-wrapper">
        <input
          ref={inputRef}
          id={`location-input-${label}`}
          type="text"
          className={`location-autocomplete__input ${displayError ? 'location-autocomplete__input--error' : ''}`}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`location-dropdown-${label}`}
          aria-activedescendant={
            highlightedIndex >= 0 
              ? `location-suggestion-${label}-${highlightedIndex}` 
              : undefined
          }
          aria-autocomplete="list"
          aria-label={`${label} location search`}
          aria-describedby={displayError ? `location-error-${label}` : undefined}
          aria-invalid={displayError ? true : undefined}
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="location-autocomplete__loading">
            <div className="location-autocomplete__spinner" />
          </div>
        )}
        
        {/* Clear button */}
        {inputValue && !isLoading && (
          <button
            type="button"
            className="location-autocomplete__clear"
            onClick={handleClear}
            aria-label="Clear input"
            disabled={disabled}
          >
            ×
          </button>
        )}
      </div>

      {/* Error message */}
      {displayError && (
        <div 
          id={`location-error-${label}`}
          className="location-autocomplete__error" 
          role="alert"
          aria-live="assertive"
        >
          <span className="location-autocomplete__error-message">{displayError}</span>
          {internalError && lastFailedQuery && (
            <button
              type="button"
              className="location-autocomplete__retry"
              onClick={handleRetry}
              disabled={isLoading}
              aria-label="Retry location search"
            >
              {isLoading ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
      )}

      {/* Recent locations dropdown (shown when input is empty and has focus) */}
      {isOpen && inputValue.trim() === '' && recentLocations.length > 0 && !disabled && (
        <div
          ref={dropdownRef}
          id={`location-dropdown-${label}`}
          className="location-autocomplete__dropdown"
          role="listbox"
          aria-label="Recent locations"
        >
          <div className="location-autocomplete__recent-header" role="presentation">
            Recent Locations
          </div>
          {recentLocations.map((location, index) => (
            <div
              key={`recent-${location.latitude}-${location.longitude}-${location.timestamp}`}
              id={`location-suggestion-${label}-${index}`}
              className={`location-autocomplete__suggestion location-autocomplete__suggestion--recent ${
                index === highlightedIndex ? 'location-autocomplete__suggestion--highlighted' : ''
              }`}
              role="option"
              aria-selected={index === highlightedIndex}
              onClick={(e) => handleRecentLocationSelect(location, e)}
              onTouchEnd={(e) => handleRecentLocationSelect(location, e)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="location-autocomplete__suggestion-icon">🕒</div>
              <div className="location-autocomplete__suggestion-content">
                <div className="location-autocomplete__suggestion-name">
                  {location.name || 'Unnamed Location'}
                </div>
                {location.address && (
                  <div className="location-autocomplete__suggestion-address">
                    {location.address}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions dropdown (shown when user is typing) */}
      {isOpen && suggestions.length > 0 && !disabled && (
        <div
          ref={dropdownRef}
          id={`location-dropdown-${label}`}
          className="location-autocomplete__dropdown"
          role="listbox"
          aria-label="Location suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.placeId}
              id={`location-suggestion-${label}-${index}`}
              className={`location-autocomplete__suggestion ${
                index === highlightedIndex ? 'location-autocomplete__suggestion--highlighted' : ''
              }`}
              role="option"
              aria-selected={index === highlightedIndex}
              onClick={(e) => handleSuggestionSelect(suggestion, e)}
              onTouchEnd={(e) => handleSuggestionSelect(suggestion, e)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="location-autocomplete__suggestion-name">
                {suggestion.name}
              </div>
              <div className="location-autocomplete__suggestion-address">
                {suggestion.address}
              </div>
              {suggestion.country && (
                <div className="location-autocomplete__suggestion-country">
                  {suggestion.country}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && suggestions.length === 0 && debouncedInputValue.length >= 3 && !isLoading && !displayError && (
        <div className="location-autocomplete__dropdown">
          <div className="location-autocomplete__no-results">
            No locations found. Try a different search term.
          </div>
        </div>
      )}
    </div>
  );
};
