// ─── Shared ward list ─────────────────────────────────────────────────────────
// Single source of truth for all wards. Both CreateGroup and OnboardingWard
// import from here. To add a new ward, add one entry to WARD_DATA below.

export interface WardEntry {
  name: string;
  city?: string;
  type: "YSA" | "SA" | "MSA" | "Branch";
  state: string;
  region: string;
}

export const WARD_DATA: WardEntry[] = [
  // ── California · Orange County ──────────────────────────────────────────
  { state: "California", region: "Orange County", name: "Huntington Beach YSA",      city: "Huntington Beach", type: "YSA" },
  { state: "California", region: "Orange County", name: "Huntington Beach SA",       city: "Huntington Beach", type: "SA"  },
  { state: "California", region: "Orange County", name: "Heritage Park Mid-Singles", city: "Orange County",    type: "MSA" },
  { state: "California", region: "Orange County", name: "Heritage Park SA",          city: "Orange County",    type: "SA"  },
  { state: "California", region: "Orange County", name: "Newport Area YSA",          city: "Newport Beach",    type: "YSA" },
  { state: "California", region: "Orange County", name: "Irvine Area YSA",           city: "Irvine",           type: "YSA" },
  { state: "California", region: "Orange County", name: "San Clemente YSA",          city: "San Clemente",     type: "YSA" },

  // ── California · Los Angeles ────────────────────────────────────────────
  { state: "California", region: "Los Angeles", name: "Santa Monica YSA",       city: "Santa Monica",  type: "YSA" },
  { state: "California", region: "Los Angeles", name: "Santa Monica 3rd YSA",   city: "Santa Monica",  type: "YSA" },
  { state: "California", region: "Los Angeles", name: "South Bay YSA",          city: "Torrance",      type: "YSA" },
  { state: "California", region: "Los Angeles", name: "San Gabriel Valley YSA", city: "San Gabriel",   type: "YSA" },
  { state: "California", region: "Los Angeles", name: "Los Angeles 1st YSA",    city: "Los Angeles",   type: "YSA" },
  { state: "California", region: "Los Angeles", name: "UCLA Ward",              city: "Westwood",      type: "YSA" },
  { state: "California", region: "Los Angeles", name: "USC Ward",               city: "Los Angeles",   type: "YSA" },
  { state: "California", region: "Los Angeles", name: "West Valley YSA",        city: "West Hills",    type: "YSA" },
  { state: "California", region: "Los Angeles", name: "Chatsworth 3rd YSA",     city: "Chatsworth",    type: "YSA" },
  { state: "California", region: "Los Angeles", name: "Santa Clarita 2nd YSA",  city: "Santa Clarita", type: "YSA" },
  { state: "California", region: "Los Angeles", name: "Los Angeles Midsingles",  city: "Los Angeles",   type: "MSA" },
  { state: "California", region: "Los Angeles", name: "Glendale SA Ward",       city: "Glendale",      type: "SA"  },
  { state: "California", region: "Los Angeles", name: "Glendale Single Adult",  city: "Glendale",      type: "SA"  },

  // ── California · Inland Empire ──────────────────────────────────────────
  { state: "California", region: "Inland Empire", name: "Inland Empire YSA",         city: "Rancho Cucamonga", type: "YSA" },
  { state: "California", region: "Inland Empire", name: "Inland Empire Mid-Singles",  city: "Rancho Cucamonga", type: "MSA" },
  { state: "California", region: "Inland Empire", name: "Corona Single Adult",        city: "Corona",           type: "SA"  },
  { state: "California", region: "Inland Empire", name: "Chino Valley YSA",           city: "Chino",            type: "YSA" },
  { state: "California", region: "Inland Empire", name: "Claremont 3rd YSA",          city: "Claremont",        type: "YSA" },
  { state: "California", region: "Inland Empire", name: "Riverside 1st YSA",          city: "Riverside",        type: "YSA" },

  // ── California · San Diego ──────────────────────────────────────────────
  { state: "California", region: "San Diego", name: "San Diego Bay YSA",   city: "San Diego", type: "YSA" },
  { state: "California", region: "San Diego", name: "Cowles Mountain YSA", city: "San Diego", type: "YSA" },

  // ── California · Sacramento ─────────────────────────────────────────────
  { state: "California", region: "Sacramento", name: "Folsom Lake YSA", city: "Folsom", type: "YSA" },

  // ── California · Bay Area ───────────────────────────────────────────────
  { state: "California", region: "Bay Area", name: "Berkeley YSA",       city: "Berkeley",  type: "YSA" },
  { state: "California", region: "Bay Area", name: "Antioch YSA",        city: "Antioch",   type: "YSA" },
  { state: "California", region: "Bay Area", name: "Silicon Valley YSA", city: "San Jose",  type: "YSA" },
  { state: "California", region: "Bay Area", name: "Stanford Singles",   city: "Palo Alto", type: "YSA" },
  { state: "California", region: "Bay Area", name: "East Bay Singles",   city: "Oakland",   type: "SA"  },

  // ── Nevada · Las Vegas ──────────────────────────────────────────────────
  { state: "Nevada", region: "Las Vegas", name: "Redrock YSA Ward",           city: "Las Vegas", type: "YSA"    },
  { state: "Nevada", region: "Las Vegas", name: "Robindale YSA Ward",         city: "Las Vegas", type: "YSA"    },
  { state: "Nevada", region: "Las Vegas", name: "Virgin Valley YSA Branch",   city: "Mesquite",  type: "Branch" },
  { state: "Nevada", region: "Las Vegas", name: "Las Vegas Single Adult Ward", city: "Las Vegas", type: "SA"    },
  { state: "Nevada", region: "Las Vegas", name: "Las Vegas Mid-Singles",      city: "Las Vegas", type: "MSA"    },
];

export const ALL_US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

export const STATES_WITH_WARDS = [...new Set(WARD_DATA.map((w) => w.state))];
