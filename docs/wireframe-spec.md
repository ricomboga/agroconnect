# AgroConnect — Screen Specifications for Claude Code

This file is the text translation of the visual wireframes.
Claude Code reads this file via @docs/wireframe-spec.md
Reference in every UI prompt: Read @docs/wireframe-spec.md

---

## GLOBAL DESIGN SYSTEM

### Colors (use EXACTLY these hex values — no alternatives)
```
PRIMARY_GREEN:    #1A6B3C   → all primary buttons, top bars, active tab indicators
GREEN_DARK:       #0D4A28   → gradient start, nav background
GREEN_MID:        #2E8B57   → gradient end, secondary accents
GREEN_LIGHT:      #EAF4EE   → card tints, success backgrounds, selected tiles
GOLD:             #C9A84C   → streak bar, CTA accents, achievements, price alerts
GOLD_LIGHT:       #F5E9C8   → gold card backgrounds, streak bar bg
TEAL:             #0E7490   → expert badges, worker chips, info states
TEAL_LIGHT:       #CFFAFE   → teal backgrounds, worker chip bg
INK:              #111827   → primary body text
INK2:             #374151   → secondary body text
MUTED:            #6B7280   → placeholder text, labels, subtitles
MUTED2:           #9CA3AF   → hint text, disabled, future states
SURFACE:          #F9FAFB   → card inner backgrounds, input backgrounds
SURFACE2:         #F3F4F6   → page background, inactive states
BORDER:           #E5E7EB   → all borders and dividers
WHITE:            #FFFFFF
RED:              #DC2626   → errors, overdue, urgent, delete actions
RED_LIGHT:        #FEE2E2   → error backgrounds, overdue section bg
AMBER:            #D97706   → warnings, pending, "Soon" states
AMBER_LIGHT:      #FEF3C7   → warning backgrounds
BLUE:             #1D4ED8   → info badges, AI-scheduled indicators
BLUE_LIGHT:       #DBEAFE   → info backgrounds
PURPLE:           #7C3AED   → achievements, gamification
PURPLE_LIGHT:     #F3E8FF   → achievement backgrounds
```

### Typography
```
Font family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

Sizes:
  8px  → timestamps, badge text, hint text, sub-labels
  9px  → secondary body, table data, section headers (UPPERCASE), alert text
  10px → standard body, card subtitles, button text, form labels
  11px → card titles, primary body
  12px → top bar links, nav text
  13px → screen titles in top bar, modal headers
  14px → page section titles
  15px → top bar primary title
  18px → large stat values (credit score display)
  20px → hero numbers

Weights:
  '400' → regular body
  '500' → medium, nav links
  '600' → card titles, section titles, button labels
  '700' → page headings, stat values, emphasized text
  '800' → hero numbers, credit score, streak count
```

### Spacing
```
Component padding: 10px (cards), 11px (screen), 12px (section), 14-16px (modals)
Gap between items: 5px (tight buttons), 6px (standard), 8px (cards), 10px (sections)
Border radius: 5px (inputs), 6px (buttons), 8px (cards), 10-12px (modal sheet)
Border width: 1px (default), 1.5px (highlighted cards), 2px (dashed add-cards), 3px (left-accent)
Progress bars: height 5-7px, borderRadius 3px
Minimum tap target: 44px height for all touchable elements
```

### Status Badge Pattern (used throughout app)
```
borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, fontWeight: '600'

Green  (done/healthy/active):  bg #EAF4EE   text #0D4A28
Amber  (pending/soon/warning): bg #FEF3C7   text #92400E
Red    (late/overdue/error):   bg #FEE2E2   text #991B1B
Blue   (info/scheduled):       bg #DBEAFE   text #1E40AF
Teal   (expert/worker):        bg #CFFAFE   text #0E7490
Purple (achievement):          bg #F3E8FF   text #6B21A8
```

### Alert Box Pattern (left-border accent)
```
borderLeftWidth: 3, borderRadius: '0 5px 5px 0' (or right corners only)
paddingVertical: 6, paddingHorizontal: 9, fontSize: 9, lineHeight: 1.5

Green: bg #EAF4EE   borderColor #1A6B3C   text #0D4A28
Amber: bg #FEF3C7   borderColor #D97706   text #78350F
Red:   bg #FEE2E2   borderColor #DC2626   text #7F1D1D
Blue:  bg #DBEAFE   borderColor #1D4ED8   text #1D4ED8
```

---

## SCREEN 1 — Farm List Screen (FarmListScreen)

**Route:** Farm tab (bottom tab index 1)
**Data:** GET /farms?userId={me}  queryKey: ['farms', user.id]

### Top Bar
```
backgroundColor: #1A6B3C, paddingHorizontal: 12, paddingVertical: 9
flexDirection: row, justifyContent: space-between

LEFT:  "My Farms"  fontSize 15, fontWeight '600', color #fff
RIGHT: "Create on web →"  fontSize 10, color rgba(255,255,255,0.65)
       onPress → Linking.openURL('https://agroconnect.co.ke/farms/new')

NO + BUTTON. NO navigation to AddFarmScreen. Farm creation is web-only.
```

### Alert Bar (conditional — show if any farm has overdueCount > 0)
```
backgroundColor: #FEF3C7, borderLeftWidth: 3, borderLeftColor: #D97706
paddingVertical: 6, paddingHorizontal: 12
Text: "⚠️ {farmWithMostOverdue.name}: {overdueCount} activities overdue"
fontSize: 9, color: #78350F
```

### Loading State (isLoading === true)
```
2 skeleton cards:
  View: height 100, backgroundColor #F3F4F6, borderRadius 8, marginBottom 8
```

### Empty State (farms.length === 0)
```
View: alignItems center, justifyContent center, paddingVertical 40
"🌐"  fontSize 36, marginBottom 8
"Create farms on web"  fontSize 13, fontWeight '700', color #111827, marginBottom 4
"Visit agroconnect.co.ke on a browser to set up your farms and crops."
  fontSize 10, color #6B7280, textAlign center, marginBottom 16
Button "Open Website" → Linking.openURL('https://agroconnect.co.ke/farms/new')
  backgroundColor #1A6B3C, borderRadius 6, paddingVertical 9, paddingHorizontal 16
  fontSize 10, fontWeight '600', color #fff
```

### Farm Card (repeat for each farm)
```
Container:
  backgroundColor: #fff, borderRadius: 8, padding: 10, marginBottom: 8
  borderWidth: farm.overdueCount > 0 ? 1.5 : 1
  borderColor: farm.overdueCount > 0 ? #1A6B3C : #E5E7EB
  elevation: 1

ROW 1 (flexDirection row, justifyContent space-between):
  LEFT:
    "{farmEmoji} {farm.name}"    fontSize 11, fontWeight '600', color #111827
    "{farm.areaAcres} acres · {farm.county} · {cropList}"
      fontSize 9, color #6B7280, marginTop 1
  RIGHT: Status badge
    overdueCount > 0 → Red badge "{n} Late"
    else             → Green badge "Healthy"

ROW 2 — 4 STAT PILLS (flexDirection row, gap 3, marginVertical 5):
  Each pill: flex 1, backgroundColor #F9FAFB, borderRadius 3
             paddingVertical 4, alignItems center
  
  PILL 1 "Health": backgroundColor #EAF4EE (always green tint)
    value: "{farm.healthScore}%"
    color: score>=70→#1A6B3C, score>=40→#D97706, else→#DC2626
    fontSize 10, fontWeight '700'
    label: "Health" fontSize 8 color #6B7280
  
  PILL 2 "Crops":
    value: "{farm.crops.length}" fontSize 10 fontWeight '700' color #111827
    label: "Crops" (or "Animals" if farmType==='animal') fontSize 8
  
  PILL 3 "Tasks":
    value: "{farm.activitiesThisMonth}" fontSize 10 fontWeight '700'
    label: "Tasks" fontSize 8
  
  PILL 4 "Workers":
    value: "{farm.workerCount}" fontSize 10 fontWeight '700'
    label: "Workers" fontSize 8

ROW 3 — 2 BUTTONS (flexDirection row, gap 5, marginTop 4):
  LEFT "View Details" (outline):
    flex 1, backgroundColor #fff, borderWidth 1.5, borderColor #1A6B3C
    borderRadius 6, paddingVertical 7
    text: "View Details" fontSize 10 fontWeight '600' color #1A6B3C
    onPress → navigation.navigate('FarmProfile', { farmId: farm.id })
  
  RIGHT "Log Activity" (solid):
    flex 1, backgroundColor #1A6B3C, borderRadius 6, paddingVertical 7
    text: "Log Activity" fontSize 10 fontWeight '600' color #fff
    onPress → navigation.navigate('ActivityLogModal', { farmId: farm.id })
```

### Footer Dashed Card (ListFooterComponent)
```
borderWidth 2, borderStyle dashed, borderColor #E5E7EB, borderRadius 8
backgroundColor #F9FAFB, alignItems center, padding 12, marginTop 4
"🌐"  fontSize 18, marginBottom 3
"Add farm at agroconnect.co.ke"  fontSize 10, fontWeight '600', color #1A6B3C
"Farm setup happens on web"  fontSize 8, color #6B7280, marginTop 2
```

### Farm Emoji Helper
```javascript
const FARM_EMOJI = (farm) => {
  if (farm.farmType === 'animal') return '🐄';
  if (farm.farmType === 'both') return '🌾🐄';
  const crop = farm.crops?.[0]?.name?.toLowerCase() ?? '';
  if (crop.includes('maize')) return '🌽';
  if (crop.includes('tomato')) return '🍅';
  if (crop.includes('bean')) return '🫘';
  if (crop.includes('cabbage')) return '🥬';
  return '🌾';
};
```

---

## SCREEN 2 — Farm Profile · Overview Tab

**Route:** navigation.navigate('FarmProfile', { farmId })
**Data:** GET /farms/:farmId  +  GET /farms/:farmId/schedule

### Top Bar
```
backgroundColor #1A6B3C, flexDirection row, justifyContent space-between
paddingHorizontal 12, paddingVertical 9

LEFT: "← My Farms"  fontSize 11, color rgba(255,255,255,0.9)
      onPress → navigation.goBack()
CENTER: "{farm.name}"  fontSize 13, fontWeight '600', color #fff
RIGHT:  "⋯"  fontSize 18, color rgba(255,255,255,0.85)
        onPress → ActionSheet: ["View on Web", "Edit Farm", "Cancel"]
```

### Sub-Tab Bar (3 tabs)
```
backgroundColor #fff, borderBottomWidth 1, borderBottomColor #E5E7EB
flexDirection row

Tabs: ["Overview", "My Tasks", "Workers"]

Active tab:
  color #1A6B3C, fontWeight '600', fontSize 9
  indicator: View height 2 backgroundColor #1A6B3C at bottom

Inactive tab:
  color #6B7280, fontSize 9

"My Tasks" tab badge (if overdueCount > 0):
  View: backgroundColor #DC2626, borderRadius 8, paddingHorizontal 4
        marginLeft 3
  Text: "{overdueCount}" fontSize 7 fontWeight '700' color #fff
```

### Overview Tab — Stats Row
```
flexDirection row, paddingVertical 8, paddingHorizontal 12
4 stats separated by thin vertical dividers (View width 1 height 30 bg #E5E7EB)

Stat 1: "{farm.healthScore}%"   color #1A6B3C    label "Farm Health"
Stat 2: "{overdueCount}"        color #D97706    label "Overdue"
Stat 3: "{cropCount}"           color #111827    label "Crops"
Stat 4: "{workerCount}"         color #111827    label "Workers"

value: fontSize 14, fontWeight '700'
label: fontSize 8, color #6B7280, marginTop 1
```

### Overview Tab — Map Thumbnail
```
View: height 60, borderRadius 6, backgroundColor #BBF7D0
      margin: 0 11 7, alignItems center, justifyContent center
"📍" fontSize 18

Overlay (position absolute, bottom 5, right 6):
  backgroundColor rgba(0,0,0,0.5), paddingHorizontal 5, paddingVertical 2, borderRadius 3
  "{farm.county} · {farm.areaAcres} acres"  fontSize 8, color #fff
```

### Overview Tab — AI Care Cards

**Section header:** "AI Care Cards"
fontSize 9, fontWeight '700', color #1A6B3C, textTransform uppercase
letterSpacing 0.8, marginTop 10, marginBottom 5, marginHorizontal 11

**URGENT CARE CARD (crop with overdue activities):**
```
Card: backgroundColor #fff, borderRadius 8, padding 10, marginBottom 8
      borderWidth 1.5, borderColor #DC2626

Header row (space-between, marginBottom 6):
  "{cropEmoji} {crop.name} Care"  fontSize 10, fontWeight '700'
  Red badge "Urgent"

For each overdue activity:
  Row: flexDirection row, alignItems center, paddingVertical 4
       borderBottomWidth 1, borderBottomColor #E5E7EB
    "{activityEmoji}"  fontSize 14, marginRight 4
    View flex 1:
      "{type} — {daysLate} days overdue"  fontSize 9, fontWeight '600'
      "Last: {lastDoneDate} · Due every {n} days"  fontSize 8, color #6B7280
    Red badge "Late" fontSize 7
  
  Progress bar: height 4, fill 100% backgroundColor #DC2626 (overdue = full red)
  
  AI reasoning box:
    View: backgroundColor #F9FAFB, borderRadius 5, padding 7, margin 5 0
          borderWidth 1, borderColor #EAF4EE
    "🤖 {activity.aiReason}"  fontSize 9, color #374151

  Action button (full width, marginTop 5):
    backgroundColor #DC2626, borderRadius 6, paddingVertical 6
    "⚡ Log {activity.type} Now"  color #fff, fontSize 9, fontWeight '600'
    onPress → setActiveTab('mytasks')
```

**ON-TRACK CARE CARD (crop with no overdue):**
```
Card: borderWidth 1.5, borderColor #D97706 (amber)

Header row:
  "{cropEmoji} {crop.name} Care"  fontSize 10, fontWeight '700'
  Amber badge "On Track"

Done items: "✅" + "{type} — Done" + Green badge "Done ✓"
  sub: "Yesterday · Next: {nextDueDate}"  fontSize 8, color #6B7280

Upcoming items: "{emoji}" + "{type}" + Amber badge "Soon"
  sub: "Due in {n} days"

Harvest line (borderTop paddingTop 5):
  "🌽 Expected harvest: {harvestDate} ({daysUntil} days)"
  fontSize 8, color #6B7280, fontStyle italic
```

---

## SCREEN 3 — My Tasks Tab (inside FarmProfileScreen)

**Data:** activities from GET /farms/:farmId/schedule
filtered to: assignedToWorkerId === currentUserId OR assignedToWorkerId === null

### Activity Emoji Map
```javascript
const ACTIVITY_EMOJI = {
  irrigation: '💧', pesticide: '🌿', fertilising: '🌾',
  weeding: '✂️', planting: '🌱', harvesting: '🌽',
  vaccination: '💉', deworming: '💊', feeding: '🐾', other: '📋'
};
```

### Overdue Section (show only if overdue.length > 0)
```
Outer container:
  backgroundColor #FEE2E2, borderRadius 8, padding 8, marginBottom 8

Title: "⚠️ OVERDUE — Action Required"
  fontSize 9, fontWeight '700', color #DC2626, marginBottom 5

For each overdue activity — OVERDUE CARD:
  Card: backgroundColor #fff, borderRadius 7, padding 10, marginBottom 5
        borderWidth 1, borderColor #DC2626
  
  Row 1 (space-between):
    "{emoji} {activity.title}"  fontSize 10, fontWeight '600'
    Red badge "{daysLate} days late"
  
  Row 2: "{activity.plotName} · {activity.cropName}"
    fontSize 8, color #6B7280, marginTop 2
  
  Worker chip (if assignedToWorkerId === currentUserId):
    View: backgroundColor #CFFAFE, borderRadius 10, flexDirection row
          alignItems center, gap 4, paddingVertical 2, paddingHorizontal 7
          alignSelf flex-start, marginTop 4
    Initials circle: width 16 height 16 borderRadius 8 bg #0E7490 color #fff fontSize 7 fontWeight '700'
    "Assigned to you"  fontSize 8, color #0E7490, fontWeight '600'
  
  AI Reasoning box (always visible on overdue):
    View: backgroundColor #F9FAFB, borderRadius 5, padding 7, marginTop 5, marginBottom 5
          borderWidth 1, borderColor #EAF4EE
    "🤖 Why now?"  fontSize 9, fontWeight '700', color #1A6B3C, marginBottom 3
    "{activity.aiReason}"  fontSize 9, color #374151, lineHeight 14
  
  Action button (full width):
    backgroundColor #DC2626, borderRadius 6, paddingVertical 5
    irrigation → "⚡ Log Watering Now"
    vaccination → "📅 Book Vet"
    pesticide   → "⚡ Log Spraying Now"
    default     → "⚡ Log Now"
    fontSize 9, fontWeight '600', color #fff, textAlign center
    onPress → navigation.navigate('ActivityLogModal', { activityId: activity.id })
```

### Today Section
```
Day label: "Today — {formatDate(new Date(), 'MMM D')}"
  fontSize 9, fontWeight '700', color #6B7280, textTransform uppercase
  letterSpacing 0.6, marginTop 10, marginBottom 5

TODAY CARD:
  Card: borderWidth 1, borderColor #E5E7EB, borderRadius 7, padding 10, marginBottom 7
        borderLeftWidth 3, borderLeftColor #D97706   ← LEFT ACCENT amber
  
  Row 1 (space-between):
    "{emoji} {activity.title}"  fontSize 10, fontWeight '600'
    Amber badge "Today"
  
  Row 2: sub info
  Worker chip (if assigned to currentUser)
  
  AI reasoning box (collapsible — collapsed by default):
    TouchableOpacity: "🤖 Why now? ▾"  fontSize 9, color #1A6B3C
    When expanded: show reasoning box (same style as overdue)
  
  "Log ✓" button:
    backgroundColor #1A6B3C, borderRadius 6, paddingVertical 5
    marginTop 5, full width
    onPress → navigation.navigate('ActivityLogModal', { activityId })
```

### This Week Section
```
For each date group (sorted ascending):
  Day label: "Wed Jun 10" — same style as Today label, marginTop 10

  UPCOMING CARD:
    borderLeftWidth 3, borderLeftColor #E5E7EB   ← LEFT ACCENT grey
    
    Row 1 (space-between):
      "{emoji} {activity.title}"  fontWeight '600'
      Blue badge "{daysUntil} days" or "{dateStr}"
    
    AI reasoning collapsible (same pattern as Today)
    NO action button (not due yet)
```

### Done Section (last 5, at bottom)
```
Section header: "Completed This Month"

DONE CARD:
  borderLeftWidth 3, borderLeftColor #1A6B3C, opacity 0.7
  Row: "{emoji} {activity.title}" | Green badge "Done ✓"
  Sub: "Completed: {formatDate(completedDate, 'MMM D')}"
```

---

## SCREEN 4 — Activity Log Modal (ActivityLogModal)

**Type:** React Native Modal — animationType='slide', presentationStyle='overFullScreen'
**Data:** GET /farms/:farmId/activities/:activityId  +  GET /farms/:farmId/workers
**Mutation:** PATCH /farms/:farmId/activities/:activityId

### Overlay
```
Modal outer: flex 1, backgroundColor rgba(0,0,0,0.45), justifyContent flex-end
Tap overlay area (above sheet) → dismiss modal
```

### Bottom Sheet
```
backgroundColor #fff
borderTopLeftRadius 16, borderTopRightRadius 16
paddingHorizontal 14, paddingBottom 28, paddingTop 12
```

### Handle Bar
```
View: width 36, height 4, backgroundColor #E5E7EB, borderRadius 2
      alignSelf center, marginBottom 12
```

### Activity Header
```
flexDirection row, space-between, alignItems flex-start, marginBottom 4

LEFT:
  "{ACTIVITY_EMOJI[type]} {activity.title}"
    fontSize 13, fontWeight '700', color #111827
  "{activity.plotName} · {activity.cropName}"
    fontSize 9, color #6B7280, marginTop 2

RIGHT:
  Blue badge "🤖 AI Scheduled"
    backgroundColor #DBEAFE, color #1D4ED8, fontSize 8
```

### AI Reasoning Box (always visible — NOT collapsible here)
```
View: backgroundColor #F9FAFB, borderRadius 6, padding 8, marginBottom 8
      borderWidth 1, borderColor #EAF4EE

"🤖 Why this activity?"  fontSize 9, fontWeight '700', color #1A6B3C, marginBottom 3
"{activity.aiReason}"    fontSize 9, color #374151, lineHeight 14
```

### Divider
```
height 1, backgroundColor #E5E7EB, marginBottom 8
```

### Form Fields
```
COMPLETED ON field:
  Label: "COMPLETED ON"  fontSize 9, fontWeight '600', color #374151
         textTransform uppercase, letterSpacing 0.4, marginBottom 3
  TouchableOpacity → DateTimePicker:
    View: border 1 #E5E7EB, borderRadius 5, padding 7 9
    "📅 {formatDate(completedDate)}"  fontSize 10, color #111827
  Default: today's date

2-COLUMN ROW (gap 6, marginBottom 8):
  Left "ACTUAL COST (KES)":
    TextInput: keyboardType numeric, defaultValue '0'
    Same border/padding as above input
  
  Right "ASSIGN TO":
    TouchableOpacity → ActionSheet with farm workers
    Shows: "{selectedWorkerName ?? 'Unassigned'} ▾"  fontSize 10

NOTES field:
  Label: "NOTES"  same uppercase style
  TextInput: placeholder "e.g. Used 3m hose, full irrigation..."
             fontSize 10, border 1 #E5E7EB, borderRadius 5, padding 7 9
```

### Streak Motivator (show only if streak.current >= 3)
```
View: backgroundColor #F5E9C8, borderWidth 1, borderColor #C9A84C
      borderRadius 8, padding 8 10, marginBottom 10
      flexDirection row, alignItems center, gap 8

"🔥"  fontSize 16

View:
  "Log to keep {streak.current}-day streak!"
    fontSize 10, fontWeight '700', color #92400E
  "+1 credit score point"
    fontSize 8, color #B45309
```

### Buttons
```
COMPLETE BUTTON:
  backgroundColor #1A6B3C, borderRadius 6, paddingVertical 11, marginBottom 8
  "✅ Mark Complete"  color #fff, fontSize 11, fontWeight '600', textAlign center
  minHeight 44
  loading → ActivityIndicator color #fff
  
  onPress mutation success:
    Invalidate: ['farms/schedule', farmId], ['farms', user.id], ['streak']
    Toast: "Logged! 🔥 {newStreak}-day streak"  bg #1A6B3C, 2 seconds
    navigation.goBack()

SKIP:
  TouchableOpacity: alignSelf center
  "Skip for now"  fontSize 10, color #9CA3AF
  onPress → PATCH { status: 'skipped' } then navigation.goBack()
```

---

## SCREEN 5 — Workers Tab (inside FarmProfileScreen)

**Data:** farm.workers (included in GET /farms/:farmId response)
Each worker: { userId, fullName, role, phone, assignedTaskCount, isActive }

### Info Alert
```
Blue alert box (left border #1D4ED8):
"To add or remove workers, visit the farm portal on web."
```

### Section Header: "Team on {farm.name}"

### Worker Card (per worker)
```
Card: backgroundColor #fff, border 1 #E5E7EB, borderRadius 8, padding 10, marginBottom 8
flexDirection row, alignItems center, gap 10

AVATAR (34×34 circle):
  Odd workers:  backgroundColor #1A6B3C
  Even workers: backgroundColor #0E7490
  color #fff, fontSize 12, fontWeight '700'
  Text: initials (first letter first name + first letter last name)

INFO (flex 1):
  "{worker.fullName}"  fontSize 11, fontWeight '600', color #111827
  Masked phone: "+254 7XX *** XXX"  fontSize 9, color #6B7280
  Role badge (marginTop 3):
    manager:      bg #EAF4EE  color #0D4A28
    field_worker: bg #DBEAFE  color #1E40AF
    harvester:    bg #FEF3C7  color #92400E
    sprayer:      bg #F3E8FF  color #6B21A8
    driver:       bg #CFFAFE  color #0E7490

RIGHT:
  "Active" fontSize 8, color #1A6B3C, fontWeight '600'
  "{worker.assignedTaskCount} tasks"  fontSize 8, color #6B7280, marginTop 2
```

### Task Distribution Card
```
Card: backgroundColor #fff, border 1 #E5E7EB, borderRadius 8, padding 10

Header: "Task Distribution"  fontSize 10, fontWeight '600', marginBottom 6
Sub: "Jun 2025"  fontSize 9, color #6B7280, marginBottom 8

For each worker (sorted by task count desc):
  Row: flexDirection row, alignItems center, gap 8, paddingVertical 5
       borderBottomWidth 1 (except last), borderColor #E5E7EB
  Small avatar 24×24, same initials pattern
  "{worker.fullName}"  fontSize 9, fontWeight '600', flex 1
  "{worker.assignedTaskCount} tasks"  fontSize 9, fontWeight '700', color #1A6B3C
```

### Web Management Footer
```
border 1 #E5E7EB, borderRadius 8, padding 12, backgroundColor #F9FAFB, alignItems center
"Manage workers at agroconnect.co.ke"
  fontSize 10, fontWeight '600', color #1A6B3C, marginBottom 3
"Add, remove, and assign roles from the farm portal"
  fontSize 8, color #6B7280
```

---

## SCREEN 6 — Farm Worker View (role='farm_worker')

When user.role === 'farm_worker', the app changes in two places:

### Bottom Tab Bar (different tabs)
```
FARMER tabs:  Home | Farm | Finance | Stock | Me
WORKER tabs:  Home | Farm | Diagnose | Community | Me
              (Finance tab is HIDDEN for farm_worker role)
```

### FarmProfileScreen changes for workers
```
Sub-tab bar is REPLACED with a role banner:
  View: backgroundColor #CFFAFE, padding 6 12
  flexDirection row, alignItems center, gap 6
  
  Role badge (Teal):
    "{ROLE_LABELS[user.workerRole]}"  bg #0E7490 color #fff
    fontSize 8, fontWeight '700', padding 2 7, borderRadius 10
  
  "{assignedTaskCount} tasks assigned to you"  fontSize 9, color #0E7490

  ROLE_LABELS = {
    manager: 'Manager', field_worker: 'Field Worker',
    harvester: 'Harvester', sprayer: 'Sprayer', driver: 'Driver'
  }

Content below: shows ONLY My Tasks tab content
  Activities filtered to: assignedToWorkerId === currentUserId
  Same layout as Screen 3, but no Upcoming section for unassigned activities
  "Owner: {farm.ownerName}" shown on each card instead of worker chip
```

---

## TEST DATA (use in all seeds and mock data)

```
Jane Wanjiru — Farmer, Nakuru, farmType: both
  Farm: "Nakuru Farm", 2.5 acres, lat -0.3031 lng 36.0800
  Crops:
    Maize H614D, planted April 1 2025, Plot A 1.5 acres
    Cabbage, planted May 1 2025, Plot B 0.5 acres
    Beans, planted June 1 2025, Plot C 0.5 acres
  Animals: 50 Layers (KARI, hatched Jan 15), 4 Dairy cattle
  Workers:
    John Waweru — field_worker — 5 tasks assigned
    Mary Kamau  — harvester   — 2 tasks assigned
  Credit score: 73 (Band B), streak: 12 days

Activities (June 6 = today):
  OVERDUE:  Water Cabbage (3 days late, due every 2 days, last Jun 3)
  OVERDUE:  Newcastle Vaccine 50 chickens (1 week late)
  TODAY:    Spray Maize — Mancozeb 80WP
  JUN 10:   Apply 2nd Fertiliser CAN 50kg — Maize
  JUL 15:   Weed Beans — Plot C
  DONE:     Water Maize — June 5 (yesterday)
  DONE:     1st Fertiliser CAN — June 1

AI Reasons:
  Water Cabbage: "Cabbage needs water every 2 days. Last watered June 3 — 3 days ago. Risk of wilting."
  Newcastle Vaccine: "Newcastle vaccine due every 3 months. Last given January 15. Now 7 weeks overdue."
  Spray Maize: "Maize at week 10 needs fungicide spray. EfficientNet detects conditions matching Grey Leaf Spot risk."
  2nd Fertiliser: "Maize at week 10 needs nitrogen boost for grain fill. Optimal window: June 8–12."
  Weed Beans: "Beans at week 6 — weeds compete with roots at this stage. Window: July 13–17."
  Harvest Maize: "H614D variety matures at 105 days. Planted April 1 → harvest August 14."
```
