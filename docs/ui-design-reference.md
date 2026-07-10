# AgroConnect — UI Design Reference (Read this before every UI prompt)

Reference this file in every prompt: @docs/ui-design-reference.md

---

## Design Tokens — Use these exact values everywhere. Never invent alternatives.

### Colors
```
Primary Green:        #1A6B3C  (backgrounds, primary buttons, headers, active states)
Green Medium:         #2E8B57  (gradients, secondary accents)
Green Dark:           #0D4A28  (sidebar header, dark gradient start, nav background)
Green Light:          #EAF4EE  (card backgrounds, success states, input focus bg)

Gold:                 #C9A84C  (badges, CTA accents, price alerts, streak highlights)
Gold Light:           #FFF8E7  (gold card backgrounds)
Gold Dark:            #F5E9C8  (gold borders, muted gold backgrounds)

Teal:                 #0E7490  (expert badges, secondary info, links)
Teal Light:           #CFFAFE  (teal backgrounds)

Ink (body text):      #111827
Ink2 (secondary text):#374151
Muted:                #6B7280
Muted2:               #9CA3AF

Surface:              #F9FAFB  (card inner backgrounds)
Surface2:             #F3F4F6  (page background, sidebar)
Border:               #E5E7EB

Red:                  #DC2626  (errors, overdue, urgent alerts, delete)
Red Light:            #FEE2E2  (error backgrounds)
Amber:                #D97706  (warnings, pending states)
Amber Light:          #FEF3C7  (warning backgrounds)
Blue:                 #1D4ED8  (info states, expert badge background)
Blue Light:           #DBEAFE  (info backgrounds)
Purple:               #7C3AED  (achievements, gamification)
Purple Light:         #F3E8FF  (purple backgrounds)
```

### Typography
```
Font family:   -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
Font sizes:
  xs:  12px (timestamps, sub-labels, hint text, badge text)
  sm:  13px (secondary text, table data, form labels)
  md:  14px (body text, list items, card subtitles)
  base:16px (standard body)
  lg:  18px (screen titles, nav links)
  xl:  20px (section titles, important labels)
  2xl: 22px (page headings, feature titles)
  3xl: 24px (stat values)
  4xl: 28px (large stats, hero numbers)
  5xl: 32px (hero titles)
  6xl+ Use sparingly: 36px, 40px (major KPI displays only)

Font weights:
  Regular:  400
  Medium:   500 (nav items, secondary headings)
  SemiBold: 600 (labels, table headers, sub-titles)
  Bold:     700 (card titles, section headers, primary text)
  ExtraBold:800 (hero numbers, credit scores, major stats)
```

### Spacing & Shape
```
Border radius:
  sm:  4px (inputs, small elements)
  md:  6px (buttons, chips)
  base:8px (cards, alert boxes)
  lg:  12px (modals, large cards)
  pill:20px (badges, chips)
  full:50% (avatars, FABs, dot indicators)

Shadows:
  card:   0 1px 3px rgba(0,0,0,.05)
  elevated: 0 4px 12px rgba(0,0,0,.1)
  heavy:  0 8px 28px rgba(0,0,0,.2)
  green-glow: 0 4px 10px rgba(26,107,60,.4)

Padding: 8px (tight), 10px (card), 12px (section), 16px (screen), 20px+ (hero)
Gap: 4px (tight chips), 6px (standard), 8px (cards), 12px+ (sections)
```

---

## Layout System

### Mobile App (React Native)
```
Screen structure (top to bottom):
  1. StatusBar:     background #1A6B3C, style: light
  2. TopBar:        background #1A6B3C, height 44px, horizontal padding 12px
     - Left: back arrow (← text "Back") OR screen title (fontWeight 600, color #fff, fontSize 15)
     - Right: action icon (color rgba(255,255,255,0.85), fontSize 22)
  3. SubTabs (optional): white bg, bottom border 1px #E5E7EB, flex row
     - Active tab: color #1A6B3C, border-bottom 2px #1A6B3C, fontWeight 600
     - Inactive tab: color #6B7280
  4. ScrollView / Content area: padding 11px, background #fff
  5. BottomTabBar: white bg, border-top 1px #E5E7EB, 5 tabs
     - Active icon+label: color #1A6B3C
     - Inactive: color #9CA3AF
     - Label fontSize: 8px (React Native: 9)
     - Icon: emoji or MaterialCommunityIcons, size 20

Bottom Tab Bar — 5 tabs in this exact order:
  Home (🏠) | Farm (🌾) | Finance (💰) | Stock (📦) | Me (👤)
  [For screens with Community/Govt access:]
  Home (🏠) | Farm (🌾) | Community (👥) | Govt (🏛) | Me (👤)

FAB (Floating Action Button):
  position: absolute, bottom: 72px, right: 16px
  width: 48px, height: 48px, borderRadius: 24
  background: #1A6B3C, shadow: green-glow
  icon: '+', color: #fff, fontSize: 24
```

### Web Portal (Next.js)
```
Layout:
  TopNav (height 40px, bg #1A6B3C):
    - Logo: "🌱 AgroConnect [Portal Name]" fontWeight 700, color #fff, fontSize 14
    - Nav links: fontSize 10, color rgba(255,255,255,0.7), active: color #fff fontWeight 600
    - Right: user dropdown button bg #C9A84C color #fff borderRadius 3px fontSize 10
  
  Main area = flex row:
    Sidebar (width 160px, bg #F9FAFB, borderRight 1px #E5E7EB, padding 12px 10px):
      - Items: fontSize 10, borderRadius 5px, padding 6px 9px
      - Active: bg #EAF4EE, color #1A6B3C, fontWeight 600
      - Hover: bg #F3F4F6
      - Badge (notification): bg #DC2626, color #fff, borderRadius 8px, padding 0 4px, fontSize 7px
    
    Content area (flex 1, padding 14px 16px):
      - Page title: fontSize 14, fontWeight 700, color #111827, marginBottom 12px
      - Stat grid: 4 columns, gap 9px
      - Data table: wtbl class patterns
```

---

## Core Component Patterns

### Cards
```jsx
// Standard card
<View style={{
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 8,
  padding: 10,
  marginBottom: 8,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
}}>

// Highlighted card (urgent/active)
borderColor: '#DC2626'  // red for overdue
borderColor: '#D97706'  // amber for pending
borderColor: '#1A6B3C'  // green for active/done
borderWidth: 1.5        // slightly thicker for highlighted
borderLeftWidth: 3      // left-accent pattern for status cards

// Info/alert card backgrounds
Green tint:  backgroundColor: '#EAF4EE', borderColor: '#1A6B3C'
Gold tint:   backgroundColor: '#FFF8E7', borderColor: '#C9A84C'
Red tint:    backgroundColor: '#FEE2E2', borderColor: '#DC2626'
Blue tint:   backgroundColor: '#DBEAFE', borderColor: '#1D4ED8'
```

### Buttons
```jsx
// Primary button (green)
backgroundColor: '#1A6B3C', color: '#fff',
borderRadius: 6, paddingVertical: 9, paddingHorizontal: 10,
fontSize: 10, fontWeight: '600', textAlign: 'center'

// Outline button (green)
backgroundColor: '#fff', color: '#1A6B3C',
borderWidth: 1.5, borderColor: '#1A6B3C',
borderRadius: 6, paddingVertical: 9

// Gold CTA button
backgroundColor: '#C9A84C', color: '#fff', borderRadius: 6

// Red danger button
backgroundColor: '#DC2626', color: '#fff', borderRadius: 6

// Minimum tap target: height 44, width 44 (accessibility)
// Button rows: flexDirection: 'row', gap: 5 — each button flex: 1
```

### Badges / Pills
```jsx
// Status badge pattern
borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, fontWeight: '600'

Green (done/active):  bg: '#EAF4EE', color: '#0D4A28'
Amber (pending):      bg: '#FEF3C7', color: '#92400E'
Red (overdue/error):  bg: '#FEE2E2', color: '#991B1B'
Blue (info):          bg: '#DBEAFE', color: '#1E40AF'
Purple (achievement): bg: '#F3E8FF', color: '#6B21A8'
Teal (expert):        bg: '#CFFAFE', color: '#0E7490'
```

### Progress Bars
```jsx
// Track
height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden'
// Fill — color based on completion:
100% or overdue:  #DC2626 (red)
< 50%:            #D97706 (amber)
50-79%:           #1A6B3C (green, dimmer)
80%+:             #1A6B3C (green, full)
```

### Inputs
```jsx
borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
paddingVertical: 7, paddingHorizontal: 9,
fontSize: 10, color: '#6B7280',  // placeholder
color: '#111827',                 // filled value
backgroundColor: '#F9FAFB'
// Focus: borderColor: '#1A6B3C'
```

### List Items
```jsx
// Standard list item
flexDirection: 'row', alignItems: 'center', gap: 9,
paddingVertical: 8, borderBottomWidth: 1, borderColor: '#E5E7EB'

// Avatar circle
width: 30, height: 30, borderRadius: 15,
backgroundColor: '#EAF4EE',
alignItems: 'center', justifyContent: 'center', fontSize: 13
// Named avatar (initials): bg #1A6B3C, color #fff, fontWeight 700
```

### Alert Boxes
```jsx
// Pattern: left border accent, rounded right corners
borderLeftWidth: 3, borderRadius: '0 5px 5px 0',
paddingVertical: 6, paddingHorizontal: 9, fontSize: 9, lineHeight: 1.5

Green alert: bg '#EAF4EE', borderColor '#1A6B3C', color '#0D4A28'
Amber alert: bg '#FEF3C7', borderColor '#D97706', color '#78350F'
Red alert:   bg '#FEE2E2', borderColor '#DC2626', color '#7F1D1D'
Blue alert:  bg '#DBEAFE', borderColor '#1D4ED8', color '#1D4ED8'
```

### Section Headers (within screens)
```jsx
fontSize: 9, fontWeight: '700', color: '#1A6B3C',
textTransform: 'uppercase', letterSpacing: 0.8,
marginTop: 10, marginBottom: 5
```

---

## Retention & Hook Components

### Streak Bar
```jsx
// Gold gradient background, shows fire emoji + count
background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)'
border: '1px solid #C9A84C', borderRadius: 8
padding: '8px 10px', flexDirection: 'row', gap: 8
// Fire emoji: fontSize 20
// Count: fontSize 13, fontWeight 800, color #92400E
// Sub: fontSize 9, color #B45309
// Best score right-aligned: fontSize 9, fontWeight 700, color #C9A84C
```

### AI Nudge Card
```jsx
// Green gradient: linear-gradient(135deg, #EAF4EE, #D1FAE5)
border: '1px solid #2E8B57', borderRadius: 8, padding: '8px 10px'
// Title: fontSize 10, fontWeight 700, color #0D4A28
// Each nudge row: white/60% bg, borderRadius 5, padding 5 7, gap 6
```

### Onboarding Progress
```jsx
// Container: bg #F3F4F6, borderRadius 8, padding 8 10
// Steps row: flexDirection row, gap 4
// Done step: height 4, flex 1, borderRadius 2, bg #1A6B3C
// Current step: bg #C9A84C
// Future step: bg #E5E7EB
// Percentage: fontWeight 700, color #1A6B3C
```

### Achievement Item
```jsx
flexDirection: 'row', alignItems: 'center', gap: 7
padding: '7px 9px', bg '#fff', border '1px solid #E5E7EB', borderRadius 8
// Icon: fontSize 20
// Name: fontSize 10, fontWeight 600
// Sub: fontSize 8, color #6B7280
// New badge: bg #C9A84C, color #fff, fontSize 8, fontWeight 700, padding 1 5, borderRadius 8
// Locked: opacity 0.5
```

---

## Screen-Specific Header Gradients

### Login screen hero
```
background: 'linear-gradient(160deg, #0D4A28 0%, #1A6B3C 60%, #2E8B57 100%)'
```

### Dashboard header
```
background: 'linear-gradient(135deg, #0D4A28, #1A6B3C)'
```

### AI loading / processing screens
```
background: 'linear-gradient(135deg, #1A6B3C, #2E8B57)'
```

### Weather card
```
background: 'linear-gradient(135deg, #0369A1, #0E7490)'
```

---

## Test Data — Use exactly this data in all screens and seeds

### Test Farmers
```
Farmer 1: Jane Wanjiru, +254712345678, Nakuru county, Crops + Animals
  - Farm: "Nakuru Farm", 2.5 acres, lat:-0.3031, lng:36.0800
  - Crops: Maize (H614D, planted April 1 2025, 1.5 acres), Cabbage (0.5 acres, planted May 1), Beans (0.5 acres, planted June 1)
  - Animals: 50 Layers (KARI Improved, hatched Jan 15 2025), 4 Dairy cattle
  - Credit score: 73 (Band B), max loan: KES 200,000
  - Streak: 12 days
  - June cash flow: Income KES 42,500 | Expenses KES 18,200 | Net KES 24,300
  - Active loan: KES 80,000 from Equity Bank, 12 months, 14% p.a., 4/12 payments done

Farmer 2: Peter Kipchoge, +254722345678, Uasin Gishu county, Crops only
  - Farm: "Eldoret Farm", 3.0 acres
  - Crops: Wheat (planted March 15 2025)
  - Credit score: 81 (Band A), max loan: KES 500,000

Farmer 3: Mary Njeri, +254733345678, Meru county, Animals only
  - Animals: 30 Dairy cattle, 20 Goats
  - Credit score: 58 (Band C), max loan: KES 75,000
```

### Test Activities (Jane Wanjiru — June 2025)
```
Done:
  - June 5: Watering, Maize, 2hrs, KES 500
  - June 4: Spray Mancozeb, Tomato, KES 960 (input cost)
  - June 1: 1st Fertiliser CAN 50kg, Maize, KES 3,200

Overdue:
  - June 3 (3 days late): Water Cabbage — last watered June 3, due every 2 days
  - May 28 (1 week late): Newcastle vaccine for 50 chickens

Upcoming:
  - June 8: Spray Maize (Mancozeb, week 10 fungicide)
  - June 10: Apply 2nd Fertiliser CAN, Maize (week 10)
  - July 15: Weed Bean crop (week 6 milestone from planting)
  - August 15: Harvest Maize (expected from April 1 planting)
```

### Test Inventory (Jane Wanjiru)
```
Inputs:
  - CAN Fertiliser: purchased 10 bags, used 6, remaining 4
  - Mancozeb 80WP: purchased 5kg, used 4.9kg, remaining ~0.1kg (EMPTY — needs reorder)
  - Maize Seed H614D: purchased 5kg, used 3kg, remaining 2kg

Egg collection (trays/day):
  Mon: 8, Tue: 7.5, Wed: 8, Thu: 7, Fri: 8.5, Sat: 6.5 (today), Sun: —
  Weekly total: 45.5 trays, Average: 7.6/day

Milk (litres/day):
  Today: 28L (4 dairy cattle)

Customer pending collections:
  - Grace Kamau: 5 egg trays @ KES 150 = KES 750 (since June 3)
  - John Mwangi: 20L milk @ KES 60 = KES 1,200 (since June 4)
  Total pending: KES 1,950
```

### Test Transactions (Jane — June 2025)
```
Income:
  Jun 5: Maize sale 200kg @ KES 40 = KES 8,000 (buyer: Peter Buyer)
  Jun 3: Eggs 30 trays @ KES 150 = KES 4,500 (Nakuru Market)
  Jun 1: Cabbage sale 100kg @ KES 35 = KES 3,500
  May 28: Milk sale 80L @ KES 60 = KES 4,800

Expenses:
  Jun 4: Mancozeb 2kg KES 960 (Nakuru Agrovets)
  Jun 2: CAN Fertiliser 50kg KES 3,200 (Farmers Choice)
  May 30: Labour (2 workers × 2 days) KES 2,400
  May 25: Poultry feed 50kg KES 3,500
```

### Test Market Data
```
Current prices (KES/kg):
  Maize: 48 (↑15% from last week, was 42)
  Tomatoes: 89
  Beans: 110
  Cabbage: 35
  Wheat: 52
  Potatoes: 28

Egg trays: KES 150/tray
Milk: KES 60/litre
```

### Test Community Posts
```
Post 1: Jane Wanjiru, "Maize leaves turning yellow from edges — help?" 
  Category: Crops, 8 replies, 14 upvotes, 2 photos
  Expert reply from: Mr. Ochieng (Extension Officer), "Grey Leaf Spot — spray Mancozeb 80WP..."

Post 2: Dr. Ochieng (verified expert), "Cattle coughing in morning — BRD warning"
  Category: Livestock, 12 replies, 28 upvotes

Post 3: Peter Kipchoge, "Maize at KES 50/kg in Eldoret — highest this year"
  Category: Market, 5 replies, 32 upvotes
```

### Test Loan Data
```
Active loan: Jane Wanjiru
  Amount: KES 80,000
  Lender: Equity Bank Kenya
  Rate: 14% p.a.
  Term: 12 months
  Monthly payment: KES 7,200
  Disbursed: June 4, 2025, Ref: QA4K72XP via M-Pesa
  Paid: 4 payments (KES 28,000)
  Remaining: 8 payments (KES 52,000)
  Next due: July 1, 2025 (25 days away)
```

### Test Government Applications
```
Approved: MSAI Fertiliser Subsidy 2024 (50kg bag), delivery June 20
Available: MSAI Fertiliser Subsidy 2025 (deadline June 30)
Available: KALRO Subsidised Seeds 2025 (40% discount)
Upcoming: Irrigation Equipment (opens July 2025)
```

---

## AI Recommendation Rules (for test data)

The app generates these based on data in the system:

```
Cabbage:
  Rule: Water every 2 days. If last_watered > 2 days ago → URGENT red card
  Last watered: June 3 → Today (June 6) = 3 days overdue
  Display: "Water Cabbage — 3 days since last watering" [URGENT badge]

Maize (planted April 1):
  Week 10 = June 10: Apply 2nd CAN fertiliser
  Every 14 days: Spray fungicide
  Last spray: May 28 → Next: June 11 [SOON amber badge]
  Expected harvest: ~August 15 (105 days from planting H614D variety)

Beans (planted June 1):
  Week 6 = July 13: Weed [UPCOMING blue badge]
  Week 10 = August 10: Apply fertiliser

Chickens (50 layers):
  Newcastle vaccine: Every 3 months from Jan 15 = April 15 = 7 weeks late [URGENT red]
  Daily reminder: "Record today's egg collection" (if not recorded before 10am)
```

---

## User Journey Navigation Flow

### Mobile App Navigation
```
Login → Set PIN (first time only) → Onboarding Tour → Dashboard

Dashboard quick actions:
  "Log Activity" → Activity Type Picker → Activity Form → Saved (streak +1)
  "Add Transaction" → Income/Expense toggle → Form → Saved (cash flow updates)
  "Diagnose" → Question/Photo/Both picker → Input → AI Result → Buy Treatment (links to Market)
  "Record Stock" → Inventory tab → Input form
  "View Farms" → Farm List → Farm Profile → Care Card → Log Activity

Bottom tabs:
  Home → Dashboard
  Farm → Farm List → Farm Profile / Add Farm / Activity Schedule
  Finance → Cash Flow / Add Transaction / Loans
  Stock → Input Inventory / Animal Products / Collections
  Me → Profile / Settings / Achievements / Logout
```

### Web Portal Navigation
```
Admin:
  /dashboard → Platform overview
  /users/new → Create any user type (Farmer crop/animal/both, Lender, Supplier, etc.)
  /users → List + search + KYC approve
  /users/:id → Farmer detail with all farm data
  /moderation → Flagged community posts

Lender:
  /loans → Pipeline with status columns
  /loans/:id → Application detail + credit score + approve/reject
  /reports → Download disbursement and repayment reports

Buyer:
  / → Public market browse (no login)
  /listings/:id → Listing detail + price history
  /checkout → M-Pesa payment flow
```
