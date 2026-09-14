export const ANOMALY_META = {
  normal: {
    key: 'normal',
    label: '정상',
    shortLabel: '정상',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    calendarClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    panelClass: 'border-emerald-100 bg-emerald-50/70 text-emerald-800',
  },
  warning: {
    key: 'warning',
    label: '주의',
    shortLabel: '주의',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
    calendarClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    panelClass: 'border-amber-100 bg-amber-50/70 text-amber-800',
  },
  danger: {
    key: 'danger',
    label: '위험',
    shortLabel: '위험',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
    calendarClass: 'bg-red-50 text-red-700 hover:bg-red-100',
    panelClass: 'border-red-100 bg-red-50/70 text-red-800',
  },
  unknown: {
    key: 'unknown',
    label: '분석 없음',
    shortLabel: '미분석',
    badgeClass: 'bg-slate-50 text-slate-500 border-slate-200',
    dotClass: 'bg-slate-300',
    calendarClass: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    panelClass: 'border-slate-100 bg-slate-50 text-slate-600',
  },
};

export function getAnomalyKey(anomaly) {
  const riskLevel = Number(anomaly?.riskLevel);

  if (riskLevel >= 3) return 'danger';
  if (riskLevel === 2) return 'warning';
  if (riskLevel === 1) return 'normal';
  return 'unknown';
}

export function getAnomalyMeta(anomaly) {
  return ANOMALY_META[getAnomalyKey(anomaly)];
}

export function getLatestAnomaly(anomalies = []) {
  return [...anomalies]
    .filter(Boolean)
    .sort((a, b) => String(b.analysisDate || '').localeCompare(String(a.analysisDate || '')))[0] || null;
}

export function buildAnomalyByDate(anomalies = []) {
  return new Map(
    anomalies
      .filter(anomaly => anomaly?.analysisDate)
      .map(anomaly => [anomaly.analysisDate, anomaly]),
  );
}

export function getAnomalyCausesText(anomaly) {
  const causes = anomaly?.topCauses || [];
  if (!causes.length) return '주요 원인 정보가 없습니다.';

  return causes
    .slice(0, 3)
    .map((cause) => {
      const feature = cause.feature || cause.name || '지표';
      const direction = cause.direction ? ` ${cause.direction}` : '';
      const score = cause.impact_score ?? cause.impactScore;

      return `${feature}${direction}${score !== undefined ? ` (${Number(score).toFixed(2)})` : ''}`;
    })
    .join(', ');
}

export function getAnomalySummaryText(anomaly) {
  if (!anomaly) return '아직 이상치 탐지 결과가 없습니다.';

  const meta = getAnomalyMeta(anomaly);
  const dateText = anomaly.analysisDate ? `${anomaly.analysisDate} 기준` : '최근 분석 기준';
  const scoreText = anomaly.anomalyScore !== undefined && anomaly.anomalyScore !== null
    ? `, 점수 ${Number(anomaly.anomalyScore).toFixed(3)}`
    : '';

  return `${dateText} ${meta.label} 상태입니다${scoreText}. ${anomaly.statusMessage || ''}`.trim();
}
