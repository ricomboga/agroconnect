from typing import Literal
from typing_extensions import TypedDict


class DiseaseEntry(TypedDict):
    code: str
    name: str
    subject_type: Literal["plant", "animal"]
    subject_name: str
    pathogen_type: str
    severity_range: str


DISEASE_TAXONOMY: list[DiseaseEntry] = [
    # ── Crop diseases ────────────────────────────────────────────────────────
    {"code": "MAI-GLS-001", "name": "Grey Leaf Spot",                    "subject_type": "plant",  "subject_name": "maize",        "pathogen_type": "Fungal (Cercospora)",      "severity_range": "moderate-severe"},
    {"code": "MAI-NLB-002", "name": "Northern Leaf Blight",              "subject_type": "plant",  "subject_name": "maize",        "pathogen_type": "Fungal (Exserohilum)",     "severity_range": "moderate-severe"},
    {"code": "MAI-MSV-003", "name": "Maize Streak Virus",                "subject_type": "plant",  "subject_name": "maize",        "pathogen_type": "Viral (MSV)",              "severity_range": "severe-critical"},
    {"code": "MAI-FAW-004", "name": "Fall Armyworm",                     "subject_type": "plant",  "subject_name": "maize",        "pathogen_type": "Insect (Spodoptera)",      "severity_range": "moderate-critical"},
    {"code": "TOM-LBL-005", "name": "Late Blight",                       "subject_type": "plant",  "subject_name": "tomato",       "pathogen_type": "Oomycete (Phytophthora)",  "severity_range": "severe-critical"},
    {"code": "TOM-EBL-006", "name": "Early Blight",                      "subject_type": "plant",  "subject_name": "tomato",       "pathogen_type": "Fungal (Alternaria)",      "severity_range": "mild-moderate"},
    {"code": "TOM-BW-007",  "name": "Bacterial Wilt",                    "subject_type": "plant",  "subject_name": "tomato",       "pathogen_type": "Bacterial (Ralstonia)",    "severity_range": "critical"},
    {"code": "TOM-TYLCV-008","name": "Tomato Yellow Leaf Curl",          "subject_type": "plant",  "subject_name": "tomato",       "pathogen_type": "Viral (Begomovirus)",      "severity_range": "severe-critical"},
    {"code": "BEA-ANT-009", "name": "Bean Anthracnose",                  "subject_type": "plant",  "subject_name": "beans",        "pathogen_type": "Fungal (Colletotrichum)",  "severity_range": "moderate-severe"},
    {"code": "BEA-ALS-010", "name": "Bean Angular Leaf Spot",            "subject_type": "plant",  "subject_name": "beans",        "pathogen_type": "Fungal (Phaeoisariopsis)", "severity_range": "mild-moderate"},
    {"code": "POT-LBL-011", "name": "Potato Late Blight",                "subject_type": "plant",  "subject_name": "potato",       "pathogen_type": "Oomycete (Phytophthora)",  "severity_range": "severe-critical"},
    {"code": "POT-PVY-012", "name": "Potato Virus Y",                    "subject_type": "plant",  "subject_name": "potato",       "pathogen_type": "Viral",                    "severity_range": "moderate-severe"},
    {"code": "CAB-BRR-013", "name": "Cabbage Black Rot",                 "subject_type": "plant",  "subject_name": "cabbage",      "pathogen_type": "Bacterial (Xanthomonas)",  "severity_range": "moderate-severe"},
    {"code": "CAB-DMD-014", "name": "Cabbage Downy Mildew",              "subject_type": "plant",  "subject_name": "cabbage",      "pathogen_type": "Oomycete",                 "severity_range": "mild-moderate"},
    {"code": "COF-CBD-015", "name": "Coffee Berry Disease",              "subject_type": "plant",  "subject_name": "coffee",       "pathogen_type": "Fungal (Colletotrichum)",  "severity_range": "severe-critical"},
    {"code": "COF-CLR-016", "name": "Coffee Leaf Rust",                  "subject_type": "plant",  "subject_name": "coffee",       "pathogen_type": "Fungal (Hemileia)",        "severity_range": "moderate-severe"},
    {"code": "TEA-BLI-017", "name": "Tea Blister Blight",               "subject_type": "plant",  "subject_name": "tea",          "pathogen_type": "Fungal (Exobasidium)",     "severity_range": "moderate-severe"},
    {"code": "AVA-ADN-018", "name": "Avocado Anthracnose",               "subject_type": "plant",  "subject_name": "avocado",      "pathogen_type": "Fungal (Colletotrichum)",  "severity_range": "mild-moderate"},
    {"code": "AVA-PWR-019", "name": "Avocado Phytophthora Root Rot",     "subject_type": "plant",  "subject_name": "avocado",      "pathogen_type": "Oomycete",                 "severity_range": "severe-critical"},
    {"code": "MAN-ANT-020", "name": "Mango Anthracnose",                 "subject_type": "plant",  "subject_name": "mango",        "pathogen_type": "Fungal (Colletotrichum)",  "severity_range": "moderate-severe"},
    {"code": "WHE-STR-021", "name": "Wheat Stem Rust",                   "subject_type": "plant",  "subject_name": "wheat",        "pathogen_type": "Fungal (Puccinia)",        "severity_range": "severe-critical"},
    {"code": "SOR-GMD-022", "name": "Sorghum Grey Mould",                "subject_type": "plant",  "subject_name": "sorghum",      "pathogen_type": "Fungal (Botrytis)",        "severity_range": "moderate"},
    {"code": "SUN-SCL-023", "name": "Sunflower Sclerotinia",             "subject_type": "plant",  "subject_name": "sunflower",    "pathogen_type": "Fungal (Sclerotinia)",     "severity_range": "moderate-severe"},
    {"code": "CAS-CMD-024", "name": "Cassava Mosaic Disease",            "subject_type": "plant",  "subject_name": "cassava",      "pathogen_type": "Viral (Begomovirus)",      "severity_range": "severe-critical"},
    {"code": "CAS-CBB-025", "name": "Cassava Brown Streak",              "subject_type": "plant",  "subject_name": "cassava",      "pathogen_type": "Viral (Ipomovirus)",       "severity_range": "critical"},
    {"code": "SWT-SPW-026", "name": "Sweet Potato Weevil",               "subject_type": "plant",  "subject_name": "sweet potato", "pathogen_type": "Insect (Cylas)",           "severity_range": "moderate-severe"},
    {"code": "ONI-PUR-027", "name": "Onion Purple Blotch",               "subject_type": "plant",  "subject_name": "onion",        "pathogen_type": "Fungal (Alternaria)",      "severity_range": "mild-moderate"},
    {"code": "KAL-DMD-028", "name": "Kale Downy Mildew",                "subject_type": "plant",  "subject_name": "kale",         "pathogen_type": "Oomycete",                 "severity_range": "mild"},
    {"code": "PIN-MBU-029", "name": "Pineapple Mealybug Wilt",          "subject_type": "plant",  "subject_name": "pineapple",    "pathogen_type": "Viral (PMWaV)",            "severity_range": "moderate-severe"},
    {"code": "BAN-PAW-030", "name": "Banana Xanthomonas Wilt",          "subject_type": "plant",  "subject_name": "banana",       "pathogen_type": "Bacterial (Xanthomonas)",  "severity_range": "critical"},
    # ── Livestock conditions ─────────────────────────────────────────────────
    {"code": "COW-ECF-001", "name": "East Coast Fever",                  "subject_type": "animal", "subject_name": "cattle",       "pathogen_type": "Tick-borne (Theileria)",   "severity_range": "severe-critical"},
    {"code": "COW-FMD-002", "name": "Foot and Mouth Disease",            "subject_type": "animal", "subject_name": "cattle",       "pathogen_type": "Viral",                    "severity_range": "severe"},
    {"code": "COW-LSD-003", "name": "Lumpy Skin Disease",                "subject_type": "animal", "subject_name": "cattle",       "pathogen_type": "Viral",                    "severity_range": "moderate-severe"},
    {"code": "GOA-PPR-004", "name": "Peste des Petits Ruminants",        "subject_type": "animal", "subject_name": "goat",         "pathogen_type": "Viral",                    "severity_range": "critical"},
    {"code": "POL-NDV-005", "name": "Newcastle Disease",                 "subject_type": "animal", "subject_name": "poultry",      "pathogen_type": "Viral",                    "severity_range": "critical"},
    {"code": "POL-IBD-006", "name": "Gumboro Disease",                   "subject_type": "animal", "subject_name": "poultry",      "pathogen_type": "Viral",                    "severity_range": "moderate-severe"},
    {"code": "COW-MAS-007", "name": "Mastitis",                          "subject_type": "animal", "subject_name": "cattle",       "pathogen_type": "Bacterial",                "severity_range": "moderate-severe"},
    {"code": "COW-BRU-008", "name": "Brucellosis",                       "subject_type": "animal", "subject_name": "cattle",       "pathogen_type": "Bacterial",                "severity_range": "moderate"},
    {"code": "PIG-ASF-009", "name": "African Swine Fever",               "subject_type": "animal", "subject_name": "pig",          "pathogen_type": "Viral",                    "severity_range": "critical"},
    {"code": "COW-ANT-010", "name": "Anthrax",                           "subject_type": "animal", "subject_name": "cattle",       "pathogen_type": "Bacterial (Bacillus)",     "severity_range": "critical"},
]

TAXONOMY_BY_CODE: dict[str, DiseaseEntry] = {d["code"]: d for d in DISEASE_TAXONOMY}

LIVESTOCK_PREFIXES: frozenset[str] = frozenset({"COW", "GOA", "POL", "PIG", "SHP"})
