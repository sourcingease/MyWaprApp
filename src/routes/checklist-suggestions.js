/**
 * Safety Checklist AI Suggestions API
 * Generates relevant safety checklist items based on tab context and heading
 */

function setupChecklistSuggestionsRoutes(app, pool) {
  
  // Generate AI suggestions for checklist items
  app.post('/api/safety/checklist/suggestions', async (req, res) => {
    try {
      const { tabId, headingText, existingItems } = req.body;
      
      console.log('🤖 Generating suggestions for:', { tabId, headingText });
      
      if (!tabId || !headingText) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Map tab IDs to safety contexts
      const tabContexts = {
        'usc-safe': 'USC (Unified Safety Code) compliance and general workplace safety',
        'fire': 'Fire safety, fire extinguishers, emergency exits, and fire prevention',
        'electrical': 'Electrical safety, wiring, grounding, and electrical hazard prevention',
        'structural': 'Structural integrity, building safety, and structural inspections',
        'health': 'Occupational health, hygiene, and health hazard prevention',
        'gas': 'Gas safety, LPG, natural gas, and gas leak prevention',
        'boiler': 'Boiler safety, pressure vessels, and steam system safety',
        'consultant': 'Safety consultant requirements and third-party assessments',
        'dsa': 'Detailed Structural Assessment (DSA) requirements',
        'emergency-power': 'Emergency power systems, generators, and backup power'
      };
      
      const context = tabContexts[tabId] || 'General workplace safety';
      
      // Generate suggestions based on common safety standards
      const suggestions = generateSuggestions(context, headingText, existingItems || []);
      
      console.log(`✅ Generated ${suggestions.length} suggestions`);
      
      res.json({
        success: true,
        suggestions: suggestions,
        context: context,
        heading: headingText
      });
      
    } catch (err) {
      console.error('❌ Error generating suggestions:', err.message);
      res.status(500).json({ error: err.message });
    }
  });
  
  // Search internet for safety regulations (placeholder for future integration)
  app.post('/api/safety/checklist/search', async (req, res) => {
    try {
      const { query, country } = req.body;
      
      console.log('🔍 Searching safety regulations:', query);
      
      // TODO: Integrate with web search API or safety regulation database
      // For now, return predefined results
      
      const searchResults = [
        {
          title: 'OSHA Safety Standards',
          snippet: 'Occupational Safety and Health Administration standards for workplace safety',
          source: 'OSHA.gov',
          relevance: 0.95
        },
        {
          title: 'ISO 45001 Occupational Health and Safety',
          snippet: 'International standard for occupational health and safety management systems',
          source: 'ISO.org',
          relevance: 0.90
        }
      ];
      
      res.json({
        success: true,
        results: searchResults,
        query: query
      });
      
    } catch (err) {
      console.error('❌ Error searching:', err.message);
      res.status(500).json({ error: err.message });
    }
  });
}

// Generate suggestions based on safety domain knowledge
function generateSuggestions(context, headingText, existingItems) {
  const suggestions = [];
  const heading = headingText.toLowerCase();
  
  // Common safety question formats
  const formats = ['Yes', 'No', 'N/A'];
  
  // Fire Safety suggestions
  if (context.includes('fire') || context.includes('Fire')) {
    if (heading.includes('extinguisher')) {
      suggestions.push(
        { text: 'Are fire extinguishers properly mounted and accessible?', options: formats },
        { text: 'Are fire extinguishers inspected and tagged within the last year?', options: formats },
        { text: 'Are appropriate types of extinguishers available for the hazards present?', options: formats },
        { text: 'Is there proper signage indicating fire extinguisher locations?', options: formats }
      );
    }
    if (heading.includes('exit') || heading.includes('evacuation')) {
      suggestions.push(
        { text: 'Are exit routes clearly marked and illuminated?', options: formats },
        { text: 'Are exit doors unlocked and easily opened from the inside?', options: formats },
        { text: 'Is there an evacuation plan posted and up to date?', options: formats },
        { text: 'Are emergency exits free from obstructions?', options: formats }
      );
    }
    if (heading.includes('alarm') || heading.includes('detection')) {
      suggestions.push(
        { text: 'Are smoke detectors installed and functional?', options: formats },
        { text: 'Are fire alarms tested regularly?', options: formats },
        { text: 'Is the alarm system audible throughout the facility?', options: formats }
      );
    }
  }
  
  // Electrical Safety suggestions
  if (context.includes('electrical') || context.includes('Electrical')) {
    if (heading.includes('panel') || heading.includes('circuit')) {
      suggestions.push(
        { text: 'Is there a minimum 3-foot clearance around electrical panels?', options: formats },
        { text: 'Are electrical panels properly labeled?', options: formats },
        { text: 'Are all circuit breakers and fuses properly rated?', options: formats },
        { text: 'Are electrical panel covers in place and secured?', options: formats }
      );
    }
    if (heading.includes('wiring') || heading.includes('cord')) {
      suggestions.push(
        { text: 'Are all electrical cords in good condition without fraying?', options: formats },
        { text: 'Are extension cords used as temporary solutions only?', options: formats },
        { text: 'Are electrical outlets not overloaded?', options: formats },
        { text: 'Is all wiring properly secured and protected?', options: formats }
      );
    }
    if (heading.includes('ground')) {
      suggestions.push(
        { text: 'Are all electrical systems properly grounded?', options: formats },
        { text: 'Are ground fault circuit interrupters (GFCI) installed where required?', options: formats },
        { text: 'Is grounding equipment regularly tested?', options: formats }
      );
    }
  }
  
  // Structural Safety suggestions
  if (context.includes('structural') || context.includes('Structural')) {
    suggestions.push(
      { text: 'Are there any visible cracks in walls, floors, or ceilings?', options: formats },
      { text: 'Are load-bearing structures regularly inspected?', options: formats },
      { text: 'Is there evidence of water damage or deterioration?', options: formats },
      { text: 'Are structural modifications properly documented and approved?', options: formats }
    );
  }
  
  // Health & Hygiene suggestions
  if (context.includes('health') || context.includes('Health')) {
    suggestions.push(
      { text: 'Are hand washing facilities available and functional?', options: formats },
      { text: 'Are first aid kits stocked and accessible?', options: formats },
      { text: 'Is there adequate ventilation in all work areas?', options: formats },
      { text: 'Are personal protective equipment (PPE) requirements posted?', options: formats },
      { text: 'Are restrooms clean and properly maintained?', options: formats }
    );
  }
  
  // Gas Safety suggestions
  if (context.includes('gas') || context.includes('Gas')) {
    suggestions.push(
      { text: 'Are gas cylinders properly secured and stored upright?', options: formats },
      { text: 'Are gas leak detectors installed and functional?', options: formats },
      { text: 'Is there proper ventilation in areas with gas equipment?', options: formats },
      { text: 'Are gas lines regularly inspected for leaks?', options: formats },
      { text: 'Are emergency shutoff valves clearly marked and accessible?', options: formats }
    );
  }
  
  // USC/General Safety suggestions
  if (context.includes('USC') || context.includes('workplace')) {
    if (heading.includes('smoking')) {
      suggestions.push(
        { text: 'Are designated smoking areas provided and clearly marked?', options: formats },
        { text: 'Is smoking prohibited in hazardous areas?', options: formats }
      );
    }
    if (heading.includes('housekeeping') || heading.includes('clean')) {
      suggestions.push(
        { text: 'Are work areas kept clean and orderly?', options: formats },
        { text: 'Are aisles and walkways clear of obstructions?', options: formats },
        { text: 'Is waste disposed of properly and regularly?', options: formats }
      );
    }
  }
  
  // Emergency Power suggestions
  if (context.includes('emergency-power') || context.includes('Emergency power')) {
    suggestions.push(
      { text: 'Is the emergency generator tested monthly?', options: formats },
      { text: 'Is fuel supply adequate for required runtime?', options: formats },
      { text: 'Are automatic transfer switches functional?', options: formats },
      { text: 'Are emergency lighting systems operational?', options: formats }
    );
  }
  
  // Filter out items that are too similar to existing items
  const filtered = suggestions.filter(suggestion => {
    const similar = existingItems.some(existing => 
      similarity(suggestion.text, existing) > 0.7
    );
    return !similar;
  });
  
  // Return top 10 suggestions
  return filtered.slice(0, 10);
}

// Simple similarity check (Jaccard similarity)
function similarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

module.exports = { setupChecklistSuggestionsRoutes };
