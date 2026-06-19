import { PrismaClient as AuthPrismaClient } from '../generated/auth-client/index.js';
import { PrismaClient as FarmPrismaClient } from '../generated/farm-client/index.js';
import { PrismaClient as MarketPrismaClient } from '../generated/market-client/index.js';
import { PrismaClient as GovtPrismaClient } from '../generated/govt-client/index.js';
import bcrypt from 'bcryptjs';

const authDb = new AuthPrismaClient();
const farmDb = new FarmPrismaClient();
const marketDb = new MarketPrismaClient({
  datasources: { db: { url: process.env['MARKET_DATABASE_URL'] } },
});
const govtDb = new GovtPrismaClient({
  datasources: { db: { url: process.env['GOVT_DATABASE_URL'] } },
});

// ─── helpers ───────────────────────────────────────────────────────────────────

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

const BASE = new Date('2026-03-10');
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

// inputs applied in April–May window (days 31–91 from Mar 10 = Apr 10 – Jun 09)
const INPUTS_BY_CROP: Record<Crop, InputDef[]> = {
  maize: [
    { daysFromBase: 32, type: 'fertiliser', productName: 'CAN Fertiliser 50kg (Yara)',       quantity: 2,   unit: 'bag',   unitCostKes: 3800 },
    { daysFromBase: 68, type: 'pesticide',  productName: 'Coragen 200SC (FMC) 150ml',        quantity: 2,   unit: 'bottle', unitCostKes: 1450 },
  ],
  tomatoes: [
    { daysFromBase: 38, type: 'pesticide',  productName: 'Ridomil Gold MZ 500g (Syngenta)',  quantity: 3,   unit: 'packet', unitCostKes: 2200 },
    { daysFromBase: 50, type: 'fertiliser', productName: 'Calcium Nitrate 25kg (Haifa)',     quantity: 1,   unit: 'bag',   unitCostKes: 1850 },
    { daysFromBase: 70, type: 'pesticide',  productName: 'Dursban 480EC 1L (Dow)',           quantity: 1,   unit: 'litre', unitCostKes: 1200 },
  ],
  beans: [
    { daysFromBase: 35, type: 'fertiliser', productName: 'DAP Fertiliser 50kg (Yara)',       quantity: 1,   unit: 'bag',   unitCostKes: 4500 },
    { daysFromBase: 55, type: 'pesticide',  productName: 'Dithane M-45 500g (Corteva)',      quantity: 2,   unit: 'packet', unitCostKes: 780  },
  ],
  potatoes: [
    { daysFromBase: 42, type: 'fertiliser', productName: 'NPK 17:17:17 50kg (MEA)',          quantity: 2,   unit: 'bag',   unitCostKes: 5200 },
    { daysFromBase: 60, type: 'pesticide',  productName: 'Ridomil Gold Plus 500g (Syngenta)',quantity: 4,   unit: 'packet', unitCostKes: 2200 },
    { daysFromBase: 72, type: 'pesticide',  productName: 'Dithane M-45 1kg (Corteva)',       quantity: 2,   unit: 'packet', unitCostKes: 1450 },
  ],
  tea: [
    { daysFromBase: 28, type: 'fertiliser', productName: 'NPK 25:5:5 50kg (KTDA spec)',      quantity: 2,   unit: 'bag',   unitCostKes: 4200 },
    { daysFromBase: 49, type: 'pesticide',  productName: 'Karate Zeon 50CS 250ml (Syngenta)',quantity: 2,   unit: 'bottle', unitCostKes: 1800 },
  ],
  coffee: [
    { daysFromBase: 25, type: 'fertiliser', productName: 'CAN Fertiliser 50kg (Yara)',       quantity: 2,   unit: 'bag',   unitCostKes: 3800 },
    { daysFromBase: 48, type: 'pesticide',  productName: 'Copper Oxychloride 1kg (Osho)',    quantity: 3,   unit: 'packet', unitCostKes: 1200 },
  ],
  avocado: [
    { daysFromBase: 22, type: 'fertiliser', productName: 'CAN Fertiliser 50kg (Yara)',       quantity: 1,   unit: 'bag',   unitCostKes: 3800 },
    { daysFromBase: 85, type: 'pesticide',  productName: 'Mancozeb 80WP 500g (Indofil)',     quantity: 2,   unit: 'packet', unitCostKes: 680  },
  ],
};

// ─── harvest generation ─────────────────────────────────────────────────────────

interface HarvestDef {
  daysFromBase: number; crop: Crop; variety: string;
  quantityKgPerAcre: number; grade: 'A' | 'B' | 'C'; priceKes: number;
  storageLocation: string; notes: string;
}

// 1-2 harvests per farm
const HARVESTS_BY_CROP: Record<Crop, HarvestDef[]> = {
  maize: [
    // Long rains 2025 previous-season harvest (offset -150 days before base = Oct 2025)
    { daysFromBase: -150, crop: 'maize', variety: 'DH04 Hybrid', quantityKgPerAcre: 1800,
      grade: 'A', priceKes: 42, storageLocation: 'On-farm grain store', notes: 'Good yield, OcT 2025 short-rains cycle' },
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
    // Planted Mar 20, harvest due late June — adding a previous-season harvest
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

  // hash once — used for all seed users (dev password: TestPass123!)
  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  // ── clean slate ──────────────────────────────────────────────────────────────
  console.log('  Clearing existing seed data...');
  await farmDb.harvest.deleteMany({});
  await farmDb.input.deleteMany({});
  await farmDb.activity.deleteMany({});
  await farmDb.farmPlot.deleteMany({});
  await farmDb.farm.deleteMany({});
  await authDb.session.deleteMany({ where: { user: { phone: { contains: '001' } } } });
  await authDb.user.deleteMany({ where: { phone: { contains: '001' } } });

  // ── users ─────────────────────────────────────────────────────────────────────
  console.log('  Creating 20 users...');
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

  // ── farms + activities + inputs + harvests ─────────────────────────────────────
  console.log('  Creating 30 farms with activities, inputs and harvests...');

  for (const f of FARMS) {
    const ownerId = userMap.get(f.ownerPhone);
    if (!ownerId) throw new Error(`Owner not found for phone ${f.ownerPhone}`);

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

    // activities
    const actDefs = ACTIVITIES_BY_CROP[f.crop];
    for (const a of actDefs) {
      const scheduled = addDays(BASE, a.daysFromBase);
      const isPast = scheduled <= TODAY;
      const isRecentlyPast = isPast && scheduled >= addDays(TODAY, -7);
      // activities within 7 days of today: 50/50 completed vs pending (use farm lat as tiebreak)
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

    // inputs
    const inpDefs = INPUTS_BY_CROP[f.crop];
    for (const i of inpDefs) {
      const appliedDate = addDays(BASE, i.daysFromBase);
      // only seed inputs that fall within the Apr–May window (days 31–91)
      if (i.daysFromBase < 31 || i.daysFromBase > 91) continue;
      const totalCostKes = i.quantity * i.unitCostKes;
      await farmDb.input.create({
        data: {
          farmId:       farm.id,
          type:         i.type,
          productName:  i.productName,
          quantity:     i.quantity,
          unit:         i.unit,
          unitCostKes:  i.unitCostKes,
          totalCostKes,
          appliedDate,
        },
      });
    }

    // harvests
    const hvDefs = HARVESTS_BY_CROP[f.crop];
    for (const h of hvDefs) {
      const harvestDate = addDays(BASE, h.daysFromBase);
      // only create harvest if date is in the past
      if (harvestDate > TODAY) continue;
      const quantityKg = Math.round(h.quantityKgPerAcre * f.acres);
      const avgPriceKes = h.priceKes;
      const totalRevenueKes = Math.round(quantityKg * avgPriceKes * 0.85); // 15% kept/unsold
      const soldQuantityKg  = Math.round(quantityKg * 0.85);
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
          avgPriceKes,
          totalRevenueKes,
          notes:           h.notes,
        },
      });
    }
  }

  // ── govt subsidy programs ─────────────────────────────────────────────────────
  console.log('  Seeding 5 subsidy programs...');
  await govtDb.subsidyApplication.deleteMany({});
  await govtDb.subsidyProgram.deleteMany({});
  await govtDb.subsidyProgram.createMany({
    data: [
      {
        name: 'MSAI Fertiliser Subsidy',
        description: 'Subsidised certified fertilisers for smallholder farmers through the Ministry of Agriculture Seed and Input programme.',
        providerAgency: 'Ministry of Agriculture and Livestock Development',
        eligibility: 'Smallholder farmers with registered farm of ≤5 acres and a valid AFA farmer ID',
        benefitType: 'subsidy',
        benefitValue: '50% discount on NPKS and CAN fertilisers (max 2 bags per season)',
        countyEligible: [],
        isActive: true,
      },
      {
        name: 'KALRO High-Yielding Seeds',
        description: 'Access to improved drought-tolerant and disease-resistant seed varieties developed by KALRO research stations.',
        providerAgency: 'Kenya Agricultural and Livestock Research Organisation',
        eligibility: 'Registered farmers growing maize, beans, sorghum, or cowpea',
        benefitType: 'subsidy',
        benefitValue: 'Certified KALRO seeds at 30% below commercial market price',
        countyEligible: [],
        isActive: true,
      },
      {
        name: 'AFC Youth in Agribusiness',
        description: 'Low-interest agricultural loans for youth-led farming enterprises to boost food production and rural employment.',
        providerAgency: 'Agricultural Finance Corporation',
        eligibility: 'Kenyan youth aged 18–35 with a viable agribusiness plan and farm collateral or group guarantee',
        benefitType: 'loan',
        benefitValue: 'Loans of KES 50,000–500,000 at 8% p.a., repayable over 3 years',
        countyEligible: [],
        isActive: true,
      },
      {
        name: 'NDMA Drought Emergency Relief',
        description: 'Emergency food and input relief for farmers in arid and semi-arid counties affected by drought.',
        providerAgency: 'National Drought Management Authority',
        eligibility: 'Farmers in ASAL counties with documented crop failure or livestock loss due to drought',
        benefitType: 'grant',
        benefitValue: 'Emergency seed and food package valued at up to KES 15,000 per household',
        countyEligible: ['Turkana', 'Marsabit', 'Isiolo', 'Mandera', 'Wajir', 'Garissa', 'Samburu', 'Baringo', 'Laikipia'],
        isActive: true,
      },
      {
        name: 'KCSAP Climate Smart Agriculture Grants',
        description: 'Grants to smallholder farmers for adoption of climate-smart practices including conservation agriculture, agroforestry, and irrigation.',
        providerAgency: 'State Department for Crop Development (KCSAP)',
        eligibility: 'Smallholder farmers in targeted sub-counties enrolled in an active Common Interest Group (CIG)',
        benefitType: 'grant',
        benefitValue: 'Matching grants of KES 20,000–100,000 for approved CSA investments',
        countyEligible: ['Nakuru', 'Meru', 'Bungoma', 'Kakamega', 'Kisumu', 'Kiambu', "Murang'a", 'Embu'],
        isActive: true,
      },
    ],
  });

  // ── market commodity prices ───────────────────────────────────────────────────
  console.log('  Seeding commodity prices...');
  await marketDb.commodityPrice.deleteMany({});
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

  // ── summary ───────────────────────────────────────────────────────────────────
  const [userCount, farmCount, actCount, inpCount, hvCount, priceCount, subsidyCount] = await Promise.all([
    authDb.user.count(),
    farmDb.farm.count(),
    farmDb.activity.count(),
    farmDb.input.count(),
    farmDb.harvest.count(),
    marketDb.commodityPrice.count(),
    govtDb.subsidyProgram.count(),
  ]);

  console.log('\n✅  Seed complete:');
  console.log(`   users:            ${userCount}`);
  console.log(`   farms:            ${farmCount}`);
  console.log(`   activities:       ${actCount}`);
  console.log(`   inputs:           ${inpCount}`);
  console.log(`   harvests:         ${hvCount}`);
  console.log(`   commodity prices: ${priceCount}`);
  console.log(`   subsidy programs: ${subsidyCount}`);
  console.log('\n   Dev password for all users: TestPass123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await authDb.$disconnect();
    await farmDb.$disconnect();
    await marketDb.$disconnect();
    await govtDb.$disconnect();
  });
