import { Link } from 'react-router-dom'
import { Pill, ShieldCheck, Bell, ArrowRight, Clock, Store, FileText } from 'lucide-react'

const features = [
  {
    icon: Pill,
    title: 'Medicine Tracking',
    description: 'Monitor your complete medicine inventory and daily consumption in one place.',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Get notified before you run out — configurable thresholds and automatic alerts.',
  },
  {
    icon: Store,
    title: 'Pharmacy Network',
    description: 'Discover verified, registered pharmacies nearby and send refill requests instantly.',
  },
  {
    icon: FileText,
    title: 'Digital Bills',
    description: 'Review pharmacy-generated bills, approve or reject — all without leaving the app.',
  },
  {
    icon: Clock,
    title: 'Order History',
    description: 'Complete timeline of every order: from request to doorstep delivery.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Pharmacies Only',
    description: 'Every pharmacy on MediConnect is reviewed and approved by our administrators.',
  },
]

export function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border dark:border-[#30363D] bg-white dark:bg-[#161B22]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-100 dark:border-primary-800/60 text-primary-700 dark:text-primary-300 text-xs font-medium mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Trusted healthcare platform
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-900 dark:text-[#F0F6FC] tracking-tight leading-tight mb-5">
            Never run out of your<br />
            <span className="text-primary-600 dark:text-primary-400">essential medicines</span> again
          </h1>

          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed">
            MediConnect tracks your medicine stock, calculates days remaining, sends timely reminders,
            and connects you with verified pharmacies for effortless refills.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-sm sm:max-w-none mx-auto">
            <Link
              to="/register/patient"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition-colors shadow-xs"
            >
              Start managing medicines
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register/pharmacy"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-[#21262D] text-slate-700 dark:text-slate-200 text-sm font-medium rounded border border-border dark:border-[#30363D] hover:bg-slate-50 dark:hover:bg-[#30363D] transition-colors"
            >
              Register your pharmacy
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-[#F0F6FC] tracking-tight">
            Everything you need for medicine management
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            A complete platform for patients and pharmacies, built for reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-lg p-5 shadow-xs transition-colors">
              <div className="w-9 h-9 bg-primary-50 dark:bg-primary-950/60 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-4.5 h-4.5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F0F6FC] mb-1">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t border-border dark:border-[#30363D] bg-primary-600 dark:bg-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-14 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mb-3">
            Take control of your health today
          </h2>
          <p className="text-xs sm:text-sm text-primary-200 mb-7 max-w-md mx-auto">
            Join thousands of patients who never miss a refill.
          </p>
          <Link
            to="/register/patient"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-primary-700 dark:text-primary-800 text-sm font-medium rounded hover:bg-primary-50 transition-colors shadow-xs"
          >
            Create free account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
