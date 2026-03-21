export const sampleTripSource = {
  metadata: {
    title: 'Mykonos + Marrakech Honeymoon',
    dateRangeLabel: 'June 14 - June 27, 2026',
    timezone: 'America/Los_Angeles',
    tripStartDate: '2026-06-14',
    tripEndDate: '2026-06-27'
  },
  themeBands: [
    { id: 'pretrip', startDate: null, endDate: '2026-06-13', homeMode: 'countdown', headline: 'Countdown to Mykonos', accentLabel: 'The trip starts June 14', assetKey: 'pretrip' },
    { id: 'mykonos', startDate: '2026-06-14', endDate: '2026-06-20', homeMode: 'welcome', headline: 'Welcome to Mykonos', accentLabel: 'Aegean days', assetKey: 'mykonos' },
    { id: 'marrakech', startDate: '2026-06-21', endDate: '2026-06-27', homeMode: 'welcome', headline: 'Welcome to Marrakech', accentLabel: 'Lantern nights', assetKey: 'marrakech' },
    { id: 'posttrip', startDate: '2026-06-28', endDate: null, homeMode: 'welcome', headline: 'Welcome home', accentLabel: 'Keep the memories close', assetKey: 'posttrip' }
  ],
  days: [
    { date: '2026-06-14', title: 'Departure + Logistics', summary: 'Rental car, airport handoff, and overnight flight to Greece' },
    { date: '2026-06-15', title: 'Arrival in Mykonos', summary: 'Landing day and first night on the island' },
    { date: '2026-06-16', title: 'Mykonos', summary: 'Island day' }
  ],
  events: [
    {
      id: 'flight-1',
      type: 'flight',
      title: 'Portland to Mykonos',
      provider: 'Lufthansa Group',
      confirmationCode: '8Z2MA2',
      startDate: '2026-06-14',
      endDate: '2026-06-15',
      startLabel: 'Departs 3:25 PM (PDX)',
      endLabel: 'Arrive 6:20 PM local',
      location: 'PDX -> YVR -> MUC -> JMK',
      duration: '16h 55m',
      cabin: 'Economy + Business',
      details: ['Booking reference for all segments: 8Z2MA2'],
      layovers: ['Vancouver (YVR): 1h 56m'],
      segments: [
        {
          from: 'Portland (PDX)',
          to: 'Vancouver (YVR)',
          departureLabel: '15:25 Portland (PDX)',
          arrivalLabel: '16:44 Vancouver (YVR)',
          equipment: 'De Havilland DHC-8 400',
          airline: 'Air Canada',
          cabin: 'Economy'
        }
      ]
    }
  ],
  reservations: [],
  essentials: []
};
