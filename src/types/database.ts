// ─────────────────────────────────────────────────────────────
// Supabase Database type definitions
// Auto-generate in production with: npx supabase gen types typescript
// ─────────────────────────────────────────────────────────────

export type UserRole = 'patient' | 'pharmacy_admin' | 'admin'

export type PharmacyStatus = 'pending' | 'verified' | 'suspended'

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'bill_generated'
  | 'bill_approved'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'rejected'
  | 'cancelled'

export type BillStatus = 'pending' | 'approved' | 'rejected'

export type ComplaintStatus = 'open' | 'under_review' | 'resolved' | 'dismissed'

export type MedicineForm = 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'other'

export type NotificationType =
  | 'low_stock'
  | 'order_update'
  | 'bill_generated'
  | 'new_request'
  | 'pharmacy_verified'
  | 'complaint_update'
  | 'broadcast'
  | 'system_alert'

// ─── Row types ───────────────────────────────────────────────

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone: string | null
  avatar_url: string | null
  city: string | null
  pincode: string | null
  address: string | null
  created_at: string
  updated_at: string
}

export interface Medicine {
  id: string
  user_id: string
  name: string
  brand: string | null
  dosage: string | null
  form: MedicineForm | null
  current_quantity: number
  unit: string
  daily_dose: number
  reminder_threshold: number
  is_prescription: boolean
  last_consumed_date?: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Pharmacy {
  id: string
  owner_id: string
  name: string
  license_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  pincode: string | null
  latitude: number | null
  longitude: number | null
  status: PharmacyStatus
  document_url: string | null
  verified_at: string | null
  verified_by: string | null
  created_at: string
  updated_at: string
}

export interface PharmacyInventory {
  id: string
  pharmacy_id: string
  medicine_name: string
  brand: string | null
  form: MedicineForm | null
  dosage: string | null
  price: number
  stock_quantity: number
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  patient_id: string
  pharmacy_id: string
  status: OrderStatus
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  patient?: Profile
  pharmacy?: Pharmacy
  items?: OrderItem[]
  bill?: Bill
}

export interface OrderItem {
  id: string
  order_id: string
  medicine_id: string | null
  medicine_name: string
  quantity_requested: number
  unit: string
}

export interface Bill {
  id: string
  order_id: string
  subtotal: number
  delivery_fee: number
  tax: number
  total: number
  status: BillStatus
  patient_note: string | null
  generated_at: string
  responded_at: string | null
  items?: BillItem[]
}

export interface BillItem {
  id: string
  bill_id: string
  medicine_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  reference_id: string | null
  is_read: boolean
  created_at: string
}

export interface Complaint {
  id: string
  filed_by: string
  against_pharmacy: string | null
  against_order: string | null
  subject: string
  description: string | null
  status: ComplaintStatus
  admin_note: string | null
  created_at: string
  updated_at: string
}

// ─── Database schema shape (for Supabase client typing) ───────

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> }
      medicines: { Row: Medicine; Insert: Omit<Medicine, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Medicine> }
      pharmacies: { Row: Pharmacy; Insert: Omit<Pharmacy, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Pharmacy> }
      pharmacy_inventory: { Row: PharmacyInventory; Insert: Omit<PharmacyInventory, 'id' | 'created_at' | 'updated_at'>; Update: Partial<PharmacyInventory> }
      orders: { Row: Order; Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Order> }
      order_items: { Row: OrderItem; Insert: Omit<OrderItem, 'id'>; Update: Partial<OrderItem> }
      bills: { Row: Bill; Insert: Omit<Bill, 'id' | 'generated_at'>; Update: Partial<Bill> }
      bill_items: { Row: BillItem; Insert: Omit<BillItem, 'id'>; Update: Partial<BillItem> }
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Notification> }
      complaints: { Row: Complaint; Insert: Omit<Complaint, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Complaint> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
