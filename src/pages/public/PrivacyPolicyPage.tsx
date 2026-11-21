import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Lock, Eye, Database, Phone, Mail, CheckCircle2, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const sections = [
  { id: 'introduction', title: '1. Privacy Commitment' },
  { id: 'information-collected', title: '2. Information We Collect' },
  { id: 'medicine-data', title: '3. Medicine & Refill Data' },
  { id: 'how-we-use', title: '4. How We Use Information' },
  { id: 'data-storage', title: '5. Data Storage & Security' },
  { id: 'pharmacy-sharing', title: '6. Sharing with Pharmacies' },
  { id: 'user-rights', title: '7. User Privacy Rights' },
  { id: 'retention-deletion', title: '8. Data Retention & Deletion' },
  { id: 'cookies', title: '9. Cookies & Local Storage' },
  { id: 'contact', title: '10. Contact Information' },
]

export function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('introduction')

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120
      for (const section of sections) {
        const el = document.getElementById(section.id)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const yOffset = -80
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-white dark:bg-[#161B22] border-b border-[#E5EAF0] dark:border-[#30363D] py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-[#102624] border border-teal-100 dark:border-[#173E3B] text-[#159A91] dark:text-[#38D9A9] text-xs font-medium mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Healthcare Data Protection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#182230] dark:text-[#F0F6FC] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#8B949E] mt-2 max-w-2xl leading-relaxed">
            Your health and medicine data privacy is fundamental. This policy transparently explains
            how MediConnect collects, safeguards, and isolates your information, adhering strictly to
            the principle of medical data minimization.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#667085] dark:text-[#8B949E]">
            <span>Last Updated: November 2026</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3" /> Zero Commercial Data Sharing
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Table of Contents - Sticky Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24">
            <div className="bg-white dark:bg-[#161B22] rounded-xl border border-[#E5EAF0] dark:border-[#30363D] p-4 shadow-2xs">
              <div className="text-xs font-semibold text-[#182230] dark:text-[#F0F6FC] uppercase tracking-wider mb-3">
                Table of Contents
              </div>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollTo(section.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors truncate block ${
                      activeSection === section.id
                        ? 'bg-teal-50 dark:bg-[#102624] font-semibold text-[#159A91] dark:text-[#38D9A9] border-l-2 border-[#159A91]'
                        : 'text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC] hover:bg-slate-50 dark:hover:bg-[#21262D]'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>

              <div className="mt-6 pt-4 border-t border-[#E5EAF0] dark:border-[#30363D] text-xs text-[#667085] dark:text-[#8B949E] space-y-2">
                <div className="font-medium text-[#182230] dark:text-[#F0F6FC]">Privacy Inquiries</div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-[#159A91] dark:text-[#38D9A9]" />
                  <span>+91 7061800527</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-[#159A91] dark:text-[#38D9A9]" />
                  <span className="truncate">satya2006prakash@gmail.com</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Document Content */}
          <main className="lg:col-span-8 bg-white dark:bg-[#161B22] rounded-xl border border-[#E5EAF0] dark:border-[#30363D] p-6 sm:p-10 shadow-2xs space-y-10 text-sm text-[#182230] dark:text-[#F0F6FC] leading-relaxed">
            {/* 1. Privacy Commitment */}
            <section id="introduction" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                1. Privacy Commitment & Academic Framework
              </h2>
              <p>
                <strong>MediConnect</strong> operates on a strict principle of{' '}
                <strong>data minimization</strong>. We collect and retain only the exact data required
                to calculate medication stock, alert patients when medicine quantities run low, and
                process patient-authorized refill requests through verified retail pharmacies.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 leading-relaxed">
                <div className="font-semibold mb-1 flex items-center gap-1.5 text-blue-800">
                  <FileCheck className="w-4 h-4 shrink-0" />
                  Academic Non-Commercial Scope
                </div>
                MediConnect is an academic healthcare engineering initiative. We do not sell, rent, monetize,
                or distribute your personal health data to third-party data brokers, advertising networks, or
                insurance aggregators.
              </div>
            </section>

            {/* 2. Information Collected */}
            <section id="information-collected" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                2. Information We Collect
              </h2>
              <p>Depending on your role on the platform, we collect the following limited information:</p>
              
              <div className="space-y-3">
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50">
                  <span className="font-semibold text-slate-900 block mb-1">A. Patient Profile Information</span>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                    <li>Full Name and contact telephone number.</li>
                    <li>Email address (used for secure authentication and account recovery).</li>
                    <li>Physical residential address, city, and 6-digit postal pincode (strictly required for medicine delivery fulfillment).</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50">
                  <span className="font-semibold text-slate-900 block mb-1">B. Pharmacy Business Information</span>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                    <li>Pharmacy business trade name and registered owner/manager name.</li>
                    <li>Official state drug retail license number.</li>
                    <li>Store street address, phone number, and support email.</li>
                    <li>Stock inventory catalog items, unit pricing, and availability status.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 3. Medicine Data */}
            <section id="medicine-data" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                3. Medicine & Refill-Related Information
              </h2>
              <p>
                To provide inventory tracking and calculate days remaining before stock exhaustion,
                patients log specific medicine parameters:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                <li>
                  <strong>Medicine Details:</strong> Drug name, brand/manufacturer, dosage (e.g. 500mg),
                  and pharmaceutical form (tablet, capsule, syrup, etc.).
                </li>
                <li>
                  <strong>Tracking Counts:</strong> Current quantity, prescribed daily intake dose, and
                  customizable reminder threshold (default 7 days).
                </li>
                <li>
                  <strong>Order Records:</strong> Timestamps of submitted refill requests, itemized bill
                  summaries, order approval receipts, and fulfillment status history.
                </li>
              </ul>
            </section>

            {/* 4. How We Use Information */}
            <section id="how-we-use" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                4. How We Use Your Information
              </h2>
              <p>Your information is used strictly for functional healthcare management:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                <li>
                  <strong>Inventory Math:</strong> Automatically computing days of medication remaining
                  and classifying stock as Good, Low Stock, or Critical Stock.
                </li>
                <li>
                  <strong>Refill Coordination:</strong> Forwarding authorized refill requests to the
                  patient&apos;s chosen verified pharmacy.
                </li>
                <li>
                  <strong>Administrative Verification:</strong> Confirming pharmacy drug licenses
                  prior to enabling pharmacy access.
                </li>
                <li>
                  <strong>Direct Notifications:</strong> Sending status alerts when refill requests are
                  billed, approved, out for delivery, or fulfilled.
                </li>
              </ul>
            </section>

            {/* 5. Data Storage & Security */}
            <section id="data-storage" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                5. Data Storage & Security Architecture
              </h2>
              <p>
                MediConnect employs modern, industry-standard cryptographic mechanisms to safeguard all
                patient records and transactional history:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#F7F9FC] border border-[#E5EAF0] p-3 rounded-lg space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-[#16865B]" />
                    Encryption in Transit & Rest
                  </div>
                  <p className="text-slate-600">
                    All communications are secured via TLS 1.3 encryption. Underlying database storage
                    is protected with AES-256 disk encryption.
                  </p>
                </div>

                <div className="bg-[#F7F9FC] border border-[#E5EAF0] p-3 rounded-lg space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#2457A7]" />
                    PostgreSQL Row-Level Security
                  </div>
                  <p className="text-slate-600">
                    Row-Level Security (RLS) is enforced at the database kernel level: patients can only
                    view their own records; pharmacies only see assigned orders.
                  </p>
                </div>
              </div>
            </section>

            {/* 6. Sharing with Pharmacies */}
            <section id="pharmacy-sharing" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                6. Information Sharing with Registered Pharmacies
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Eye className="w-4 h-4 shrink-0" />
                  Strict Refill-Only Scope
                </div>
                <p>
                  Pharmacies <strong>NEVER</strong> have open access to browse your medicine cabinet or
                  medical history. A pharmacy is granted access to view medicine information{' '}
                  <strong>ONLY</strong> when you explicitly submit a refill order to that specific pharmacy.
                </p>
              </div>
              <p className="text-xs text-slate-600">
                Shared order data is strictly confined to: the requested medicine items, required quantities,
                your delivery address, and contact phone number needed to dispatch the shipment and contact
                you regarding fulfillment.
              </p>
            </section>

            {/* 7. User Rights */}
            <section id="user-rights" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                7. User Privacy Rights
              </h2>
              <p>As a MediConnect user, you maintain complete sovereignty over your data:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                <li>
                  <strong>Access & Correction:</strong> You can view, edit, or correct your personal profile,
                  phone number, address, and medicine inventory at any time directly through the dashboard.
                </li>
                <li>
                  <strong>Medicine Removal:</strong> Deleting a medicine from your inventory immediately
                  removes it from future automated calculations and dashboard views.
                </li>
                <li>
                  <strong>Order History:</strong> Past completed orders remain stored as accounting receipts
                  for you and the fulfillment pharmacy.
                </li>
              </ul>
            </section>

            {/* 8. Retention & Deletion */}
            <section id="retention-deletion" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                8. Data Retention & Account Deletion
              </h2>
              <p>
                We retain your account profile and medication data for as long as your account remains active.
                If you wish to terminate your account and request permanent deletion of your profile and
                unfulfilled records, you may submit a deletion request to the Platform Administration.
              </p>
            </section>

            {/* 9. Cookies */}
            <section id="cookies" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                9. Cookies & Local Storage
              </h2>
              <p>
                MediConnect utilizes standard browser local storage and secure HTTP session tokens solely to
                maintain your authenticated login session across page refreshes. We do not employ third-party
                tracking cookies, ad telemetry scripts, or cross-site tracking beacons.
              </p>
            </section>

            {/* 10. Contact */}
            <section id="contact" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                10. Privacy Administration Contact
              </h2>
              <p>
                If you have inquiries regarding this Privacy Policy, your personal data, or data deletion
                requests, please contact:
              </p>
              <div className="bg-[#F7F9FC] border border-[#E5EAF0] rounded-lg p-4 space-y-2 text-xs">
                <div className="font-semibold text-slate-900">MediConnect Data Protection Administration</div>
                <div className="text-slate-600">Administrator: Satya Prakash</div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-[#159A91]" />
                  <span>+91 7061800527</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-[#159A91]" />
                  <a href="mailto:satya2006prakash@gmail.com" className="text-[#159A91] hover:underline">
                    satya2006prakash@gmail.com
                  </a>
                </div>
              </div>
            </section>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-[#E5EAF0] flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link to="/terms" className="text-xs text-[#159A91] hover:underline font-medium">
                Review our Terms & Conditions →
              </Link>
              <Link to="/register/patient">
                <Button size="sm" className="bg-[#16865B] hover:bg-[#117C75] text-white">
                  Continue to Registration
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
