export interface DiseaseEntry {
  code: string;
  name: string;
  subjectType: 'plant' | 'animal';
  subjectName: string;
  pathogenType: string;
  severityRange: string;
}

export const DISEASE_TAXONOMY: DiseaseEntry[] = [
  // ── Crop diseases ────────────────────────────────────────────────────────
  { code: 'MAI-GLS-001', name: 'Grey Leaf Spot',                  subjectType: 'plant',  subjectName: 'maize',        pathogenType: 'Fungal (Cercospora)',      severityRange: 'moderate-severe'  },
  { code: 'MAI-NLB-002', name: 'Northern Leaf Blight',            subjectType: 'plant',  subjectName: 'maize',        pathogenType: 'Fungal (Exserohilum)',     severityRange: 'moderate-severe'  },
  { code: 'MAI-MSV-003', name: 'Maize Streak Virus',              subjectType: 'plant',  subjectName: 'maize',        pathogenType: 'Viral (MSV)',              severityRange: 'severe-critical'  },
  { code: 'MAI-FAW-004', name: 'Fall Armyworm',                   subjectType: 'plant',  subjectName: 'maize',        pathogenType: 'Insect (Spodoptera)',      severityRange: 'moderate-critical'},
  { code: 'TOM-LBL-005', name: 'Late Blight',                     subjectType: 'plant',  subjectName: 'tomato',       pathogenType: 'Oomycete (Phytophthora)', severityRange: 'severe-critical'  },
  { code: 'TOM-EBL-006', name: 'Early Blight',                    subjectType: 'plant',  subjectName: 'tomato',       pathogenType: 'Fungal (Alternaria)',      severityRange: 'mild-moderate'    },
  { code: 'TOM-BW-007',  name: 'Bacterial Wilt',                  subjectType: 'plant',  subjectName: 'tomato',       pathogenType: 'Bacterial (Ralstonia)',    severityRange: 'critical'         },
  { code: 'TOM-TYLCV-008',name:'Tomato Yellow Leaf Curl',         subjectType: 'plant',  subjectName: 'tomato',       pathogenType: 'Viral (Begomovirus)',      severityRange: 'severe-critical'  },
  { code: 'BEA-ANT-009', name: 'Bean Anthracnose',                subjectType: 'plant',  subjectName: 'beans',        pathogenType: 'Fungal (Colletotrichum)', severityRange: 'moderate-severe'  },
  { code: 'BEA-ALS-010', name: 'Bean Angular Leaf Spot',          subjectType: 'plant',  subjectName: 'beans',        pathogenType: 'Fungal (Phaeoisariopsis)',severityRange: 'mild-moderate'    },
  { code: 'POT-LBL-011', name: 'Potato Late Blight',              subjectType: 'plant',  subjectName: 'potato',       pathogenType: 'Oomycete (Phytophthora)', severityRange: 'severe-critical'  },
  { code: 'POT-PVY-012', name: 'Potato Virus Y',                  subjectType: 'plant',  subjectName: 'potato',       pathogenType: 'Viral',                   severityRange: 'moderate-severe'  },
  { code: 'CAB-BRR-013', name: 'Cabbage Black Rot',               subjectType: 'plant',  subjectName: 'cabbage',      pathogenType: 'Bacterial (Xanthomonas)', severityRange: 'moderate-severe'  },
  { code: 'CAB-DMD-014', name: 'Cabbage Downy Mildew',            subjectType: 'plant',  subjectName: 'cabbage',      pathogenType: 'Oomycete',                severityRange: 'mild-moderate'    },
  { code: 'COF-CBD-015', name: 'Coffee Berry Disease',            subjectType: 'plant',  subjectName: 'coffee',       pathogenType: 'Fungal (Colletotrichum)', severityRange: 'severe-critical'  },
  { code: 'COF-CLR-016', name: 'Coffee Leaf Rust',                subjectType: 'plant',  subjectName: 'coffee',       pathogenType: 'Fungal (Hemileia)',        severityRange: 'moderate-severe'  },
  { code: 'TEA-BLI-017', name: 'Tea Blister Blight',             subjectType: 'plant',  subjectName: 'tea',          pathogenType: 'Fungal (Exobasidium)',     severityRange: 'moderate-severe'  },
  { code: 'AVA-ADN-018', name: 'Avocado Anthracnose',             subjectType: 'plant',  subjectName: 'avocado',      pathogenType: 'Fungal (Colletotrichum)', severityRange: 'mild-moderate'    },
  { code: 'AVA-PWR-019', name: 'Avocado Phytophthora Root Rot',   subjectType: 'plant',  subjectName: 'avocado',      pathogenType: 'Oomycete',                severityRange: 'severe-critical'  },
  { code: 'MAN-ANT-020', name: 'Mango Anthracnose',               subjectType: 'plant',  subjectName: 'mango',        pathogenType: 'Fungal (Colletotrichum)', severityRange: 'moderate-severe'  },
  { code: 'WHE-STR-021', name: 'Wheat Stem Rust',                 subjectType: 'plant',  subjectName: 'wheat',        pathogenType: 'Fungal (Puccinia)',        severityRange: 'severe-critical'  },
  { code: 'SOR-GMD-022', name: 'Sorghum Grey Mould',              subjectType: 'plant',  subjectName: 'sorghum',      pathogenType: 'Fungal (Botrytis)',        severityRange: 'moderate'         },
  { code: 'SUN-SCL-023', name: 'Sunflower Sclerotinia',           subjectType: 'plant',  subjectName: 'sunflower',    pathogenType: 'Fungal (Sclerotinia)',     severityRange: 'moderate-severe'  },
  { code: 'CAS-CMD-024', name: 'Cassava Mosaic Disease',          subjectType: 'plant',  subjectName: 'cassava',      pathogenType: 'Viral (Begomovirus)',      severityRange: 'severe-critical'  },
  { code: 'CAS-CBB-025', name: 'Cassava Brown Streak',            subjectType: 'plant',  subjectName: 'cassava',      pathogenType: 'Viral (Ipomovirus)',       severityRange: 'critical'         },
  { code: 'SWT-SPW-026', name: 'Sweet Potato Weevil',             subjectType: 'plant',  subjectName: 'sweet potato', pathogenType: 'Insect (Cylas)',           severityRange: 'moderate-severe'  },
  { code: 'ONI-PUR-027', name: 'Onion Purple Blotch',             subjectType: 'plant',  subjectName: 'onion',        pathogenType: 'Fungal (Alternaria)',      severityRange: 'mild-moderate'    },
  { code: 'KAL-DMD-028', name: 'Kale Downy Mildew',              subjectType: 'plant',  subjectName: 'kale',         pathogenType: 'Oomycete',                severityRange: 'mild'             },
  { code: 'PIN-MBU-029', name: 'Pineapple Mealybug Wilt',        subjectType: 'plant',  subjectName: 'pineapple',    pathogenType: 'Viral (PMWaV)',            severityRange: 'moderate-severe'  },
  { code: 'BAN-PAW-030', name: 'Banana Xanthomonas Wilt',        subjectType: 'plant',  subjectName: 'banana',       pathogenType: 'Bacterial (Xanthomonas)', severityRange: 'critical'         },
  // ── Livestock conditions ─────────────────────────────────────────────────
  { code: 'COW-ECF-001', name: 'East Coast Fever',                subjectType: 'animal', subjectName: 'cattle',       pathogenType: 'Tick-borne (Theileria)',  severityRange: 'severe-critical'  },
  { code: 'COW-FMD-002', name: 'Foot and Mouth Disease',          subjectType: 'animal', subjectName: 'cattle',       pathogenType: 'Viral',                   severityRange: 'severe'           },
  { code: 'COW-LSD-003', name: 'Lumpy Skin Disease',              subjectType: 'animal', subjectName: 'cattle',       pathogenType: 'Viral',                   severityRange: 'moderate-severe'  },
  { code: 'GOA-PPR-004', name: 'Peste des Petits Ruminants',      subjectType: 'animal', subjectName: 'goat',         pathogenType: 'Viral',                   severityRange: 'critical'         },
  { code: 'POL-NDV-005', name: 'Newcastle Disease',               subjectType: 'animal', subjectName: 'poultry',      pathogenType: 'Viral',                   severityRange: 'critical'         },
  { code: 'POL-IBD-006', name: 'Gumboro Disease',                 subjectType: 'animal', subjectName: 'poultry',      pathogenType: 'Viral',                   severityRange: 'moderate-severe'  },
  { code: 'COW-MAS-007', name: 'Mastitis',                        subjectType: 'animal', subjectName: 'cattle',       pathogenType: 'Bacterial',               severityRange: 'moderate-severe'  },
  { code: 'COW-BRU-008', name: 'Brucellosis',                     subjectType: 'animal', subjectName: 'cattle',       pathogenType: 'Bacterial',               severityRange: 'moderate'         },
  { code: 'PIG-ASF-009', name: 'African Swine Fever',             subjectType: 'animal', subjectName: 'pig',          pathogenType: 'Viral',                   severityRange: 'critical'         },
  { code: 'COW-ANT-010', name: 'Anthrax',                         subjectType: 'animal', subjectName: 'cattle',       pathogenType: 'Bacterial (Bacillus)',     severityRange: 'critical'         },
];

export const TAXONOMY_BY_CODE = new Map(DISEASE_TAXONOMY.map((d) => [d.code, d]));
