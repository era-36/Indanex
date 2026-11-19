import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  Layers,
  Package,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { SEGMENT_LIST } from '../data/industrySegments';
import { submitDemoEnquiry } from '../services/firestoreService';
import type { IndustrySegment } from '../types/industrial';
import { isValidEmail } from '../utils/validation';
import { Navbar } from './Navbar';

interface LandingPageProps {
  onOpenAuthModal: (initialTab?: 'signin' | 'register') => void;
  onEnterSandbox: () => void;
}

export function LandingPage({ onOpenAuthModal, onEnterSandbox }: LandingPageProps) {
  const [selectedSegment, setSelectedSegment] = useState<IndustrySegment>('pharma');
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [pharmaImgFailed, setPharmaImgFailed] = useState(false);
  const [floorImgFailed, setFloorImgFailed] = useState(false);

  // Enquiry / Registration form state
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formSegment, setFormSegment] = useState<IndustrySegment>('pharma');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const activeSegmentDef =
    SEGMENT_LIST.find((s) => s.id === selectedSegment) || SEGMENT_LIST[0];

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (contactName.trim().length < 2) {
      setFormError('Please enter your full name.');
      return;
    }
    if (companyName.trim().length < 2) {
      setFormError('Please enter your company or plant name.');
      return;
    }
    if (!isValidEmail(email)) {
      setFormError('Please enter a valid business email address.');
      return;
    }

    setSubmitting(true);
    try {
      const apiRes = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: contactName.trim(),
          companyName: companyName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          segment: formSegment,
          message: message.trim(),
        }),
      });
      if (!apiRes.ok) {
        const errBody = (await apiRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error || 'Unable to validate enquiry submission.');
      }

      const enquiryId = await submitDemoEnquiry({
        contactName,
        companyName,
        email,
        phone,
        segment: formSegment,
        message,
      });

      setSubmittedId(enquiryId);
      setContactName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to submit enquiry right now.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="top" className="min-h-screen bg-white text-slate-900">
      <Navbar onOpenWorkspace={() => onOpenAuthModal('signin')} />

      {/* HERO SECTION */}
      <section className="bg-[#0B192C] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-wider uppercase text-sky-300 mb-4">
                Selaqui Industrial Area · Dehradun, Uttarakhand
              </p>
              <h1
                className="font-display font-bold tracking-tight text-white leading-[1.1] mb-6"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                Operational Intelligence for Selaqui Manufacturing Plants
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mb-8">
                Monitor production orders, raw-material quality inspections, inventory
                runways, supplier reliability, and compliance readiness in one isolated
                multi-tenant platform powered by grounded server-side AI analysis.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onEnterSandbox}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explore Platform
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('register')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white border border-slate-600 hover:border-slate-400 hover:bg-slate-800/60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Register Your Company
                </button>
                <a
                  href="#contact"
                  className="inline-flex items-center px-3 py-3 text-sm font-medium text-sky-300 hover:text-white underline underline-offset-4 whitespace-nowrap shrink-0"
                >
                  Request a Demo
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[300px] lg:min-h-[420px] rounded-lg overflow-hidden border border-slate-700 bg-slate-900 relative">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_selaqui_facility_1795079960316.jpg"
                    alt="Modern manufacturing and pharmaceutical industrial campus in Selaqui, Dehradun with Himalayan foothills"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-[#0B192C] text-center">
                    <Factory className="w-12 h-12 text-sky-400 mb-3" />
                    <p className="text-sm font-medium text-slate-200">
                      Selaqui Industrial Corridor Operations Platform
                    </p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B192C]/90 via-[#0B192C]/50 to-transparent p-5">
                  <p className="text-xs text-slate-200">
                    Pharma City · Specialty Chemicals · Nutraceuticals · Electronics · Precision Engineering
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grounded Platform Scope Strip below hero split */}
          <div className="mt-14 pt-8 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <p className="font-mono text-2xl font-semibold text-white tabular-nums">5</p>
              <p className="text-sm font-medium text-slate-200 mt-1">Industrial Segments</p>
              <p className="text-xs text-slate-400 mt-1">
                Configurable parameters per plant requirement
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-white tabular-nums">8</p>
              <p className="text-sm font-medium text-slate-200 mt-1">Operational & AI Modules</p>
              <p className="text-xs text-slate-400 mt-1">
                Quality, Inventory, Production, Suppliers, EHS
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-white tabular-nums">4</p>
              <p className="text-sm font-medium text-slate-200 mt-1">Enforced Access Roles</p>
              <p className="text-xs text-slate-400 mt-1">
                Super Admin, Company Admin, Manager, Operator
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-emerald-400 tabular-nums">
                Zero-Trust
              </p>
              <p className="text-sm font-medium text-slate-200 mt-1">Tenant Data Isolation</p>
              <p className="text-xs text-slate-400 mt-1">
                Backend Firestore rules & human-gated releases
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OVERVIEW SECTION */}
      <section id="overview" className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mb-4">
              Built to Diagnose Recurring Factory Bottlenecks Without Guesswork
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Industrial units across Selaqui face recurring friction across incoming
              raw-material quality, inventory imbalances, supplier lead-time slippage,
              and machine downtime. Rather than assuming every factory suffers the same
              issues, each company validates its actual operational requirements and tracks
              metrics derived strictly from verified plant records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="font-mono text-xs font-semibold text-blue-700 mb-3">01. Data Integrity</p>
              <h3 className="font-display text-lg font-semibold text-slate-950 mb-2">
                No Fabricated Metrics
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Every KPI, supplier reliability percentage, and rejection rate is calculated
                from real company records. Empty or low-sample modules explicitly prompt
                for additional records instead of displaying synthetic numbers.
              </p>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="font-mono text-xs font-semibold text-blue-700 mb-3">02. Human Governance</p>
              <h3 className="font-display text-lg font-semibold text-slate-950 mb-2">
                Human-Approved Releases
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                AI analysis flags defect patterns and scheduling risks, but never
                auto-releases batches or alters live production schedules. Only authorized
                managers and admins hold formal release authority.
              </p>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="font-mono text-xs font-semibold text-blue-700 mb-3">03. Tenant Isolation</p>
              <h3 className="font-display text-lg font-semibold text-slate-950 mb-2">
                Backend Security Rules
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Company records are partitioned under tenant-scoped Firestore paths with
                server-verified role permissions, immutable audit trails, and verified
                server-side Gemini AI calls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FIVE INDUSTRY SEGMENTS SECTION */}
      <section id="industries" className="py-16 lg:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mb-3">
                Five Selaqui Industrial Segments Supported
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Select a sector below to inspect the potential operational problem areas
                identified for investigation and the corresponding AI decision-support
                workflows.
              </p>
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Note: Listed problem areas are investigative starting points; each company
              configures and validates its own plant profile upon onboarding.
            </p>
          </div>

          {/* Interactive Segment Selector Tabs */}
          <div
            role="tablist"
            aria-label="Selaqui Industry Segments"
            className="flex flex-wrap gap-2 mb-8"
          >
            {SEGMENT_LIST.map((seg) => {
              const active = seg.id === selectedSegment;
              return (
                <button
                  key={seg.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedSegment(seg.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#0B192C] text-white border-[#0B192C]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-950'
                  }`}
                >
                  {seg.shortName}
                </button>
              );
            })}
          </div>

          {/* Active Segment Detail Panel */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 mb-2">
                  {activeSegmentDef.selaquiContext}
                </p>
                <h3 className="font-display text-2xl font-bold text-slate-950 mb-6">
                  {activeSegmentDef.name}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                      Operational Problems to Investigate
                    </h4>
                    <ul className="space-y-2.5 text-sm text-slate-700">
                      {activeSegmentDef.investigativeProblems.map((prob) => (
                        <li key={prob} className="flex items-start gap-2.5">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>{prob}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                      AI & Analytical Opportunities
                    </h4>
                    <ul className="space-y-2.5 text-sm text-slate-700">
                      {activeSegmentDef.aiOpportunities.map((opp) => (
                        <li key={opp} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  Configurable QC checks: {activeSegmentDef.defaultQcParameters.slice(0, 3).join(' · ')}
                </div>
                <button
                  type="button"
                  onClick={onEnterSandbox}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  Preview in Command Centre
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-900 min-h-[260px]">
              {selectedSegment === 'pharma' ||
              selectedSegment === 'chemicals' ||
              selectedSegment === 'food' ? (
                !pharmaImgFailed ? (
                  <img
                    src="/src/assets/images/segment_pharma_lab_1795079960075.jpg"
                    alt="Analytical quality control laboratory testing raw materials and formulations"
                    referrerPolicy="no-referrer"
                    onError={() => setPharmaImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8 text-slate-300 text-sm">
                    QC Analytical Laboratory View
                  </div>
                )
              ) : !floorImgFailed ? (
                <img
                  src="/src/assets/images/segment_automation_floor_1795079960024.jpg"
                  alt="Precision CNC and electronics assembly manufacturing bay"
                  referrerPolicy="no-referrer"
                  onError={() => setFloorImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8 text-slate-300 text-sm">
                  Precision Manufacturing Floor View
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES & PLATFORM MODULES */}
      <section id="capabilities" className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mb-3">
              Unified Operational Modules & AI Decision Support
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Every module shares a single company ledger so quality rejections, material
              shortages, machine downtime, and supplier delays connect automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: 'Industrial Command Centre',
                desc: 'Real-time KPIs across production orders, delays, pending QC, rejection rates, and machine utilization with date and department filters.',
              },
              {
                icon: ClipboardCheck,
                title: 'Quality Intelligence',
                desc: 'Raw-material, in-process, and batch inspections with defect categorization, corrective actions, and role-gated human batch release.',
              },
              {
                icon: Package,
                title: 'Inventory Intelligence',
                desc: 'Raw materials and finished goods tracking, min/max thresholds, consumption runway days, reorder suggestions, and valuation.',
              },
              {
                icon: Factory,
                title: 'Production Intelligence',
                desc: 'Production orders, batch targets vs actuals, rework logging, machine allocation, downtime tracking, and human-approved schedules.',
              },
              {
                icon: Truck,
                title: 'Supplier Intelligence',
                desc: 'Vendor registry, PO delivery tracking, and empirical on-time delivery and QC acceptance rates calculated from actual receipts.',
              },
              {
                icon: ShieldCheck,
                title: 'Compliance, Safety & AI Centre',
                desc: 'Configurable audit checklists, safety incidents, expiry alerts, immutable audit logs, and server-side Gemini operational analysis.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-6 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <Icon className="w-5 h-5 text-blue-700 mb-4" />
                  <h3 className="font-display text-base font-semibold text-slate-950 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mb-3">
              How Plant Onboarding Works
            </h2>
            <p className="text-base text-slate-600">
              Structured rollout designed for Selaqui plant teams without disrupting ongoing shifts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Register & Verify Company',
                body: 'Create your tenant workspace, select your industrial segment, and receive Super Admin verification.',
              },
              {
                step: '02',
                title: 'Validate Plant Profile',
                body: 'Configure departments, QC inspection parameters, safety checklists, and user roles.',
              },
              {
                step: '03',
                title: 'Log Operational Records',
                body: 'Operators and managers record inspections, stock movements, production batches, and POs.',
              },
              {
                step: '04',
                title: 'Review AI & Export Reports',
                body: 'Run statistical & Gemini root-cause diagnostics once sufficient records exist and export CSVs.',
              },
            ].map((s) => (
              <div key={s.step} className="p-6 bg-white border border-slate-200 rounded-lg">
                <p className="font-mono text-sm font-semibold text-blue-700 mb-3">{s.step}</p>
                <h3 className="font-display text-base font-semibold text-slate-950 mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT, DEMO & REGISTRATION SECTION */}
      <section id="contact" className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mb-4">
                Request a Plant Walkthrough or Register Your Facility
              </h2>
              <p className="text-base text-slate-600 leading-relaxed mb-6">
                Connect with our industrial engineering team serving the Selaqui, Pharma City,
                and Dehradun manufacturing corridor, or create your company workspace directly.
              </p>

              <div className="space-y-4 pt-4 border-t border-slate-200 text-sm text-slate-700">
                <div>
                  <p className="font-semibold text-slate-950">Primary Coverage Zone</p>
                  <p className="text-slate-600">
                    SIIDCUL Industrial Area, Central Hope Town & Pharma City, Selaqui, Dehradun 248011
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-950">Self-Service Workspace Setup</p>
                  <p className="text-slate-600 mb-3">
                    Ready to configure your plant departments and roles immediately?
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('register')}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#0B192C] hover:bg-blue-800 rounded-md transition-colors cursor-pointer"
                    >
                      Register Company Account
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('signin')}
                      className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 sm:p-8">
                <h3 className="font-display text-lg font-semibold text-slate-950 mb-1">
                  Demo & Onboarding Enquiry
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Submit your plant details to schedule a tailored demonstration.
                </p>

                {submittedId ? (
                  <div className="p-6 bg-white border border-emerald-200 rounded-md">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Demo Enquiry Recorded</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      Thank you. Your enquiry reference{' '}
                      <span className="font-mono text-slate-900">{submittedId}</span> has been
                      logged for our Selaqui onboarding team.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmittedId(null)}
                      className="text-sm font-medium text-blue-700 hover:underline cursor-pointer"
                    >
                      Submit another enquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEnquirySubmit} className="space-y-4">
                    {formError && (
                      <div
                        role="alert"
                        className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md"
                      >
                        {formError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="enq-name"
                          className="block text-xs font-medium text-slate-700 mb-1.5"
                        >
                          Full Name *
                        </label>
                        <input
                          id="enq-name"
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g. Arvind Rawat"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="enq-company"
                          className="block text-xs font-medium text-slate-700 mb-1.5"
                        >
                          Company / Plant Name *
                        </label>
                        <input
                          id="enq-company"
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Doon Formulations Pvt. Ltd."
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="enq-email"
                          className="block text-xs font-medium text-slate-700 mb-1.5"
                        >
                          Business Email *
                        </label>
                        <input
                          id="enq-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="operations@company.in"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="enq-phone"
                          className="block text-xs font-medium text-slate-700 mb-1.5"
                        >
                          Phone Number
                        </label>
                        <input
                          id="enq-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98..."
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="enq-segment"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        Industry Segment *
                      </label>
                      <select
                        id="enq-segment"
                        value={formSegment}
                        onChange={(e) => setFormSegment(e.target.value as IndustrySegment)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                      >
                        {SEGMENT_LIST.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="enq-message"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        Primary Operational Challenges
                      </label>
                      <textarea
                        id="enq-message"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe current priorities (e.g. raw-material QC delays, inventory shortages, machine downtime)"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
                    >
                      {submitting ? 'Submitting Enquiry...' : 'Request Demo'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUIET INDUSTRIAL FOOTER */}
      <footer className="bg-[#0B192C] text-slate-400 border-t border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-display text-base font-semibold text-white">
              Selaqui Industrial Intelligence
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Industrial Operations Intelligence & AI Decision Support · Selaqui, Dehradun, Uttarakhand
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <a href="#overview" className="hover:text-white transition-colors">
              Overview
            </a>
            <a href="#industries" className="hover:text-white transition-colors">
              Industries
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors">
              Capabilities
            </a>
            <button
              type="button"
              onClick={onEnterSandbox}
              className="text-sky-300 hover:text-white transition-colors cursor-pointer"
            >
              Interactive Workspace
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
