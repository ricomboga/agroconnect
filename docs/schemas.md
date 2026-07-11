# AgroConnect — Data Schemas

Reference: `@docs/schemas.md`

## Auth service — PostgreSQL

### users
```prisma
model User {
  id            String     @id @default(uuid())
  phone         String     @unique              // E.164 e.g. +254712345678
  email         String?    @unique
  passwordHash  String
  fullName      String
  role          UserRole
  partnerBankId String?
  county        String?
  subCounty     String?
  language      Language   @default(sw)
  status        UserStatus @default(pending_verification)
  isSuperAdmin  Boolean    @default(false)
  staffRole     StaffRole  @default(admin)
  kycStatus     KycStatus  @default(pending)
  lastLoginAt   DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  // Maker-checker fields
  createdByUserId String?  // admin/field-agent who created this account
  verifiedByUserId String? // checker who verified it — must differ from createdByUserId
  verifiedAt        DateTime?

  // Supervisor of a staff/field-agent user. When a field agent (extension_officer/
  // vet_officer) creates a farmer, only that field agent's supervisor may verify it.
  supervisorId String?
}

enum UserRole {
  farmer extension_officer vet_officer supplier buyer govt_officer admin lender farm_worker
}

enum Language { sw en }
enum KycStatus { pending submitted verified rejected }
enum StaffRole { admin county_admin moderator }

// Account lifecycle status — replaces the old isVerified/isActive booleans.
// Only `verified` and `active` are login-eligible; everything else is rejected at login.
enum UserStatus {
  pending_verification // just created by an admin/field agent, awaiting a different checker
  verified             // checker approved (maker-checker) — can log in
  active               // normal operating status — can log in
  inactive             // administratively paused — cannot log in
  disabled             // administratively disabled — cannot log in
  deleted              // soft-deleted — cannot log in
}
```

Self-registered accounts (via `POST /auth/register`) skip the maker-checker flow
entirely and start at `active` — there is no creator to check against.

### roles / permissions (system-user RBAC)
```prisma
model Role {
  id          String @id @default(uuid())
  name        String @unique
  description String?
}

model Permission {
  id          String @id @default(uuid())
  name        String @unique
  description String?
}

model RolePermission {
  roleId       String
  permissionId String
  @@id([roleId, permissionId])
}

model UserRoleAssignment {
  id               String   @id @default(uuid())
  userId           String
  roleId           String
  assignedByUserId String?
  assignedAt       DateTime @default(now())
  @@unique([userId, roleId])
}
```
Fine-grained roles/permissions assignable to admin/system users (`role: admin | govt_officer`),
layered on top of the coarser `staffRole`/`isSuperAdmin` gate used by `assertCapability` in
admin-service. See `apps/auth-service/src/repositories/roleRepository.ts`.

### sessions
```prisma
model Session {
  id               String   @id @default(uuid())
  userId           String
  deviceId         String
  refreshTokenHash String
  ipAddress        String
  userAgent        String?
  expiresAt        DateTime
  createdAt        DateTime @default(now())
}
```

---

## Farm service — PostgreSQL

### farms
```prisma
model Farm {
  id          String     @id @default(uuid())
  ownerId     String                           // FK to auth_db users.id (projection)
  name        String
  locationLat Decimal    @db.Decimal(10, 7)
  locationLng Decimal    @db.Decimal(10, 7)
  county      String
  subCounty   String?
  areaAcres   Decimal    @db.Decimal(8, 2)
  soilType    SoilType?
  waterSource WaterSource?
  status      FarmStatus @default(active)
  plots       FarmPlot[]
  activities  Activity[]
  inputs      Input[]
  harvests    Harvest[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

enum SoilType    { clay loam sandy silty peaty chalky }
enum WaterSource { rain irrigation borehole river mixed }
enum FarmStatus  { active fallow sold }
```

### farm_plots
```prisma
model FarmPlot {
  id                   String   @id @default(uuid())
  farmId               String
  farm                 Farm     @relation(fields: [farmId], references: [id], onDelete: Cascade)
  name                 String
  areaAcres            Decimal  @db.Decimal(6, 2)
  currentCrop          String?
  currentCropPlantedAt DateTime? @db.Date
  polygonGeojson       Json?
}
```

### activities
```prisma
model Activity {
  id            String         @id @default(uuid())
  farmId        String
  farm          Farm           @relation(fields: [farmId], references: [id])
  plotId        String?
  type          ActivityType
  title         String
  description   String?
  scheduledDate DateTime       @db.Date
  completedDate DateTime?      @db.Date
  status        ActivityStatus @default(pending)
  labourCostKes Decimal        @default(0) @db.Decimal(10, 2)
  notes         String?
  createdAt     DateTime       @default(now())

  @@index([farmId, scheduledDate])
}

enum ActivityType {
  planting irrigation fertilising pesticide harvesting weeding other
}
enum ActivityStatus { pending completed skipped }
```

### inputs
```prisma
model Input {
  id           String    @id @default(uuid())
  farmId       String
  farm         Farm      @relation(fields: [farmId], references: [id])
  activityId   String?
  type         InputType
  productName  String
  supplierId   String?
  quantity     Decimal   @db.Decimal(10, 3)
  unit         String
  unitCostKes  Decimal   @db.Decimal(10, 2)
  totalCostKes Decimal   @db.Decimal(12, 2)  // computed: quantity * unitCostKes
  appliedDate  DateTime  @db.Date
  notes        String?
}

enum InputType {
  seed fertiliser pesticide herbicide fuel equipment other
}
```

### harvests
```prisma
model Harvest {
  id              String       @id @default(uuid())
  farmId          String
  farm            Farm         @relation(fields: [farmId], references: [id])
  plotId          String?
  crop            String
  variety         String?
  quantityKg      Decimal      @db.Decimal(10, 2)
  qualityGrade    QualityGrade?
  harvestDate     DateTime     @db.Date
  storageLocation String?
  soldQuantityKg  Decimal      @default(0) @db.Decimal(10, 2)
  avgPriceKes     Decimal?     @db.Decimal(8, 2)
  totalRevenueKes Decimal?     @db.Decimal(12, 2)
  notes           String?
}

enum QualityGrade { A B C reject }
```

---

## Diagnosis service — MongoDB document structure

```javascript
// Collection: diagnoses
{
  _id: ObjectId,
  farm_id: String,           // AgroConnect farm UUID
  farmer_id: String,         // AgroConnect user UUID
  subject_type: String,      // 'plant' | 'animal'
  subject_name: String,      // e.g. 'maize' | 'dairy cow'
  image_urls: [String],      // S3 URLs (1–5 images)
  ai_model_version: String,  // e.g. 'efficientnet-v2.1'
  diagnosis: {
    disease_name: String,
    disease_code: String,    // internal taxonomy code e.g. MAI-GLS-001
    confidence: Number,      // 0.00–1.00
    severity: String,        // 'mild' | 'moderate' | 'severe' | 'critical'
    description: String,
    affected_area: String,
  },
  alternative_diagnoses: [
    { disease_name, confidence, description }
  ],
  prescriptions: [
    {
      step: Number,
      action: String,
      product_name: String,
      product_type: String,  // 'fungicide' | 'fertiliser' | 'drug' | etc.
      dosage: String,
      frequency: String,
      agrovet_product_id: String | null,
    }
  ],
  farmer_feedback: {
    rating: Number,           // 1–5
    outcome: String,          // 'resolved' | 'improved' | 'no_change' | 'worsened'
    notes: String,
    submitted_at: Date,
  } | null,
  status: String,             // 'pending' | 'completed' | 'failed'
  processing_time_ms: Number,
  created_at: Date,
  updated_at: Date,
}
```

---

## Finance service — PostgreSQL

### loan_applications
```prisma
model LoanApplication {
  id                   String          @id @default(uuid())
  farmerId             String
  farmId               String
  type                 LoanType
  amountRequestedKes   Decimal         @db.Decimal(12, 2)
  purpose              String
  repaymentMonths      Int
  partnerBankId        String?
  creditScore          Decimal?        @db.Decimal(5, 2)
  creditBand           CreditBand?
  status               LoanStatus      @default(draft)
  approvedAmountKes    Decimal?        @db.Decimal(12, 2)
  interestRatePct      Decimal?        @db.Decimal(5, 2)
  disbursedAt          DateTime?
  mpesaDisbursementRef String?
  rejectionReason      String?
  submittedAt          DateTime?
  createdAt            DateTime        @default(now())
}

enum LoanType { agricultural_working_capital back_to_school asset_finance emergency }
enum CreditBand { A B C D ineligible }
enum LoanStatus {
  draft submitted under_review approved rejected disbursed repaid defaulted
}
```

### credit_scores
```prisma
model CreditScore {
  id                      String    @id @default(uuid())
  farmerId                String    @unique
  score                   Decimal   @db.Decimal(5, 2)   // 0–100
  band                    CreditBand
  maxLoanKes              Decimal   @db.Decimal(12, 2)
  seasonsOfData           Int
  avgYieldScore           Decimal   @db.Decimal(5, 2)   // 0–25
  inputManagementScore    Decimal   @db.Decimal(5, 2)   // 0–25
  activityComplianceScore Decimal   @db.Decimal(5, 2)   // 0–25
  platformEngagementScore Decimal   @db.Decimal(5, 2)   // 0–25
  computedAt              DateTime
}
```

---

## Market service — PostgreSQL

### produce_listings
```prisma
model ProduceListing {
  id               String        @id @default(uuid())
  farmerId         String
  farmId           String
  harvestId        String?
  crop             String
  variety          String?
  quantityKg       Decimal       @db.Decimal(10, 2)
  askingPriceKes   Decimal       @db.Decimal(8, 2)
  qualityGrade     QualityGrade
  availableFrom    DateTime      @db.Date
  availableUntil   DateTime      @db.Date
  locationCounty   String
  locationDescription String?
  photos           Json?          // String[]
  status           ListingStatus  @default(active)
  views            Int            @default(0)
  createdAt        DateTime       @default(now())
}

enum ListingStatus { active sold expired withdrawn }
```

### supplier_products
```prisma
model SupplierProduct {
  id                String          @id @default(uuid())
  supplierId        String
  name              String
  category          ProductCategory
  brand             String?
  description       String
  unit              String
  pricePerUnitKes   Decimal         @db.Decimal(10, 2)
  stockQuantity     Decimal         @db.Decimal(10, 2)
  sku               String?         @unique
  countyAvailability Json           // String[]
  photos            Json?           // String[]
  isActive          Boolean         @default(true)
  createdAt         DateTime        @default(now())
}

enum ProductCategory {
  seed fertiliser pesticide herbicide equipment veterinary other
}
```

---

## Community service — PostgreSQL

```prisma
model Thread {
  id        String   @id @default(uuid())
  authorId  String
  category  ThreadCategory
  title     String
  body      String
  cropType  String?
  county    String?
  upvotes   Int      @default(0)
  status    ThreadStatus @default(active)
  replies   Reply[]
  createdAt DateTime @default(now())
}

model Reply {
  id           String   @id @default(uuid())
  threadId     String
  thread       Thread   @relation(fields: [threadId], references: [id])
  authorId     String
  body         String
  upvotes      Int      @default(0)
  isExpertVerified Boolean @default(false)
  createdAt    DateTime @default(now())
}

enum ThreadCategory {
  crop_advice livestock_health market_talk weather_climate
  finance_business government_programs success_stories equipment_tools
}
enum ThreadStatus { active hidden deleted }
```

---

## Service provider — user service extension

```prisma
model ServiceProvider {
  id                   String             @id @default(uuid())
  userId               String             @unique
  type                 ProviderType
  registrationNumber   String
  issuingBody          String
  specialisations      Json               // String[]
  countiesServed       Json               // String[]
  bio                  String
  profilePhotoUrl      String?
  verificationStatus   VerificationStatus @default(pending)
  verificationDocs     Json?              // String[]
  ratingAvg            Decimal            @default(0) @db.Decimal(3, 2)
  ratingCount          Int                @default(0)
  isActive             Boolean            @default(true)
  createdAt            DateTime           @default(now())
}

enum ProviderType {
  extension_officer vet_officer agronomist soil_lab equipment_dealer
}
enum VerificationStatus { pending verified rejected suspended }
```
