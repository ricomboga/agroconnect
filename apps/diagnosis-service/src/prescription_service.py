"""
Prescription service — maps every disease/condition code from
docs/disease-taxonomy.md to 2–3 actionable treatment steps.

All keys in PRESCRIPTIONS must exist in TAXONOMY_BY_CODE.
No code may appear here that is not in the taxonomy document.
"""

from __future__ import annotations

from typing_extensions import TypedDict

from src.utils.disease_taxonomy import TAXONOMY_BY_CODE


class PrescriptionStep(TypedDict):
    step_number: int
    action: str
    product_name: str
    product_type: str
    dosage: str
    frequency: str


# ---------------------------------------------------------------------------
# Full prescription table — 30 crop diseases + 10 livestock conditions.
# Codes match docs/disease-taxonomy.md exactly.
# ---------------------------------------------------------------------------

PRESCRIPTIONS: dict[str, list[PrescriptionStep]] = {

    # ── Maize ────────────────────────────────────────────────────────────────

    "MAI-GLS-001": [
        {"step_number": 1, "action": "Remove and destroy lower infected leaves",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Once"},
        {"step_number": 2, "action": "Apply Mancozeb 80WP as protective fungicide spray",
         "product_name": "Mancozeb 80WP", "product_type": "fungicide", "dosage": "2.5 g/L", "frequency": "Every 7 days for 3 applications"},
        {"step_number": 3, "action": "Maintain adequate plant spacing to improve air circulation",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Ongoing"},
    ],

    "MAI-NLB-002": [
        {"step_number": 1, "action": "Destroy all crop residues after harvest by burning or deep burial",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Once post-harvest"},
        {"step_number": 2, "action": "Apply Propiconazole 25EC at first lesion appearance",
         "product_name": "Propiconazole 25EC", "product_type": "fungicide", "dosage": "1 mL/L", "frequency": "Every 14 days, 2 applications"},
        {"step_number": 3, "action": "Plant resistant varieties in the following season",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Next planting"},
    ],

    "MAI-MSV-003": [
        {"step_number": 1, "action": "Uproot and burn all infected plants immediately — no curative treatment",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 2, "action": "Apply Imidacloprid 70WS as seed dressing to control leafhopper vectors",
         "product_name": "Imidacloprid 70WS", "product_type": "insecticide", "dosage": "Per label rate", "frequency": "At planting"},
        {"step_number": 3, "action": "Control surrounding weed hosts of leafhoppers",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Weekly during season"},
    ],

    "MAI-FAW-004": [
        {"step_number": 1, "action": "Apply Emamectin Benzoate 1.9EC into the leaf funnel at first sign of damage",
         "product_name": "Emamectin Benzoate 1.9EC", "product_type": "pesticide", "dosage": "0.4 g/L", "frequency": "Every 7 days while active"},
        {"step_number": 2, "action": "Deploy pheromone traps for population monitoring and mass trapping",
         "product_name": "FAW Pheromone Trap", "product_type": "trap", "dosage": "1 trap per 20 acres", "frequency": "Check weekly"},
        {"step_number": 3, "action": "Apply Neem-based extract as early-stage deterrent",
         "product_name": "Azadirachtin Neem Extract", "product_type": "biopesticide", "dosage": "5 mL/L", "frequency": "Every 5 days at early stage"},
    ],

    # ── Tomato ───────────────────────────────────────────────────────────────

    "TOM-LBL-005": [
        {"step_number": 1, "action": "Remove and destroy all infected leaves, stems and fruits immediately",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 2, "action": "Apply Metalaxyl + Mancozeb fungicide preventively and curatively",
         "product_name": "Ridomil Gold MZ 68WP", "product_type": "fungicide", "dosage": "2.5 g/L", "frequency": "Every 5–7 days"},
        {"step_number": 3, "action": "Switch to drip or furrow irrigation — avoid wetting foliage",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Ongoing"},
    ],

    "TOM-EBL-006": [
        {"step_number": 1, "action": "Remove lower infected leaves; do not compost",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Weekly scouting"},
        {"step_number": 2, "action": "Apply Chlorothalonil 75WP as protective spray",
         "product_name": "Daconil 75WP", "product_type": "fungicide", "dosage": "2 g/L", "frequency": "Every 7–10 days"},
        {"step_number": 3, "action": "Mulch around plant base to prevent soil-splash infection",
         "product_name": "Organic mulch", "product_type": "cultural", "dosage": "5 cm thick layer", "frequency": "Once per season"},
    ],

    "TOM-BW-007": [
        {"step_number": 1, "action": "Uproot and burn all infected plants immediately — no effective chemical treatment",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 2, "action": "Solarise soil with clear plastic sheeting for 4–6 weeks before replanting",
         "product_name": "Clear plastic sheeting", "product_type": "cultural", "dosage": "N/A", "frequency": "Once before replanting"},
        {"step_number": 3, "action": "Rotate with non-solanaceous crops for a minimum of 3 seasons",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Next 3 seasons"},
    ],

    "TOM-TYLCV-008": [
        {"step_number": 1, "action": "Remove and destroy all infected plants immediately",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 2, "action": "Apply Imidacloprid 200SL to control whitefly vectors",
         "product_name": "Confidor 200SL", "product_type": "insecticide", "dosage": "0.5 mL/L", "frequency": "Every 7 days"},
        {"step_number": 3, "action": "Use silver-reflective mulch to deter whiteflies",
         "product_name": "Silver reflective mulch", "product_type": "cultural", "dosage": "N/A", "frequency": "Throughout season"},
    ],

    # ── Beans ────────────────────────────────────────────────────────────────

    "BEA-ANT-009": [
        {"step_number": 1, "action": "Use certified seed treated with Thiram fungicide before planting",
         "product_name": "Thiram 80WP", "product_type": "fungicide", "dosage": "3 g per kg of seed", "frequency": "At planting"},
        {"step_number": 2, "action": "Apply Mancozeb 80WP from pod-formation stage",
         "product_name": "Mancozeb 80WP", "product_type": "fungicide", "dosage": "2.5 g/L", "frequency": "Every 7 days"},
        {"step_number": 3, "action": "Harvest promptly at maturity; avoid harvesting in wet conditions",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "At maturity"},
    ],

    "BEA-ALS-010": [
        {"step_number": 1, "action": "Apply Copper Oxychloride 50WP spray",
         "product_name": "Copper Oxychloride 50WP", "product_type": "fungicide", "dosage": "3 g/L", "frequency": "Every 10 days"},
        {"step_number": 2, "action": "Rotate with non-legume crops for at least 2 seasons",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Next 2 seasons"},
    ],

    # ── Potato ───────────────────────────────────────────────────────────────

    "POT-LBL-011": [
        {"step_number": 1, "action": "Remove and destroy all infected haulms and tubers",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 2, "action": "Apply Metalaxyl-M + Mancozeb fungicide as preventive spray",
         "product_name": "Ridomil Gold MZ 68WP", "product_type": "fungicide", "dosage": "2.5 g/L", "frequency": "Every 7 days"},
        {"step_number": 3, "action": "Earth up ridges to prevent spore spread to tubers",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Once at tuber initiation"},
    ],

    "POT-PVY-012": [
        {"step_number": 1, "action": "Use only certified virus-free seed potatoes",
         "product_name": "Certified seed potatoes", "product_type": "cultural", "dosage": "N/A", "frequency": "At planting"},
        {"step_number": 2, "action": "Apply Thiamethoxam 25WG to control aphid vectors",
         "product_name": "Actara 25WG", "product_type": "insecticide", "dosage": "0.3 g/L", "frequency": "Every 14 days"},
        {"step_number": 3, "action": "Rogue out infected plants immediately to prevent spread",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Weekly scouting"},
    ],

    # ── Cabbage ──────────────────────────────────────────────────────────────

    "CAB-BRR-013": [
        {"step_number": 1, "action": "Treat seed with hot water (50°C for 25 minutes) before sowing",
         "product_name": "Hot water treatment", "product_type": "cultural", "dosage": "50°C for 25 min", "frequency": "Before planting"},
        {"step_number": 2, "action": "Apply Copper Oxychloride 50WP spray",
         "product_name": "Copper Oxychloride 50WP", "product_type": "bactericide", "dosage": "3 g/L", "frequency": "Every 10 days"},
        {"step_number": 3, "action": "Remove and burn infected material; avoid overhead irrigation",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
    ],

    "CAB-DMD-014": [
        {"step_number": 1, "action": "Apply Metalaxyl + Mancozeb fungicide preventively",
         "product_name": "Ridomil Gold MZ 68WP", "product_type": "fungicide", "dosage": "2.5 g/L", "frequency": "Every 7 days"},
        {"step_number": 2, "action": "Widen plant spacing to improve air circulation",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "At transplanting"},
    ],

    # ── Coffee ───────────────────────────────────────────────────────────────

    "COF-CBD-015": [
        {"step_number": 1, "action": "Spray Copper Hydroxide 77WP from green-berry stage",
         "product_name": "Kocide 77WP", "product_type": "fungicide", "dosage": "3 g/L", "frequency": "Every 14 days"},
        {"step_number": 2, "action": "Carry out timely harvesting; remove all mummy berries",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Weekly during harvest"},
        {"step_number": 3, "action": "Prune to open canopy and improve air circulation",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Annual"},
    ],

    "COF-CLR-016": [
        {"step_number": 1, "action": "Apply Triadimefon 25WP systemic fungicide at first sign of rust",
         "product_name": "Bayleton 25WP", "product_type": "fungicide", "dosage": "1 g/L", "frequency": "Every 21 days"},
        {"step_number": 2, "action": "Remove and destroy severely infected leaves",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 3, "action": "Apply balanced NPK fertiliser — nutrient-stressed plants are more susceptible",
         "product_name": "NPK 17:17:17", "product_type": "fertiliser", "dosage": "50 g per tree", "frequency": "Once per season"},
    ],

    # ── Tea ──────────────────────────────────────────────────────────────────

    "TEA-BLI-017": [
        {"step_number": 1, "action": "Apply Copper Oxychloride 50WP at every plucking round during wet season",
         "product_name": "Copper Oxychloride 50WP", "product_type": "fungicide", "dosage": "3 g/L", "frequency": "At each plucking cycle"},
        {"step_number": 2, "action": "Increase plucking frequency to remove infected flushes before spore release",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Every 7 days during wet season"},
    ],

    # ── Avocado ──────────────────────────────────────────────────────────────

    "AVA-ADN-018": [
        {"step_number": 1, "action": "Prune infected branches; sterilise tools between cuts with 70% alcohol",
         "product_name": "70% Ethanol", "product_type": "sanitiser", "dosage": "Full strength", "frequency": "Between each cut"},
        {"step_number": 2, "action": "Apply Carbendazim 50WP as pre-harvest spray and post-harvest fruit dip",
         "product_name": "Bavistin 50WP", "product_type": "fungicide", "dosage": "1 g/L", "frequency": "Every 14 days pre-harvest; once post-harvest"},
        {"step_number": 3, "action": "Handle harvested fruit carefully to avoid skin wounds",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "At harvest"},
    ],

    "AVA-PWR-019": [
        {"step_number": 1, "action": "Apply Fosetyl-Aluminium 80WP as quarterly soil drench",
         "product_name": "Aliette 80WP", "product_type": "fungicide", "dosage": "3 g/L", "frequency": "Every 3 months"},
        {"step_number": 2, "action": "Improve drainage; never allow waterlogging around root zone",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Ongoing"},
        {"step_number": 3, "action": "Avoid planting in previously infested soil; use resistant rootstock",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "At establishment"},
    ],

    # ── Mango ────────────────────────────────────────────────────────────────

    "MAN-ANT-020": [
        {"step_number": 1, "action": "Apply Mancozeb 80WP from bud break through fruit set",
         "product_name": "Mancozeb 80WP", "product_type": "fungicide", "dosage": "2.5 g/L", "frequency": "Every 10 days"},
        {"step_number": 2, "action": "Dip harvested fruit in hot water (52°C, 5 min) or Carbendazim solution",
         "product_name": "Bavistin 50WP", "product_type": "fungicide", "dosage": "1 g/L solution", "frequency": "Once post-harvest"},
        {"step_number": 3, "action": "Prune to improve air circulation; remove all infected debris from orchard floor",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Annual after harvest"},
    ],

    # ── Wheat ────────────────────────────────────────────────────────────────

    "WHE-STR-021": [
        {"step_number": 1, "action": "Apply Propiconazole 25EC fungicide at first uredinia appearance",
         "product_name": "Tilt 250EC", "product_type": "fungicide", "dosage": "1 mL/L", "frequency": "Once at first sign; repeat in 14 days if needed"},
        {"step_number": 2, "action": "Plant resistant wheat varieties (e.g. Kenya Fahari, KW Duma)",
         "product_name": "Resistant wheat variety seed", "product_type": "cultural", "dosage": "N/A", "frequency": "Next planting season"},
        {"step_number": 3, "action": "Destroy volunteer wheat and grass rust hosts in surrounding fields",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Throughout season"},
    ],

    # ── Sorghum ──────────────────────────────────────────────────────────────

    "SOR-GMD-022": [
        {"step_number": 1, "action": "Harvest promptly at physiological maturity; do not leave in field after maturity",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "At maturity"},
        {"step_number": 2, "action": "Apply Thiram 80WP as protectant spray at panicle emergence",
         "product_name": "Thiram 80WP", "product_type": "fungicide", "dosage": "3 g/L", "frequency": "Once at panicle emergence"},
        {"step_number": 3, "action": "Select open-panicle sorghum varieties to reduce humid microclimate",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Next planting"},
    ],

    # ── Sunflower ─────────────────────────────────────────────────────────────

    "SUN-SCL-023": [
        {"step_number": 1, "action": "Apply Iprodione 500SC at early flowering stage",
         "product_name": "Rovral 500SC", "product_type": "fungicide", "dosage": "2 mL/L", "frequency": "Once at early flowering"},
        {"step_number": 2, "action": "Rotate with cereals or maize for at least 3 years",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Next 3 seasons"},
        {"step_number": 3, "action": "Deep-plough to bury sclerotia below germination depth",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Once before planting"},
    ],

    # ── Cassava ──────────────────────────────────────────────────────────────

    "CAS-CMD-024": [
        {"step_number": 1, "action": "Use only certified virus-free cuttings from healthy mother plants",
         "product_name": "Certified clean cuttings", "product_type": "cultural", "dosage": "N/A", "frequency": "At planting"},
        {"step_number": 2, "action": "Uproot and burn all infected plants immediately",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 3, "action": "Apply Imidacloprid 200SL to control whitefly vectors at planting",
         "product_name": "Confidor 200SL", "product_type": "insecticide", "dosage": "0.5 mL/L", "frequency": "At transplanting"},
    ],

    "CAS-CBB-025": [
        {"step_number": 1, "action": "Use certified virus-free planting material exclusively — no treatment cures infected plants",
         "product_name": "Certified clean cuttings", "product_type": "cultural", "dosage": "N/A", "frequency": "At planting"},
        {"step_number": 2, "action": "Rogue out (uproot and burn) infected plants immediately upon detection",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 3, "action": "Apply Acetamiprid 20SP to control whitefly vectors on remaining healthy plants",
         "product_name": "Acetamiprid 20SP", "product_type": "insecticide", "dosage": "0.5 g/L", "frequency": "Every 14 days"},
    ],

    # ── Sweet Potato ─────────────────────────────────────────────────────────

    "SWT-SPW-026": [
        {"step_number": 1, "action": "Deploy pheromone traps for population monitoring and mass trapping",
         "product_name": "Sweet Potato Weevil Pheromone Trap", "product_type": "trap", "dosage": "1 per 0.1 ha", "frequency": "Check weekly"},
        {"step_number": 2, "action": "Harvest promptly at maturity; do not leave tubers in soil after maturity",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "At maturity"},
        {"step_number": 3, "action": "Apply Chlorpyrifos 48EC as soil drench in heavily infested areas at planting",
         "product_name": "Dursban 48EC", "product_type": "pesticide", "dosage": "2 mL/L", "frequency": "Once at planting"},
    ],

    # ── Onion ────────────────────────────────────────────────────────────────

    "ONI-PUR-027": [
        {"step_number": 1, "action": "Apply Iprodione 500SC or Mancozeb 80WP at first lesion appearance",
         "product_name": "Mancozeb 80WP", "product_type": "fungicide", "dosage": "2.5 g/L", "frequency": "Every 7–10 days"},
        {"step_number": 2, "action": "Switch to drip or furrow irrigation — avoid wetting foliage",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Ongoing"},
        {"step_number": 3, "action": "Ensure proper plant spacing; remove and destroy dead lower leaves",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Weekly"},
    ],

    # ── Kale ─────────────────────────────────────────────────────────────────

    "KAL-DMD-028": [
        {"step_number": 1, "action": "Apply Metalaxyl + Mancozeb preventively during wet season",
         "product_name": "Ridomil Gold MZ 68WP", "product_type": "fungicide", "dosage": "2.5 g/L", "frequency": "Every 10 days in wet season"},
        {"step_number": 2, "action": "Thin plants to improve air circulation; avoid wetting foliage",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Ongoing"},
    ],

    # ── Pineapple ─────────────────────────────────────────────────────────────

    "PIN-MBU-029": [
        {"step_number": 1, "action": "Destroy all infected plants; eliminate ant colonies that protect mealybugs",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 2, "action": "Dip planting suckers in Chlorpyrifos 48EC + Paraffin oil before planting",
         "product_name": "Dursban 48EC + Paraffin oil", "product_type": "insecticide", "dosage": "2 mL/L + 10 mL/L", "frequency": "Once at planting"},
        {"step_number": 3, "action": "Source planting material only from certified mealybug-free nurseries",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "At establishment"},
    ],

    # ── Banana ───────────────────────────────────────────────────────────────

    "BAN-PAW-030": [
        {"step_number": 1, "action": "Immediately uproot, chop and bury infected plants — no chemical treatment exists",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 2, "action": "Sterilise all cutting tools between plants using 1:10 bleach or heat",
         "product_name": "Sodium Hypochlorite 1:10 solution", "product_type": "sanitiser", "dosage": "1:10 dilution", "frequency": "Between every plant"},
        {"step_number": 3, "action": "Remove male bud (de-budding) promptly after last hand to block insect-spread",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "At bunch emergence"},
    ],

    # ── Livestock ─────────────────────────────────────────────────────────────

    "COW-ECF-001": [
        {"step_number": 1, "action": "Administer Buparvaquone (Butalex) IM at first signs — requires veterinarian",
         "product_name": "Butalex 2.5% Injection", "product_type": "antiprotozoal", "dosage": "2.5 mg/kg IM", "frequency": "Single dose; repeat if no improvement in 48h"},
        {"step_number": 2, "action": "Apply acaricide dip or spray to kill tick vectors",
         "product_name": "Amitraz 12.5% EC", "product_type": "acaricide", "dosage": "Per label dilution", "frequency": "Every 7–14 days"},
        {"step_number": 3, "action": "Provide supportive therapy: antipyretics and B-complex vitamins",
         "product_name": "Flunixin Meglumine + Vitamin B-Complex", "product_type": "supportive", "dosage": "Per veterinarian instruction", "frequency": "Daily until recovery"},
    ],

    "COW-FMD-002": [
        {"step_number": 1, "action": "Isolate affected animals immediately; report to nearest veterinary office (notifiable disease)",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 2, "action": "Vaccinate susceptible animals with current-strain FMD polyvalent vaccine",
         "product_name": "FMD Polyvalent Vaccine", "product_type": "vaccine", "dosage": "2 mL SC", "frequency": "Every 6 months"},
        {"step_number": 3, "action": "Provide supportive care: clean dry bedding, soft feed, antiseptic foot baths",
         "product_name": "Copper Sulphate 5% foot bath", "product_type": "supportive", "dosage": "5% solution", "frequency": "Daily"},
    ],

    "COW-LSD-003": [
        {"step_number": 1, "action": "Vaccinate all at-risk cattle with Neethling strain LSD vaccine",
         "product_name": "Neethling LSD Vaccine", "product_type": "vaccine", "dosage": "1 mL SC", "frequency": "Annual booster"},
        {"step_number": 2, "action": "Control insect vectors (flies, mosquitoes) with permethrin pour-on",
         "product_name": "Permethrin 1% Pour-On", "product_type": "insecticide", "dosage": "1 mL per 10 kg body weight", "frequency": "Every 3–4 weeks"},
        {"step_number": 3, "action": "Treat secondary bacterial skin infections with broad-spectrum antibiotic — veterinarian required",
         "product_name": "Oxytetracycline LA 200", "product_type": "antibiotic", "dosage": "20 mg/kg IM", "frequency": "Every 48–72 hours per veterinarian"},
    ],

    "GOA-PPR-004": [
        {"step_number": 1, "action": "Vaccinate all goats and sheep annually with PPR live attenuated vaccine",
         "product_name": "PPR Live Attenuated Vaccine", "product_type": "vaccine", "dosage": "1 mL SC", "frequency": "Annual"},
        {"step_number": 2, "action": "Quarantine affected flocks immediately; report to veterinary authorities (notifiable disease)",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 3, "action": "Administer Oxytetracycline for secondary bacterial pneumonia",
         "product_name": "Oxytetracycline LA 200", "product_type": "antibiotic", "dosage": "20 mg/kg IM", "frequency": "Every 48 hours for 3 treatments"},
    ],

    "POL-NDV-005": [
        {"step_number": 1, "action": "Vaccinate day-old chicks with Hitchner B1; boost with La Sota at 3 weeks",
         "product_name": "Hitchner B1 + La Sota Vaccines", "product_type": "vaccine", "dosage": "1 dose eye-drop or drinking water", "frequency": "Day 1 and day 21"},
        {"step_number": 2, "action": "Implement strict biosecurity: quarantine new birds for 21 days; disinfect housing",
         "product_name": "Virkon S disinfectant", "product_type": "disinfectant", "dosage": "1:100 dilution", "frequency": "Between flocks"},
        {"step_number": 3, "action": "Report mass mortality immediately to veterinary office",
         "product_name": "None", "product_type": "reporting", "dosage": "N/A", "frequency": "Immediately"},
    ],

    "POL-IBD-006": [
        {"step_number": 1, "action": "Vaccinate at 14–18 days with intermediate IBD vaccine; boost at 24–28 days",
         "product_name": "Intermediate IBD (Gumboro) Vaccine", "product_type": "vaccine", "dosage": "1 dose in drinking water", "frequency": "Day 14–18 and day 24–28"},
        {"step_number": 2, "action": "All-in/all-out management; thoroughly clean and disinfect housing between flocks",
         "product_name": "Formalin 1% solution", "product_type": "disinfectant", "dosage": "1% solution", "frequency": "Between each flock"},
        {"step_number": 3, "action": "Provide vitamin/electrolyte supplementation in drinking water",
         "product_name": "Vitamin-Electrolyte Supplement", "product_type": "supportive", "dosage": "Per label rate", "frequency": "For 5 days during recovery"},
    ],

    "COW-MAS-007": [
        {"step_number": 1, "action": "Administer intramammary antibiotic infusion — requires veterinarian prescription",
         "product_name": "Cloxacillin Intramammary Infusion", "product_type": "antibiotic", "dosage": "Per quarter per label", "frequency": "Every 12 hours for 3 treatments"},
        {"step_number": 2, "action": "Strip affected quarters 3–4 times daily; discard all milk from affected quarters",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "3–4 times daily"},
        {"step_number": 3, "action": "Apply post-milking teat dip with 0.5% Iodophor solution; maintain milking hygiene",
         "product_name": "Iodophor Teat Dip 0.5%", "product_type": "sanitiser", "dosage": "Full immersion of each teat", "frequency": "After every milking"},
    ],

    "COW-BRU-008": [
        {"step_number": 1, "action": "Vaccinate female calves aged 3–8 months with Brucella S19 vaccine (veterinarian only)",
         "product_name": "Brucella Abortus S19 Vaccine", "product_type": "vaccine", "dosage": "Per veterinarian instruction", "frequency": "Once in lifetime (calves only)"},
        {"step_number": 2, "action": "Test-and-cull all reactor animals — antibiotic treatment is not recommended",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Annual herd testing"},
        {"step_number": 3, "action": "Disinfect abortion sites; handle aborted material with protective gloves — zoonotic risk",
         "product_name": "Lime or 2% Caustic Soda", "product_type": "disinfectant", "dosage": "Cover all material", "frequency": "Immediately after any abortion"},
    ],

    "PIG-ASF-009": [
        {"step_number": 1, "action": "Quarantine and report to veterinary authorities immediately — ASF is a notifiable emergency",
         "product_name": "None", "product_type": "reporting", "dosage": "N/A", "frequency": "Immediately"},
        {"step_number": 2, "action": "Humanely slaughter all affected and in-contact pigs under official supervision — no vaccine or treatment exists",
         "product_name": "None", "product_type": "cultural", "dosage": "N/A", "frequency": "Under veterinary authority"},
        {"step_number": 3, "action": "Decontaminate premises with 2% caustic soda; no pig restocking for minimum 3 months",
         "product_name": "Caustic Soda (NaOH) 2% solution", "product_type": "disinfectant", "dosage": "2% solution", "frequency": "Full decontamination once"},
    ],

    "COW-ANT-010": [
        {"step_number": 1, "action": "Administer Penicillin G immediately — contact veterinarian urgently",
         "product_name": "Penicillin G (Procaine)", "product_type": "antibiotic", "dosage": "22,000 IU/kg IV or IM", "frequency": "Every 12 hours for 5 days"},
        {"step_number": 2, "action": "Vaccinate all at-risk livestock with Sterne spore vaccine BEFORE anthrax season",
         "product_name": "Sterne Anthrax Spore Vaccine", "product_type": "vaccine", "dosage": "1 mL SC", "frequency": "Annual pre-season vaccination"},
        {"step_number": 3, "action": "Do NOT open carcasses — burn in situ or deep-bury with quicklime; report to authorities",
         "product_name": "Quicklime (CaO)", "product_type": "disinfectant", "dosage": "Cover carcass thoroughly", "frequency": "Immediately"},
    ],
}


def get_prescriptions(disease_code: str) -> list[PrescriptionStep]:
    """Return the prescription steps for a disease/condition code, or [] if unknown."""
    return PRESCRIPTIONS.get(disease_code, [])


# ---------------------------------------------------------------------------
# Validation guard — enforced at import time so bad codes fail fast.
# ---------------------------------------------------------------------------

_unknown = set(PRESCRIPTIONS) - set(TAXONOMY_BY_CODE)
if _unknown:
    raise ValueError(
        f"prescription_service.py contains codes not in disease taxonomy: {_unknown}"
    )
