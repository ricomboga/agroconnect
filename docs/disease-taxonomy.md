# AgroConnect — Disease Taxonomy

Reference: `@docs/disease-taxonomy.md`
Used by: diagnosis-service, farm-service, community-service

## Crop diseases (Phase 1 — 30 diseases)

| Code | Disease name | Crop | Pathogen type | Severity range |
|---|---|---|---|---|
| MAI-GLS-001 | Grey Leaf Spot | Maize | Fungal (Cercospora) | Moderate–Severe |
| MAI-NLB-002 | Northern Leaf Blight | Maize | Fungal (Exserohilum) | Moderate–Severe |
| MAI-MSV-003 | Maize Streak Virus | Maize | Viral (MSV) | Severe–Critical |
| MAI-FAW-004 | Fall Armyworm | Maize | Insect (Spodoptera) | Moderate–Critical |
| TOM-LBL-005 | Late Blight | Tomato | Oomycete (Phytophthora) | Severe–Critical |
| TOM-EBL-006 | Early Blight | Tomato | Fungal (Alternaria) | Mild–Moderate |
| TOM-BW-007 | Bacterial Wilt | Tomato | Bacterial (Ralstonia) | Critical |
| TOM-TYLCV-008 | Tomato Yellow Leaf Curl | Tomato | Viral (Begomovirus) | Severe–Critical |
| BEA-ANT-009 | Bean Anthracnose | Beans | Fungal (Colletotrichum) | Moderate–Severe |
| BEA-ALS-010 | Bean Angular Leaf Spot | Beans | Fungal (Phaeoisariopsis) | Mild–Moderate |
| POT-LBL-011 | Potato Late Blight | Potato | Oomycete (Phytophthora) | Severe–Critical |
| POT-PVY-012 | Potato Virus Y | Potato | Viral | Moderate–Severe |
| CAB-BRR-013 | Cabbage Black Rot | Cabbage | Bacterial (Xanthomonas) | Moderate–Severe |
| CAB-DMD-014 | Cabbage Downy Mildew | Cabbage | Oomycete | Mild–Moderate |
| COF-CBD-015 | Coffee Berry Disease | Coffee | Fungal (Colletotrichum) | Severe–Critical |
| COF-CLR-016 | Coffee Leaf Rust | Coffee | Fungal (Hemileia) | Moderate–Severe |
| TEA-BLI-017 | Tea Blister Blight | Tea | Fungal (Exobasidium) | Moderate–Severe |
| AVA-ADN-018 | Avocado Anthracnose | Avocado | Fungal (Colletotrichum) | Mild–Moderate |
| AVA-PWR-019 | Avocado Phytophthora Root Rot | Avocado | Oomycete | Severe–Critical |
| MAN-ANT-020 | Mango Anthracnose | Mango | Fungal (Colletotrichum) | Moderate–Severe |
| WHE-STR-021 | Wheat Stem Rust | Wheat | Fungal (Puccinia) | Severe–Critical |
| SOR-GMD-022 | Sorghum Grey Mould | Sorghum | Fungal (Botrytis) | Moderate |
| SUN-SCL-023 | Sunflower Sclerotinia | Sunflower | Fungal (Sclerotinia) | Moderate–Severe |
| CAS-CMD-024 | Cassava Mosaic Disease | Cassava | Viral (Begomovirus) | Severe–Critical |
| CAS-CBB-025 | Cassava Brown Streak | Cassava | Viral (Ipomovirus) | Critical |
| SWT-SPW-026 | Sweet Potato Weevil | Sweet Potato | Insect (Cylas) | Moderate–Severe |
| ONI-PUR-027 | Onion Purple Blotch | Onion | Fungal (Alternaria) | Mild–Moderate |
| KAL-DMD-028 | Kale Downy Mildew | Kale | Oomycete | Mild |
| PIN-MBU-029 | Pineapple Mealybug Wilt | Pineapple | Viral (PMWaV) | Moderate–Severe |
| BAN-PAW-030 | Banana Xanthomonas Wilt | Banana | Bacterial (Xanthomonas) | Critical |

## Livestock conditions (Phase 1 — 10 conditions)

| Code | Condition | Species | Type | Severity |
|---|---|---|---|---|
| COW-ECF-001 | East Coast Fever | Cattle | Tick-borne (Theileria) | Severe–Critical |
| COW-FMD-002 | Foot and Mouth Disease | Cattle/Goats/Sheep | Viral | Severe |
| COW-LSD-003 | Lumpy Skin Disease | Cattle | Viral | Moderate–Severe |
| GOA-PPR-004 | Peste des Petits Ruminants | Goats/Sheep | Viral | Critical |
| POL-NDV-005 | Newcastle Disease | Poultry | Viral | Critical |
| POL-IBD-006 | Gumboro Disease | Poultry | Viral | Moderate–Severe |
| COW-MAS-007 | Mastitis | Dairy cattle | Bacterial | Moderate–Severe |
| COW-BRU-008 | Brucellosis | Cattle/Goats | Bacterial | Moderate |
| PIG-ASF-009 | African Swine Fever | Pigs | Viral | Critical |
| COW-ANT-010 | Anthrax | All livestock | Bacterial (Bacillus) | Critical |

## Code format
`{CROP_CODE}-{CONDITION_CODE}-{NUMBER}`

Crop codes: MAI, TOM, BEA, POT, CAB, COF, TEA, AVA, MAN, WHE, SOR, SUN, CAS, SWT, ONI, KAL, PIN, BAN
Animal codes: COW, GOA, POL, PIG, SHP

New diseases added to the taxonomy must be reviewed by the Head of Agronomy before the model is retrained. See `@.claude/skills/ml-retrain/SKILL.md`.
