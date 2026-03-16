/**
 * NYC Council District data — 51 districts with council member info.
 * Used for auto-tagging the responsible council member based on lat/lng.
 * 
 * Boundaries are simplified bounding boxes. For production, use the
 * actual GeoJSON from NYC Open Data (872g-cjhh) and point-in-polygon.
 * For the MVP, we use the neighborhood-to-district mapping which is
 * accurate enough for day 1.
 */

export interface CouncilMember {
  district: number;
  name: string;
  borough: string;
  party: string;
  neighborhoods: string[];
  twitterHandle?: string;
}

// Full 51-member council as of March 2026
export const NYC_COUNCIL_MEMBERS: CouncilMember[] = [
  { district: 1, name: "Christopher Marte", borough: "Manhattan", party: "D", neighborhoods: ["Financial District", "Battery Park City", "Tribeca", "SoHo", "Little Italy", "Chinatown", "Lower East Side"], twitterHandle: "@CMChrisMarte" },
  { district: 2, name: "Harvey Epstein", borough: "Manhattan", party: "D", neighborhoods: ["Greenwich Village", "East Village", "Gramercy", "Murray Hill", "Kips Bay", "Flatiron", "Union Square"], twitterHandle: "@HarveyForNY" },
  { district: 3, name: "Vacant", borough: "Manhattan", party: "", neighborhoods: ["West Village", "Chelsea", "Hudson Yards", "Hell's Kitchen", "Garment District", "Times Square"], twitterHandle: "" },
  { district: 4, name: "Virginia Maloney", borough: "Manhattan", party: "D", neighborhoods: ["Midtown", "Stuyvesant Town", "Peter Cooper Village", "East Midtown", "Turtle Bay", "Upper East Side"], twitterHandle: "" },
  { district: 5, name: "Julie Menin", borough: "Manhattan", party: "D", neighborhoods: ["Upper East Side", "Lenox Hill", "Yorkville", "Carnegie Hill", "Roosevelt Island"], twitterHandle: "@JulieMenin" },
  { district: 6, name: "Gale A. Brewer", borough: "Manhattan", party: "D", neighborhoods: ["Upper West Side", "Lincoln Square", "Central Park"], twitterHandle: "@gaborewermanh" },
  { district: 7, name: "Shaun Abreu", borough: "Manhattan", party: "D", neighborhoods: ["Morningside Heights", "Manhattanville", "West Harlem", "Hamilton Heights", "Sugar Hill", "Washington Heights"], twitterHandle: "@ShaunAbreu" },
  { district: 8, name: "Elsie Encarnacion", borough: "Manhattan", party: "D", neighborhoods: ["East Harlem", "Mott Haven", "Port Morris", "Melrose", "Concourse"], twitterHandle: "" },
  { district: 9, name: "Yusef Salaam", borough: "Manhattan", party: "D", neighborhoods: ["Harlem", "East Harlem", "Manhattanville"], twitterHandle: "@draboringdrsalaam" },
  { district: 10, name: "Carmen De La Rosa", borough: "Manhattan", party: "D", neighborhoods: ["Washington Heights", "Inwood", "Marble Hill"], twitterHandle: "@CDelaRosaNYC" },
  { district: 11, name: "Eric Dinowitz", borough: "Bronx", party: "D", neighborhoods: ["Bedford Park", "Norwood", "Kingsbridge", "Riverdale", "Wakefield", "Woodlawn"], twitterHandle: "@EricDinworitzNY" },
  { district: 12, name: "Kevin C. Riley", borough: "Bronx", party: "D", neighborhoods: ["Williamsbridge", "Eastchester", "Edenwald", "Baychester", "Wakefield", "Co-op City"], twitterHandle: "@CMKevinRiley" },
  { district: 13, name: "Shirley Aldebol", borough: "Bronx", party: "D", neighborhoods: ["Throggs Neck", "Pelham Bay", "Morris Park", "Country Club", "City Island"], twitterHandle: "" },
  { district: 14, name: "Pierina Ana Sanchez", borough: "Bronx", party: "D", neighborhoods: ["University Heights", "Morris Heights", "Fordham", "Mount Hope"], twitterHandle: "@CMPierinaNYC" },
  { district: 15, name: "Oswald Feliz", borough: "Bronx", party: "D", neighborhoods: ["East Tremont", "Belmont", "Bathgate", "Crotona Park", "Mount Eden", "West Farms"], twitterHandle: "@OswaldFelizNYC" },
  { district: 16, name: "Althea Stevens", borough: "Bronx", party: "D", neighborhoods: ["Morrisania", "Claremont", "Highbridge", "Concourse Village"], twitterHandle: "@CMAltheaStevens" },
  { district: 17, name: "Justin Sanchez", borough: "Bronx", party: "D", neighborhoods: ["Mott Haven", "Hunts Point", "Longwood", "Crotona Park East", "Soundview"], twitterHandle: "" },
  { district: 18, name: "Amanda Farías", borough: "Bronx", party: "D", neighborhoods: ["Soundview", "Castle Hill", "Parkchester", "Westchester Square", "Clason Point"], twitterHandle: "@AmandaFariasNYC" },
  { district: 19, name: "Vickie Paladino", borough: "Queens", party: "R", neighborhoods: ["College Point", "Whitestone", "Bayside", "Douglaston", "Little Neck", "Auburndale"], twitterHandle: "@VickiePaladino" },
  { district: 20, name: "Sandra Ung", borough: "Queens", party: "D", neighborhoods: ["Flushing", "Murray Hill", "Queensboro Hill", "Fresh Meadows"], twitterHandle: "@CMSandraUng" },
  { district: 21, name: "Shanel Thomas-Henry", borough: "Queens", party: "D", neighborhoods: ["Astoria", "Jackson Heights", "East Elmhurst", "Corona", "Elmhurst"], twitterHandle: "" },
  { district: 22, name: "Tiffany Cabán", borough: "Queens", party: "D", neighborhoods: ["Astoria", "Queensbridge", "Rikers Island", "Jackson Heights", "East Elmhurst"], twitterHandle: "@TiffanyCabanNYC" },
  { district: 23, name: "Linda Lee", borough: "Queens", party: "D", neighborhoods: ["Fresh Meadows", "Jamaica Estates", "Bayside", "Douglaston", "Oakland Gardens", "Hollis", "Queens Village"], twitterHandle: "@CMLindalee" },
  { district: 24, name: "James F. Gennaro", borough: "Queens", party: "D", neighborhoods: ["Rego Park", "Forest Hills", "Kew Gardens Hills", "Jamaica Estates", "Jamaica Hills", "Briarwood"], twitterHandle: "@JimGennaro" },
  { district: 25, name: "Shekar Krishnan", borough: "Queens", party: "D", neighborhoods: ["Jackson Heights", "Elmhurst", "Woodside"], twitterHandle: "@CMShekar25" },
  { district: 26, name: "Julie Won", borough: "Queens", party: "D", neighborhoods: ["Long Island City", "Sunnyside", "Woodside", "Maspeth"], twitterHandle: "@JulieWonNYC" },
  { district: 27, name: "Nantasha Williams", borough: "Queens", party: "D", neighborhoods: ["Jamaica", "South Jamaica", "Springfield Gardens", "St. Albans", "Hollis", "Cambria Heights", "Laurelton"], twitterHandle: "@CMNantashaW" },
  { district: 28, name: "Ty Hankerson", borough: "Queens", party: "D", neighborhoods: ["South Ozone Park", "Jamaica", "South Jamaica", "Springfield Gardens"], twitterHandle: "" },
  { district: 29, name: "Lynn Schulman", borough: "Queens", party: "D", neighborhoods: ["Rego Park", "Forest Hills", "Kew Gardens", "Richmond Hill", "South Richmond Hill"], twitterHandle: "@LynnSchulmanNYC" },
  { district: 30, name: "Phil Wong", borough: "Queens", party: "D", neighborhoods: ["Maspeth", "Middle Village", "Glendale", "Ridgewood", "Elmhurst"], twitterHandle: "" },
  { district: 31, name: "Selvena N. Brooks-Powers", borough: "Queens", party: "D", neighborhoods: ["Arverne", "Far Rockaway", "Laurelton", "Rosedale", "Springfield Gardens"], twitterHandle: "@CMBrooksPowers" },
  { district: 32, name: "Joann Ariola", borough: "Queens", party: "R", neighborhoods: ["Ozone Park", "Woodhaven", "Howard Beach", "Rockaway Beach", "Broad Channel", "Breezy Point"], twitterHandle: "@JoannAriolaNYC" },
  { district: 33, name: "Lincoln Restler", borough: "Brooklyn", party: "D", neighborhoods: ["Greenpoint", "Williamsburg", "Brooklyn Heights", "Downtown Brooklyn", "DUMBO", "Boerum Hill", "Vinegar Hill"], twitterHandle: "@LincolnRestler" },
  { district: 34, name: "Jennifer Gutiérrez", borough: "Brooklyn", party: "D", neighborhoods: ["Williamsburg", "South Williamsburg", "East Williamsburg", "Bushwick", "Ridgewood"], twitterHandle: "@CMJGutiérrez" },
  { district: 35, name: "Crystal Hudson", borough: "Brooklyn", party: "D", neighborhoods: ["Fort Greene", "Clinton Hill", "Prospect Heights", "Crown Heights"], twitterHandle: "@CMCrystalHudson" },
  { district: 36, name: "Chi Ossé", borough: "Brooklyn", party: "D", neighborhoods: ["Bedford-Stuyvesant", "Crown Heights"], twitterHandle: "@ChiOsse" },
  { district: 37, name: "Sandy Nurse", borough: "Brooklyn", party: "D", neighborhoods: ["Bushwick", "Cypress Hills", "East New York", "Ocean Hill", "Brownsville"], twitterHandle: "@CMSandyNurse" },
  { district: 38, name: "Alexa Avilés", borough: "Brooklyn", party: "D", neighborhoods: ["Red Hook", "Gowanus", "Park Slope", "Sunset Park", "Borough Park", "Dyker Heights", "Bensonhurst"], twitterHandle: "@CMAlexaAviles" },
  { district: 39, name: "Shahana Hanif", borough: "Brooklyn", party: "D", neighborhoods: ["Kensington", "Borough Park", "Windsor Terrace", "Park Slope", "Gowanus", "Carroll Gardens", "Cobble Hill", "Boerum Hill"], twitterHandle: "@ShahanaFromBK" },
  { district: 40, name: "Rita Joseph", borough: "Brooklyn", party: "D", neighborhoods: ["Crown Heights", "Prospect Lefferts Gardens", "Flatbush", "Ditmas Park", "East Flatbush", "Kensington"], twitterHandle: "@CMRitaJoseph" },
  { district: 41, name: "Darlene Mealy", borough: "Brooklyn", party: "D", neighborhoods: ["Bedford-Stuyvesant", "Crown Heights", "Brownsville", "Ocean Hill", "East Flatbush"], twitterHandle: "@DarleneMealy" },
  { district: 42, name: "Chris Banks", borough: "Brooklyn", party: "D", neighborhoods: ["East New York", "Spring Creek", "Brownsville", "East Flatbush", "Canarsie"], twitterHandle: "@CMChrisBanks42" },
  { district: 43, name: "Susan Zhuang", borough: "Brooklyn", party: "D", neighborhoods: ["Sunset Park", "Dyker Heights", "Bensonhurst", "Bath Beach", "Gravesend", "Borough Park"], twitterHandle: "@CMSusanZhuang" },
  { district: 44, name: "Simcha Felder", borough: "Brooklyn", party: "D", neighborhoods: ["Borough Park", "Flatbush", "Gravesend", "Mapleton", "Midwood"], twitterHandle: "" },
  { district: 45, name: "Farah N. Louis", borough: "Brooklyn", party: "D", neighborhoods: ["Flatbush", "Midwood", "East Flatbush", "Flatlands", "Marine Park", "Canarsie"], twitterHandle: "@CMFarahLouis" },
  { district: 46, name: "Mercedes Narcisse", borough: "Brooklyn", party: "D", neighborhoods: ["Bergen Beach", "Canarsie", "Flatlands", "Gerritsen Beach", "Marine Park", "Mill Basin", "Sheepshead Bay"], twitterHandle: "@CMNarcisse46" },
  { district: 47, name: "Kayla Santosuosso", borough: "Brooklyn", party: "D", neighborhoods: ["Bay Ridge", "Coney Island", "Dyker Heights", "Gravesend", "Bath Beach"], twitterHandle: "" },
  { district: 48, name: "Inna Vernikov", borough: "Brooklyn", party: "R", neighborhoods: ["Brighton Beach", "Midwood", "Gravesend", "Sheepshead Bay", "Manhattan Beach", "Coney Island"], twitterHandle: "@InnaVernikov" },
  { district: 49, name: "Kamillah Hanks", borough: "Staten Island", party: "D", neighborhoods: ["St. George", "Tompkinsville", "Stapleton", "New Brighton", "Port Richmond", "West New Brighton"], twitterHandle: "@KamillahHanks" },
  { district: 50, name: "David Carr", borough: "Staten Island", party: "R", neighborhoods: ["Bay Ridge", "Fort Hamilton", "Dongan Hills", "Midland Beach", "South Beach", "New Dorp", "Todt Hill"], twitterHandle: "@DavidCarr50" },
  { district: 51, name: "Frank Morano", borough: "Staten Island", party: "R", neighborhoods: ["Great Kills", "Tottenville", "Annadale", "Arden Heights", "Rossville", "Huguenot"], twitterHandle: "@FrankMorano51" },
];

/**
 * Find the council member for a given neighborhood string.
 * Matches against the neighborhoods array of each council member.
 * Returns the best match or null.
 */
export function getCouncilMemberByNeighborhood(neighborhood: string): CouncilMember | null {
  if (!neighborhood) return null;
  
  const lowerHood = neighborhood.toLowerCase().replace(/[,\-]/g, " ").trim();
  
  // Try exact substring match first
  for (const cm of NYC_COUNCIL_MEMBERS) {
    for (const n of cm.neighborhoods) {
      if (lowerHood.includes(n.toLowerCase()) || n.toLowerCase().includes(lowerHood.split(",")[0].trim())) {
        return cm;
      }
    }
  }
  
  // Try partial word match
  const words = lowerHood.split(/\s+/).filter(w => w.length > 3);
  for (const cm of NYC_COUNCIL_MEMBERS) {
    for (const n of cm.neighborhoods) {
      const nLower = n.toLowerCase();
      if (words.some(w => nLower.includes(w))) {
        return cm;
      }
    }
  }
  
  return null;
}

/**
 * Get council member by borough as a fallback.
 * Returns the first member for that borough.
 */
export function getCouncilMembersByBorough(borough: string): CouncilMember[] {
  return NYC_COUNCIL_MEMBERS.filter(
    cm => cm.borough.toLowerCase() === borough.toLowerCase()
  );
}
