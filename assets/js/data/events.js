/* ==========================================================================
   OUR JOURNEY — event archive
   --------------------------------------------------------------------------
   Add events in any order; the site sorts them chronologically and gives each
   one its own scene. Only `title`, `date` and `type` are required.

   {
     id:          "ideathon-2025",               // unique, used for #event-<id> links
     title:       "Event name",
     date:        "2025-03-14",                  // YYYY-MM-DD
     endDate:     "2025-03-15",                  // optional, for multi-day events
     type:        "hackathon",                   // hackathon | workshop | outreach | talk | competition | milestone
     venue:       "Vel Tech, Avadi",
     summary:     "One-line hook, shown large.",
     description: "The story of the event. Separate paragraphs with a blank line.",
     outcomes:    ["Real outcome", "Another real outcome"],
     role:        "Organising lead",             // optional — your role, if you want it shown
     photos:      [{ src: "assets/img/events/ideathon-2025/01.jpg", alt: "Describe the photo" }],
     poster:      { src: "assets/img/events/ideathon-2025/poster.jpg", alt: "Event poster" },
     links:       [{ label: "Recap post", href: "https://..." }]
   }

   Only real events, dates and outcomes go here. To preview the layouts before
   any events are added, open the site with ?preview=journey
   ========================================================================== */

window.SSIT_EVENTS = [];
