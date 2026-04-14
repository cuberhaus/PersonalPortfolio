/** Mock data for the SBC Trip Planner expert system demo. */

export interface City {
  id: string;
  name: string;
  continent: string;
  population: number;
}

export interface Accommodation {
  id: string;
  name: string;
  cityId: string;
  kind: string;
  stars: number;
  distanceToCenter: number;
  pricePerNight: number;
}

export interface Activity {
  id: string;
  name: string;
  cityId: string;
  category: string;
  durationPct: number;
  price: number;
}

export interface Transport {
  id: string;
  name: string;
  fromCityId: string;
  toCityId: string;
  mode: string;
  price: number;
  duration: number;
}

export const CITIES: City[] = [
  { id: "paris", name: "Paris", continent: "Europa", population: 2_161_000 },
  { id: "roma", name: "Roma", continent: "Europa", population: 2_873_000 },
  { id: "barcelona", name: "Barcelona", continent: "Europa", population: 1_620_000 },
  { id: "nueva_york", name: "Nueva York", continent: "America", population: 8_336_000 },
  { id: "kioto", name: "Kioto", continent: "Asia", population: 1_475_000 },
  { id: "cancun", name: "Cancún", continent: "America", population: 888_000 },
  { id: "amsterdam", name: "Amsterdam", continent: "Europa", population: 872_000 },
  { id: "granada", name: "Granada", continent: "Europa", population: 232_000 },
  { id: "venecia", name: "Venecia", continent: "Europa", population: 261_000 },
  { id: "miami", name: "Miami", continent: "America", population: 442_000 },
  { id: "praga", name: "Praga", continent: "Europa", population: 1_309_000 },
  { id: "las_vegas", name: "Las Vegas", continent: "America", population: 641_000 },
];

export const ACCOMMODATIONS: Accommodation[] = [
  { id: "h1", name: "Hôtel Le Marais", cityId: "paris", kind: "Hotel", stars: 4, distanceToCenter: 0.5, pricePerNight: 180 },
  { id: "h2", name: "Paris Budget Inn", cityId: "paris", kind: "Hotel", stars: 2, distanceToCenter: 3.0, pricePerNight: 65 },
  { id: "h3", name: "Colosseo Grand", cityId: "roma", kind: "Hotel", stars: 4, distanceToCenter: 0.8, pricePerNight: 160 },
  { id: "h4", name: "Roma Hostel", cityId: "roma", kind: "Albergue", stars: 1, distanceToCenter: 1.2, pricePerNight: 35 },
  { id: "h5", name: "Hotel Arts", cityId: "barcelona", kind: "Hotel", stars: 5, distanceToCenter: 0.3, pricePerNight: 250 },
  { id: "h6", name: "Barri Gòtic B&B", cityId: "barcelona", kind: "Hotel", stars: 3, distanceToCenter: 0.4, pricePerNight: 95 },
  { id: "h7", name: "Manhattan Suites", cityId: "nueva_york", kind: "Hotel", stars: 4, distanceToCenter: 1.0, pricePerNight: 220 },
  { id: "h8", name: "Ryokan Zen", cityId: "kioto", kind: "Hotel", stars: 4, distanceToCenter: 0.6, pricePerNight: 140 },
  { id: "h9", name: "Cancún Beach Resort", cityId: "cancun", kind: "Resort", stars: 5, distanceToCenter: 2.0, pricePerNight: 200 },
  { id: "h10", name: "Canal View Hotel", cityId: "amsterdam", kind: "Hotel", stars: 3, distanceToCenter: 0.5, pricePerNight: 130 },
  { id: "h11", name: "Alhambra Palace", cityId: "granada", kind: "Hotel", stars: 4, distanceToCenter: 0.7, pricePerNight: 120 },
  { id: "h12", name: "Venice Charm", cityId: "venecia", kind: "Hotel", stars: 3, distanceToCenter: 0.3, pricePerNight: 150 },
  { id: "h13", name: "Miami Beachfront", cityId: "miami", kind: "Resort", stars: 4, distanceToCenter: 1.5, pricePerNight: 190 },
  { id: "h14", name: "Old Town Pension", cityId: "praga", kind: "Hotel", stars: 3, distanceToCenter: 0.4, pricePerNight: 75 },
  { id: "h15", name: "Vegas Strip Hotel", cityId: "las_vegas", kind: "Hotel", stars: 4, distanceToCenter: 0.2, pricePerNight: 170 },
];

export const ACTIVITIES: Activity[] = [
  { id: "a1", name: "Louvre Museum", cityId: "paris", category: "Cultural", durationPct: 30, price: 17 },
  { id: "a2", name: "Seine River Cruise", cityId: "paris", category: "Relax", durationPct: 15, price: 15 },
  { id: "a3", name: "Eiffel Tower", cityId: "paris", category: "Visita_monumento", durationPct: 20, price: 26 },
  { id: "a4", name: "Colosseum Tour", cityId: "roma", category: "Cultural", durationPct: 25, price: 16 },
  { id: "a5", name: "Vatican Museums", cityId: "roma", category: "Visita_museo", durationPct: 30, price: 20 },
  { id: "a6", name: "Trastevere Food Tour", cityId: "roma", category: "Gastronomica", durationPct: 20, price: 45 },
  { id: "a7", name: "Sagrada Familia", cityId: "barcelona", category: "Visita_monumento", durationPct: 20, price: 26 },
  { id: "a8", name: "Barceloneta Beach", cityId: "barcelona", category: "Relax", durationPct: 15, price: 0 },
  { id: "a9", name: "Gothic Quarter Walk", cityId: "barcelona", category: "Cultural", durationPct: 15, price: 0 },
  { id: "a10", name: "Central Park Walk", cityId: "nueva_york", category: "Relax", durationPct: 15, price: 0 },
  { id: "a11", name: "MoMA", cityId: "nueva_york", category: "Visita_museo", durationPct: 25, price: 25 },
  { id: "a12", name: "Fushimi Inari Shrine", cityId: "kioto", category: "Visita_monumento", durationPct: 25, price: 0 },
  { id: "a13", name: "Tea Ceremony", cityId: "kioto", category: "Cultural", durationPct: 15, price: 30 },
  { id: "a14", name: "Snorkeling", cityId: "cancun", category: "Aventura", durationPct: 20, price: 50 },
  { id: "a15", name: "Beach Day", cityId: "cancun", category: "Relax", durationPct: 25, price: 0 },
  { id: "a16", name: "Anne Frank House", cityId: "amsterdam", category: "Visita_museo", durationPct: 20, price: 16 },
  { id: "a17", name: "Canal Cruise", cityId: "amsterdam", category: "Relax", durationPct: 15, price: 18 },
  { id: "a18", name: "Alhambra Visit", cityId: "granada", category: "Visita_monumento", durationPct: 30, price: 14 },
  { id: "a19", name: "Gondola Ride", cityId: "venecia", category: "Relax", durationPct: 15, price: 80 },
  { id: "a20", name: "St. Mark's Basilica", cityId: "venecia", category: "Visita_monumento", durationPct: 20, price: 0 },
  { id: "a21", name: "Everglades Tour", cityId: "miami", category: "Aventura", durationPct: 25, price: 45 },
  { id: "a22", name: "Prague Castle", cityId: "praga", category: "Visita_monumento", durationPct: 25, price: 12 },
  { id: "a23", name: "Casino Night", cityId: "las_vegas", category: "Ocio_Nocturno", durationPct: 20, price: 0 },
];

export const TRANSPORTS: Transport[] = [
  { id: "t1", name: "Flight Paris→Roma", fromCityId: "paris", toCityId: "roma", mode: "Avion", price: 85, duration: 2 },
  { id: "t2", name: "Train Paris→Barcelona", fromCityId: "paris", toCityId: "barcelona", mode: "Tren", price: 60, duration: 6 },
  { id: "t3", name: "Train Paris→Amsterdam", fromCityId: "paris", toCityId: "amsterdam", mode: "Tren", price: 40, duration: 3 },
  { id: "t4", name: "Flight Roma→Barcelona", fromCityId: "roma", toCityId: "barcelona", mode: "Avion", price: 70, duration: 2 },
  { id: "t5", name: "Flight Barcelona→Paris", fromCityId: "barcelona", toCityId: "paris", mode: "Avion", price: 80, duration: 2 },
  { id: "t6", name: "Flight Paris→New York", fromCityId: "paris", toCityId: "nueva_york", mode: "Avion", price: 350, duration: 8 },
  { id: "t7", name: "Flight Barcelona→Roma", fromCityId: "barcelona", toCityId: "roma", mode: "Avion", price: 65, duration: 2 },
  { id: "t8", name: "Train Roma→Venecia", fromCityId: "roma", toCityId: "venecia", mode: "Tren", price: 35, duration: 4 },
  { id: "t9", name: "Train Barcelona→Granada", fromCityId: "barcelona", toCityId: "granada", mode: "Tren", price: 45, duration: 5 },
  { id: "t10", name: "Flight Amsterdam→Praga", fromCityId: "amsterdam", toCityId: "praga", mode: "Avion", price: 55, duration: 2 },
  { id: "t11", name: "Flight Miami→Cancún", fromCityId: "miami", toCityId: "cancun", mode: "Avion", price: 120, duration: 2 },
  { id: "t12", name: "Flight New York→Miami", fromCityId: "nueva_york", toCityId: "miami", mode: "Avion", price: 90, duration: 3 },
  { id: "t13", name: "Train Paris→Praga", fromCityId: "paris", toCityId: "praga", mode: "Tren", price: 80, duration: 12 },
  { id: "t14", name: "Flight Cancún→Las Vegas", fromCityId: "cancun", toCityId: "las_vegas", mode: "Avion", price: 180, duration: 5 },
];

/** Trip types with emoji and labels per language. */
export const TRIP_TYPES = [
  { id: "cultural", emoji: "🏛️", en: "Cultural", es: "Cultural", ca: "Cultural" },
  { id: "romantico", emoji: "💕", en: "Romantic", es: "Romántico", ca: "Romàntic" },
  { id: "descanso", emoji: "🏖️", en: "Relaxation", es: "Relax", ca: "Relax" },
  { id: "diversion", emoji: "🎉", en: "Fun", es: "Diversión", ca: "Diversió" },
  { id: "trabajo", emoji: "💼", en: "Business", es: "Trabajo", ca: "Treball" },
  { id: "aventura", emoji: "🧗", en: "Adventure", es: "Aventura", ca: "Aventura" },
] as const;

/** City lists favored by each trip type (matches CLIPS INFERENCIA rules). */
export const CITY_LISTS: Record<string, string[]> = {
  romantico: ["paris", "venecia", "barcelona", "nueva_york", "granada", "praga", "amsterdam", "kioto"],
  descanso: ["cancun", "las_vegas", "miami"],
  diversion: ["paris", "las_vegas", "barcelona", "roma"],
  trabajo: ["barcelona", "nueva_york", "roma", "amsterdam", "paris"],
  aventura: ["miami", "barcelona", "cancun", "las_vegas"],
  cultural: ["paris", "roma", "barcelona", "granada", "kioto"],
};
