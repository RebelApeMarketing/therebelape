export interface CityData {
  name: string;
  state: string;
  stateAbbr: string;
  region: string;
  slug: string;
}

export const cities: Record<string, CityData> = {
  // Utah Cities
  ogden: {
    name: "Ogden",
    state: "Utah",
    stateAbbr: "UT",
    region: "Northern Utah",
    slug: "ogden",
  },
  saltLakeCity: {
    name: "Salt Lake City",
    state: "Utah",
    stateAbbr: "UT",
    region: "Salt Lake Valley",
    slug: "salt-lake-city",
  },
  provo: {
    name: "Provo",
    state: "Utah",
    stateAbbr: "UT",
    region: "Utah Valley",
    slug: "provo",
  },
  orem: {
    name: "Orem",
    state: "Utah",
    stateAbbr: "UT",
    region: "Utah Valley",
    slug: "orem",
  },
  westValleyCity: {
    name: "West Valley City",
    state: "Utah",
    stateAbbr: "UT",
    region: "Salt Lake Valley",
    slug: "west-valley-city",
  },
  westJordan: {
    name: "West Jordan",
    state: "Utah",
    stateAbbr: "UT",
    region: "Salt Lake Valley",
    slug: "west-jordan",
  },
  sandy: {
    name: "Sandy",
    state: "Utah",
    stateAbbr: "UT",
    region: "Salt Lake Valley",
    slug: "sandy",
  },
  southJordan: {
    name: "South Jordan",
    state: "Utah",
    stateAbbr: "UT",
    region: "Salt Lake Valley",
    slug: "south-jordan",
  },
  murray: {
    name: "Murray",
    state: "Utah",
    stateAbbr: "UT",
    region: "Salt Lake Valley",
    slug: "murray",
  },
  layton: {
    name: "Layton",
    state: "Utah",
    stateAbbr: "UT",
    region: "Northern Utah",
    slug: "layton",
  },
  logan: {
    name: "Logan",
    state: "Utah",
    stateAbbr: "UT",
    region: "Cache Valley",
    slug: "logan",
  },
  roy: {
    name: "Roy",
    state: "Utah",
    stateAbbr: "UT",
    region: "Northern Utah",
    slug: "roy",
  },
  clearfield: {
    name: "Clearfield",
    state: "Utah",
    stateAbbr: "UT",
    region: "Northern Utah",
    slug: "clearfield",
  },
  bountiful: {
    name: "Bountiful",
    state: "Utah",
    stateAbbr: "UT",
    region: "Northern Utah",
    slug: "bountiful",
  },
  farmington: {
    name: "Farmington",
    state: "Utah",
    stateAbbr: "UT",
    region: "Northern Utah",
    slug: "farmington",
  },
  brighamCity: {
    name: "Brigham City",
    state: "Utah",
    stateAbbr: "UT",
    region: "Northern Utah",
    slug: "brigham-city",
  },

  // Nevada Cities
  lasVegas: {
    name: "Las Vegas",
    state: "Nevada",
    stateAbbr: "NV",
    region: "Southern Nevada",
    slug: "las-vegas",
  },
  reno: {
    name: "Reno",
    state: "Nevada",
    stateAbbr: "NV",
    region: "Northern Nevada",
    slug: "reno",
  },
};

// Helper function to get city data by slug
export function getCityBySlug(slug: string): CityData | undefined {
  return Object.values(cities).find(city => city.slug === slug);
}

// Helper function to get all cities by state
export function getCitiesByState(stateAbbr: string): CityData[] {
  return Object.values(cities).filter(city => city.stateAbbr === stateAbbr);
}
