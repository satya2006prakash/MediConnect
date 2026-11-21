# MediConnect – Smart Medicine Reordering & Healthcare Platform

MediConnect is a comprehensive healthcare coordination and smart medicine reordering platform built for patients, licensed pharmacies, and administrators.

---

## 🌟 Key Features

### 1. Patient Portal (`/app`)
- **Medicine Tracking**: Manage prescriptions, dosage, frequency, and remaining pill counts.
- **Automated Refill Reminders**: Smart refill scheduling based on dosage and pill countdown.
- **Direct Refill Orders**: Select nearby licensed pharmacies and place refill orders with live status tracking.
- **Profile Photo Management**: Upload and manage profile avatar with automatic image optimization.

### 2. Pharmacy Portal (`/pharmacy`)
- **Prescription Order Review**: Receive incoming patient refill requests with detailed order items.
- **Inventory Management**: Track stock levels, batch numbers, and unit pricing.
- **Order Billing & Invoicing**: Generate itemized patient bills with automated total calculations.
- **Administrative Review Gate**: New pharmacy registrations start in pending verification status until approved by the platform administrator.

### 3. Administrator Portal (`/admin`)
- **Platform Analytics**: Real-time overview of users, pharmacies, order volume, and open complaints.
- **Pharmacy Verification**: Review drug license credentials and approve or suspend pharmacies with automatic email notification.
- **User Directory**: Unified directory of all registered patients and pharmacy owners.
- **Complaints & Dispute Resolution**: Direct oversight of platform complaints and issue resolution.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide Icons
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query v5
- **Backend & Database**: Supabase (PostgreSQL, Row-Level Security, Auth, Storage)
- **Forms & Validation**: React Hook Form, Zod

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm or pnpm

### 2. Clone and Install
```bash
git clone https://github.com/satya2006prakash/MediConnect.git
cd MediConnect
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env` and configure your Supabase credentials:
```bash
cp .env.example .env
```

Ensure your `.env` contains:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-secret-key
```

### 4. Database Setup
Run the SQL scripts in your Supabase SQL Editor:
1. `supabase/full_setup.sql` — Schema, RLS policies, functions, and triggers.
2. `supabase/migrations/002_fix_pharmacy_registration_rls.sql` — Pharmacy registration RLS policy.

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔒 Security & Privacy

- **Row-Level Security (RLS)**: Enforced across all PostgreSQL tables.
- **Cross-Role Reservation**: Email addresses are unique across patients, pharmacies, and administrators.
- **Compliance**: Dedicated [Terms & Conditions](/terms) and [Privacy Policy](/privacy) pages.

---

## 📄 License
This project is developed for academic and healthcare coordination purposes.

