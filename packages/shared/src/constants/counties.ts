export const KENYA_COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta',
  'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru',
  'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua',
  'Nyeri', 'Kirinyaga', "Murang'a", 'Kiambu', 'Turkana', 'West Pokot',
  'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi',
  'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet',
  'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay',
  'Migori', 'Kisii', 'Nyamira', 'Nairobi',
] as const;

export type KenyaCounty = typeof KENYA_COUNTIES[number];

export const SUB_COUNTIES_BY_COUNTY: Record<KenyaCounty, string[]> = {
  Mombasa: ['Changamwe', 'Jomvu', 'Kisauni', 'Nyali', 'Likoni', 'Mvita'],
  Kwale: ['Msambweni', 'Lunga Lunga', 'Matuga', 'Kinango'],
  Kilifi: ['Kilifi North', 'Kilifi South', 'Kaloleni', 'Rabai', 'Ganze', 'Malindi', 'Magarini'],
  'Tana River': ['Garsen', 'Galole', 'Bura'],
  Lamu: ['Lamu East', 'Lamu West'],
  'Taita-Taveta': ['Taveta', 'Wundanyi', 'Mwatate', 'Voi'],
  Garissa: ['Garissa Township', 'Balambala', 'Lagdera', 'Dadaab', 'Fafi', 'Ijara'],
  Wajir: ['Wajir North', 'Wajir East', 'Tarbaj', 'Wajir West', 'Eldas', 'Wajir South'],
  Mandera: ['Mandera West', 'Banissa', 'Mandera North', 'Mandera South', 'Mandera East', 'Lafey'],
  Marsabit: ['Moyale', 'North Horr', 'Saku', 'Laisamis'],
  Isiolo: ['Isiolo North', 'Isiolo South'],
  Meru: [
    'Igembe South', 'Igembe Central', 'Igembe North', 'Tigania West', 'Tigania East',
    'North Imenti', 'Buuri', 'Central Imenti', 'South Imenti',
  ],
  'Tharaka-Nithi': ['Maara', "Chuka/Igambang'ombe", 'Tharaka'],
  Embu: ['Manyatta', 'Runyenjes', 'Mbeere South', 'Mbeere North'],
  Kitui: [
    'Mwingi North', 'Mwingi West', 'Mwingi Central', 'Kitui West',
    'Kitui Rural', 'Kitui Central', 'Kitui East', 'Kitui South',
  ],
  Machakos: ['Masinga', 'Yatta', 'Kangundo', 'Matungulu', 'Kathiani', 'Mavoko', 'Machakos Town', 'Mwala'],
  Makueni: ['Mbooni', 'Kilome', 'Kaiti', 'Makueni', 'Kibwezi West', 'Kibwezi East'],
  Nyandarua: ['Kinangop', 'Kipipiri', 'Ol Kalou', 'Ol Jorok', 'Ndaragwa'],
  Nyeri: ['Tetu', 'Kieni', 'Mathira', 'Othaya', 'Mukurweini', 'Nyeri Town'],
  Kirinyaga: ['Mwea', 'Gichugu', 'Ndia', 'Kirinyaga Central'],
  "Murang'a": ['Kangema', 'Mathioya', 'Kiharu', 'Kigumo', 'Maragwa', 'Kandara', 'Gatanga'],
  Kiambu: [
    'Gatundu South', 'Gatundu North', 'Juja', 'Thika Town', 'Ruiru', 'Githunguri',
    'Kiambu', 'Kiambaa', 'Kabete', 'Kikuyu', 'Limuru', 'Lari',
  ],
  Turkana: ['Turkana North', 'Turkana West', 'Turkana Central', 'Loima', 'Turkana South', 'Turkana East'],
  'West Pokot': ['Kapenguria', 'Sigor', 'Kacheliba', 'Pokot South'],
  Samburu: ['Samburu West', 'Samburu North', 'Samburu East'],
  'Trans Nzoia': ['Kwanza', 'Endebess', 'Saboti', 'Kiminini', 'Cherangany'],
  'Uasin Gishu': ['Soy', 'Turbo', 'Moiben', 'Ainabkoi', 'Kapseret', 'Kesses'],
  'Elgeyo-Marakwet': ['Marakwet East', 'Marakwet West', 'Keiyo North', 'Keiyo South'],
  Nandi: ['Tinderet', 'Aldai', 'Nandi Hills', 'Chesumei', 'Emgwen', 'Mosop'],
  Baringo: ['Tiaty', 'Baringo North', 'Baringo Central', 'Baringo South', 'Mogotio', 'Eldama Ravine'],
  Laikipia: ['Laikipia West', 'Laikipia East', 'Laikipia North'],
  Nakuru: [
    'Molo', 'Njoro', 'Naivasha', 'Gilgil', 'Kuresoi South', 'Kuresoi North',
    'Subukia', 'Rongai', 'Bahati', 'Nakuru Town West', 'Nakuru Town East',
  ],
  Narok: ['Kilgoris', 'Emurua Dikirr', 'Narok North', 'Narok East', 'Narok South', 'Narok West'],
  Kajiado: ['Kajiado North', 'Kajiado Central', 'Kajiado East', 'Kajiado West', 'Kajiado South'],
  Kericho: ['Kipkelion East', 'Kipkelion West', 'Ainamoi', 'Bureti', 'Belgut', 'Sigowet/Soin'],
  Bomet: ['Sotik', 'Chepalungu', 'Bomet East', 'Bomet Central', 'Konoin'],
  Kakamega: [
    'Lugari', 'Likuyani', 'Malava', 'Lurambi', 'Navakholo', 'Mumias West',
    'Mumias East', 'Matungu', 'Butere', 'Khwisero', 'Shinyalu', 'Ikolomani',
  ],
  Vihiga: ['Vihiga', 'Sabatia', 'Hamisi', 'Luanda', 'Emuhaya'],
  Bungoma: [
    'Mt. Elgon', 'Sirisia', 'Kabuchai', 'Bumula', 'Kanduyi', 'Webuye East',
    'Webuye West', 'Kimilili', 'Tongaren',
  ],
  Busia: ['Teso North', 'Teso South', 'Nambale', 'Matayos', 'Butula', 'Funyula', 'Budalangi'],
  Siaya: ['Ugenya', 'Ugunja', 'Alego Usonga', 'Gem', 'Bondo', 'Rarieda'],
  Kisumu: ['Kisumu East', 'Kisumu West', 'Kisumu Central', 'Seme', 'Nyando', 'Muhoroni', 'Nyakach'],
  'Homa Bay': [
    'Kasipul', 'Kabondo Kasipul', 'Karachuonyo', 'Rangwe', 'Homa Bay Town',
    'Ndhiwa', 'Suba North', 'Suba South',
  ],
  Migori: ['Rongo', 'Awendo', 'Suna East', 'Suna West', 'Uriri', 'Nyatike', 'Kuria West', 'Kuria East'],
  Kisii: [
    'Bonchari', 'South Mugirango', 'Bomachoge Borabu', 'Bobasi', 'Bomachoge Chache',
    'Nyaribari Masaba', 'Nyaribari Chache', 'Kitutu Chache North', 'Kitutu Chache South',
  ],
  Nyamira: ['Kitutu Masaba', 'West Mugirango', 'North Mugirango', 'Borabu'],
  Nairobi: [
    'Westlands', 'Dagoretti North', 'Dagoretti South', 'Langata', 'Kibra', 'Roysambu',
    'Kasarani', 'Ruaraka', 'Embakasi South', 'Embakasi North', 'Embakasi Central',
    'Embakasi East', 'Embakasi West', 'Makadara', 'Kamukunji', 'Starehe', 'Mathare',
  ],
};

export const KENYA_REGIONS = {
  Nairobi: ['Nairobi'],
  Central: ['Kiambu', "Murang'a", 'Nyeri', 'Kirinyaga', 'Nyandarua'],
  Coast: ['Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta'],
  Eastern: ['Machakos', 'Makueni', 'Kitui', 'Embu', 'Tharaka-Nithi', 'Meru', 'Isiolo', 'Marsabit'],
  'North Eastern': ['Garissa', 'Wajir', 'Mandera'],
  Nyanza: ['Kisumu', 'Siaya', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira'],
  'Rift Valley': [
    'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet',
    'Nandi', 'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet',
  ],
  Western: ['Kakamega', 'Vihiga', 'Bungoma', 'Busia'],
} as const satisfies Record<string, readonly KenyaCounty[]>;

export type KenyaRegion = keyof typeof KENYA_REGIONS;

const COUNTY_TO_REGION: Record<KenyaCounty, KenyaRegion> = Object.entries(KENYA_REGIONS).reduce(
  (acc, [region, counties]) => {
    for (const county of counties) acc[county as KenyaCounty] = region as KenyaRegion;
    return acc;
  },
  {} as Record<KenyaCounty, KenyaRegion>,
);

/** Returns the region name a county belongs to, e.g. "Nakuru" -> "Rift Valley". */
export function getRegionForCounty(county: string): KenyaRegion | undefined {
  return COUNTY_TO_REGION[county as KenyaCounty];
}

/** Returns every county in the same region as `county` (including itself). */
export function getRegionCounties(county: string): readonly string[] {
  const region = getRegionForCounty(county);
  return region ? KENYA_REGIONS[region] : [];
}
