import React, { useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, Info, Loader2 } from 'lucide-react';
import { auth } from '../../firebase';
import type {
  AiRecommendation,
  GeminiAnalysisResult,
  OperationalDataset,
  PredictionBaseline,
  PredictionDomain,
} from '../../types/industrial';
import { computeAllPredictionBaselines } from '../../utils/analyticsEngine';
import { generateRecordId } from '../../utils/validation';

interface AiPredictionCentreViewProps {
  dataset: OperationalDataset;
  isSandbox: boolean;
  currentUid: string;
  onSaveAiRecommendation: (rec: AiRecommendation) => Promise<void>;
}

export function AiPredictionCentreView({
  dataset,
  isSandbox,
  currentUid,
  onSaveAiRecommendation,
}: AiPredictionCentreViewProps) {
  const baselines = useMemo(() => computeAllPredictionBaselines(dataset), [dataset]);
  const [selectedDomain, setSelectedDomain] = useState<PredictionDomain>('qc_failure');
  const [loadingDomain, setLoadingDomain] = useState<PredictionDomain | null>(null);
  const [analysisMap, setAnalysisMap] = useState<Partial<Record<PredictionDomain, GeminiAnalysisResult>>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeBaseline =
    baselines.find((b) => b.domain === selectedDomain) || baselines[0];
  const activeAnalysis = analysisMap[selectedDomain];

  const getContextRecords = (domain: PredictionDomain): unknown[] => {
    switch (domain) {
      case 'qc_failure':
      case 'batch_rejection':
      case 'component_defect':
        return dataset.qualityInspections.map((q) => ({
          code: q.inspectionCode,
          type: q.inspectionType,
          subject: q.subjectName,
          result: q.result,
          releaseStatus: q.releaseStatus,
          defectCategory: q.defectCategory,
          date: q.inspectedDate,
        }));
      case 'inventory_shortage':
        return dataset.inventory.map((i) => ({
          sku: i.sku,
          name: i.name,
          currentStock: i.currentStock,
          minStock: i.minStock,
          maxStock: i.maxStock,
          unit: i.unit,
          dailyConsumptionAvg: i.dailyConsumptionAvg,
        }));
      case 'supplier_delivery':
        return dataset.purchaseOrders.map((p) => ({
          poNumber: p.poNumber,
          material: p.materialName,
          expectedDate: p.expectedDate,
          deliveredDate: p.deliveredDate,
          status: p.status,
          totalCostInr: p.totalCostInr,
        }));
      case 'production_delay':
      case 'delivery_forecast':
        return dataset.productionOrders.map((o) => ({
          orderCode: o.orderCode,
          product: o.productName,
          targetQty: o.targetQty,
          actualQty: o.actualQty,
          reworkQty: o.reworkQty,
          dueDate: o.dueDate,
          status: o.status,
        }));
      case 'machine_utilization':
        return dataset.machines.map((m) => ({
          code: m.code,
          name: m.name,
          status: m.status,
          utilizationPct: m.utilizationPct,
          downtimeHoursMonth: m.downtimeHoursMonth,
        }));
    }
  };

  const handleRunGeminiAnalysis = async (baseline: PredictionBaseline) => {
    setErrorMsg(null);
    setLoadingDomain(baseline.domain);
    try {
      let idToken: string | null = null;
      if (!isSandbox && auth.currentUser) {
        idToken = await auth.currentUser.getIdToken();
      }

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          domain: baseline.domain,
          sandboxMode: isSandbox,
          companyName: dataset.company.name,
          segment: dataset.company.segment,
          baseline,
          contextRecords: getContextRecords(baseline.domain),
        }),
      });

      const data = (await response.json()) as GeminiAnalysisResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || `Server returned status ${response.status}`);
      }

      setAnalysisMap((prev) => ({ ...prev, [baseline.domain]: data }));

      if (data.status === 'analyzed') {
        await onSaveAiRecommendation({
          id: generateRecordId('ai'),
          companyId: dataset.company.id,
          domain: baseline.domain,
          summary: data.headline,
          recommendedAction: data.recommendedActions.join(' | '),
          dataPeriod: data.dataPeriod,
          sampleSize: data.sampleSize,
          createdByUid: currentUid,
        });
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to execute AI operational analysis.'
      );
    } finally {
      setLoadingDomain(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Architecture & Epistemic Integrity Notice */}
      <div className="bg-[#0B192C] text-white rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 text-sky-300 text-xs font-semibold uppercase tracking-wider">
            <BrainCircuit className="w-4 h-4" />
            <span>Statistical Baseline + Server-Side Gemini Reasoning</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            Quantitative signals below are computed deterministically from your company’s logged
            records. Gemini provides root-cause interpretation and action recommendations—never
            fabricated accuracy percentages, never automatic QC releases, and never unapproved
            schedule changes.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-300 shrink-0">
          Minimum sample threshold: 3 records / domain
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">AI Analysis Request Failed</p>
            <p className="text-xs mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* 8 Prediction Domain Cards Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {baselines.map((b) => {
          const selected = b.domain === selectedDomain;
          return (
            <button
              key={b.domain}
              type="button"
              onClick={() => setSelectedDomain(b.domain)}
              className={`text-left p-4 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between ${
                selected
                  ? 'bg-white border-blue-700 ring-1 ring-blue-700'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[11px] font-semibold uppercase ${
                      b.riskLevel === 'high'
                        ? 'text-red-700'
                        : b.riskLevel === 'moderate'
                        ? 'text-amber-700'
                        : b.riskLevel === 'low'
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {b.riskLevel === 'insufficient_data'
                      ? 'Needs More Data'
                      : `${b.riskLevel} signal`}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    n={b.sampleSize}
                  </span>
                </div>
                <h3 className="font-display text-sm font-semibold text-slate-950 mb-1">
                  {b.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 mt-1">{b.headlineSummary}</p>
            </button>
          );
        })}
      </div>

      {/* Selected Domain Detailed Workbench */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <p className="text-xs font-mono text-slate-500">
              Data Period: {activeBaseline.dataPeriod} · Sample Size: {activeBaseline.sampleSize} records
            </p>
            <h2 className="font-display text-xl font-bold text-slate-950 mt-1">
              {activeBaseline.title}
            </h2>
            <p className="text-sm text-slate-700 mt-2">{activeBaseline.headlineSummary}</p>
          </div>

          <button
            type="button"
            disabled={loadingDomain === activeBaseline.domain}
            onClick={() => handleRunGeminiAnalysis(activeBaseline)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            {loadingDomain === activeBaseline.domain ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Records...
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4" />
                Run Gemini Deep Analysis
              </>
            )}
          </button>
        </div>

        {/* Supporting Historical Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {activeBaseline.supportingMetrics.map((m) => (
            <div key={m.label} className="p-4 bg-slate-50 border border-slate-200 rounded-md">
              <p className="text-xs text-slate-500">{m.label}</p>
              <p className="font-mono text-lg font-semibold text-slate-950 tabular-nums mt-1">
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Deterministic Factors & Action */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Contributing Factors (Observed Data)
            </h3>
            <ul className="space-y-2 text-sm text-slate-700">
              {activeBaseline.contributingFactors.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-700 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Baseline Recommended Action
            </h3>
            <p className="text-sm text-slate-800 leading-relaxed mb-3">
              {activeBaseline.recommendedAction}
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>{activeBaseline.uncertaintyNote}</span>
            </div>
          </div>
        </div>

        {/* Server-Side Gemini Output */}
        {activeAnalysis && (
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-slate-950">
                Gemini Server-Side Diagnostic Report
              </h3>
              <span className="font-mono text-xs text-slate-500">
                Generated {new Date(activeAnalysis.generatedAt).toLocaleString()}
              </span>
            </div>

            <p className="text-sm font-medium text-slate-900 bg-blue-50/70 border border-blue-200 rounded-md p-4">
              {activeAnalysis.headline}
            </p>

            {activeAnalysis.status === 'analyzed' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Root-Cause Hypotheses
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {activeAnalysis.rootCauseHypotheses.map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Recommended Human Actions
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {activeAnalysis.recommendedActions.map((a) => (
                      <li key={a} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 space-y-1.5">
              <p>
                <span className="font-semibold text-slate-800">Uncertainty & Sample Scope:</span>{' '}
                {activeAnalysis.dataLimitationsAndUncertainty}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Governance Rule:</span>{' '}
                {activeAnalysis.humanApprovalNotice}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
