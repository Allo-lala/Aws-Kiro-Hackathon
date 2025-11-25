# Recent Locations Feature - Manual Testing Guide

## Overview
This document describes how to manually test the recent locations feature in the LocationAutocomplete component.

## Test Cases

### 1. Save Location to Recent Locations
**Steps:**
1. Open the route planner page
2. Click on the origin or destination input field
3. Type a location name (e.g., "New York")
4. Select a location from the dropdown
5. Open browser DevTools > Application > Local Storage
6. Look for key: `eco-route-planner-recent-locations`

**Expected Result:**
- The selected location should be saved with `timestamp` and `searchCount: 1`

### 2. Display Recent Locations on Focus
**Steps:**
1. After selecting a location (from Test Case 1)
2. Clear the input field
3. Click on the input field to focus it

**Expected Result:**
- A dropdown should appear showing "Recent Locations" header
- The previously selected location should appear with a clock icon (🕒)

### 3. Select Recent Location
**Steps:**
1. Focus on an empty input field (recent locations dropdown appears)
2. Click on a recent location

**Expected Result:**
- The input field should be populated with the location name
- The location should be selected
- The dropdown should close

### 4. Limit to 5 Recent Locations
**Steps:**
1. Select 6 different locations one by one
2. Focus on an empty input field
3. Count the number of recent locations shown

**Expected Result:**
- Only 5 recent locations should be displayed
- The oldest location should be removed

### 5. Update Existing Location
**Steps:**
1. Select a location (e.g., "Paris")
2. Select a different location
3. Select "Paris" again
4. Check local storage

**Expected Result:**
- "Paris" should have `searchCount: 2`
- The timestamp should be updated
- "Paris" should appear at the top of the recent locations list

### 6. Keyboard Navigation with Recent Locations
**Steps:**
1. Focus on an empty input field (recent locations appear)
2. Press Arrow Down key multiple times
3. Press Enter on a highlighted location

**Expected Result:**
- Arrow keys should highlight recent locations
- Enter should select the highlighted location

### 7. Local Storage Error Handling
**Steps:**
1. Open browser DevTools > Console
2. Run: `Object.defineProperty(window, 'localStorage', { value: null })`
3. Try to select a location

**Expected Result:**
- A warning should appear in console
- The component should continue working normally
- No errors should crash the application

### 8. Recent Locations Appear Before API Results
**Steps:**
1. Select a location to add it to recent locations
2. Clear the input field
3. Focus on the input (recent locations appear)
4. Start typing a search query

**Expected Result:**
- Recent locations should disappear when typing starts
- API search results should appear after 300ms debounce
- Recent locations should reappear if input is cleared again

## Browser Compatibility
Test in the following browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Local Storage Structure
```json
[
  {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "name": "New York",
    "address": "New York, NY, USA",
    "timestamp": 1700000000000,
    "searchCount": 2
  }
]
```

## Notes
- Recent locations are stored per browser/device
- Clearing browser data will remove recent locations
- Private/Incognito mode may not persist recent locations
