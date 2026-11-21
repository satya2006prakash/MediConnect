import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Shield, AlertCircle, Phone, Mail, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const sections = [
  { id: 'introduction', title: '1. Introduction' },
  { id: 'eligibility', title: '2. Eligibility & Registration' },
  { id: 'user-responsibilities', title: '3. User Responsibilities' },
  { id: 'medicine-management', title: '4. Medicine & Refill Tracking' },
  { id: 'pharmacy-services', title: '5. Pharmacy Services' },
  { id: 'refill-orders', title: '6. Refill Requests & Orders' },
  { id: 'pricing-billing', title: '7. Pricing & Itemized Billing' },
  { id: 'account-security', title: '8. Account Security' },
  { id: 'platform-limitations', title: '9. Platform Limitations & Disclaimers' },
  { id: 'changes-to-terms', title: '10. Changes to Terms' },
  { id: 'contact', title: '11. Contact Information' },
]

export function TermsPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-[#16243B] border border-blue-100 dark:border-[#1F3659] text-[#2457A7] dark:text-[#58A6FF] text-xs font-medium mb-3">
            <FileText className="w-3.5 h-3.5" />
            <span>MediConnect Governance & Usage</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#182230] dark:text-[#F0F6FC] tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#8B949E] mt-2 max-w-2xl leading-relaxed">
            Please read these terms carefully before accessing or registering on the MediConnect
            platform. These terms outline user responsibilities, pharmacy coordination guidelines,
            and service limitations.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#667085] dark:text-[#8B949E]">
            <span>Last Updated: November 2026</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3" /> Academic & Demonstration Release
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
                        ? 'bg-blue-50 dark:bg-[#16243B] font-semibold text-[#2457A7] dark:text-[#58A6FF] border-l-2 border-[#2457A7]'
                        : 'text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC] hover:bg-slate-50 dark:hover:bg-[#21262D]'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>

              <div className="mt-6 pt-4 border-t border-[#E5EAF0] dark:border-[#30363D] text-xs text-[#667085] dark:text-[#8B949E] space-y-2">
                <div className="font-medium text-[#182230] dark:text-[#F0F6FC]">Need help?</div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-[#2457A7] dark:text-[#58A6FF]" />
                  <span>+91 7061800527</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-[#2457A7] dark:text-[#58A6FF]" />
                  <span className="truncate">satya2006prakash@gmail.com</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Document Content */}
          <main className="lg:col-span-8 bg-white dark:bg-[#161B22] rounded-xl border border-[#E5EAF0] dark:border-[#30363D] p-6 sm:p-10 shadow-2xs space-y-10 text-sm text-[#182230] dark:text-[#F0F6FC] leading-relaxed">
            {/* 1. Introduction */}
            <section id="introduction" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                1. Introduction
              </h2>
              <p>
                Welcome to <strong>MediConnect – Smart Medicine Reordering System</strong> (&ldquo;MediConnect&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
                MediConnect is a digital healthcare management platform designed to help patients monitor
                routine medicine inventory, receive timely low-stock refill reminders, and coordinate
                authorized refill requests directly with registered local pharmacies.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 leading-relaxed">
                <div className="font-semibold mb-1 flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Academic Project Notice
                </div>
                MediConnect is an academic and demonstrative software system built to illustrate modern,
                privacy-respecting healthcare workflows and pharmacy fulfillment. The platform is not an
                autonomous prescribing service or licensed pharmaceutical vendor.
              </div>
            </section>

            {/* 2. Eligibility & Registration */}
            <section id="eligibility" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                2. Eligibility & Account Registration
              </h2>
              <p>
                By registering for an account on MediConnect, you confirm that you are at least 18 years
                of age (or under the supervision of a legal guardian) and possess the legal authority
                to agree to these Terms.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                <li>
                  <strong>Accurate Information:</strong> You agree to provide true, current, and accurate
                  information during registration, including your name, contact phone number, and physical
                  delivery address.
                </li>
                <li>
                  <strong>Single Account Role Reservation:</strong> Each email address is strictly limited
                  to one account role across the entire platform. An email registered as a Patient cannot be
                  re-used to register a Pharmacy, and an email registered as a Pharmacy cannot be registered as
                  a Patient.
                </li>
                <li>
                  <strong>Pharmacy Registration:</strong> Pharmacy operators must submit valid drug license
                  information issued by applicable state regulatory authorities for administrative review
                  before accessing the pharmacy portal.
                </li>
              </ul>
            </section>

            {/* 3. User Responsibilities */}
            <section id="user-responsibilities" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                3. User Responsibilities
              </h2>
              <p>Users of MediConnect agree to the following conduct standards:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                <li>
                  <strong>Credential Safeguarding:</strong> You are responsible for keeping your account
                  credentials, password, and active sessions secure.
                </li>
                <li>
                  <strong>Medicine Verification:</strong> You are solely responsible for ensuring that the
                  medicines, dosage instructions, and brand names entered into your inventory accurately
                  reflect prescriptions written by your licensed healthcare physician.
                </li>
                <li>
                  <strong>Non-Misuse:</strong> You shall not use the service to request controlled, prohibited,
                  or illicit substances, nor submit fraudulent orders or duplicate accounts.
                </li>
              </ul>
            </section>

            {/* 4. Medicine Management */}
            <section id="medicine-management" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                4. Medicine Information & Refill Management
              </h2>
              <p>
                MediConnect provides algorithmic calculation tools to estimate remaining medicine supply
                based on patient-provided dosage data (e.g. daily intake and current inventory count).
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                <li>
                  <strong>Estimates Only:</strong> Remaining day calculations, stock levels, and automated
                  refill notifications are advisory calculations and do not replace physical verification
                  of your actual medication supply.
                </li>
                <li>
                  <strong>No Medical Advice:</strong> Information displayed within the system is for inventory
                  management only and does not constitute medical advice, diagnosis, or treatment recommendations.
                  Always consult a licensed physician for changes to your prescription regimen.
                </li>
              </ul>
            </section>

            {/* 5. Pharmacy Services */}
            <section id="pharmacy-services" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                5. Pharmacy Services & Administrative Approval
              </h2>
              <p>
                Pharmacies listed on MediConnect operate as independent licensed retail dispensaries.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                <li>
                  <strong>Administrative Review:</strong> New pharmacy registrations must undergo review
                  by the MediConnect Platform Administrator. Unverified pharmacies remain gated and cannot
                  receive orders or publish inventory until officially verified.
                </li>
                <li>
                  <strong>Dispensing Standards:</strong> Verified pharmacies are solely responsible for the
                  quality, expiration validity, authentic sourcing, and lawful dispensing of all medications
                  supplied to patients.
                </li>
                <li>
                  <strong>Prescription Requirements:</strong> Where required by applicable drug rules, pharmacies
                  retain the right and obligation to request and inspect a valid physician prescription prior to
                  dispensing Schedule H/X medications.
                </li>
              </ul>
            </section>

            {/* 6. Refill Requests */}
            <section id="refill-orders" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                6. Refill Requests & Order Lifecycle
              </h2>
              <p>The standard order fulfillment flow proceeds through explicit, authorized checkpoints:</p>
              <div className="bg-[#F7F9FC] border border-[#E5EAF0] rounded-lg p-4 space-y-2 text-xs">
                <div className="font-semibold text-slate-800">Standard Order Progression:</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold block text-slate-900">1. Request</span>
                    Patient selects medicines & sends request
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold block text-slate-900">2. Review & Bill</span>
                    Pharmacy reviews stock & issues invoice
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold block text-slate-900">3. Approval</span>
                    Patient approves itemized bill
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold block text-slate-900">4. Delivery</span>
                    Pharmacy dispatches order to patient
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Pharmacies maintain the discretion to reject requests or adjust quantities based on real-time
                stock availability. Orders may be cancelled by either party prior to item dispatch.
              </p>
            </section>

            {/* 7. Pricing & Billing */}
            <section id="pricing-billing" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                7. Pricing & Itemized Billing
              </h2>
              <p>
                All prices, taxes, and optional delivery charges are determined by the fulfillment pharmacy
                and presented in an itemized bill before payment or confirmation.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                <li>
                  <strong>Transparency:</strong> Bills must specify unit prices, quantities, taxes, and
                  delivery costs. No hidden fees are assessed by MediConnect.
                </li>
                <li>
                  <strong>Payment Settlement:</strong> Payment is settled directly between the patient and
                  the dispensing pharmacy upon delivery or pickup using agreed settlement methods.
                </li>
              </ul>
            </section>

            {/* 8. Account Security */}
            <section id="account-security" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                8. Account Security & Verification
              </h2>
              <p>
                Authentication services are powered by secure cryptographic authentication mechanisms.
                Users must notify platform administration immediately if they detect unauthorized access,
                lost credentials, or security incidents affecting their account.
              </p>
            </section>

            {/* 9. Platform Limitations */}
            <section id="platform-limitations" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                9. Platform Limitations & Disclaimers
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-red-800">
                  <Shield className="w-4 h-4 shrink-0" />
                  Medical Emergency Disclaimer
                </div>
                <p>
                  <strong>MEDICONNECT IS NOT EQUIPPED FOR MEDICAL EMERGENCIES.</strong> In the event of an
                  acute health emergency, severe drug reaction, or critical symptom, immediately contact your
                  local medical emergency number (such as 112 / 108 in India) or report to the nearest hospital
                  emergency department.
                </p>
              </div>
              <p className="text-xs text-slate-600">
                MediConnect is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis for academic research and
                demonstration. While we endeavor to maintain reliable platform uptime, uninterrupted operation
                cannot be guaranteed.
              </p>
            </section>

            {/* 10. Changes to Terms */}
            <section id="changes-to-terms" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                10. Changes to These Terms
              </h2>
              <p>
                We may revise these Terms & Conditions periodically to reflect modifications in platform
                capabilities, academic requirements, or operational changes. The &ldquo;Last Updated&rdquo; date at the top
                of this page indicates when revisions were published. Continued use of the platform after updates
                constitutes your acceptance of the revised terms.
              </p>
            </section>

            {/* 11. Contact */}
            <section id="contact" className="space-y-3">
              <h2 className="text-lg font-bold text-[#182230] pb-2 border-b border-[#E5EAF0]">
                11. Contact Information
              </h2>
              <p>
                For questions regarding these Terms & Conditions, platform governance, or user inquiries,
                please contact the MediConnect Platform Administration:
              </p>
              <div className="bg-[#F7F9FC] border border-[#E5EAF0] rounded-lg p-4 space-y-2 text-xs">
                <div className="font-semibold text-slate-900">MediConnect Platform Governance</div>
                <div className="text-slate-600">Lead Administrator: Satya Prakash</div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-[#2457A7]" />
                  <span>+91 7061800527</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-[#2457A7]" />
                  <a href="mailto:satya2006prakash@gmail.com" className="text-[#2457A7] hover:underline">
                    satya2006prakash@gmail.com
                  </a>
                </div>
              </div>
            </section>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-[#E5EAF0] flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link to="/privacy" className="text-xs text-[#2457A7] hover:underline font-medium">
                Review our Privacy Policy →
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
