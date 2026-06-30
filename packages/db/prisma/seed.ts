import { PrismaClient as AuthPrismaClient }      from '../generated/auth-client/index.js';
import { PrismaClient as FarmPrismaClient }      from '../generated/farm-client/index.js';
import { PrismaClient as MarketPrismaClient }    from '../generated/market-client/index.js';
import { PrismaClient as GovtPrismaClient }      from '../generated/govt-client/index.js';
import { PrismaClient as FinancePrismaClient }   from '../generated/finance-client/index.js';
import { PrismaClient as CommunityPrismaClient } from '../generated/community-client/index.js';
import bcrypt from 'bcryptjs';

// ── DB clients ────────────────────────────────────────────────────────────────
// Pass explicit URLs so the seed works regardless of what DATABASE_URL points to.
const authDb      = new AuthPrismaClient({ datasources: { db: { url: process.env['AUTH_DATABASE_URL'] } } });
const farmDb      = new FarmPrismaClient({ datasources: { db: { url: process.env['DATABASE_URL'] } } });
const marketDb    = new MarketPrismaClient({ datasources: { db: { url: process.env['MARKET_DATABASE_URL'] } } });
const govtDb      = new GovtPrismaClient({ datasources: { db: { url: process.env['GOVT_DATABASE_URL'] } } });
const financeDb   = new FinancePrismaClient({ datasources: { db: { url: process.env['FINANCE_DATABASE_URL'] } } });
const communityDb = new CommunityPrismaClient({ datasources: { db: { url: process.env['COMMUNITY_DATABASE_URL'] } } });

// ── helpers ───────────────────────────────────────────────────────────────────

function d(iso: string): Date { return new Date(iso); }
function addDays(base: Date, n: number): Date {
  const r = new Date(base); r.setDate(r.getDate() + n); return r;
}

// ─── users ─────────────────────────────────────────────────────────────────────

type UserRole = 'farmer' | 'extension_officer' | 'supplier' | 'buyer';
interface UserSeed {
  phone: string; fullName: string; role: UserRole;
  county: string; language: 'sw' | 'en'; email?: string;
}

const USERS: UserSeed[] = [
  // 14 farmers
  { phone: '+254712001001', fullName: 'Wanjiku Kamau',     role: 'farmer',            county: 'Kiambu',       language: 'sw' },
  { phone: '+254722001002', fullName: 'Otieno Ochieng',    role: 'farmer',            county: 'Kisumu',       language: 'sw' },
  { phone: '+254733001003', fullName: 'Amina Hassan',      role: 'farmer',            county: 'Kilifi',       language: 'sw' },
  { phone: '+254742001004', fullName: 'Kipchoge Mutai',    role: 'farmer',            county: 'Uasin Gishu',  language: 'sw' },
  { phone: '+254712001005', fullName: 'Grace Njeri',       role: 'farmer',            county: 'Nyeri',        language: 'sw' },
  { phone: '+254722001006', fullName: 'Mwangi Gatheru',    role: 'farmer',            county: "Murang'a",     language: 'sw' },
  { phone: '+254733001007', fullName: 'Fatuma Dida',       role: 'farmer',            county: 'Isiolo',       language: 'sw' },
  { phone: '+254742001008', fullName: 'Kimani Njoroge',    role: 'farmer',            county: 'Nakuru',       language: 'sw' },
  { phone: '+254712001009', fullName: 'Chebet Rono',       role: 'farmer',            county: 'Kericho',      language: 'sw' },
  { phone: '+254722001010', fullName: 'David Mwenda',      role: 'farmer',            county: 'Meru',         language: 'sw' },
  { phone: '+254733001011', fullName: 'Esther Achieng',    role: 'farmer',            county: 'Siaya',        language: 'sw' },
  { phone: '+254742001012', fullName: 'Hassan Abdi',       role: 'farmer',            county: 'Marsabit',     language: 'sw' },
  { phone: '+254712001013', fullName: 'Margaret Waweru',   role: 'farmer',            county: 'Kirinyaga',    language: 'sw' },
  { phone: '+254722001014', fullName: 'Samuel Korir',      role: 'farmer',            county: 'Nandi',        language: 'sw' },
  // 3 extension officers
  { phone: '+254733001015', fullName: "Dr. Peter Ndung'u", role: 'extension_officer', county: 'Nairobi',      language: 'sw', email: 'p.ndungu@agriculture.go.ke' },
  { phone: '+254742001016', fullName: 'Agnes Muthoni',     role: 'extension_officer', county: 'Kiambu',       language: 'sw', email: 'a.muthoni@agriculture.go.ke' },
  { phone: '+254712001017', fullName: 'James Oduya',       role: 'extension_officer', county: 'Kisumu',       language: 'en', email: 'j.oduya@agriculture.go.ke' },
  // 2 suppliers
  { phone: '+254722001018', fullName: 'Nganga Kamau',      role: 'supplier',          county: 'Nairobi',      language: 'sw', email: 'nganga@agroinputs.co.ke' },
  { phone: '+254733001019', fullName: 'Vincent Kiprotich', role: 'supplier',          county: 'Nakuru',       language: 'sw', email: 'v.kiprotich@riftvalleyagro.co.ke' },
  // 1 buyer
  { phone: '+254742001020', fullName: 'Beatrice Njoki',    role: 'buyer',             county: 'Nairobi',      language: 'en', email: 'b.njoki@nairobigreens.co.ke' },
  // dev test user — phone: +254700001000 / password: TestPass123!
  { phone: '+254700001000', fullName: 'Jane Wanjiru',      role: 'farmer',            county: 'Kiambu',       language: 'sw', email: 'test@agroconnect.ke' },
];

// ─── farms ─────────────────────────────────────────────────────────────────────

type Crop = 'maize' | 'tomatoes' | 'beans' | 'potatoes' | 'tea' | 'coffee' | 'avocado';
type SoilType = 'clay' | 'loam' | 'sandy' | 'silty';
type WaterSource = 'rain' | 'irrigation' | 'borehole' | 'river' | 'mixed';

interface FarmSeed {
  ownerPhone: string; name: string; county: string; subCounty: string;
  lat: number; lng: number; acres: number;
  soil: SoilType; water: WaterSource; crop: Crop;
}

const FARMS: FarmSeed[] = [
  // Wanjiku Kamau — Kiambu (3 farms)
  { ownerPhone: '+254712001001', name: 'Kamau Tea Farm',       county: 'Kiambu',      subCounty: 'Limuru',    lat: -1.115, lng: 36.637, acres: 4.5,  soil: 'loam',  water: 'rain',       crop: 'tea'      },
  { ownerPhone: '+254712001001', name: 'Wanjiku Maize Shamba', county: 'Kiambu',      subCounty: 'Thika',     lat: -1.037, lng: 37.088, acres: 2.0,  soil: 'loam',  water: 'rain',       crop: 'maize'    },
  { ownerPhone: '+254712001001', name: 'Riverbank Beans Farm', county: 'Kiambu',      subCounty: 'Ruiru',     lat: -1.145, lng: 36.960, acres: 1.5,  soil: 'loam',  water: 'river',      crop: 'beans'    },
  // Otieno Ochieng — Kisumu (3 farms)
  { ownerPhone: '+254722001002', name: 'Lake Shore Tomatoes',  county: 'Kisumu',      subCounty: 'Kisumu East', lat: -0.065, lng: 34.812, acres: 3.0, soil: 'clay',  water: 'irrigation', crop: 'tomatoes' },
  { ownerPhone: '+254722001002', name: 'Otieno Maize Farm',    county: 'Kisumu',      subCounty: 'Muhoroni',  lat: -0.155, lng: 35.195, acres: 5.0,  soil: 'loam',  water: 'rain',       crop: 'maize'    },
  { ownerPhone: '+254722001002', name: 'Nyawita Avocado Farm', county: 'Kisumu',      subCounty: 'Kisumu West', lat: -0.105, lng: 34.745, acres: 2.5, soil: 'loam',  water: 'river',      crop: 'avocado'  },
  // Amina Hassan — Kilifi (2 farms)
  { ownerPhone: '+254733001003', name: "Amina's Tomato Plot",  county: 'Kilifi',      subCounty: 'Kilifi North', lat: -3.508, lng: 39.847, acres: 1.5, soil: 'sandy', water: 'irrigation', crop: 'tomatoes' },
  { ownerPhone: '+254733001003', name: 'Coastal Maize Farm',   county: 'Kilifi',      subCounty: 'Malindi',   lat: -3.217, lng: 40.117, acres: 3.0,  soil: 'sandy', water: 'rain',       crop: 'maize'    },
  // Kipchoge Mutai — Uasin Gishu (2 farms)
  { ownerPhone: '+254742001004', name: 'Kipchoge Maize Farm',  county: 'Uasin Gishu', subCounty: 'Ainabkoi',  lat: 0.498,  lng: 35.195, acres: 8.0,  soil: 'loam',  water: 'rain',       crop: 'maize'    },
  { ownerPhone: '+254742001004', name: 'Plateau Potato Farm',  county: 'Uasin Gishu', subCounty: 'Kapseret',  lat: 0.557,  lng: 35.318, acres: 4.0,  soil: 'loam',  water: 'rain',       crop: 'potatoes' },
  // Grace Njeri — Nyeri (2 farms)
  { ownerPhone: '+254712001005', name: 'Mt. Kenya Coffee Farm', county: 'Nyeri',      subCounty: 'Nyeri Town', lat: -0.425, lng: 36.944, acres: 2.0,  soil: 'loam',  water: 'rain',       crop: 'coffee'   },
  { ownerPhone: '+254712001005', name: 'Grace Beans Shamba',   county: 'Nyeri',       subCounty: 'Kieni',     lat: -0.375, lng: 37.085, acres: 1.5,  soil: 'loam',  water: 'rain',       crop: 'beans'    },
  // Mwangi Gatheru — Murang'a (2 farms)
  { ownerPhone: '+254722001006', name: "Mwangi Tea Garden",    county: "Murang'a",    subCounty: 'Kangema',   lat: -0.744, lng: 36.979, acres: 3.5,  soil: 'loam',  water: 'rain',       crop: 'tea'      },
  { ownerPhone: '+254722001006', name: 'Gatheru Maize Farm',   county: "Murang'a",    subCounty: 'Maragua',   lat: -0.733, lng: 37.118, acres: 4.0,  soil: 'loam',  water: 'rain',       crop: 'maize'    },
  // Fatuma Dida — Isiolo (2 farms)
  { ownerPhone: '+254733001007', name: 'Dida Irrigated Tomatoes', county: 'Isiolo',   subCounty: 'Isiolo North', lat: 0.365, lng: 37.584, acres: 2.0, soil: 'clay',  water: 'irrigation', crop: 'tomatoes' },
  { ownerPhone: '+254733001007', name: 'Fatuma Beans Plot',    county: 'Isiolo',      subCounty: 'Isiolo South', lat: 0.323, lng: 37.562, acres: 1.5, soil: 'loam',  water: 'rain',       crop: 'beans'    },
  // Kimani Njoroge — Nakuru (2 farms)
  { ownerPhone: '+254742001008', name: 'Nakuru Potato Farm',   county: 'Nakuru',      subCounty: 'Njoro',     lat: -0.355, lng: 35.942, acres: 6.0,  soil: 'loam',  water: 'rain',       crop: 'potatoes' },
  { ownerPhone: '+254742001008', name: 'Njoroge Maize Shamba', county: 'Nakuru',      subCounty: 'Bahati',    lat: -0.268, lng: 36.198, acres: 4.0,  soil: 'loam',  water: 'rain',       crop: 'maize'    },
  // Chebet Rono — Kericho (2 farms)
  { ownerPhone: '+254712001009', name: 'Kericho Tea Garden',   county: 'Kericho',     subCounty: 'Kericho',   lat: -0.368, lng: 35.288, acres: 5.0,  soil: 'loam',  water: 'rain',       crop: 'tea'      },
  { ownerPhone: '+254712001009', name: 'Rono Maize Farm',      county: 'Kericho',     subCounty: 'Kipkelion', lat: -0.402, lng: 35.461, acres: 2.5,  soil: 'loam',  water: 'rain',       crop: 'maize'    },
  // David Mwenda — Meru (2 farms)
  { ownerPhone: '+254722001010', name: 'Mwenda Coffee Estate', county: 'Meru',        subCounty: 'Imenti North', lat: 0.052, lng: 37.648, acres: 3.0, soil: 'loam',  water: 'rain',       crop: 'coffee'   },
  { ownerPhone: '+254722001010', name: "David's Avocado Farm", county: 'Meru',        subCounty: 'Tigania West', lat: 0.145, lng: 37.724, acres: 2.0, soil: 'loam',  water: 'river',      crop: 'avocado'  },
  // Esther Achieng — Siaya (2 farms)
  { ownerPhone: '+254733001011', name: 'Siaya Tomato Farm',    county: 'Siaya',       subCounty: 'Rarieda',   lat: -0.225, lng: 34.248, acres: 2.0,  soil: 'clay',  water: 'irrigation', crop: 'tomatoes' },
  { ownerPhone: '+254733001011', name: 'Achieng Maize Farm',   county: 'Siaya',       subCounty: 'Ugenya',    lat: 0.062,  lng: 34.338, acres: 4.0,  soil: 'loam',  water: 'rain',       crop: 'maize'    },
  // Hassan Abdi — Marsabit (2 farms)
  { ownerPhone: '+254742001012', name: 'Abdi Borehole Farm',   county: 'Marsabit',    subCounty: 'Saku',      lat: 2.345,  lng: 37.988, acres: 3.0,  soil: 'sandy', water: 'borehole',   crop: 'maize'    },
  { ownerPhone: '+254742001012', name: 'Hassan Tomato Plot',   county: 'Marsabit',    subCounty: 'Moyale',    lat: 3.523,  lng: 39.058, acres: 1.0,  soil: 'sandy', water: 'borehole',   crop: 'tomatoes' },
  // Margaret Waweru — Kirinyaga (2 farms)
  { ownerPhone: '+254712001013', name: 'Kirinyaga Coffee Farm',county: 'Kirinyaga',   subCounty: 'Kirinyaga Central', lat: -0.655, lng: 37.335, acres: 2.0, soil: 'loam', water: 'rain', crop: 'coffee' },
  { ownerPhone: '+254712001013', name: 'Waweru Beans Farm',    county: 'Kirinyaga',   subCounty: 'Mwea',      lat: -0.692, lng: 37.458, acres: 2.5,  soil: 'loam',  water: 'rain',       crop: 'beans'    },
  // Samuel Korir — Nandi (2 farms)
  { ownerPhone: '+254722001014', name: 'Nandi Tea Estate',     county: 'Nandi',       subCounty: 'Nandi Hills', lat: 0.182, lng: 35.118, acres: 7.0,  soil: 'loam',  water: 'rain',       crop: 'tea'      },
  { ownerPhone: '+254722001014', name: 'Korir Maize Farm',     county: 'Nandi',       subCounty: 'Chesumei',  lat: 0.225,  lng: 35.228, acres: 3.0,  soil: 'loam',  water: 'rain',       crop: 'maize'    },
];

// ─── activity generation ────────────────────────────────────────────────────────

type ActivityType = 'planting' | 'irrigation' | 'fertilising' | 'pesticide' | 'harvesting' | 'weeding' | 'other';
type ActivityStatus = 'completed' | 'pending';

interface ActivityDef {
  daysFromBase: number; type: ActivityType; title: string;
  description: string; labourCostKes: number;
}

const BASE  = new Date('2026-03-10');
const TODAY = new Date('2026-06-10');

const ACTIVITIES_BY_CROP: Record<Crop, ActivityDef[]> = {
  maize: [
    { daysFromBase: 5,   type: 'planting',     title: 'Kupanda mahindi',                   description: 'Hybrid maize DH04, spacing 75x25cm, 25kg seed/acre',  labourCostKes: 2500 },
    { daysFromBase: 18,  type: 'weeding',      title: 'Palizi ya kwanza',                  description: 'Manual weeding, remove competing grass',              labourCostKes: 1800 },
    { daysFromBase: 32,  type: 'fertilising',  title: 'Mbolea ya CAN — top dressing',      description: 'Apply CAN 50kg/acre at knee-high stage',              labourCostKes: 1200 },
    { daysFromBase: 52,  type: 'weeding',      title: 'Palizi ya pili',                    description: 'Second weeding, hill-up soil around stalks',          labourCostKes: 1600 },
    { daysFromBase: 68,  type: 'pesticide',    title: 'Dawa ya kunyunyizia — armyworm',    description: 'Spray Coragen for fall armyworm control',             labourCostKes: 1400 },
    { daysFromBase: 95,  type: 'harvesting',   title: 'Kuvuna mahindi',                    description: 'Harvest when husks turn brown, moisture ≤ 14%',       labourCostKes: 4000 },
  ],
  tomatoes: [
    { daysFromBase: 3,   type: 'planting',     title: 'Kupanda nyanya — seedling transplant', description: 'Kilele F1 hybrid seedlings, spacing 60x45cm',      labourCostKes: 3200 },
    { daysFromBase: 14,  type: 'irrigation',   title: 'Umwagiliaji wa kawaida',            description: 'Drip irrigation, 3 litres/plant/day',                 labourCostKes: 800  },
    { daysFromBase: 25,  type: 'fertilising',  title: 'Mbolea ya majani — calcium nitrate',description: 'Foliar feed 500g per 200L water',                    labourCostKes: 1000 },
    { daysFromBase: 38,  type: 'pesticide',    title: 'Dawa ya ukungu — Ridomil Gold',     description: 'Preventive spray for late blight, 100g/20L',          labourCostKes: 1200 },
    { daysFromBase: 58,  type: 'harvesting',   title: 'Mavuno ya kwanza',                  description: 'Pick red-ripe fruit, 3–4 picks expected',             labourCostKes: 2000 },
    { daysFromBase: 70,  type: 'harvesting',   title: 'Mavuno ya pili',                    description: 'Second pick, main flush',                            labourCostKes: 2200 },
    { daysFromBase: 82,  type: 'harvesting',   title: 'Mavuno ya tatu',                    description: 'Third pick, reduce irrigation to trigger ripening',   labourCostKes: 1800 },
  ],
  beans: [
    { daysFromBase: 8,   type: 'planting',     title: 'Kupanda maharagwe',                 description: 'Rosecoco variety, 50kg seed/acre, spacing 45x10cm',  labourCostKes: 1800 },
    { daysFromBase: 22,  type: 'weeding',      title: 'Palizi ya maharagwe',               description: 'Manual weeding, avoid damaging shallow roots',        labourCostKes: 1500 },
    { daysFromBase: 35,  type: 'fertilising',  title: 'Mbolea ya DAP',                     description: 'DAP 40kg/acre at pod formation',                      labourCostKes: 1000 },
    { daysFromBase: 52,  type: 'harvesting',   title: 'Kuvuna maharagwe',                  description: 'Harvest dry beans, moisture < 14%',                   labourCostKes: 2500 },
    { daysFromBase: 65,  type: 'planting',     title: 'Kupanda maharagwe — msimu wa pili', description: 'Second cycle planting on same land',                  labourCostKes: 1800 },
    { daysFromBase: 78,  type: 'weeding',      title: 'Palizi — msimu wa pili',            description: 'Weeding second crop',                                 labourCostKes: 1500 },
  ],
  potatoes: [
    { daysFromBase: 12,  type: 'planting',     title: 'Kupanda viazi — Shangi variety',    description: 'Certified Shangi seed potato, 1200kg/acre, 75x30cm',  labourCostKes: 3500 },
    { daysFromBase: 28,  type: 'weeding',      title: 'Kupalilia na kuunga udongo',        description: 'Earthing up to prevent greening, weed control',       labourCostKes: 2000 },
    { daysFromBase: 42,  type: 'fertilising',  title: 'Mbolea ya NPK 17:17:17',           description: 'Side-dress 50kg/acre at haulm emergence',             labourCostKes: 1200 },
    { daysFromBase: 60,  type: 'pesticide',    title: 'Dawa ya blight — Ridomil',         description: 'Late blight spray 100g/20L, repeat 10 days',          labourCostKes: 1400 },
    { daysFromBase: 72,  type: 'pesticide',    title: 'Dawa ya blight — spraying 2',      description: 'Follow-up blight prevention',                         labourCostKes: 1400 },
    { daysFromBase: 88,  type: 'harvesting',   title: 'Kuvuna viazi',                      description: 'Harvest when haulms yellow, 90 days from planting',   labourCostKes: 5000 },
  ],
  tea: [
    { daysFromBase: 0,   type: 'harvesting',   title: 'Kupiga chai — juma la kwanza Mar',  description: 'Pluck two leaves and a bud, 7-day plucking round',    labourCostKes: 3500 },
    { daysFromBase: 14,  type: 'harvesting',   title: 'Kupiga chai — juma la pili Mar',    description: 'Plucking round two, check for witches broom',         labourCostKes: 3500 },
    { daysFromBase: 28,  type: 'fertilising',  title: 'Mbolea ya NPK 25:5:5',             description: 'Apply 50kg/acre split dose, April season',            labourCostKes: 1200 },
    { daysFromBase: 35,  type: 'harvesting',   title: 'Kupiga chai — Apr round 1',         description: 'April main flush, highest yield month',               labourCostKes: 3800 },
    { daysFromBase: 49,  type: 'pesticide',    title: 'Dawa ya wadudu — Karate',           description: 'Spray for red spider mite control',                   labourCostKes: 1500 },
    { daysFromBase: 56,  type: 'harvesting',   title: 'Kupiga chai — Apr round 2',         description: 'Second April round',                                  labourCostKes: 3800 },
    { daysFromBase: 70,  type: 'harvesting',   title: 'Kupiga chai — May round 1',         description: 'May plucking, rains supporting flush',                labourCostKes: 3600 },
    { daysFromBase: 84,  type: 'harvesting',   title: 'Kupiga chai — May round 2',         description: 'Second May round',                                    labourCostKes: 3600 },
    { daysFromBase: 88,  type: 'weeding',      title: 'Kupalilia chai',                    description: 'Weed paths and inter-row, remove suckers',            labourCostKes: 2000 },
    { daysFromBase: 98,  type: 'harvesting',   title: 'Kupiga chai — Jun round 1',         description: 'June first round',                                    labourCostKes: 3600 },
  ],
  coffee: [
    { daysFromBase: 2,   type: 'other',        title: 'Kukata matawi — pruning',           description: 'Remove dead and crossing branches, open canopy',     labourCostKes: 2500 },
    { daysFromBase: 25,  type: 'fertilising',  title: 'Mbolea ya CAN — baada ya mvua',     description: 'Apply CAN 50kg/acre after first April rains',         labourCostKes: 1200 },
    { daysFromBase: 48,  type: 'pesticide',    title: 'Dawa ya kutu — copper oxychloride', description: 'CBD (coffee berry disease) preventive spray',         labourCostKes: 1300 },
    { daysFromBase: 62,  type: 'weeding',      title: 'Palizi ya miwa ya kahawa',          description: 'Slashing and hand-weeding under canopy',             labourCostKes: 1800 },
    { daysFromBase: 78,  type: 'fertilising',  title: 'Mbolea ya majani — foliar feed',    description: 'Foliar nutrition boost at berry development',         labourCostKes: 900  },
    { daysFromBase: 90,  type: 'harvesting',   title: 'Mavuno ya mchumbi — light crop',    description: 'Pick red ripe cherries, light Jun-Jul crop',          labourCostKes: 3000 },
  ],
  avocado: [
    { daysFromBase: 3,   type: 'other',        title: 'Kupogoa — avocado pruning',         description: 'Prune to maintain picking height < 4m',              labourCostKes: 2000 },
    { daysFromBase: 22,  type: 'fertilising',  title: 'Mbolea ya CAN — baada ya mavuno',   description: 'Post-harvest CAN fertiliser to restore tree vigor',   labourCostKes: 1200 },
    { daysFromBase: 42,  type: 'irrigation',   title: 'Umwagiliaji wa mti',               description: 'Deep irrigation 80L/tree twice weekly in dry period',  labourCostKes: 600  },
    { daysFromBase: 65,  type: 'harvesting',   title: 'Kuvuna avocado — Hass variety',     description: 'Harvest when skin colour shifts, maturity >30% oil',  labourCostKes: 3500 },
    { daysFromBase: 85,  type: 'pesticide',    title: 'Dawa ya anthracnose',               description: 'Spray mancozeb for post-harvest disease prevention',  labourCostKes: 1100 },
    { daysFromBase: 97,  type: 'other',        title: 'Kutunza miti — post-harvest care',  description: 'Mulch, remove suckers, apply compost',                labourCostKes: 1500 },
  ],
};

// ─── input generation ───────────────────────────────────────────────────────────

type InputType = 'seed' | 'fertiliser' | 'pesticide' | 'herbicide' | 'fuel' | 'equipment' | 'other';

interface InputDef {
  daysFromBase: number; type: InputType; productName: string;
  quantity: number; unit: string; unitCostKes: number;
}

const INPUTS_BY_CROP: Record<Crop, InputDef[]> = {
  maize: [
    { daysFromBase: 32, type: 'fertiliser', productName: 'CAN Fertiliser 50kg (Yara)',       quantity: 2,   unit: 'bag',    unitCostKes: 3800 },
    { daysFromBase: 68, type: 'pesticide',  productName: 'Coragen 200SC (FMC) 150ml',        quantity: 2,   unit: 'bottle', unitCostKes: 1450 },
  ],
  tomatoes: [
    { daysFromBase: 38, type: 'pesticide',  productName: 'Ridomil Gold MZ 500g (Syngenta)',  quantity: 3,   unit: 'packet', unitCostKes: 2200 },
    { daysFromBase: 50, type: 'fertiliser', productName: 'Calcium Nitrate 25kg (Haifa)',     quantity: 1,   unit: 'bag',    unitCostKes: 1850 },
    { daysFromBase: 70, type: 'pesticide',  productName: 'Dursban 480EC 1L (Dow)',           quantity: 1,   unit: 'litre',  unitCostKes: 1200 },
  ],
  beans: [
    { daysFromBase: 35, type: 'fertiliser', productName: 'DAP Fertiliser 50kg (Yara)',       quantity: 1,   unit: 'bag',    unitCostKes: 4500 },
    { daysFromBase: 55, type: 'pesticide',  productName: 'Dithane M-45 500g (Corteva)',      quantity: 2,   unit: 'packet', unitCostKes: 780  },
  ],
  potatoes: [
    { daysFromBase: 42, type: 'fertiliser', productName: 'NPK 17:17:17 50kg (MEA)',          quantity: 2,   unit: 'bag',    unitCostKes: 5200 },
    { daysFromBase: 60, type: 'pesticide',  productName: 'Ridomil Gold Plus 500g (Syngenta)',quantity: 4,   unit: 'packet', unitCostKes: 2200 },
    { daysFromBase: 72, type: 'pesticide',  productName: 'Dithane M-45 1kg (Corteva)',       quantity: 2,   unit: 'packet', unitCostKes: 1450 },
  ],
  tea: [
    { daysFromBase: 28, type: 'fertiliser', productName: 'NPK 25:5:5 50kg (KTDA spec)',      quantity: 2,   unit: 'bag',    unitCostKes: 4200 },
    { daysFromBase: 49, type: 'pesticide',  productName: 'Karate Zeon 50CS 250ml (Syngenta)',quantity: 2,   unit: 'bottle', unitCostKes: 1800 },
  ],
  coffee: [
    { daysFromBase: 25, type: 'fertiliser', productName: 'CAN Fertiliser 50kg (Yara)',       quantity: 2,   unit: 'bag',    unitCostKes: 3800 },
    { daysFromBase: 48, type: 'pesticide',  productName: 'Copper Oxychloride 1kg (Osho)',    quantity: 3,   unit: 'packet', unitCostKes: 1200 },
  ],
  avocado: [
    { daysFromBase: 22, type: 'fertiliser', productName: 'CAN Fertiliser 50kg (Yara)',       quantity: 1,   unit: 'bag',    unitCostKes: 3800 },
    { daysFromBase: 85, type: 'pesticide',  productName: 'Mancozeb 80WP 500g (Indofil)',     quantity: 2,   unit: 'packet', unitCostKes: 680  },
  ],
};

// ─── harvest generation ─────────────────────────────────────────────────────────

interface HarvestDef {
  daysFromBase: number; crop: Crop; variety: string;
  quantityKgPerAcre: number; grade: 'A' | 'B' | 'C'; priceKes: number;
  storageLocation: string; notes: string;
}

const HARVESTS_BY_CROP: Record<Crop, HarvestDef[]> = {
  maize: [
    { daysFromBase: -150, crop: 'maize', variety: 'DH04 Hybrid', quantityKgPerAcre: 1800,
      grade: 'A', priceKes: 42, storageLocation: 'On-farm grain store', notes: 'Good yield, Oct 2025 short-rains cycle' },
  ],
  tomatoes: [
    { daysFromBase: 58,  crop: 'tomatoes', variety: 'Kilele F1', quantityKgPerAcre: 5500,
      grade: 'A', priceKes: 45, storageLocation: 'Sold at farm gate', notes: 'First pick, excellent firmness' },
    { daysFromBase: 72,  crop: 'tomatoes', variety: 'Kilele F1', quantityKgPerAcre: 6200,
      grade: 'B', priceKes: 38, storageLocation: 'Sold at farm gate', notes: 'Peak flush, some cracking due to rain' },
  ],
  beans: [
    { daysFromBase: 52,  crop: 'beans', variety: 'Rosecoco', quantityKgPerAcre: 520,
      grade: 'A', priceKes: 135, storageLocation: 'Jute bags, dry store', notes: 'Good dry bean quality, 12% moisture' },
  ],
  potatoes: [
    { daysFromBase: -120, crop: 'potatoes', variety: 'Shangi', quantityKgPerAcre: 6500,
      grade: 'A', priceKes: 28, storageLocation: 'Cool store shed', notes: 'Previous season Oct 2025' },
  ],
  tea: [
    { daysFromBase: 35,  crop: 'tea', variety: 'TRFK 303/577', quantityKgPerAcre: 380,
      grade: 'A', priceKes: 23, storageLocation: 'Delivered to KTDA factory', notes: 'Green leaf Apr flush, high quality' },
    { daysFromBase: 70,  crop: 'tea', variety: 'TRFK 303/577', quantityKgPerAcre: 350,
      grade: 'A', priceKes: 23, storageLocation: 'Delivered to KTDA factory', notes: 'May green leaf, good flush' },
  ],
  coffee: [
    { daysFromBase: -60, crop: 'coffee', variety: 'Ruiru 11', quantityKgPerAcre: 1200,
      grade: 'A', priceKes: 95, storageLocation: 'Sold to co-operative', notes: 'Main season Jan 2026 crop (cherry)' },
    { daysFromBase: 90,  crop: 'coffee', variety: 'Ruiru 11',  quantityKgPerAcre: 380,
      grade: 'B', priceKes: 80, storageLocation: 'Sold to co-operative', notes: 'Light June crop, secondary flush' },
  ],
  avocado: [
    { daysFromBase: 65,  crop: 'avocado', variety: 'Hass', quantityKgPerAcre: 1800,
      grade: 'A', priceKes: 28, storageLocation: 'Export packhouse, Nairobi', notes: 'Good sizing, >200g avg fruit weight' },
  ],
};

// ─── main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱  AgroConnect seed starting...\n');

  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  // ── clean slate ──────────────────────────────────────────────────────────────
  console.log('  Clearing existing data...');
  // community
  await communityDb.reply.deleteMany({});
  await communityDb.thread.deleteMany({});
  // finance
  await financeDb.loanDocument.deleteMany({});
  await financeDb.loanApplication.deleteMany({});
  await financeDb.creditScore.deleteMany({});
  // govt
  await govtDb.licenseApplication.deleteMany({});
  await govtDb.subsidyApplication.deleteMany({});
  await govtDb.subsidyProgram.deleteMany({});
  await govtDb.govtDocument.deleteMany({});
  await govtDb.farmRegistration.deleteMany({});
  // market
  await marketDb.order.deleteMany({});
  await marketDb.supplierProduct.deleteMany({});
  await marketDb.produceListing.deleteMany({});
  await marketDb.commodityPrice.deleteMany({});
  // farm
  await farmDb.harvest.deleteMany({});
  await farmDb.input.deleteMany({});
  await farmDb.activity.deleteMany({});
  await farmDb.farmPlot.deleteMany({});
  await farmDb.farm.deleteMany({});
  // auth — sessions cascade-delete when user is deleted
  await authDb.user.deleteMany({});

  // ── users ─────────────────────────────────────────────────────────────────────
  console.log('  Creating 21 users...');
  const userMap = new Map<string, string>(); // phone → id

  for (const u of USERS) {
    const user = await authDb.user.create({
      data: {
        phone:        u.phone,
        fullName:     u.fullName,
        role:         u.role,
        county:       u.county,
        language:     u.language,
        email:        u.email ?? null,
        passwordHash,
        isVerified:   true,
        isActive:     true,
        kycStatus:    'verified',
      },
    });
    userMap.set(u.phone, user.id);
  }

  const testUserId  = userMap.get('+254700001000')!;
  const farmer1Id   = userMap.get('+254712001001')!; // Wanjiku
  const farmer2Id   = userMap.get('+254722001002')!; // Otieno
  const farmer3Id   = userMap.get('+254742001004')!; // Kipchoge
  const officerId   = userMap.get('+254733001015')!; // Dr. Peter
  const officer2Id  = userMap.get('+254742001016')!; // Agnes
  const supplierId  = userMap.get('+254722001018')!; // Nganga
  const supplier2Id = userMap.get('+254733001019')!; // Vincent

  // ── farms + activities + inputs + harvests ─────────────────────────────────────
  console.log('  Creating 30 farms with activities, inputs and harvests...');

  for (const f of FARMS) {
    const ownerId = userMap.get(f.ownerPhone);
    if (!ownerId) throw new Error(`Owner not found: ${f.ownerPhone}`);

    const farm = await farmDb.farm.create({
      data: {
        ownerId,
        name:        f.name,
        county:      f.county,
        subCounty:   f.subCounty,
        locationLat: f.lat,
        locationLng: f.lng,
        areaAcres:   f.acres,
        soilType:    f.soil,
        waterSource: f.water,
        status:      'active',
      },
    });

    for (const a of ACTIVITIES_BY_CROP[f.crop]) {
      const scheduled = addDays(BASE, a.daysFromBase);
      const isPast = scheduled <= TODAY;
      const isRecentlyPast = isPast && scheduled >= addDays(TODAY, -7);
      const status: ActivityStatus =
        !isPast ? 'pending'
        : isRecentlyPast && f.lat > 0 ? 'pending'
        : 'completed';

      await farmDb.activity.create({
        data: {
          farmId:        farm.id,
          type:          a.type,
          title:         a.title,
          description:   a.description,
          scheduledDate: scheduled,
          completedDate: status === 'completed' ? addDays(scheduled, 1) : null,
          status,
          labourCostKes: a.labourCostKes,
        },
      });
    }

    for (const i of INPUTS_BY_CROP[f.crop]) {
      if (i.daysFromBase < 31 || i.daysFromBase > 91) continue;
      await farmDb.input.create({
        data: {
          farmId:       farm.id,
          type:         i.type,
          productName:  i.productName,
          quantity:     i.quantity,
          unit:         i.unit,
          unitCostKes:  i.unitCostKes,
          totalCostKes: i.quantity * i.unitCostKes,
          appliedDate:  addDays(BASE, i.daysFromBase),
        },
      });
    }

    for (const h of HARVESTS_BY_CROP[f.crop]) {
      const harvestDate = addDays(BASE, h.daysFromBase);
      if (harvestDate > TODAY) continue;
      const quantityKg       = Math.round(h.quantityKgPerAcre * f.acres);
      const soldQuantityKg   = Math.round(quantityKg * 0.85);
      await farmDb.harvest.create({
        data: {
          farmId:          farm.id,
          crop:            h.crop,
          variety:         h.variety,
          quantityKg,
          qualityGrade:    h.grade,
          harvestDate,
          storageLocation: h.storageLocation,
          soldQuantityKg,
          avgPriceKes:     h.priceKes,
          totalRevenueKes: Math.round(soldQuantityKg * h.priceKes),
          notes:           h.notes,
        },
      });
    }
  }

  // ── dev test farm ─────────────────────────────────────────────────────────────
  console.log('  Creating dev test farm for Jane Wanjiru (+254700001000)...');
  const testFarm = await farmDb.farm.create({
    data: {
      ownerId:     testUserId,
      name:        'Wanjiru Maize & Poultry Farm',
      county:      'Kiambu',
      subCounty:   'Kiambu Town',
      locationLat: -1.175,
      locationLng: 36.829,
      areaAcres:   3.0,
      soilType:    'loam',
      waterSource: 'rain',
      status:      'active',
    },
  });
  await farmDb.farmPlot.createMany({
    data: [
      { farmId: testFarm.id, name: 'Kiwanja A', areaAcres: 1.5, currentCrop: 'maize' },
      { farmId: testFarm.id, name: 'Kiwanja B', areaAcres: 1.0, currentCrop: 'beans' },
      { farmId: testFarm.id, name: 'Banda ya Kuku', areaAcres: 0.5, currentCrop: null },
    ],
  });

  const SEED_NOW = new Date('2026-06-23');
  const testActivities = [
    { daysOffset: -45, type: 'planting'    as ActivityType, title: 'Kupanda mahindi — DH04',         desc: 'Hybrid DH04, spacing 75×25cm',              costKes: 2500, status: 'completed' as ActivityStatus },
    { daysOffset: -30, type: 'weeding'     as ActivityType, title: 'Palizi ya kwanza',               desc: 'Manual weeding — maize field',              costKes: 1800, status: 'completed' as ActivityStatus },
    { daysOffset: -15, type: 'fertilising' as ActivityType, title: 'Mbolea ya CAN — top dressing',   desc: 'Apply CAN 50kg/acre',                       costKes: 1200, status: 'completed' as ActivityStatus },
    { daysOffset:   5, type: 'pesticide'   as ActivityType, title: 'Dawa ya armyworm',               desc: 'Spray Coragen for fall armyworm control',   costKes: 1400, status: 'pending'   as ActivityStatus },
    { daysOffset:  18, type: 'weeding'     as ActivityType, title: 'Palizi ya pili',                 desc: 'Second weeding, hill-up soil',              costKes: 1600, status: 'pending'   as ActivityStatus },
    { daysOffset:  45, type: 'harvesting'  as ActivityType, title: 'Kuvuna mahindi',                 desc: 'Harvest when husks brown, moisture ≤ 14%',  costKes: 4000, status: 'pending'   as ActivityStatus },
    { daysOffset: -20, type: 'planting'    as ActivityType, title: 'Kupanda maharagwe — Rosecoco',   desc: 'Rosecoco 50kg seed/acre',                   costKes: 1800, status: 'completed' as ActivityStatus },
    { daysOffset:  30, type: 'harvesting'  as ActivityType, title: 'Kuvuna maharagwe',              desc: 'Harvest dry beans, moisture < 14%',          costKes: 2500, status: 'pending'   as ActivityStatus },
  ];
  for (const a of testActivities) {
    await farmDb.activity.create({
      data: {
        farmId:        testFarm.id,
        type:          a.type,
        title:         a.title,
        description:   a.desc,
        scheduledDate: addDays(SEED_NOW, a.daysOffset),
        completedDate: a.status === 'completed' ? addDays(SEED_NOW, a.daysOffset + 1) : null,
        status:        a.status,
        labourCostKes: a.costKes,
      },
    });
  }

  // Previous harvest for test farm
  await farmDb.harvest.create({
    data: {
      farmId:          testFarm.id,
      crop:            'maize',
      variety:         'DH04 Hybrid',
      quantityKg:      4500,
      qualityGrade:    'A',
      harvestDate:     new Date('2025-10-05'),
      storageLocation: 'On-farm grain store',
      soldQuantityKg:  3800,
      avgPriceKes:     42,
      totalRevenueKes: 159600,
      notes:           'Short rains 2025 season — good yield',
    },
  });

  // ── govt: subsidy programs ────────────────────────────────────────────────────
  console.log('  Seeding govt data (programs, registrations, applications, licenses)...');
  const [prog1, prog2, prog3, prog4, prog5] = await Promise.all([
    govtDb.subsidyProgram.create({ data: {
      name: 'MSAI Fertiliser Subsidy',
      description: 'Subsidised certified fertilisers for smallholder farmers through the Ministry of Agriculture Seed and Input programme.',
      providerAgency: 'Ministry of Agriculture and Livestock Development',
      eligibility: 'Smallholder farmers with registered farm of ≤5 acres and a valid AFA farmer ID',
      benefitType: 'subsidy',
      benefitValue: '50% discount on NPKS and CAN fertilisers (max 2 bags per season)',
      countyEligible: [],
      isActive: true,
    }}),
    govtDb.subsidyProgram.create({ data: {
      name: 'KALRO High-Yielding Seeds',
      description: 'Access to improved drought-tolerant and disease-resistant seed varieties developed by KALRO research stations.',
      providerAgency: 'Kenya Agricultural and Livestock Research Organisation',
      eligibility: 'Registered farmers growing maize, beans, sorghum, or cowpea',
      benefitType: 'subsidy',
      benefitValue: 'Certified KALRO seeds at 30% below commercial market price',
      countyEligible: [],
      isActive: true,
    }}),
    govtDb.subsidyProgram.create({ data: {
      name: 'AFC Youth in Agribusiness',
      description: 'Low-interest agricultural loans for youth-led farming enterprises to boost food production and rural employment.',
      providerAgency: 'Agricultural Finance Corporation',
      eligibility: 'Kenyan youth aged 18–35 with a viable agribusiness plan and farm collateral or group guarantee',
      benefitType: 'loan',
      benefitValue: 'Loans of KES 50,000–500,000 at 8% p.a., repayable over 3 years',
      countyEligible: [],
      isActive: true,
    }}),
    govtDb.subsidyProgram.create({ data: {
      name: 'NDMA Drought Emergency Relief',
      description: 'Emergency food and input relief for farmers in arid and semi-arid counties affected by drought.',
      providerAgency: 'National Drought Management Authority',
      eligibility: 'Farmers in ASAL counties with documented crop failure or livestock loss due to drought',
      benefitType: 'grant',
      benefitValue: 'Emergency seed and food package valued at up to KES 15,000 per household',
      countyEligible: ['Turkana', 'Marsabit', 'Isiolo', 'Mandera', 'Wajir', 'Garissa', 'Samburu', 'Baringo', 'Laikipia'],
      isActive: true,
    }}),
    govtDb.subsidyProgram.create({ data: {
      name: 'KCSAP Climate Smart Agriculture Grants',
      description: 'Grants for adoption of climate-smart practices including conservation agriculture, agroforestry, and irrigation.',
      providerAgency: 'State Department for Crop Development (KCSAP)',
      eligibility: 'Smallholder farmers in targeted sub-counties enrolled in an active Common Interest Group (CIG)',
      benefitType: 'grant',
      benefitValue: 'Matching grants of KES 20,000–100,000 for approved CSA investments',
      countyEligible: ['Nakuru', 'Meru', 'Bungoma', 'Kakamega', 'Kisumu', 'Kiambu', "Murang'a", 'Embu'],
      isActive: true,
    }}),
  ]);

  // Farm registration for test user
  await govtDb.farmRegistration.create({ data: {
    farmerId:        testUserId,
    farmId:          testFarm.id,
    farmName:        'Wanjiru Maize & Poultry Farm',
    county:          'Kiambu',
    subCounty:       'Kiambu Town',
    areaAcres:       3.0,
    status:          'approved',
    registrationRef: 'KE/FARM/2024/07841',
    officerId:       officerId,
    notes:           'Verified on-site. Farm records up to date.',
    submittedAt:     new Date('2024-08-15'),
  }});

  // Subsidy applications for test user
  await govtDb.subsidyApplication.create({ data: {
    farmerId:    testUserId,
    farmId:      testFarm.id,
    programId:   prog1.id,
    status:      'approved',
    notes:       'Approved for 2 bags CAN 50kg at subsidised rate.',
    submittedAt: new Date('2026-01-10'),
  }});
  await govtDb.subsidyApplication.create({ data: {
    farmerId:    testUserId,
    farmId:      testFarm.id,
    programId:   prog2.id,
    status:      'under_review',
    notes:       'Application under review by KALRO regional office.',
    submittedAt: new Date('2026-03-20'),
  }});
  await govtDb.subsidyApplication.create({ data: {
    farmerId:    testUserId,
    farmId:      testFarm.id,
    programId:   prog5.id,
    status:      'submitted',
    notes:       null,
    submittedAt: new Date('2026-05-05'),
  }});

  // License application
  await govtDb.licenseApplication.create({ data: {
    farmerId:     testUserId,
    farmId:       testFarm.id,
    licenseType:  'pesticide_use',
    description:  'Certified pesticide applicator for commercial vegetable production',
    status:       'approved',
    licenseNumber: 'PCPB/PA/2024/003271',
    expiresAt:    new Date('2027-08-31'),
    submittedAt:  new Date('2024-07-10'),
  }});
  await govtDb.licenseApplication.create({ data: {
    farmerId:    testUserId,
    farmId:      testFarm.id,
    licenseType: 'agro_dealer',
    description: 'Agrovet dealer licence for on-farm input sales to neighbours',
    status:      'submitted',
    submittedAt: new Date('2026-04-22'),
  }});

  // ── finance: credit scores + loan applications ─────────────────────────────────
  console.log('  Seeding finance data (credit scores + loans)...');

  // Credit scores for test user and 5 other farmers
  const creditSeeds = [
    { farmerId: testUserId,  score: 72, band: 'B' as const, maxLoan: 120000, yield_: 78, inputs: 70, activities: 68, platform: 80 },
    { farmerId: farmer1Id,   score: 85, band: 'A' as const, maxLoan: 250000, yield_: 88, inputs: 85, activities: 82, platform: 90 },
    { farmerId: farmer2Id,   score: 60, band: 'C' as const, maxLoan: 60000,  yield_: 62, inputs: 58, activities: 55, platform: 70 },
    { farmerId: farmer3Id,   score: 91, band: 'A' as const, maxLoan: 350000, yield_: 93, inputs: 90, activities: 88, platform: 95 },
    { farmerId: officer2Id,  score: 40, band: 'D' as const, maxLoan: 0,      yield_: 35, inputs: 40, activities: 45, platform: 50 },
  ];

  for (const cs of creditSeeds) {
    await financeDb.creditScore.create({ data: {
      farmerId:                cs.farmerId,
      score:                   cs.score,
      band:                    cs.band,
      maxLoanKes:              cs.maxLoan,
      seasonsOfData:           cs.band === 'A' ? 6 : cs.band === 'B' ? 4 : 2,
      avgYieldScore:           cs.yield_,
      inputManagementScore:    cs.inputs,
      activityComplianceScore: cs.activities,
      platformEngagementScore: cs.platform,
      computedAt:              new Date('2026-06-01'),
    }});
  }

  // Loan applications for test user
  await financeDb.loanApplication.create({ data: {
    farmerId:          testUserId,
    farmId:            testFarm.id,
    type:              'agricultural_working_capital',
    amountRequestedKes: 80000,
    purpose:           'Purchase maize seeds, fertiliser and pesticides for the long rains 2026 season',
    repaymentMonths:   12,
    partnerBankId:     'partner-eq-001',
    creditScore:       72,
    creditBand:        'B',
    status:            'disbursed',
    approvedAmountKes: 75000,
    interestRatePct:   13.0,
    disbursedAt:       new Date('2026-03-01'),
    mpesaDisbursementRef: 'QJF8KH3X22',
    submittedAt:       new Date('2026-02-14'),
  }});
  await financeDb.loanApplication.create({ data: {
    farmerId:          testUserId,
    farmId:            testFarm.id,
    type:              'asset_finance',
    amountRequestedKes: 45000,
    purpose:           'Drip irrigation kit for the kitchen garden and poultry water system',
    repaymentMonths:   18,
    partnerBankId:     'partner-fa-003',
    creditScore:       72,
    creditBand:        'B',
    status:            'under_review',
    submittedAt:       new Date('2026-05-20'),
  }});
  // One rejected loan for history
  await financeDb.loanApplication.create({ data: {
    farmerId:          testUserId,
    farmId:            testFarm.id,
    type:              'emergency',
    amountRequestedKes: 200000,
    purpose:           'Emergency flood relief and farm rehabilitation',
    repaymentMonths:   24,
    partnerBankId:     'partner-kcb-002',
    creditScore:       65,
    creditBand:        'C',
    status:            'rejected',
    rejectionReason:   'Requested amount exceeds Band B limit of KES 120,000. Improve credit score to Band A.',
    submittedAt:       new Date('2025-11-08'),
  }});

  // ── market: commodity prices + produce listings + supplier products ────────────
  console.log('  Seeding market data (prices, listings, supplier products)...');

  await marketDb.commodityPrice.createMany({
    data: [
      { crop: 'maize',    priceKes: 40,  unit: 'kg' },
      { crop: 'beans',    priceKes: 120, unit: 'kg' },
      { crop: 'tomatoes', priceKes: 60,  unit: 'kg' },
      { crop: 'potatoes', priceKes: 50,  unit: 'kg' },
      { crop: 'onions',   priceKes: 80,  unit: 'kg' },
      { crop: 'cabbage',  priceKes: 30,  unit: 'kg' },
      { crop: 'wheat',    priceKes: 55,  unit: 'kg' },
      { crop: 'sorghum',  priceKes: 35,  unit: 'kg' },
      { crop: 'coffee',   priceKes: 600, unit: 'kg' },
      { crop: 'tea',      priceKes: 200, unit: 'kg' },
    ],
  });

  // Produce listings — farmers selling their harvest
  await marketDb.produceListing.createMany({
    data: [
      {
        farmerId: testUserId, farmId: testFarm.id,
        crop: 'maize', variety: 'DH04 Hybrid',
        quantityKg: 700, askingPriceKes: 44,
        qualityGrade: 'A', availableFrom: d('2026-06-15'), availableUntil: d('2026-08-15'),
        locationCounty: 'Kiambu', locationDescription: 'Kiambu Town — can deliver within 30km',
        status: 'active', views: 18,
      },
      {
        farmerId: farmer1Id, farmId: 'farm-seed-1',
        crop: 'beans', variety: 'Rosecoco',
        quantityKg: 280, askingPriceKes: 130,
        qualityGrade: 'A', availableFrom: d('2026-06-01'), availableUntil: d('2026-07-31'),
        locationCounty: 'Kiambu', locationDescription: 'Ruiru — farm gate pickup',
        status: 'active', views: 32,
      },
      {
        farmerId: farmer2Id, farmId: 'farm-seed-2',
        crop: 'tomatoes', variety: 'Kilele F1',
        quantityKg: 1200, askingPriceKes: 58,
        qualityGrade: 'A', availableFrom: d('2026-05-20'), availableUntil: d('2026-06-30'),
        locationCounty: 'Kisumu', locationDescription: 'Kisumu East — daily deliveries to city market',
        status: 'active', views: 75,
      },
      {
        farmerId: farmer3Id, farmId: 'farm-seed-3',
        crop: 'potatoes', variety: 'Shangi',
        quantityKg: 5000, askingPriceKes: 32,
        qualityGrade: 'B', availableFrom: d('2026-06-10'), availableUntil: d('2026-09-30'),
        locationCounty: 'Uasin Gishu', locationDescription: 'Ainabkoi — bulk discount available',
        status: 'active', views: 54,
      },
      {
        farmerId: farmer1Id, farmId: 'farm-seed-4',
        crop: 'tea', variety: 'TRFK 303/577',
        quantityKg: 900, askingPriceKes: 22,
        qualityGrade: 'A', availableFrom: d('2026-04-20'), availableUntil: d('2026-07-20'),
        locationCounty: 'Kiambu', locationDescription: 'Limuru — KTDA-certified green leaf',
        status: 'active', views: 11,
      },
      {
        farmerId: farmer2Id, farmId: 'farm-seed-5',
        crop: 'avocado', variety: 'Hass',
        quantityKg: 3200, askingPriceKes: 30,
        qualityGrade: 'A', availableFrom: d('2026-06-25'), availableUntil: d('2026-08-31'),
        locationCounty: 'Kisumu', locationDescription: 'Kisumu West — export quality, packhouse ready',
        status: 'active', views: 41,
      },
      {
        farmerId: testUserId, farmId: testFarm.id,
        crop: 'maize', variety: 'DH04 Hybrid',
        quantityKg: 2000, askingPriceKes: 40,
        qualityGrade: 'B', availableFrom: d('2025-10-15'), availableUntil: d('2026-01-15'),
        locationCounty: 'Kiambu', locationDescription: 'Previous season — sold out',
        status: 'sold', views: 62,
      },
    ],
  });

  // Supplier products — from supplier users
  await marketDb.supplierProduct.createMany({
    data: [
      // Nganga Kamau (Nairobi agro-inputs)
      {
        supplierId: supplierId, name: 'CAN Fertiliser 50kg (Yara)',
        category: 'fertiliser', brand: 'Yara',
        description: 'Calcium Ammonium Nitrate — 26% N. Best for top-dressing maize, tea, vegetables after establishment.',
        unit: 'bag', pricePerUnitKes: 3850, stockQuantity: 200,
        sku: 'YAR-CAN-50', countyAvailability: ['Nairobi', 'Kiambu', "Murang'a", 'Machakos'],
        isActive: true,
      },
      {
        supplierId: supplierId, name: 'DAP Fertiliser 50kg (Yara)',
        category: 'fertiliser', brand: 'Yara',
        description: 'Di-Ammonium Phosphate — 18% N, 46% P₂O₅. Best applied at planting for strong root development.',
        unit: 'bag', pricePerUnitKes: 4650, stockQuantity: 150,
        sku: 'YAR-DAP-50', countyAvailability: ['Nairobi', 'Kiambu', "Murang'a", 'Machakos'],
        isActive: true,
      },
      {
        supplierId: supplierId, name: 'Maize Seed DH04 — 2kg (Dryland Seed)',
        category: 'seed', brand: 'Dryland Seed',
        description: 'DH04 hybrid maize. High-yielding, drought-tolerant. 2kg treats 1 acre. Germination >95%.',
        unit: 'packet', pricePerUnitKes: 980, stockQuantity: 500,
        sku: 'DLS-DH04-2KG', countyAvailability: ['Nairobi', 'Kiambu', 'Nakuru', 'Meru'],
        isActive: true,
      },
      {
        supplierId: supplierId, name: 'Ridomil Gold MZ 500g (Syngenta)',
        category: 'pesticide', brand: 'Syngenta',
        description: 'Systemic + contact fungicide. Controls late blight in tomatoes and potatoes. Use 100g per 20L water.',
        unit: 'packet', pricePerUnitKes: 2250, stockQuantity: 80,
        sku: 'SYN-RGM-500', countyAvailability: ['Nairobi', 'Kiambu', 'Nakuru', 'Meru', 'Nyandarua'],
        isActive: true,
      },
      {
        supplierId: supplierId, name: 'Coragen 200SC 150ml (FMC)',
        category: 'pesticide', brand: 'FMC',
        description: 'Diamide insecticide. Controls fall armyworm, stem borer, diamondback moth. Rainfast in 1 hour.',
        unit: 'bottle', pricePerUnitKes: 1480, stockQuantity: 120,
        sku: 'FMC-COR-150', countyAvailability: ['Nairobi', 'Kiambu', "Murang'a", 'Machakos', 'Meru'],
        isActive: true,
      },
      // Vincent Kiprotich (Nakuru agro-inputs)
      {
        supplierId: supplier2Id, name: 'NPK 17:17:17 50kg (MEA)',
        category: 'fertiliser', brand: 'MEA',
        description: 'Balanced NPK fertiliser. Ideal for potatoes, vegetables, and horticulture at planting stage.',
        unit: 'bag', pricePerUnitKes: 5300, stockQuantity: 90,
        sku: 'MEA-NPK-50', countyAvailability: ['Nakuru', 'Nyandarua', 'Laikipia', 'Uasin Gishu'],
        isActive: true,
      },
      {
        supplierId: supplier2Id, name: 'Certified Shangi Potato Seed 50kg',
        category: 'seed', brand: 'KEPHIS',
        description: 'KEPHIS-certified Shangi seed potato. Disease-free. Plant 1,200kg per acre at 75×30cm spacing.',
        unit: 'bag', pricePerUnitKes: 6800, stockQuantity: 60,
        sku: 'KEP-SHA-50', countyAvailability: ['Nakuru', 'Nyandarua', 'Meru', 'Elgeyo-Marakwet'],
        isActive: true,
      },
      {
        supplierId: supplier2Id, name: 'Karate Zeon 50CS 250ml (Syngenta)',
        category: 'pesticide', brand: 'Syngenta',
        description: 'Lambda-cyhalothrin capsule suspension. Controls tea spider mite, aphids, whitefly. Very low residue.',
        unit: 'bottle', pricePerUnitKes: 1850, stockQuantity: 45,
        sku: 'SYN-KAR-250', countyAvailability: ['Nakuru', 'Kericho', 'Nandi', 'Bomet'],
        isActive: true,
      },
      {
        supplierId: supplier2Id, name: 'Drip Irrigation Kit — 1 Acre (Netafim)',
        category: 'equipment', brand: 'Netafim',
        description: '1-acre complete drip kit: mainline, laterals, emitters, filter, venturi injector. Installs in 1 day.',
        unit: 'kit', pricePerUnitKes: 28000, stockQuantity: 12,
        sku: 'NET-DRIP-1AC', countyAvailability: ['Nakuru', 'Kiambu', 'Machakos', 'Laikipia'],
        isActive: true,
      },
      {
        supplierId: supplier2Id, name: 'Copper Oxychloride 1kg (Osho)',
        category: 'pesticide', brand: 'Osho',
        description: 'Contact fungicide for CBD (coffee berry disease), bacterial blight, downy mildew. 300g per 20L.',
        unit: 'packet', pricePerUnitKes: 1150, stockQuantity: 200,
        sku: 'OSH-COX-1KG', countyAvailability: ['Nakuru', 'Kericho', 'Nyeri', 'Meru', 'Kirinyaga'],
        isActive: true,
      },
    ],
  });

  // ── community: threads + replies ───────────────────────────────────────────────
  console.log('  Seeding community data (threads + replies)...');

  const threads = await Promise.all([
    communityDb.thread.create({ data: {
      authorId:  farmer1Id,
      category:  'crop_advice',
      title:     'Armyworm outbreak in Kiambu — best control now?',
      body:      'Nimeona armyworm kwenye shamba yangu la mahindi. Imekula majani mengi. Ninatumia nini haraka kabla halichanganyiki zaidi? Nimeskia Coragen inafanya kazi lakini ni ghali kidogo.',
      cropType:  'maize',
      county:    'Kiambu',
      upvotes:   47,
      status:    'active',
      createdAt: new Date('2026-06-08T07:12:00Z'),
    }}),
    communityDb.thread.create({ data: {
      authorId:  farmer2Id,
      category:  'livestock_health',
      title:     'Newcastle disease kuku wangu — dalili na dawa',
      body:      'Kuku wangu wa layer wanapoteza nguvu, hawali, na wengine wanakufa. Nimekuta baadhi wana kikohozi. Je, hii ni Newcastle? Nifanye nini haraka kabla simu wote hawajasababiwa?',
      cropType:  null,
      county:    'Kisumu',
      upvotes:   31,
      status:    'active',
      createdAt: new Date('2026-06-05T09:30:00Z'),
    }}),
    communityDb.thread.create({ data: {
      authorId:  farmer3Id,
      category:  'market_talk',
      title:     'Bei ya mahindi Eldoret — Juni 2026',
      body:      'Ninavyoona Eldoret juzi bei ya mahindi ilikuwa KES 38-40/kg. Mkulima mmoja alisema ameuzwa KES 35. Je, mnasema bei ipo wapi kweli? Niko na tani 3 nataka kuuza.',
      cropType:  'maize',
      county:    'Uasin Gishu',
      upvotes:   29,
      status:    'active',
      createdAt: new Date('2026-06-09T14:22:00Z'),
    }}),
    communityDb.thread.create({ data: {
      authorId:  officerId,
      category:  'weather_climate',
      title:     'Mvua ya Julai/Agosti — matarajio na jinsi ya kujiandaa',
      body:      'Kulingana na KMD, mvua za masika 2026 zitakuwa kali zaidi kuliko wastani katika maeneo ya Highlands (Kiambu, Nyeri, Meru). Wakulima wa mahindi wajitayarishe kwa hatari ya kuoza kwa mizizi na Grey Leaf Spot. Tenganisheni mazao yaliyovunwa mapema.',
      cropType:  null,
      county:    null,
      upvotes:   88,
      status:    'active',
      createdAt: new Date('2026-06-01T08:00:00Z'),
    }}),
    communityDb.thread.create({ data: {
      authorId:  testUserId,
      category:  'finance_business',
      title:     'Mkopo wa Equity Bank kwa wakulima — mtu ameshapata?',
      body:      'Nimetuma application ya mkopo wa KES 80,000 Equity Bank kupitia AgroConnect. Nimekuwa nasubiri siku 14. Je, mtu mwingine amefanikiwa kupata mkopo hapa? Ni muda gani kawaida?',
      cropType:  null,
      county:    'Kiambu',
      upvotes:   22,
      status:    'active',
      createdAt: new Date('2026-06-03T11:15:00Z'),
    }}),
    communityDb.thread.create({ data: {
      authorId:  farmer1Id,
      category:  'government_programs',
      title:     'Ruzuku ya mbolea MSAI 2026 — jinsi ya kuomba',
      body:      'Nimesikia serikali inagawa ruzuku ya mbolea tena. MSAI inasema 50% discount kwa CAN na NPKS. Niliomba mwaka jana lakini sikupata. Mwaka huu naomba kupitia AgroConnect — ni rahisi zaidi. Je, nyinyi mmeomba?',
      cropType:  null,
      county:    'Kiambu',
      upvotes:   56,
      status:    'active',
      createdAt: new Date('2026-05-28T15:40:00Z'),
    }}),
    communityDb.thread.create({ data: {
      authorId:  farmer2Id,
      category:  'success_stories',
      title:     'Nilipata tani 12 ya mahindi — DH04 na umwagiliaji wa tone',
      body:      'Mwaka huu nimevuna tani 12 kwa ekari 2 ya mahindi DH04. Niliweka umwagiliaji wa tone, nilitumia CAN vizuri, na nilifuata ratiba ya shughulli. Mapato: KES 504,000. Naweza kushare ratiba yangu yote kwa mtu anayehitaji.',
      cropType:  'maize',
      county:    'Kisumu',
      upvotes:   134,
      status:    'active',
      createdAt: new Date('2026-06-07T06:55:00Z'),
    }}),
    communityDb.thread.create({ data: {
      authorId:  officer2Id,
      category:  'equipment_tools',
      title:     'Mashine ya kupiga dawa kwa drone — bei na faida',
      body:      'Kampuni moja Nairobi sasa inatoa huduma ya drone spraying kwa bei ya KES 800 kwa ekari. Kwa shamba la zaidi ya ekari 10 ni nafuu kuliko kulipa wafanyikazi 3 siku nzima. Je, mtu ametumia? Ni nzuri kwa blight control?',
      cropType:  null,
      county:    null,
      upvotes:   45,
      status:    'active',
      createdAt: new Date('2026-06-06T13:00:00Z'),
    }}),
  ]);

  // Replies
  await communityDb.reply.createMany({
    data: [
      // Thread 0: armyworm
      { threadId: threads[0].id, authorId: officerId,  body: 'Coragen (chlorantraniliprole) ndio dawa bora zaidi sasa hivi dhidi ya armyworm. Nyunyizia asubuhi au jioni wakati halijapanda. Dozi: 150ml kwa ekari. Rudia baada ya siku 10 ukiona bado wako.', upvotes: 28, isExpertVerified: true,  status: 'active', createdAt: new Date('2026-06-08T08:45:00Z') },
      { threadId: threads[0].id, authorId: farmer3Id,  body: 'Mimi nilitumia Emamectin Benzoate (Escort) na ilifanya kazi vizuri. Ni bei nafuu zaidi kuliko Coragen — KES 350 kwa 100ml.', upvotes: 12, isExpertVerified: false, status: 'active', createdAt: new Date('2026-06-08T10:10:00Z') },
      { threadId: threads[0].id, authorId: testUserId, body: 'Ninakushukuru! Nilienda kuomba Coragen Farmers Choice leo. Nitarudi na ripoti baada ya nyunyizio.', upvotes: 3,  isExpertVerified: false, status: 'active', createdAt: new Date('2026-06-08T14:30:00Z') },
      // Thread 1: Newcastle
      { threadId: threads[1].id, authorId: officerId,  body: 'Dalili unazosema zinaonyesha Newcastle Disease (NCD). Chanjo ya Hitchner B1 au LaSota haraka. Toa kuku wote waliokufa na achilia umbali. Mwambie daktari wa mifugo aribe haraka.', upvotes: 41, isExpertVerified: true,  status: 'active', createdAt: new Date('2026-06-05T10:20:00Z') },
      { threadId: threads[1].id, authorId: farmer1Id,  body: 'Nilipitia hali kama hii 2024. Nimepoteza kuku 80. Chanjo ya mara kwa mara kila miezi 2 ndiyo suluhisho la muda mrefu.', upvotes: 19, isExpertVerified: false, status: 'active', createdAt: new Date('2026-06-05T12:05:00Z') },
      // Thread 2: maize price
      { threadId: threads[2].id, authorId: testUserId, body: 'Kiambu juzi niliona KES 42/kg kwa grade A. Nadhani inategemea ubora na mahali unapouza. Supermarket inanunua vizuri zaidi kuliko wholesale.', upvotes: 8,  isExpertVerified: false, status: 'active', createdAt: new Date('2026-06-09T15:00:00Z') },
      { threadId: threads[2].id, authorId: farmer1Id,  body: 'Nijaribu Nairobi (Wakulima market) — mara nyingi KES 44-46 kwa grade A ukiuza moja kwa moja bila dalali.', upvotes: 15, isExpertVerified: false, status: 'active', createdAt: new Date('2026-06-09T16:45:00Z') },
      // Thread 3: weather
      { threadId: threads[3].id, authorId: farmer1Id,  body: 'Ninashukuru taarifa hii daktari. Nitaanza kukata mahindi yangu ya tea mapema wiki hii ili kukimbia mvua za mara kwa mara.', upvotes: 22, isExpertVerified: false, status: 'active', createdAt: new Date('2026-06-02T07:30:00Z') },
      { threadId: threads[3].id, authorId: officer2Id, body: 'KMD pia imesema mvua itaendelea hadi Agosti katika Rift Valley. Wakulima wa viazi Nakuru wajikingue dhidi ya late blight — nyunyizo ya kuzuia ni muhimu.', upvotes: 35, isExpertVerified: true,  status: 'active', createdAt: new Date('2026-06-02T09:15:00Z') },
      // Thread 4: Equity loan
      { threadId: threads[4].id, authorId: farmer3Id,  body: 'Mimi nilipata mkopo kupitia Faulu Kenya wiki mbili baada ya kutuma. Lakini KCB ilichukua siku 21. Inategemea benki na band yako ya credit.', upvotes: 11, isExpertVerified: false, status: 'active', createdAt: new Date('2026-06-03T13:40:00Z') },
      { threadId: threads[4].id, authorId: testUserId, body: 'Nimepokea ujumbe leo — mkopo umeidhinishwa! KES 75,000 itatumwa M-Pesa. Asante kwa msaada.', upvotes: 18, isExpertVerified: false, status: 'active', createdAt: new Date('2026-06-10T08:00:00Z') },
      // Thread 5: MSAI subsidy
      { threadId: threads[5].id, authorId: officer2Id, body: 'Ombi la MSAI linafanywa kupitia eCitizen au kaunti yako ya kilimo. Utahitaji: nambari ya AFA, picha ya kadi ya ID, na cheti cha usajili wa shamba. AgroConnect inaweza kukusaidia kujaza fomu.', upvotes: 43, isExpertVerified: true,  status: 'active', createdAt: new Date('2026-05-29T09:00:00Z') },
      // Thread 6: success story
      { threadId: threads[6].id, authorId: farmer3Id,  body: 'Hongera sana! DH04 na umwagiliaji wa tone ni mchanganyiko unaofanya kazi. Mimi pia nimetumia hii Uasin Gishu. Unaweza kushare ratiba yako? Ningependa kuona jinsi ulivyopanga mbolea na dawa.', upvotes: 28, isExpertVerified: false, status: 'active', createdAt: new Date('2026-06-07T09:10:00Z') },
      { threadId: threads[6].id, authorId: officerId,  body: 'Mfano mzuri sana! Hii inaonyesha wakulima wanaweza kufikia tani 6 kwa ekari na teknolojia sahihi. Tunataka kufanya semina kuhusu drip irrigation — jiandikishe kupitia extension office yako.', upvotes: 55, isExpertVerified: true,  status: 'active', createdAt: new Date('2026-06-07T11:00:00Z') },
      // Thread 7: drone spraying
      { threadId: threads[7].id, authorId: farmer2Id,  body: 'Nilitumia drone service Kisumu msimu uliopita kwa blight ya nyanya. Inafanya kazi vizuri — coverage ni bora kuliko knapsack. Lakini uangalifu: uchunguzi wa dawa na muda wa kunyunyizia ni muhimu.', upvotes: 22, isExpertVerified: false, status: 'active', createdAt: new Date('2026-06-06T14:20:00Z') },
    ],
  });

  // ── summary ───────────────────────────────────────────────────────────────────
  const [userCount, farmCount, actCount, inpCount, hvCount, priceCount, subsidyCount,
         loanCount, scoreCount, threadCount, replyCount, listingCount, productCount,
         regCount, licCount] = await Promise.all([
    authDb.user.count(),
    farmDb.farm.count(),
    farmDb.activity.count(),
    farmDb.input.count(),
    farmDb.harvest.count(),
    marketDb.commodityPrice.count(),
    govtDb.subsidyProgram.count(),
    financeDb.loanApplication.count(),
    financeDb.creditScore.count(),
    communityDb.thread.count(),
    communityDb.reply.count(),
    marketDb.produceListing.count(),
    marketDb.supplierProduct.count(),
    govtDb.farmRegistration.count(),
    govtDb.licenseApplication.count(),
  ]);

  console.log('\n✅  Seed complete:');
  console.log(`   users:              ${userCount}`);
  console.log(`   farms:              ${farmCount}`);
  console.log(`   activities:         ${actCount}`);
  console.log(`   inputs:             ${inpCount}`);
  console.log(`   harvests:           ${hvCount}`);
  console.log(`   commodity prices:   ${priceCount}`);
  console.log(`   subsidy programs:   ${subsidyCount}`);
  console.log(`   credit scores:      ${scoreCount}`);
  console.log(`   loan applications:  ${loanCount}`);
  console.log(`   community threads:  ${threadCount}`);
  console.log(`   community replies:  ${replyCount}`);
  console.log(`   market listings:    ${listingCount}`);
  console.log(`   supplier products:  ${productCount}`);
  console.log(`   farm registrations: ${regCount}`);
  console.log(`   license apps:       ${licCount}`);
  console.log('\n   Dev login: +254700001000 / TestPass123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await authDb.$disconnect();
    await farmDb.$disconnect();
    await marketDb.$disconnect();
    await govtDb.$disconnect();
    await financeDb.$disconnect();
    await communityDb.$disconnect();
  });
