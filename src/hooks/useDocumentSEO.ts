import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface PageMetadata {
  title: string
  description: string
  robots?: string
}

const SITE_URL = 'https://mediconnect-sp.vercel.app'
const DEFAULT_TITLE = 'MediConnect – Smart Medicine Reordering & Healthcare Platform'
const DEFAULT_DESCRIPTION =
  'MediConnect is a smart medicine reordering platform. Track prescription medication, calculate remaining days, receive automatic refill alerts, and order refills directly from verified local pharmacies.'
const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
const NOINDEX_ROBOTS = 'noindex, nofollow'

const ROUTE_SEO: Record<string, PageMetadata> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    robots: DEFAULT_ROBOTS,
  },
  '/login': {
    title: 'Sign In | MediConnect',
    description: 'Sign in to your MediConnect account to manage prescriptions, refill orders, and healthcare services.',
    robots: DEFAULT_ROBOTS,
  },
  '/register/patient': {
    title: 'Patient Registration | MediConnect',
    description: 'Register as a patient on MediConnect to track medicine supplies, receive refill alerts, and order refills seamlessly.',
    robots: DEFAULT_ROBOTS,
  },
  '/register/pharmacy': {
    title: 'Pharmacy Partner Registration | MediConnect',
    description: 'Partner with MediConnect to receive prescription refill requests, streamline medicine fulfillment, and grow your pharmacy network.',
    robots: DEFAULT_ROBOTS,
  },
  '/terms': {
    title: 'Terms of Service | MediConnect',
    description: 'Read the terms of service, acceptable use guidelines, and platform policies for MediConnect users and pharmacies.',
    robots: DEFAULT_ROBOTS,
  },
  '/privacy': {
    title: 'Privacy Policy | MediConnect',
    description: 'Understand how MediConnect collects, uses, and protects your personal health information and medicine records.',
    robots: DEFAULT_ROBOTS,
  },
  '/forgot-password': {
    title: 'Forgot Password | MediConnect',
    description: 'Request a password recovery link to restore access to your MediConnect account securely.',
    robots: NOINDEX_ROBOTS,
  },
  '/reset-password': {
    title: 'Reset Password | MediConnect',
    description: 'Securely create a new password for your MediConnect account.',
    robots: NOINDEX_ROBOTS,
  },
}

function setOrCreateMeta(selector: string, attrName: string, attrVal: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attrName, attrVal)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function setOrCreateCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

export function useDocumentSEO() {
  const location = useLocation()

  useEffect(() => {
    const pathname = location.pathname

    // Determine metadata based on route
    let meta = ROUTE_SEO[pathname]

    if (!meta) {
      if (pathname.startsWith('/app')) {
        meta = {
          title: 'Patient Portal | MediConnect',
          description: 'Manage your medicine schedule, prescription supplies, and pharmacy refills.',
          robots: NOINDEX_ROBOTS,
        }
      } else if (pathname.startsWith('/pharmacy')) {
        meta = {
          title: 'Pharmacy Portal | MediConnect',
          description: 'Review patient refill requests, manage inventory, and generate pharmacy invoices.',
          robots: NOINDEX_ROBOTS,
        }
      } else if (pathname.startsWith('/admin')) {
        meta = {
          title: 'Admin Portal | MediConnect',
          description: 'Platform management and administrative controls for MediConnect.',
          robots: NOINDEX_ROBOTS,
        }
      } else {
        meta = {
          title: DEFAULT_TITLE,
          description: DEFAULT_DESCRIPTION,
          robots: DEFAULT_ROBOTS,
        }
      }
    }

    // Update document title
    document.title = meta.title

    // Update meta tags
    setOrCreateMeta('meta[name="description"]', 'name', 'description', meta.description)
    setOrCreateMeta('meta[name="title"]', 'name', 'title', meta.title)
    setOrCreateMeta('meta[name="robots"]', 'name', 'robots', meta.robots || DEFAULT_ROBOTS)

    // Update Open Graph tags
    const canonicalUrl = `${SITE_URL}${pathname === '/' ? '/' : pathname}`
    setOrCreateCanonical(canonicalUrl)
    setOrCreateMeta('meta[property="og:title"]', 'property', 'og:title', meta.title)
    setOrCreateMeta('meta[property="og:description"]', 'property', 'og:description', meta.description)
    setOrCreateMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl)
    setOrCreateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title)
    setOrCreateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description)
  }, [location.pathname])
}
