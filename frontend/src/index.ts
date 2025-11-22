import './styles.css';
import { RouteAlternative, UserPreferences, SustainabilityMetrics, Location } from './types/models';

// Frontend application class
class RuttyFrontend {
  private currentUserPreferences: UserPreferences | null = null;
  private currentRoutes: RouteAlternative[] = [];

  constructor() {
    this.initializeEventListeners();
    this.loadUserPreferences();
    this.loadSavingsDashboard();
  }

  private initializeEventListeners(): void {
    // Navigation toggle for mobile
    const navToggle = document.querySelector('.nav-toggle') as HTMLButtonElement;
    const navMenu = document.querySelector('.nav-menu') as HTMLElement;
    
    if (navToggle && navMenu) {
      navToggle.addEventListener('click', () => {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', (!isExpanded).toString());
        navMenu.classList.toggle('active');
      });
    }

    // Route form submission
    const routeForm = document.getElementById('route-form') as HTMLFormElement;
    if (routeForm) {
      routeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRouteCalculation();
      });
    }

    // Preferences form submission
    const preferencesForm = document.getElementById('preferences-form') as HTMLFormElement;
    if (preferencesForm) {
      preferencesForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePreferencesSave();
      });
    }

    // Walking distance range input
    const walkingDistanceRange = document.getElementById('max-walking-distance') as HTMLInputElement;
    const walkingDistanceValue = document.getElementById('walking-distance-value') as HTMLOutputElement;
    
    if (walkingDistanceRange && walkingDistanceValue) {
      walkingDistanceRange.addEventListener('input', () => {
        walkingDistanceValue.textContent = `${walkingDistanceRange.value} miles`;
      });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = (link as HTMLAnchorElement).getAttribute('href')?.substring(1);
        const targetElement = document.getElementById(targetId || '');
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  private async handleRouteCalculation(): Promise<void> {
    const originInput = document.getElementById('origin') as HTMLInputElement;
    const destinationInput = document.getElementById('destination') as HTMLInputElement;
    const loadingElement = document.getElementById('loading') as HTMLElement;
    const resultsElement = document.getElementById('route-results') as HTMLElement;

    if (!originInput.value.trim() || !destinationInput.value.trim()) {
      this.showError('Please enter both origin and destination');
      return;
    }

    // Show loading state
    loadingElement.classList.add('active');
    loadingElement.setAttribute('aria-hidden', 'false');
    resultsElement.innerHTML = '';

    try {
      // Create location objects
      const origin: Location = {
        address: originInput.value.trim(),
        latitude: 0, // Will be geocoded by backend
        longitude: 0,
        name: originInput.value.trim()
      };

      const destination: Location = {
        address: destinationInput.value.trim(),
        latitude: 0, // Will be geocoded by backend
        longitude: 0,
        name: destinationInput.value.trim()
      };

      // Call backend API (simulated for now)
      const routes = await this.calculateRoutes(origin, destination);
      this.currentRoutes = routes;
      
      // Display results
      this.displayRouteResults(routes);
      
      // Announce to screen readers
      this.announceToScreenReader(`Found ${routes.length} route options`);
      
    } catch (error) {
      console.error('Route calculation error:', error);
      this.showError('Unable to calculate routes. Please try again.');
    } finally {
      // Hide loading state
      loadingElement.classList.remove('active');
      loadingElement.setAttribute('aria-hidden', 'true');
    }
  }

  private async calculateRoutes(origin: Location, destination: Location): Promise<RouteAlternative[]> {
    // Simulate API call - in real implementation, this would call the backend
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockRoutes: RouteAlternative[] = [
          {
            id: '1',
            origin,
            destination,
            transportationModes: [
              { 
                type: 'public_transit', 
                subtype: 'bus', 
                emissionFactor: 0.2, 
                accessibilityFeatures: [{ type: 'wheelchair_accessible', description: 'Wheelchair accessible', supported: true }], 
                availability: { available: true, nextAvailable: new Date() } 
              }
            ],
            segments: [],
            totalDistance: 5.2,
            estimatedTime: 25,
            carbonFootprint: {
              totalEmissions: 1.04,
              emissionsBySegment: [],
              methodology: 'EPA eGRID 2021',
              dataSources: ['EPA', 'Transit Authority'],
              calculationTimestamp: new Date()
            },
            ecoScore: 95,
            accessibilityCompliant: true,
            cost: 2.50
          },
          {
            id: '2',
            origin,
            destination,
            transportationModes: [
              { type: 'cycling', emissionFactor: 0, accessibilityFeatures: [], availability: { available: true, nextAvailable: new Date() } }
            ],
            segments: [],
            totalDistance: 4.8,
            estimatedTime: 20,
            carbonFootprint: {
              totalEmissions: 0,
              emissionsBySegment: [],
              methodology: 'Zero emissions',
              dataSources: ['Internal calculation'],
              calculationTimestamp: new Date()
            },
            ecoScore: 100,
            accessibilityCompliant: false,
            cost: 0
          },
          {
            id: '3',
            origin,
            destination,
            transportationModes: [
              { type: 'conventional_vehicle', emissionFactor: 0.89, accessibilityFeatures: [], availability: { available: true, nextAvailable: new Date() } }
            ],
            segments: [],
            totalDistance: 5.0,
            estimatedTime: 12,
            carbonFootprint: {
              totalEmissions: 4.45,
              emissionsBySegment: [],
              methodology: 'EPA Vehicle Emissions',
              dataSources: ['EPA', 'Vehicle Database'],
              calculationTimestamp: new Date()
            },
            ecoScore: 30,
            accessibilityCompliant: true,
            cost: 8.50
          }
        ];
        
        // Sort by eco score (highest first)
        mockRoutes.sort((a, b) => b.ecoScore - a.ecoScore);
        resolve(mockRoutes);
      }, 2000);
    });
  }

  private displayRouteResults(routes: RouteAlternative[]): void {
    const resultsElement = document.getElementById('route-results') as HTMLElement;
    
    if (routes.length === 0) {
      resultsElement.innerHTML = `
        <div class="no-results">
          <h3>No routes found</h3>
          <p>Please try different locations or check your input.</p>
        </div>
      `;
      return;
    }

    const resultsHTML = routes.map((route, index) => {
      const isRecommended = index === 0;
      const transportModes = route.transportationModes.map((mode: any) => 
        this.getTransportModeDisplay(mode.type, mode.subtype)
      ).join(', ');

      return `
        <article class="route-card ${isRecommended ? 'best-option' : ''}" role="article" aria-labelledby="route-${route.id}-title">
          <header class="route-header">
            <h3 id="route-${route.id}-title" class="route-title">
              ${isRecommended ? '🌟 Recommended: ' : ''}${transportModes}
            </h3>
            <div class="eco-score" aria-label="Eco score ${route.ecoScore} out of 100">
              ${route.ecoScore}/100
            </div>
          </header>
          
          <div class="route-details">
            <div class="route-detail">
              <div class="route-detail-label">Distance</div>
              <div class="route-detail-value">${route.totalDistance.toFixed(1)} mi</div>
            </div>
            <div class="route-detail">
              <div class="route-detail-label">Time</div>
              <div class="route-detail-value">${route.estimatedTime} min</div>
            </div>
            <div class="route-detail">
              <div class="route-detail-label">CO₂ Emissions</div>
              <div class="route-detail-value">${route.carbonFootprint.totalEmissions.toFixed(2)} kg</div>
            </div>
            ${route.cost !== undefined ? `
              <div class="route-detail">
                <div class="route-detail-label">Cost</div>
                <div class="route-detail-value">$${route.cost.toFixed(2)}</div>
              </div>
            ` : ''}
          </div>

          <div class="transportation-modes">
            ${route.transportationModes.map((mode: any) => `
              <span class="transport-mode">${this.getTransportModeDisplay(mode.type, mode.subtype)}</span>
            `).join('')}
          </div>

          ${route.accessibilityCompliant ? `
            <div class="accessibility-badge" aria-label="This route is wheelchair accessible">
              ♿ Accessible
            </div>
          ` : ''}

          <div class="route-actions">
            <button class="btn btn-primary btn-small" onclick="ruttyApp.selectRoute('${route.id}')">
              Select This Route
            </button>
            <button class="btn btn-secondary btn-small" onclick="ruttyApp.viewRouteDetails('${route.id}')">
              View Details
            </button>
          </div>
        </article>
      `;
    }).join('');

    resultsElement.innerHTML = `
      <h3>Route Options (${routes.length} found)</h3>
      ${resultsHTML}
    `;
  }

  private getTransportModeDisplay(type: string, subtype?: string): string {
    const modeMap: Record<string, string> = {
      walking: '🚶 Walking',
      cycling: '🚴 Cycling',
      public_transit: subtype ? `🚌 ${subtype.charAt(0).toUpperCase() + subtype.slice(1)}` : '🚌 Public Transit',
      electric_vehicle: '⚡ Electric Vehicle',
      conventional_vehicle: '🚗 Car',
      rideshare: '🚕 Rideshare'
    };
    
    return modeMap[type] || type;
  }

  public selectRoute(routeId: string): void {
    const route = this.currentRoutes.find(r => r.id === routeId);
    if (route) {
      // Simulate recording the trip
      this.recordTrip(route);
      this.announceToScreenReader(`Selected ${this.getTransportModeDisplay(route.transportationModes[0].type)} route`);
      
      // Show confirmation
      alert(`Route selected! You'll save ${(4.45 - route.carbonFootprint.totalEmissions).toFixed(2)} kg of CO₂ compared to driving.`);
    }
  }

  public viewRouteDetails(routeId: string): void {
    const route = this.currentRoutes.find(r => r.id === routeId);
    if (route) {
      // Create detailed view modal or expand section
      const details = `
        Route Details:
        - Distance: ${route.totalDistance} miles
        - Estimated Time: ${route.estimatedTime} minutes
        - CO₂ Emissions: ${route.carbonFootprint.totalEmissions} kg
        - Methodology: ${route.carbonFootprint.methodology}
        - Data Sources: ${route.carbonFootprint.dataSources.join(', ')}
        - Accessibility: ${route.accessibilityCompliant ? 'Yes' : 'No'}
      `;
      
      alert(details); // In real app, this would be a proper modal
    }
  }

  private async recordTrip(route: RouteAlternative): Promise<void> {
    // Simulate API call to record trip
    console.log('Recording trip:', route);
    
    // Update savings dashboard
    setTimeout(() => {
      this.loadSavingsDashboard();
    }, 1000);
  }

  private handlePreferencesSave(): void {
    const form = document.getElementById('preferences-form') as HTMLFormElement;
    const formData = new FormData(form);
    
    // Extract form data
    const maxWalkingDistance = parseFloat(formData.get('maxWalkingDistance') as string);
    const transportationModes = formData.getAll('transportationModes') as string[];
    const accessibilityNeeds = formData.getAll('accessibilityNeeds') as string[];
    const sustainabilityPriority = formData.get('sustainabilityPriority') as string;

    // Create preferences object
    const preferences: UserPreferences = {
      userId: 'current-user', // In real app, get from auth
      maxWalkingDistance,
      preferredTransportationModes: transportationModes.map(mode => ({
        type: mode as any,
        emissionFactor: 0,
        accessibilityFeatures: [],
        availability: { available: true, nextAvailable: new Date() }
      })),
      accessibilityNeeds: accessibilityNeeds as any[],
      sustainabilityPriority: sustainabilityPriority as any,
      timeVsEnvironmentWeight: sustainabilityPriority === 'high' ? 0.8 : sustainabilityPriority === 'medium' ? 0.5 : 0.2
    };

    // Save preferences
    this.saveUserPreferences(preferences);
    this.announceToScreenReader('Preferences saved successfully');
    
    // Show confirmation
    const button = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalText = button.textContent;
    button.textContent = '✓ Saved!';
    button.style.background = '#22c55e';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  }

  private saveUserPreferences(preferences: UserPreferences): void {
    this.currentUserPreferences = preferences;
    localStorage.setItem('rutty-preferences', JSON.stringify(preferences));
  }

  private loadUserPreferences(): void {
    const saved = localStorage.getItem('rutty-preferences');
    if (saved) {
      try {
        this.currentUserPreferences = JSON.parse(saved);
        this.populatePreferencesForm();
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }

  private populatePreferencesForm(): void {
    if (!this.currentUserPreferences) return;

    const form = document.getElementById('preferences-form') as HTMLFormElement;
    if (!form) return;

    // Set walking distance
    const walkingDistanceInput = form.querySelector('#max-walking-distance') as HTMLInputElement;
    if (walkingDistanceInput) {
      walkingDistanceInput.value = this.currentUserPreferences.maxWalkingDistance.toString();
      const valueOutput = document.getElementById('walking-distance-value') as HTMLOutputElement;
      if (valueOutput) {
        valueOutput.textContent = `${this.currentUserPreferences.maxWalkingDistance} miles`;
      }
    }

    // Set transportation modes
    this.currentUserPreferences.preferredTransportationModes.forEach((mode: any) => {
      const checkbox = form.querySelector(`input[name="transportationModes"][value="${mode.type}"]`) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = true;
      }
    });

    // Set accessibility needs
    this.currentUserPreferences.accessibilityNeeds.forEach((need: any) => {
      const checkbox = form.querySelector(`input[name="accessibilityNeeds"][value="${need}"]`) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = true;
      }
    });

    // Set sustainability priority
    const priorityRadio = form.querySelector(`input[name="sustainabilityPriority"][value="${this.currentUserPreferences.sustainabilityPriority}"]`) as HTMLInputElement;
    if (priorityRadio) {
      priorityRadio.checked = true;
    }
  }

  private async loadSavingsDashboard(): Promise<void> {
    const dashboardElement = document.getElementById('savings-dashboard') as HTMLElement;
    
    try {
      // Simulate API call to get savings data
      const metrics = await this.getSustainabilityMetrics();
      this.displaySavingsDashboard(metrics);
    } catch (error) {
      console.error('Error loading savings dashboard:', error);
      dashboardElement.innerHTML = `
        <div class="savings-card">
          <p>Unable to load savings data. Please try again later.</p>
        </div>
      `;
    }
  }

  private async getSustainabilityMetrics(): Promise<SustainabilityMetrics> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalSavedEmissions: 45.7,
          totalTrips: 23,
          averageSavingsPerTrip: 1.99,
          timeframe: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            end: new Date()
          },
          milestones: [
            {
              id: '1',
              type: 'emissions_saved',
              threshold: 50,
              achieved: false,
              description: 'Save 50kg of CO₂'
            },
            {
              id: '2',
              type: 'trips_completed',
              threshold: 25,
              achieved: false,
              description: 'Complete 25 eco-friendly trips'
            }
          ]
        });
      }, 1000);
    });
  }

  private displaySavingsDashboard(metrics: SustainabilityMetrics): void {
    const dashboardElement = document.getElementById('savings-dashboard') as HTMLElement;
    
    const dashboardHTML = `
      <div class="savings-card">
        <div class="savings-value">${metrics.totalSavedEmissions.toFixed(1)}</div>
        <div class="savings-label">kg CO₂ Saved</div>
        <div class="savings-description">
          Equivalent to planting ${Math.round(metrics.totalSavedEmissions / 22)} trees
        </div>
      </div>
      
      <div class="savings-card">
        <div class="savings-value">${metrics.totalTrips}</div>
        <div class="savings-label">Eco-Friendly Trips</div>
        <div class="savings-description">
          Average ${metrics.averageSavingsPerTrip.toFixed(1)} kg CO₂ saved per trip
        </div>
      </div>
      
      <div class="savings-card">
        <div class="savings-value">${Math.round((metrics.totalSavedEmissions / 22) * 100) / 100}</div>
        <div class="savings-label">Trees Equivalent</div>
        <div class="savings-description">
          Environmental impact of your choices
        </div>
      </div>
      
      <div class="savings-card">
        <h4>Next Milestones</h4>
        ${metrics.milestones.filter((m: any) => !m.achieved).slice(0, 2).map((milestone: any) => `
          <div style="margin: 1rem 0; padding: 1rem; background: #f9fafb; border-radius: 8px;">
            <div style="font-weight: 600;">${milestone.description}</div>
            <div style="font-size: 0.875rem; color: #6b7280;">
              ${milestone.type === 'emissions_saved' 
                ? `${(milestone.threshold - metrics.totalSavedEmissions).toFixed(1)} kg to go`
                : `${milestone.threshold - metrics.totalTrips} trips to go`
              }
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    dashboardElement.innerHTML = dashboardHTML;
  }

  private showError(message: string): void {
    // Create or update error message
    let errorElement = document.getElementById('error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = 'error-message';
      errorElement.className = 'error-message';
      errorElement.style.cssText = `
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        text-align: center;
      `;
      
      const routeForm = document.getElementById('route-form');
      if (routeForm) {
        routeForm.appendChild(errorElement);
      }
    }
    
    errorElement.textContent = message;
    errorElement.setAttribute('role', 'alert');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorElement) {
        errorElement.remove();
      }
    }, 5000);
  }

  private announceToScreenReader(message: string): void {
    const announcements = document.getElementById('announcements');
    if (announcements) {
      announcements.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        announcements.textContent = '';
      }, 1000);
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  (window as any).ruttyApp = new RuttyFrontend();
});

// Export for potential external use
export { RuttyFrontend };