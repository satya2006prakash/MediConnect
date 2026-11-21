import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Pill,
  Store,
  Shield,
  Clock,
  ArrowRight,
  Mail,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select, SearchBar } from '@/components/ui/FormField'
import { Badge, StatusBadge } from '@/components/ui/StatusBadge'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatsCard } from '@/components/ui/StatsCard'
import { Alert } from '@/components/ui/Alert'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Skeleton, SkeletonCard, SkeletonText } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { MedicineCard } from '@/components/ui/MedicineCard'
import { OrderTimeline } from '@/components/ui/OrderTimeline'
import { DataTable } from '@/components/ui/DataTable'
import type { OrderStatus } from '@/types/database'

export function DesignSystemShowcasePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [loadingBtn, setLoadingBtn] = useState(false)

  // Demo table data
  const sampleTableData = [
    {
      id: 'ORD-7291',
      patient: 'Sarah Jenkins',
      medicine: 'Atorvastatin 20mg',
      pharmacy: 'Apollo Health Center',
      status: 'pending' as OrderStatus,
      total: '$24.50',
    },
    {
      id: 'ORD-7292',
      patient: 'Robert Lang',
      medicine: 'Metformin 500mg',
      pharmacy: 'MedPlus Pharmacy',
      status: 'bill_sent' as OrderStatus,
      total: '$18.00',
    },
    {
      id: 'ORD-7293',
      patient: 'Elena Rostova',
      medicine: 'Lisinopril 10mg',
      pharmacy: 'Apollo Health Center',
      status: 'delivered' as OrderStatus,
      total: '$15.20',
    },
    {
      id: 'ORD-7294',
      patient: 'David Kim',
      medicine: 'Amlodipine 5mg',
      pharmacy: 'CareFirst Chemist',
      status: 'processing' as OrderStatus,
      total: '$32.10',
    },
  ]

  const tableColumns = [
    {
      key: 'id',
      header: 'Order Reference',
      render: (row: typeof sampleTableData[0]) => (
        <span className="font-mono text-xs font-semibold text-[#182230]">{row.id}</span>
      ),
    },
    {
      key: 'patient',
      header: 'Patient Name',
      render: (row: typeof sampleTableData[0]) => (
        <span className="font-medium text-[#182230]">{row.patient}</span>
      ),
    },
    {
      key: 'medicine',
      header: 'Prescription Item',
      render: (row: typeof sampleTableData[0]) => (
        <span className="text-[#667085]">{row.medicine}</span>
      ),
    },
    {
      key: 'pharmacy',
      header: 'Fulfilling Pharmacy',
      render: (row: typeof sampleTableData[0]) => (
        <span className="text-[#182230]">{row.pharmacy}</span>
      ),
    },
    {
      key: 'status',
      header: 'Fulfillment Status',
      render: (row: typeof sampleTableData[0]) => (
        <StatusBadge type="order" status={row.status} />
      ),
    },
    {
      key: 'total',
      header: 'Amount',
      align: 'right' as const,
      render: (row: typeof sampleTableData[0]) => (
        <span className="font-semibold text-[#182230]">{row.total}</span>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#182230] pb-24">
      {/* Top Banner */}
      <div className="bg-[#2457A7] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#E5EAF0]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/10 text-white text-xs font-semibold tracking-wider uppercase mb-3">
                <Shield className="w-3.5 h-3.5" />
                MediConnect Enterprise Design System
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Design Tokens & Component Library
              </h1>
              <p className="mt-2 text-sm sm:text-base text-white/80 max-w-2xl">
                A purpose-built, accessible, and clinical design system built specifically for
                the MediConnect Smart Medicine Reordering System. Adheres strictly to the 10-color palette.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/app/dashboard">
                <Button variant="secondary" size="md">
                  Patient Portal
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="md" className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-14">
        {/* SECTION 1: MANDATED COLOR PALETTE */}
        <section className="space-y-4">
          <div className="border-b border-[#E5EAF0] pb-3">
            <h2 className="text-xl font-bold text-[#182230] tracking-tight">
              1. Mandated Healthcare Color Palette
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Strictly limited to 10 clinical colors. No random gradients, neon accents, or unbranded shades.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {[
              { name: 'Primary Blue', hex: '#2457A7', var: '--color-primary', bg: 'bg-[#2457A7]', text: 'text-white', desc: 'Primary CTAs, Brand, Key Indicators' },
              { name: 'Secondary Teal', hex: '#159A91', var: '--color-secondary', bg: 'bg-[#159A91]', text: 'text-white', desc: 'Pharmacy Portal, Supporting CTAs' },
              { name: 'Main Background', hex: '#F7F9FC', var: '--color-background', bg: 'bg-[#F7F9FC]', border: 'border border-[#E5EAF0]', text: 'text-[#182230]', desc: 'Application background' },
              { name: 'Surface', hex: '#FFFFFF', var: '--color-surface', bg: 'bg-white', border: 'border border-[#E5EAF0]', text: 'text-[#182230]', desc: 'Cards, Modals, Popovers' },
              { name: 'Primary Text', hex: '#182230', var: '--color-primary-text', bg: 'bg-[#182230]', text: 'text-white', desc: 'Headings, Labels, Emphasized text' },
              { name: 'Secondary Text', hex: '#667085', var: '--color-secondary-text', bg: 'bg-[#667085]', text: 'text-white', desc: 'Body copy, Subtitles, Meta info' },
              { name: 'Border', hex: '#E5EAF0', var: '--color-border', bg: 'bg-[#E5EAF0]', text: 'text-[#182230]', desc: 'Dividers, Hairlines, Outlines' },
              { name: 'Success Green', hex: '#16865B', var: '--color-success', bg: 'bg-[#16865B]', text: 'text-white', desc: 'Adequate stock, Completed, Approved' },
              { name: 'Warning Amber', hex: '#D99122', var: '--color-warning', bg: 'bg-[#D99122]', text: 'text-white', desc: 'Low stock warnings, Awaiting action' },
              { name: 'Danger Red', hex: '#D64545', var: '--color-danger', bg: 'bg-[#D64545]', text: 'text-white', desc: 'Critical stock (&lt;7 days), Errors, Rejection' },
            ].map((color) => (
              <div key={color.hex} className="p-3 bg-white rounded-lg border border-[#E5EAF0] shadow-xs flex flex-col justify-between">
                <div className={`h-14 rounded-md ${color.bg} ${color.border || ''} flex items-center justify-center font-mono text-xs font-semibold ${color.text} shadow-xs`}>
                  {color.hex}
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-[#182230]">{color.name}</p>
                  <p className="text-[11px] font-mono text-[#667085] mt-0.5">{color.var}</p>
                  <p className="text-[11px] text-[#667085] mt-1.5 leading-snug">{color.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: TYPOGRAPHY HIERARCHY */}
        <section className="space-y-4">
          <div className="border-b border-[#E5EAF0] pb-3">
            <h2 className="text-xl font-bold text-[#182230] tracking-tight">
              2. Typography Hierarchy (Inter Sans-Serif)
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Consistent hierarchy avoiding unnecessarily large headings, tailored for dense clinical data.
            </p>
          </div>

          <Card>
            <CardContent className="divide-y divide-[#E5EAF0] p-0">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-xs font-mono text-[#667085] w-48 shrink-0">Page Heading (H1)</span>
                <span className="text-2xl font-bold tracking-tight text-[#182230]">Smart Medicine Reordering</span>
              </div>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-xs font-mono text-[#667085] w-48 shrink-0">Section Heading (H2)</span>
                <span className="text-lg font-semibold text-[#182230] tracking-tight">Active Prescriptions & Stock</span>
              </div>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-xs font-mono text-[#667085] w-48 shrink-0">Card Title (H3)</span>
                <span className="text-sm font-semibold text-[#182230]">Atorvastatin 20mg Tablets</span>
              </div>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-xs font-mono text-[#667085] w-48 shrink-0">Body Text (Default)</span>
                <span className="text-sm text-[#667085]">Take 1 tablet daily at night after meals. Prescribed by Dr. Robert Chen.</span>
              </div>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-xs font-mono text-[#667085] w-48 shrink-0">Label / Form Label</span>
                <span className="text-xs font-medium text-[#182230]">Daily Dosage (Tablets per day)</span>
              </div>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-xs font-mono text-[#667085] w-48 shrink-0">Supporting / Caption</span>
                <span className="text-xs text-[#667085]">Batch #MED-2024-91 · Expires November 2026</span>
              </div>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-xs font-mono text-[#667085] w-48 shrink-0">Uppercase Microcopy</span>
                <span className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider">Estimated Days Remaining</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 3: BUTTON SYSTEM */}
        <section className="space-y-4">
          <div className="border-b border-[#E5EAF0] pb-3">
            <h2 className="text-xl font-bold text-[#182230] tracking-tight">
              3. Button System
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Primary, Secondary, Outline, Ghost, Danger, and Subtle variants across 4 standard sizes.
            </p>
          </div>

          <Card>
            <CardHeader
              title="Button Variants & States"
              subtitle="All buttons feature crisp focus rings, active states, and optional loading spinners."
            />
            <CardContent className="space-y-6">
              {/* Variants */}
              <div>
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-3">Variants</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary">Primary Blue</Button>
                  <Button variant="secondary">Secondary Teal</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="subtle">Subtle</Button>
                  <Button variant="danger">Danger</Button>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-3">Sizes</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="xs">Extra Small (xs)</Button>
                  <Button variant="primary" size="sm">Small (sm)</Button>
                  <Button variant="primary" size="md">Medium (md)</Button>
                  <Button variant="primary" size="lg">Large (lg)</Button>
                </div>
              </div>

              {/* With Icons & Interactive Loading */}
              <div>
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-3">Icons & Interactive Loading</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                    Add New Medicine
                  </Button>
                  <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Approve Refill Bill
                  </Button>
                  <Button variant="outline" leftIcon={<Trash2 className="w-4 h-4" />}>
                    Remove
                  </Button>
                  <Button
                    variant="primary"
                    isLoading={loadingBtn}
                    onClick={() => {
                      setLoadingBtn(true)
                      setTimeout(() => setLoadingBtn(false), 1500)
                    }}
                  >
                    {loadingBtn ? 'Calculating...' : 'Click for Loading State'}
                  </Button>
                  <Button variant="outline" disabled>
                    Disabled Action
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 4: FORM CONTROLS & SEARCH */}
        <section className="space-y-4">
          <div className="border-b border-[#E5EAF0] pb-3">
            <h2 className="text-xl font-bold text-[#182230] tracking-tight">
              4. Form Inputs & Search Bar
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Crisp clinical inputs with consistent border tokens (#E5EAF0), active focus rings, and validation styling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Standard Inputs & Error States" />
              <CardContent className="space-y-4">
                <Input
                  label="Medicine Name"
                  placeholder="e.g. Metformin 500mg"
                  hint="Enter generic or brand trade name"
                />
                <Input
                  label="Registered Email"
                  type="email"
                  leftIcon={<Mail className="w-4 h-4" />}
                  placeholder="patient@mediconnect.com"
                />
                <Input
                  label="Daily Dosage Count"
                  type="number"
                  defaultValue="2"
                  error="Dosage cannot exceed remaining stock"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Select, Textarea & Search" />
              <CardContent className="space-y-4">
                <Select
                  label="Select Dispensing Pharmacy"
                  options={[
                    { value: 'p1', label: 'Apollo Health Pharmacy (0.8 km)' },
                    { value: 'p2', label: 'MedPlus Express (1.4 km)' },
                    { value: 'p3', label: 'CityCare Chemist (2.2 km)' },
                  ]}
                />
                <SearchBar
                  value={searchVal}
                  onChange={setSearchVal}
                  placeholder="Search medicines, pharmacies, orders..."
                  shortcutKey="K"
                />
                <Textarea
                  label="Prescription Notes & Directions"
                  placeholder="Specify meal timing, precautions, or special storage instructions..."
                  rows={2}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SECTION 5: BADGES & STATUS INDICATORS */}
        <section className="space-y-4">
          <div className="border-b border-[#E5EAF0] pb-3">
            <h2 className="text-xl font-bold text-[#182230] tracking-tight">
              5. Badges & Healthcare Status Matrix
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Every status badge strictly uses the mandated 10 colors. Dot indicators ensure immediate recognition.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-6 pt-5">
              {/* Order Statuses */}
              <div>
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-2.5">
                  Order Lifecycle Badges
                </p>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge type="order" status="pending" />
                  <StatusBadge type="order" status="pharmacy_review" />
                  <StatusBadge type="order" status="bill_sent" />
                  <StatusBadge type="order" status="bill_approved" />
                  <StatusBadge type="order" status="processing" />
                  <StatusBadge type="order" status="out_for_delivery" />
                  <StatusBadge type="order" status="delivered" />
                  <StatusBadge type="order" status="cancelled" />
                  <StatusBadge type="order" status="rejected" />
                </div>
              </div>

              {/* Stock Levels */}
              <div>
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-2.5">
                  Stock Level Indicators
                </p>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge type="stock" status="critical" />
                  <StatusBadge type="stock" status="low" />
                  <StatusBadge type="stock" status="adequate" />
                  <StatusBadge type="stock" status="good" />
                </div>
              </div>

              {/* Semantic Variant Badges */}
              <div>
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-2.5">
                  General Badges
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="primary" size="sm">Primary Badge</Badge>
                  <Badge variant="secondary" size="sm">Secondary Teal</Badge>
                  <Badge variant="success" size="sm">Active Partner</Badge>
                  <Badge variant="warning" size="sm">Action Required</Badge>
                  <Badge variant="danger" size="sm">Prescription Expired</Badge>
                  <Badge variant="neutral" size="sm">Standard Pill</Badge>
                  <Badge variant="subtle" size="sm">System Default</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 6: KPI STATS CARDS */}
        <section className="space-y-4">
          <div className="border-b border-[#E5EAF0] pb-3">
            <h2 className="text-xl font-bold text-[#182230] tracking-tight">
              6. Metric & Stats Cards
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Healthcare KPI cards with subtle clinical icon containers and trend pills.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Active Prescriptions"
              value="8"
              subtext="2 expiring this month"
              icon={Pill}
              iconColor="primary"
              trend={{ value: '12%', isPositive: true }}
            />
            <StatsCard
              title="Nearby Pharmacies"
              value="14"
              subtext="Within 5 km radius"
              icon={Store}
              iconColor="secondary"
            />
            <StatsCard
              title="Pending Refill Bills"
              value="2"
              subtext="Action needed today"
              icon={Clock}
              iconColor="warning"
            />
            <StatsCard
              title="Critical Low Stock"
              value="1"
              subtext="Less than 7 days left"
              icon={AlertCircle}
              iconColor="danger"
            />
          </div>
        </section>

        {/* SECTION 7: CLINICAL DOMAIN COMPONENTS */}
        <section className="space-y-4">
          <div className="border-b border-[#E5EAF0] pb-3">
            <h2 className="text-xl font-bold text-[#182230] tracking-tight">
              7. Domain-Specific Components (Stock Card & Order Stepper)
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Specialized healthcare components displaying dynamic days-remaining calculations and fulfillment timeline.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Medicine Stock Cards */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
                Medicine Stock Cards (Days-Remaining Gauge)
              </p>
              <MedicineCard
                medicine={{
                  id: '1',
                  user_id: 'user_1',
                  name: 'Atorvastatin',
                  brand: 'Lipitor',
                  dosage: '20mg',
                  form: 'tablet',
                  current_quantity: 4,
                  unit: 'tablet',
                  daily_dose: 1,
                  reminder_threshold: 7,
                  is_prescription: true,
                  notes: 'Take 1 tablet at night after food',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }}
                onEdit={(med) => alert(`Edit initiated for ${med.name}`)}
              />
              <MedicineCard
                medicine={{
                  id: '2',
                  user_id: 'user_1',
                  name: 'Metformin',
                  brand: 'Glucophage',
                  dosage: '500mg',
                  form: 'tablet',
                  current_quantity: 28,
                  unit: 'tablet',
                  daily_dose: 2,
                  reminder_threshold: 7,
                  is_prescription: true,
                  notes: 'Take 1 tablet with breakfast and dinner',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }}
                onEdit={(med) => alert(`Edit initiated for ${med.name}`)}
              />
            </div>

            {/* Order Timeline Stepper */}
            <div>
              <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-3">
                Order Lifecycle Stepper
              </p>
              <OrderTimeline currentStatus="bill_generated" />
            </div>
          </div>
        </section>

        {/* SECTION 8: DATA TABLE */}
        <section className="space-y-4">
          <div className="border-b border-[#E5EAF0] pb-3">
            <h2 className="text-xl font-bold text-[#182230] tracking-tight">
              8. Healthcare Data Table
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Dense, readable table with column alignment, pagination, and empty/loading states.
            </p>
          </div>

          <DataTable
            data={sampleTableData}
            columns={tableColumns}
            keyExtractor={(row) => row.id}
            pagination={{
              currentPage: 1,
              totalPages: 4,
              totalItems: 16,
              pageSize: 4,
              onPageChange: () => {},
            }}
          />
        </section>

        {/* SECTION 9: ALERT BANNERS */}
        <section className="space-y-4">
          <div className="border-b border-[#E5EAF0] pb-3">
            <h2 className="text-xl font-bold text-[#182230] tracking-tight">
              9. Contextual Alert Banners
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Clean inline alerts for critical clinical notices, instructions, and system warnings.
            </p>
          </div>

          <div className="space-y-3">
            <Alert
              variant="info"
              title="Automatic Refill Notification"
              description="Your remaining supply of Atorvastatin will fall below your 7-day safety threshold in 48 hours."
              action={<Button variant="outline" size="xs">Configure Threshold</Button>}
            />
            <Alert
              variant="success"
              title="Refill Bill Approved"
              description="Pharmacy Apollo Health has received your confirmation. Preparing order for dispatch."
            />
            <Alert
              variant="warning"
              title="Pharmacy Awaiting Bill Confirmation"
              description="MedPlus Pharmacy sent a bill of $18.50 for Refill Request #ORD-8201. Please review and approve."
              action={<Button variant="primary" size="xs">Review Bill</Button>}
            />
            <Alert
              variant="danger"
              title="Critical Stock Warning"
              description="Only 3 days of blood pressure medication remaining. Reorder immediately to avoid missing doses."
              action={<Button variant="danger" size="xs">Reorder Now</Button>}
            />
          </div>
        </section>

        {/* SECTION 10: MODALS & DIALOGS */}
        <section className="space-y-4">
          <div className="border-b border-[#E5EAF0] pb-3">
            <h2 className="text-xl font-bold text-[#182230] tracking-tight">
              10. Dialogs & Confirmation Modals
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Accessible modals with backdrop blur, keyboard ESC dismissal, and clinical confirmation styles.
            </p>
          </div>

          <Card>
            <CardContent className="pt-5 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                Open Standard Modal
              </Button>
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                Open Confirm Dialog
              </Button>
            </CardContent>
          </Card>

          {/* Standard Modal Preview */}
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Prescription Details"
            description="Manage medication dosage and refill configuration."
            size="md"
            footer={
              <>
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>
                  Save Changes
                </Button>
              </>
            }
          >
            <div className="space-y-3 text-xs text-[#667085]">
              <Input label="Medicine Name" defaultValue="Atorvastatin 20mg" />
              <Input label="Current Quantity in Stock" defaultValue="14" type="number" />
              <Input label="Daily Consumption Rate" defaultValue="1" type="number" />
            </div>
          </Modal>

          {/* Confirm Dialog Preview */}
          <ConfirmDialog
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false)
              alert('Refill order cancelled.')
            }}
            title="Cancel Refill Order?"
            message="Are you sure you want to cancel refill order #ORD-7291? The pharmacy will be notified immediately."
            confirmLabel="Yes, Cancel Order"
            variant="danger"
          />
        </section>

        {/* SECTION 11: LOADING, EMPTY & ERROR STATES */}
        <section className="space-y-4">
          <div className="border-b border-[#E5EAF0] pb-3">
            <h2 className="text-xl font-bold text-[#182230] tracking-tight">
              11. Loading, Empty & Error States
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Polished edge-case handlers for network failures, empty queries, and async loading.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EmptyState
              title="No Medicines Added Yet"
              description="Start tracking your daily prescriptions to receive automatic refill alerts when stock runs low."
              action={{
                label: 'Add First Medicine',
                onClick: () => alert('Add medicine triggered'),
              }}
            />
            <ErrorState
              title="Unable to Connect to Pharmacy Network"
              message="We could not retrieve active dispensary inventory. Please verify your connection."
              onRetry={() => alert('Retrying fetch...')}
            />
          </div>

          <Card>
            <CardHeader title="Skeleton Loading Placeholders" />
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SkeletonCard />
                <div className="p-4 rounded-lg border border-[#E5EAF0] space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <SkeletonText lines={3} />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-8 w-24 rounded" />
                    <Skeleton className="h-8 w-20 rounded" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
