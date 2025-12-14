// User Tracking Hook
// This hook tracks user navigation through the application
const UserTrackingHook = {
  mounted() {
    // Get the current page information
    const pagePath = window.location.pathname;
    const pageTitle = document.title;
    
    // Track page entry
    this.trackPageEntry(pagePath, pageTitle);
    
    // Listen for navigation events
    window.addEventListener('popstate', this.handleNavigation.bind(this));
    
    // Store the current path to detect changes
    this.currentPath = pagePath;
    
    // Set up beforeunload event to track when user leaves the page
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  },
  
  updated() {
    // Check if the path has changed (client-side navigation)
    const newPath = window.location.pathname;
    if (newPath !== this.currentPath) {
      // Track exit from previous page
      this.trackPageExit(this.currentPath, newPath);
      
      // Track entry to new page
      this.trackPageEntry(newPath, document.title);
      
      // Update current path
      this.currentPath = newPath;
    }
  },
  
  destroyed() {
    // Clean up event listeners
    window.removeEventListener('popstate', this.handleNavigation.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    
    // Track page exit
    this.trackPageExit(this.currentPath, null);
  },
  
  handleNavigation(event) {
    const newPath = window.location.pathname;
    
    // Track exit from previous page
    this.trackPageExit(this.currentPath, newPath);
    
    // Track entry to new page
    this.trackPageEntry(newPath, document.title);
    
    // Update current path
    this.currentPath = newPath;
  },
  
  handleBeforeUnload(event) {
    // Track page exit when user leaves the site
    this.trackPageExit(this.currentPath, null);
  },
  
  trackPageEntry(pagePath, pageTitle) {
    // Extract section and action from path
    const pathParts = pagePath.split('/').filter(part => part);
    const section = pathParts.length > 0 ? pathParts[0] : 'home';
    const action = pathParts.length > 1 ? pathParts[1] : 'index';
    
    // Send tracking data to the server
    this.pushEvent('track_page_entry', {
      page_path: pagePath,
      page_name: pageTitle,
      section: section,
      action: action,
      user_agent: navigator.userAgent,
      previous_page_path: document.referrer
    });
  },
  
  trackPageExit(pagePath, nextPagePath) {
    // Send exit tracking data to the server
    this.pushEvent('track_page_exit', {
      page_path: pagePath,
      next_page_path: nextPagePath,
      status: nextPagePath ? 'completed' : 'abandoned'
    });
  }
};

export default UserTrackingHook;
