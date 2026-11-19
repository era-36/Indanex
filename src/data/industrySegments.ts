import type { IndustrySegment } from '../types/industrial';

export interface SegmentDefinition {
  id: IndustrySegment;
  name: string;
  shortName: string;
  selaquiContext: string;
  investigativeProblems: string[];
  aiOpportunities: string[];
  defaultQcParameters: string[];
  defaultComplianceFrameworks: string[];
  defaultDepartments: { name: string; code: string }[];
}

export const INDUSTRY_SEGMENTS: Record<IndustrySegment, SegmentDefinition> = {
  pharma: {
    id: 'pharma',
    name: 'Pharmaceuticals & Healthcare',
    shortName: 'Pharma & Healthcare',
    selaquiContext: 'Pharma City & formulation units in Selaqui Industrial Area',
    investigativeProblems: [
      'Raw-material & API procurement lead times',
      'API and excipient supplier selection variability',
      'Quality-control laboratory testing bottlenecks',
      'Material quarantine and QA release approval delays',
      'Batch documentation and GMP audit readiness',
    ],
    aiOpportunities: [
      'Estimate raw-material QC non-conformance risk from historical lots',
      'Estimate material release and approval turnaround times',
      'Identify supplier-level CoA and assay failure patterns',
      'Highlight upstream API procurement delay risks early',
    ],
    defaultQcParameters: [
      'Assay % (HPLC / Titration)',
      'Moisture Content (Karl Fischer)',
      'Dissolution Profile',
      'Microbial Limit Test',
      'Impurity & Heavy Metals',
    ],
    defaultComplianceFrameworks: [
      'WHO-GMP Schedule M',
      'ISO 9001:2015 QMS',
      'CDSCO / State FDA Stability',
      '21 CFR Part 11 Audit Trail',
    ],
    defaultDepartments: [
      { name: 'Granulation & Compression', code: 'PRD-GRN' },
      { name: 'Quality Control Lab', code: 'QC-LAB' },
      { name: 'Quality Assurance & Release', code: 'QA-REL' },
      { name: 'Raw Material Stores', code: 'INV-RMS' },
    ],
  },
  chemicals: {
    id: 'chemicals',
    name: 'Chemicals & Specialty Chemicals',
    shortName: 'Chemicals',
    selaquiContext: 'Specialty chemical, resin, and solvent blending facilities',
    investigativeProblems: [
      'Hazardous chemical inventory balance accuracy',
      'Raw-material purchasing & solvent price volatility',
      'Batch-production sequencing & reactor changeover',
      'Excess slow-moving inventory carrying cost',
      'Critical reagent shortages halting synthesis',
      'Chemical storage, MSDS, and safety controls',
    ],
    aiOpportunities: [
      'Inventory optimization against min/max safety bands',
      'Stock shortage runway forecasting',
      'Batch-production scheduling and changeover alignment',
      'Inventory carrying cost and dead-stock analysis',
    ],
    defaultQcParameters: [
      'Purity & Specific Gravity',
      'pH & Acid Value',
      'Viscosity (cP)',
      'Flash Point Verification',
      'Color & Clarity Index',
    ],
    defaultComplianceFrameworks: [
      'MSIHC Rules & MSDS Registry',
      'ISO 14001 Environmental',
      'UKPCB Consent & Effluent Log',
      'OSHA Chemical Storage Audit',
    ],
    defaultDepartments: [
      { name: 'Reactor & Synthesis', code: 'PRD-RXN' },
      { name: 'Analytical Testing', code: 'QC-ANL' },
      { name: 'Hazmat Storage & Tank Farm', code: 'INV-HAZ' },
      { name: 'EHS & Regulatory', code: 'EHS-SAF' },
    ],
  },
  food: {
    id: 'food',
    name: 'Food Processing & Nutraceuticals',
    shortName: 'Food & Nutraceuticals',
    selaquiContext: 'Nutraceutical, herbal extract, and packaged food plants',
    investigativeProblems: [
      'Incoming agricultural & botanical ingredient acceptance',
      'Batch-quality inspection & moisture drift',
      'Raw ingredient potency and consistency variance',
      'Batch rejection due to contamination or sensory drift',
      'Rework volume and packaging line delays',
    ],
    aiOpportunities: [
      'Estimate batch rejection risk before packaging',
      'Identify seasonal ingredient quality patterns',
      'Analyze recurring organoleptic and lab failures',
      'Monitor batch yield and rework trends',
    ],
    defaultQcParameters: [
      'Moisture & Water Activity (aw)',
      'Microbiological & Total Plate Count',
      'Active Botanical Marker %',
      'Brix / Acidity / pH',
      'Packaging Seal Integrity',
    ],
    defaultComplianceFrameworks: [
      'FSSAI Schedule 4 Hygiene',
      'HACCP Critical Control Points',
      'ISO 22000 Food Safety',
      'AYUSH / Nutraceutical Standards',
    ],
    defaultDepartments: [
      { name: 'Blending & Formulation', code: 'PRD-BLD' },
      { name: 'Packaging & Filling', code: 'PRD-PKG' },
      { name: 'Microbiology & QC', code: 'QC-MIC' },
      { name: 'Cold & Dry Stores', code: 'INV-STR' },
    ],
  },
  electronics: {
    id: 'electronics',
    name: 'Electrical, Electronics & Consumer Mfg',
    shortName: 'Electronics & Electrical',
    selaquiContext: 'PCB assembly, switchgear, lighting, and consumer appliances',
    investigativeProblems: [
      'Multi-tier electronic component procurement',
      'Incoming component AQL inspection',
      'Vendor shipment delays & customs hold-ups',
      'Component defects causing line stops',
      'Assembly line interruptions & WIP starvation',
    ],
    aiOpportunities: [
      'Highlight component defect risk by vendor lot',
      'Supplier delivery and defect performance analytics',
      'Upstream procurement delay risk alerting',
      'Line defect Pareto and root-cause analysis',
    ],
    defaultQcParameters: [
      'Solderability & Visual AOI',
      'Insulation Resistance / Hi-Pot',
      'Dimensional Tolerance (mm)',
      'Thermal Burn-In Test',
      'ESD Protection Verification',
    ],
    defaultComplianceFrameworks: [
      'BIS Mandatory Registration',
      'RoHS Hazardous Substance Check',
      'ISO 9001:2015 Assembly QMS',
      'ESD S20.20 Facility Control',
    ],
    defaultDepartments: [
      { name: 'SMT & PCB Assembly', code: 'PRD-SMT' },
      { name: 'Final Product Assembly', code: 'PRD-ASM' },
      { name: 'IQC & Electrical Testing', code: 'QC-IQC' },
      { name: 'Component Kitting Store', code: 'INV-KIT' },
    ],
  },
  engineering: {
    id: 'engineering',
    name: 'Engineering, Machinery & Industrial Equipment',
    shortName: 'Engineering & Machinery',
    selaquiContext: 'CNC machining, fabrication, auto components, and industrial machinery',
    investigativeProblems: [
      'Multi-operation production scheduling',
      'CNC & press machine capacity bottlenecks',
      'Alloy & bar-stock material availability',
      'In-process dimensional component inspection',
      'Machining rework and scrap',
      'Customer order delivery delays',
    ],
    aiOpportunities: [
      'Production schedule bottleneck identification',
      'Customer order delivery-time forecasting',
      'Machine utilization and downtime pattern analysis',
      'Shop-floor scheduling improvement recommendations',
    ],
    defaultQcParameters: [
      'CMM Dimensional Tolerance',
      'Surface Roughness (Ra)',
      'Rockwell / Brinell Hardness',
      'Weld Non-Destructive Check',
      'Runout & Concentricity',
    ],
    defaultComplianceFrameworks: [
      'ISO 9001:2015 Manufacturing',
      'IATF 16949 Automotive Quality',
      'ISO 45001 Shop-Floor Safety',
      'Calibration & Gauge R&R Log',
    ],
    defaultDepartments: [
      { name: 'CNC Machining Bay', code: 'PRD-CNC' },
      { name: 'Fabrication & Welding', code: 'PRD-FAB' },
      { name: 'Metrology & Inspection', code: 'QC-MET' },
      { name: 'Steel & Tooling Store', code: 'INV-STL' },
    ],
  },
};

export const SEGMENT_LIST: SegmentDefinition[] = Object.values(INDUSTRY_SEGMENTS);
