# Implementation Plan

- [x] 1. Set up Geoapify API configuration
  - Add `REACT_APP_GEOAPIFY_API_KEY` to `.env` and `.env.example` files
  - Document how to obtain a free Geoapify API key in README
  - Verify webpack configuration injects environment variables correctly
  - _Requirements: 6.1, 6.2_

- [x] 2. Create GeoapifyService for API integration
  - Create `frontend/src/services/geoapifyService.ts` with autocomplete and reverseGeocode methods
  - Implement request/response transformation from Geoapify format to application format
  - Add error handling for network errors, rate limits, and invalid responses
  - _Requirements: 1.1, 3.4, 6.3, 6.4_

- [ ]* 2.1 Write unit tests for GeoapifyService
  - Test API URL construction with query parameters
  - Test response transformation
  - Test error handling for different HTTP status codes
  - _Requirements: 1.1, 3.4_

- [x] 3. Create PlaceSuggestion type definition
  - Add PlaceSuggestion interface to `frontend/src/types/models.ts`
  - Add RecentLocation interface for local storage
  - _Requirements: 1.2_

- [x] 4. Create useDebounce custom hook
  - Create `frontend/src/hooks/useDebounce.ts` for debouncing search input
  - Implement 300ms debounce delay
  - Handle cleanup on unmount
  - _Requirements: 3.1, 3.2_

- [ ]* 4.1 Write property test for debounce hook
  - **Property 6: Debouncing prevents excessive API calls**
  - **Validates: Requirements 3.1, 3.2**

- [x] 5. Create LocationAutocomplete component
  - Create `frontend/src/components/LocationAutocomplete.tsx` with search input and dropdown
  - Implement component props interface (label, value, onChange, disabled, etc.)
  - Add basic styling for input field and suggestions dropdown
  - _Requirements: 1.1, 1.2_

- [x] 5.1 Implement search and suggestions display
  - Integrate useDebounce hook with input onChange handler
  - Call GeoapifyService.autocomplete() when user types 3+ characters
  - Display loading indicator during API requests
  - Render suggestions list with place name, address, and country
  - _Requirements: 1.1, 1.2, 3.3_

- [ ]* 5.2 Write property test for search triggering
  - **Property 1: Search query triggers API call**
  - **Validates: Requirements 1.1**

- [ ]* 5.3 Write property test for suggestion data
  - **Property 2: Suggestions contain required fields**
  - **Validates: Requirements 1.2**

- [x] 5.4 Implement suggestion selection
  - Add click handler for suggestion items
  - Populate location field with selected place name
  - Store coordinates in component state and call onChange callback
  - Close dropdown after selection
  - _Requirements: 1.3_

- [ ]* 5.5 Write property test for selection behavior
  - **Property 3: Selection populates location data**
  - **Validates: Requirements 1.3**

- [x] 5.6 Implement input clearing
  - Add clear button (X icon) to input field
  - Clear stored coordinates when input is cleared
  - Hide suggestions dropdown when input is empty
  - _Requirements: 1.4_

- [ ]* 5.7 Write property test for clear behavior
  - **Property 4: Clear input clears location**
  - **Validates: Requirements 1.4**

- [x] 6. Implement keyboard navigation
  - Add keydown event handler to input field
  - Implement arrow key navigation (up/down) through suggestions
  - Highlight currently selected suggestion
  - Implement Enter key to select highlighted suggestion
  - Implement Escape key to close dropdown
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 6.1 Write property test for keyboard navigation
  - **Property 7: Keyboard navigation cycles through suggestions**
  - **Validates: Requirements 4.2**

- [ ]* 6.2 Write property test for Enter key selection
  - **Property 8: Enter key selects highlighted suggestion**
  - **Validates: Requirements 4.4**

- [ ]* 6.3 Write property test for Escape key
  - **Property 9: Escape key closes dropdown**
  - **Validates: Requirements 4.5**

- [x] 7. Add "Use Current Location" feature
  - Add "Use Current Location" button that appears when showCurrentLocation prop is true
  - Implement browser geolocation API integration
  - Request user permission for location access
  - Call GeoapifyService.reverseGeocode() to get place name from coordinates
  - Handle permission denied, position unavailable, and timeout errors
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Implement recent locations feature
  - Create utility functions for local storage operations (save, load, clear)
  - Save selected locations to local storage with timestamp
  - Load recent locations on component mount
  - Display recent locations when input receives focus (before API results)
  - Limit recent locations list to 5 items
  - Handle local storage errors gracefully (storage full, unavailable)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 8.1 Write property test for recent locations storage
  - **Property 10: Recent locations are stored and retrieved**
  - **Validates: Requirements 8.1, 8.2**

- [ ]* 8.2 Write property test for recent locations ordering
  - **Property 11: Recent locations appear before API results**
  - **Validates: Requirements 8.4**

- [x] 9. Add mobile-friendly enhancements
  - Ensure touch target sizes are minimum 44x44 pixels
  - Add touch event handlers for suggestion selection
  - Implement click-outside detection to close dropdown on mobile
  - Use position: fixed for dropdown on small screens
  - Prevent page scrolling when dropdown is open
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 10. Implement error handling and display
  - Add error state to component
  - Display user-friendly error messages for API failures
  - Show "No results found" message when API returns empty results
  - Add retry capability for failed requests
  - _Requirements: 1.5, 3.4, 6.3, 6.4_

- [ ]* 10.1 Write property test for error handling
  - **Property 12: API errors display user-friendly messages**
  - **Validates: Requirements 3.4, 6.4**

- [x] 11. Add accessibility features
  - Add ARIA labels to input fields and buttons
  - Implement ARIA live region for announcing suggestion count
  - Add role="combobox" and aria-expanded to input
  - Add role="listbox" and role="option" to suggestions
  - Ensure proper focus management during keyboard navigation
  - Test with screen reader
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 12. Style the LocationAutocomplete component
  - Create CSS module or styled-components for LocationAutocomplete
  - Style input field with search icon and clear button
  - Style suggestions dropdown with hover and selected states
  - Add loading spinner animation
  - Ensure WCAG AA color contrast compliance
  - Add smooth transitions for dropdown open/close
  - Make responsive for mobile devices
  - _Requirements: 5.1, 5.2_

- [x] 13. Integrate LocationAutocomplete into RouteInputForm
  - Replace manual latitude/longitude inputs with LocationAutocomplete components
  - Add LocationAutocomplete for origin with showCurrentLocation enabled
  - Add LocationAutocomplete for destination
  - Update form submission to use location data from autocomplete components
  - Remove old manual input fields and their state management
  - _Requirements: 1.1, 1.3, 7.1_

- [x] 14. Update RouteInputForm styling
  - Adjust form layout to accommodate new autocomplete components
  - Ensure consistent spacing and alignment
  - Test responsive behavior on mobile devices
  - _Requirements: 5.1_

- [x] 15. Add global search capability verification
  - Test autocomplete with locations from different countries
  - Verify no geographic restrictions are applied to API requests
  - Test with locations that have duplicate names in different countries
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 15.1 Write property test for global search
  - **Property 5: Global search returns worldwide results**
  - **Validates: Requirements 2.1**

- [x] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Create documentation
  - Add setup instructions for Geoapify API key to README
  - Document LocationAutocomplete component props and usage
  - Add screenshots or GIFs showing autocomplete in action
  - Document keyboard shortcuts for users
  - _Requirements: 6.1_

- [ ]* 18. End-to-end testing
  - Test complete user flow: search origin, search destination, calculate routes
  - Test on different browsers (Chrome, Firefox, Safari, Edge)
  - Test on mobile devices (iOS Safari, Android Chrome)
  - Test with slow network connection
  - Test with API rate limiting
  - Verify accessibility with screen reader
  - _Requirements: All_
