'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FormSection,
  FieldGroup,
  Field,
  ChipSelect,
  TextInput,
  Select,
  Textarea,
  AlertBox,
  SuccessScreen,
} from '@agroconnect/web-ui'
import { toast } from 'sonner'
import api from '@/lib/api'

interface SupplierProduct {
  id: string
  name: string
  category: string
  brand?: string
  description: string
  unit: string
  pricePerUnitKes: string
  stockQuantity: string
  countyAvailability: string[]
}

interface ProductsResponse {
  data: SupplierProduct[]
}

// Wireframe shows 7 category chips (Fertiliser / Pesticide / Seeds / Animal
// Medicine / Vaccine / Tools & Equipment / Other). The real schema's
// `category` enum has no separate "vaccine" value, so "Animal Medicine" and
// "Vaccine" both map to `veterinary` on submit — kept as distinct chip
// options (with distinct chip-only keys) purely so only one highlights at a
// time, matching the wireframe's chip-select behavior.
const CATEGORY_CHIPS = [
  { value: 'fertiliser', label: '🌾 Fertiliser', schemaValue: 'fertiliser' },
  { value: 'pesticide', label: '🌿 Pesticide', schemaValue: 'pesticide' },
  { value: 'seed', label: '🌱 Seeds', schemaValue: 'seed' },
  { value: 'veterinary_medicine', label: '💊 Animal Medicine', schemaValue: 'veterinary' },
  { value: 'veterinary_vaccine', label: '💉 Vaccine', schemaValue: 'veterinary' },
  { value: 'equipment', label: '🔧 Tools & Equipment', schemaValue: 'equipment' },
  { value: 'other', label: '📦 Other', schemaValue: 'other' },
] as const

const UNITS = ['bag (50kg)', 'kg', 'litre', 'vial', 'piece', 'pack'] as const

// Kenya's 47 counties — used for the required countyAvailability field.
// NOTE: this county multi-select is NOT present in the wireframe's Add Product
// screen, but `countyAvailability` (min 1) is a required field on the real
// createProduct schema (apps/market-service/src/schemas/createProduct.schema.ts),
// so it must be collected here for the form to actually be submittable.
const COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta', 'Garissa', 'Wajir', 'Mandera',
  'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua',
  'Nyeri', 'Kirinyaga', "Murang'a", 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia',
  'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado',
  'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay',
  'Migori', 'Kisii', 'Nyamira', 'Nairobi',
].map((c) => ({ value: c, label: c }))

export function ProductForm() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const queryClient = useQueryClient()

  // Best-effort prefill for edit mode: no single-product GET-by-id endpoint
  // exists in the contract, so we look up the product from the already-cached
  // catalogue list query instead of adding a new fetch.
  const cachedProduct = useMemo(() => {
    if (!editId) return undefined
    const cached = queryClient.getQueryData<ProductsResponse>(['supplier', 'products'])
    return cached?.data.find((p) => p.id === editId)
  }, [editId, queryClient])

  const [categoryChip, setCategoryChip] = useState<string>('fertiliser')
  const [name, setName] = useState(cachedProduct?.name ?? '')
  const [brand, setBrand] = useState(cachedProduct?.brand ?? '')
  const [description, setDescription] = useState(cachedProduct?.description ?? '')
  const [unit, setUnit] = useState<string>(UNITS[0])
  const [price, setPrice] = useState(cachedProduct?.pricePerUnitKes ?? '')
  const [stock, setStock] = useState(cachedProduct?.stockQuantity ?? '')
  const [counties, setCounties] = useState<string[]>(cachedProduct?.countyAvailability ?? [])
  const [compatibleCrops, setCompatibleCrops] = useState('')
  const [linkedDiseases, setLinkedDiseases] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('10')
  const [autoReorderQty, setAutoReorderQty] = useState('50')
  const [deliveryAvailable, setDeliveryAvailable] = useState('Yes, within 30km')
  const [deliveryTime, setDeliveryTime] = useState('Same day')
  const [minOrderQty, setMinOrderQty] = useState('1')
  const [govtProgram, setGovtProgram] = useState('Not part of any program')
  const [photosCsv, setPhotosCsv] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      const schemaCategory = CATEGORY_CHIPS.find((c) => c.value === categoryChip)?.schemaValue ?? 'other'
      const photos = photosCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)

      const body = {
        name,
        category: schemaCategory,
        brand: brand || undefined,
        description,
        unit,
        pricePerUnitKes: Number(price),
        stockQuantity: Number(stock),
        countyAvailability: counties,
        ...(photos.length > 0 ? { photos } : {}),
      }

      if (editId) {
        return api.patch(`/api/supplier/products/${editId}`, body)
      }
      return api.post('/api/supplier/products', body)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supplier', 'products'] })
      setSubmitted(true)
    },
    onError: () => toast.error('Failed to save product'),
  })

  if (submitted) {
    return (
      <SuccessScreen
        title="Product saved"
        sub="Your product is now live in the marketplace and eligible for AI-linked recommendations."
        nextActions={[
          { label: 'Back to Catalogue', href: '/supplier/catalogue' },
          { label: 'Add Another', href: '/supplier/catalogue/new' },
        ]}
      />
    )
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">{editId ? 'Edit Product' : 'Add / Edit Product'}</p>
        <p className="text-base text-muted">
          Products appear in the public marketplace and AI-linked recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <div className="rounded-base border border-border bg-white p-4">
          <FormSection title="Category & Type">
            <ChipSelect
              options={CATEGORY_CHIPS.map((c) => ({ value: c.value, label: c.label }))}
              value={categoryChip}
              onChange={setCategoryChip}
            />
          </FormSection>

          <FormSection title="Basic Information">
            <Field label="Product Name" required>
              <TextInput
                placeholder="e.g. CAN Fertiliser 50kg"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Brand / Manufacturer">
              <TextInput placeholder="e.g. Yara, NCPB, Pioneer" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </Field>
            <Field label="Description">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <FieldGroup cols={2}>
              <Field label="Unit" required>
                <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Price per Unit (KES)" required>
                <TextInput type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
            </FieldGroup>
            <Field label="County Availability" required hint="At least one county is required">
              <ChipSelect options={COUNTIES} multiple value={counties} onChange={setCounties} />
            </Field>
          </FormSection>

          <FormSection title="AI Linking (Recommended)">
            <Field
              label="Compatible Crops"
              hint="When farmers have these crops, this product appears in AI recommendations"
            >
              {/* TODO(real-data): no compatibleCrops column exists on SupplierProduct yet — not sent on submit. */}
              <TextInput
                value={compatibleCrops}
                onChange={(e) => setCompatibleCrops(e.target.value)}
                placeholder="Maize, Cabbage, Wheat, Beans"
              />
            </Field>
            <Field
              label="Linked Diseases / Conditions"
              hint="If AI diagnoses this condition, this product is suggested"
            >
              {/* TODO(real-data): no linkedDiseases column exists on SupplierProduct yet — not sent on submit. */}
              <TextInput
                value={linkedDiseases}
                onChange={(e) => setLinkedDiseases(e.target.value)}
                placeholder="e.g. Nitrogen deficiency, stunted growth"
              />
            </Field>
          </FormSection>
        </div>

        <div>
          <div className="mb-3.5 rounded-base border border-border bg-white p-4">
            <FormSection title="Stock Management">
              <FieldGroup cols={2}>
                <Field label="Current Stock Quantity" required>
                  <TextInput type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
                </Field>
                <Field label="Unit">
                  <TextInput value={unit} readOnly />
                </Field>
              </FieldGroup>
              <FieldGroup cols={2}>
                <Field label="Low Stock Alert Threshold" hint="Alert when stock drops below this">
                  {/* TODO(real-data): no per-product low-stock-threshold column exists yet — not sent on submit. */}
                  <TextInput
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                  />
                </Field>
                <Field label="Auto-reorder Quantity" hint="Suggested order qty when restocking">
                  {/* TODO(real-data): no auto-reorder-quantity column exists yet — not sent on submit. */}
                  <TextInput
                    type="number"
                    value={autoReorderQty}
                    onChange={(e) => setAutoReorderQty(e.target.value)}
                  />
                </Field>
              </FieldGroup>
            </FormSection>

            <FormSection title="Delivery & Availability">
              {/* TODO(real-data): no delivery-settings columns exist on SupplierProduct yet — not sent on submit. */}
              <FieldGroup cols={2}>
                <Field label="Delivery Available?">
                  <Select value={deliveryAvailable} onChange={(e) => setDeliveryAvailable(e.target.value)}>
                    <option>Yes, within 30km</option>
                    <option>Yes, within 50km</option>
                    <option>No, collection only</option>
                  </Select>
                </Field>
                <Field label="Delivery Time">
                  <Select value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)}>
                    <option>Same day</option>
                    <option>Next day</option>
                    <option>2–3 days</option>
                  </Select>
                </Field>
              </FieldGroup>
              <Field label="Minimum Order Quantity" hint="Leave 1 for no minimum">
                <TextInput type="number" value={minOrderQty} onChange={(e) => setMinOrderQty(e.target.value)} />
              </Field>
            </FormSection>

            <FormSection title="Government Program Eligibility">
              <AlertBox variant="blue">
                If this product is part of a government subsidy programme, it will automatically appear in the
                relevant government program listings.
              </AlertBox>
              <Field label="Included in Gov't Program?">
                {/* TODO(real-data): no gov-program-eligibility link exists on SupplierProduct yet — not sent on submit. */}
                <Select value={govtProgram} onChange={(e) => setGovtProgram(e.target.value)}>
                  <option>MSAI Fertiliser Subsidy 2025</option>
                  <option>Not part of any program</option>
                </Select>
              </Field>
            </FormSection>
          </div>

          <div className="mb-3.5 rounded-base border border-border bg-white p-4">
            <FormSection title="Product Images">
              {/* Image upload should route through media-service per CLAUDE.md rule 8 — no
                  such integration exists in this portal yet, so we accept photo URLs directly
                  as a stand-in for a real upload widget. */}
              <Field label="Photo URLs" hint="Comma-separated URLs, max 5">
                <TextInput
                  placeholder="https://…, https://…"
                  value={photosCsv}
                  onChange={(e) => setPhotosCsv(e.target.value)}
                />
              </Field>
              <AlertBox variant="green">
                Tip: Clear product photos increase conversion by 40%. Show the bag/packaging clearly.
              </AlertBox>
            </FormSection>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={mutation.isPending || !name || !description || !price || !stock || counties.length === 0}
              onClick={() => mutation.mutate()}
              className="flex-1 rounded-md bg-ac-green px-3 py-2.5 text-center text-base font-semibold text-white disabled:opacity-50"
            >
              💾 Save Product
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
