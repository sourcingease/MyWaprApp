// WIP (Work in Progress) Tracker - Global Module Tracking
(function(global) {
  
  console.log('WIP Tracker loaded');
  
  // Track when user enters a module/page
  function trackModuleEntry(moduleKey, moduleName) {
    if (!moduleKey || !moduleName) {
      console.warn('WIP Tracker: Invalid parameters', moduleKey, moduleName);
      return;
    }
    
    console.log('WIP Tracker: Tracking module:', moduleKey, moduleName);
    
    try {
      let wipItems = JSON.parse(localStorage.getItem('safetyWipItems') || '[]');
      
      // Check if already tracked
      if (wipItems.some(item => item.key === moduleKey)) {
        console.log('WIP Tracker: Module already in WIP:', moduleKey);
        return;
      }
      
      wipItems.push({ 
        key: moduleKey, 
        name: moduleName, 
        timestamp: Date.now() 
      });
      
      localStorage.setItem('safetyWipItems', JSON.stringify(wipItems));
      console.log('WIP Tracker: Module added to WIP:', moduleKey, moduleName);
      
      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('wip-updated'));
    } catch (e) {
      console.error('WIP Tracker: Error tracking module:', e);
    }
  }
  
  // Remove module from WIP
  function removeFromWIP(moduleKey) {
    let wipItems = JSON.parse(localStorage.getItem('safetyWipItems') || '[]');
    wipItems = wipItems.filter(item => item.key !== moduleKey);
    localStorage.setItem('safetyWipItems', JSON.stringify(wipItems));
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('wip-updated'));
  }
  
  // Get current WIP items
  function getWIPItems() {
    return JSON.parse(localStorage.getItem('safetyWipItems') || '[]');
  }
  
  // Clear all WIP items
  function clearWIP() {
    localStorage.setItem('safetyWipItems', '[]');
    window.dispatchEvent(new CustomEvent('wip-updated'));
  }
  
  // Expose functions globally
  global.WIPTracker = {
    track: trackModuleEntry,
    remove: removeFromWIP,
    getItems: getWIPItems,
    clear: clearWIP
  };
  
  // Also expose as simpler names for backward compatibility
  global.addToWIP = trackModuleEntry;
  global.removeFromWIP = removeFromWIP;
  
})(window);
