import { KENYA_COUNTIES } from './counties'

export type FieldType = 'text' | 'tel' | 'number' | 'date' | 'select' | 'chips' | 'textarea'

export interface FieldOption {
  value: string
  label: string
}

export interface FieldConfig {
  key: string
  label: string
  type: FieldType
  required?: boolean
  hint?: string
  placeholder?: string
  options?: FieldOption[]
  multiple?: boolean
  default?: string | string[]
}

export interface SectionConfig {
  title: string
  fields: FieldConfig[]
}

export interface RoleFormConfig {
  role: string
  apiRole: string
  title: string
  sections: SectionConfig[]
}

const countyOptions: FieldOption[] = KENYA_COUNTIES.map((c) => ({ value: c, label: c }))

export const ROLE_FORM_CONFIG: Record<string, RoleFormConfig> = {
  lender: {
    role: 'lender',
    apiRole: 'lender',
    title: 'Create Lender Rep',
    sections: [
      {
        title: 'Contact Person Details',
        fields: [
          { key: 'fullName', label: 'Full Name', type: 'text', required: true },
          { key: 'phone', label: 'Phone Number', type: 'tel', required: true },
          { key: 'nationalId', label: 'National ID', type: 'text' },
          { key: 'email', label: 'Work Email', type: 'text' },
          { key: 'jobTitle', label: 'Job Title', type: 'text' },
        ],
      },
      {
        title: 'Institution Details',
        fields: [
          { key: 'institutionName', label: 'Institution Name', type: 'text', required: true },
          {
            key: 'institutionType',
            label: 'Institution Type',
            type: 'select',
            options: [
              { value: 'bank', label: 'Commercial Bank (CBK-licensed)' },
              { value: 'microfinance', label: 'MFI (AMFI)' },
              { value: 'sacco', label: 'SACCO' },
              { value: 'mobile_lender', label: 'Mobile Lender' },
            ],
          },
          { key: 'licenceNo', label: 'CBK / AMFI Licence No.', type: 'text', required: true },
          {
            key: 'paybill',
            label: 'M-Pesa Paybill (Disbursements)',
            type: 'text',
            required: true,
            hint: 'Farmers receive disbursements here',
          },
          { key: 'headOfficeCounty', label: 'Head Office County', type: 'select', options: countyOptions },
          { key: 'maxLoanKes', label: 'Max Loan Amount (KES)', type: 'number' },
          { key: 'interestRate', label: 'Interest Rate (% p.a.)', type: 'number' },
        ],
      },
    ],
  },
  supplier: {
    role: 'supplier',
    apiRole: 'supplier',
    title: 'Create Supplier Account',
    sections: [
      {
        title: 'Contact Person',
        fields: [
          { key: 'fullName', label: 'Full Name', type: 'text', required: true },
          { key: 'phone', label: 'Phone Number', type: 'tel', required: true },
          { key: 'nationalId', label: 'National ID', type: 'text' },
        ],
      },
      {
        title: 'Business Details',
        fields: [
          { key: 'businessName', label: 'Business Name', type: 'text', required: true },
          { key: 'businessRegNumber', label: 'Business Reg Number', type: 'text', required: true },
          { key: 'businessCounty', label: 'Business County', type: 'select', required: true, options: countyOptions },
          { key: 'deliveryRadiusKm', label: 'Delivery Radius (km)', type: 'number' },
          { key: 'address', label: 'Physical Address', type: 'text' },
          {
            key: 'productCategories',
            label: 'Product Categories',
            type: 'chips',
            multiple: true,
            options: [
              { value: 'fertiliser', label: '🌾 Fertilisers' },
              { value: 'pesticide', label: '🌿 Pesticides' },
              { value: 'seed', label: '🌱 Seeds' },
              { value: 'animal_medicine', label: '💊 Animal Medicine' },
              { value: 'vaccine', label: '💉 Vaccines' },
              { value: 'equipment', label: '🔧 Equipment / Tools' },
            ],
          },
        ],
      },
    ],
  },
  vet_officer: {
    role: 'vet_officer',
    apiRole: 'vet_officer',
    title: 'Create Vet / Expert Account',
    sections: [
      {
        title: 'Personal Details',
        fields: [
          { key: 'fullName', label: 'Full Name', type: 'text', required: true },
          { key: 'phone', label: 'Phone Number', type: 'tel', required: true },
          { key: 'nationalId', label: 'National ID', type: 'text', required: true },
          { key: 'email', label: 'Work Email', type: 'text' },
        ],
      },
      {
        title: 'Professional Details',
        fields: [
          {
            key: 'expertType',
            label: 'Expert Type',
            type: 'select',
            required: true,
            options: [
              { value: 'vet_officer', label: 'Veterinary Officer (KVB-licenced)' },
              { value: 'extension_officer', label: 'Extension Officer (Ministry)' },
              { value: 'agronomist', label: 'Agronomist (private/NGO)' },
            ],
          },
          { key: 'licenceNumber', label: 'Licence / Cert Number', type: 'text', required: true },
          { key: 'organisation', label: 'Employing Organisation', type: 'text' },
          {
            key: 'specialisations',
            label: 'Crop / Animal Specialisations',
            type: 'chips',
            multiple: true,
            options: [
              { value: 'maize', label: '🌽 Maize' },
              { value: 'poultry', label: '🐔 Poultry' },
              { value: 'horticulture', label: '🍅 Tomato / Horticulture' },
              { value: 'dairy', label: '🐄 Dairy Cattle' },
              { value: 'legumes', label: '🫘 Legumes' },
            ],
          },
          { key: 'assignedCounty', label: 'Assigned County', type: 'select', required: true, options: countyOptions },
          { key: 'maxFarmers', label: 'Max Farmers Assignable', type: 'number' },
        ],
      },
    ],
  },
  govt_officer: {
    role: 'govt_officer',
    apiRole: 'govt_officer',
    title: 'Create Govt Officer Account',
    sections: [
      {
        title: 'Personal Details',
        fields: [
          { key: 'fullName', label: 'Full Name', type: 'text', required: true },
          { key: 'phone', label: 'Phone Number', type: 'tel', required: true },
          { key: 'nationalId', label: 'National ID', type: 'text', required: true },
          { key: 'email', label: 'Work Email', type: 'text' },
        ],
      },
      {
        title: 'Government Details',
        fields: [
          {
            key: 'ministry',
            label: 'Ministry / Agency',
            type: 'select',
            required: true,
            options: [
              { value: 'moa_hq', label: 'Ministry of Agriculture & Livestock' },
              { value: 'county_agri', label: 'County Agriculture Dept' },
              { value: 'kalro', label: 'KALRO' },
              { value: 'kephis', label: 'KEPHIS' },
              { value: 'ncpb', label: 'NCPB' },
              { value: 'afa', label: 'AFA' },
            ],
          },
          { key: 'position', label: 'Position / Title', type: 'text', required: true },
          { key: 'staffId', label: 'Staff ID Number', type: 'text', required: true },
          { key: 'assignedCounty', label: 'Assigned County', type: 'select', required: true, options: countyOptions },
        ],
      },
    ],
  },
  buyer: {
    role: 'buyer',
    apiRole: 'buyer',
    title: 'Create Buyer Account',
    sections: [
      {
        title: 'Contact Person',
        fields: [
          { key: 'fullName', label: 'Full Name', type: 'text', required: true },
          { key: 'phone', label: 'Phone Number', type: 'tel', required: true },
          { key: 'email', label: 'Email', type: 'text', required: true },
        ],
      },
      {
        title: 'Business Information',
        fields: [
          { key: 'companyName', label: 'Company Name', type: 'text', required: true },
          {
            key: 'buyerType',
            label: 'Buyer Type',
            type: 'select',
            required: true,
            options: [
              { value: 'wholesale', label: 'Wholesale Trader' },
              { value: 'retail', label: 'Retail Supermarket' },
              { value: 'processor', label: 'Food Processor / Exporter' },
              { value: 'hotel', label: 'Hotel / Restaurant / Catering' },
              { value: 'individual', label: 'Individual Consumer' },
            ],
          },
          { key: 'businessRegNumber', label: 'Business Reg Number', type: 'text' },
          {
            key: 'produceInterests',
            label: 'Produce Interests',
            type: 'chips',
            multiple: true,
            options: [
              { value: 'maize', label: '🌽 Maize' },
              { value: 'tomatoes', label: '🍅 Tomatoes' },
              { value: 'beans', label: '🫘 Beans' },
              { value: 'potatoes', label: '🥔 Potatoes' },
              { value: 'eggs', label: '🥚 Eggs' },
              { value: 'milk', label: '🥛 Milk' },
            ],
          },
        ],
      },
    ],
  },
  worker: {
    role: 'worker',
    apiRole: 'farm_worker',
    title: 'Create Farm Worker',
    sections: [
      {
        title: 'Worker Details',
        fields: [
          { key: 'fullName', label: 'Full Name', type: 'text', required: true },
          { key: 'phone', label: 'Phone Number', type: 'tel', required: true },
          { key: 'nationalId', label: 'National ID', type: 'text' },
          {
            key: 'gender',
            label: 'Gender',
            type: 'select',
            options: [
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ],
          },
          {
            key: 'workerRole',
            label: 'Worker Role',
            type: 'select',
            required: true,
            default: 'field_worker',
            options: [
              { value: 'field_worker', label: 'Field Worker' },
              { value: 'manager', label: 'Manager' },
              { value: 'harvester', label: 'Harvester' },
              { value: 'sprayer', label: 'Sprayer' },
              { value: 'driver', label: 'Driver' },
            ],
          },
          {
            key: 'employmentType',
            label: 'Employment Type',
            type: 'select',
            options: [
              { value: 'permanent', label: 'Permanent' },
              { value: 'seasonal', label: 'Seasonal' },
              { value: 'casual', label: 'Casual (day rate)' },
            ],
          },
        ],
      },
      {
        title: 'Farm Assignment',
        fields: [
          {
            key: 'farmId',
            label: 'Assign to Farm',
            type: 'select',
            required: true,
            options: [],
          },
          { key: 'startDate', label: 'Start Date', type: 'date' },
          { key: 'wageKes', label: 'Daily / Monthly Wage (KES)', type: 'number' },
          {
            key: 'canCompleteActivities',
            label: 'Can Complete Activities?',
            type: 'select',
            default: 'yes',
            options: [
              { value: 'yes', label: 'Yes — assigned activities appear on app' },
              { value: 'no', label: 'No — view only' },
            ],
          },
        ],
      },
    ],
  },
}
