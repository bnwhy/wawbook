import React, { useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ConditionalSegment {
  text: string;
  condition?: string;
  parsedCondition?: {
    tabId: string;
    variantId: string;
    optionId: string;
  };
  variables?: string[];
}

interface TextElement {
  id: string;
  content: string;
  conditionalSegments?: ConditionalSegment[];
  availableConditions?: string[];
}

interface WizardTab {
  id: string;
  label: string;
  variants: Array<{
    id: string;
    label: string;
    options?: Array<{ id: string; label: string }>;
  }>;
}

interface ConditionalTextsViewerProps {
  texts: TextElement[];
  wizardTabs: WizardTab[];
}

const ConditionalTextsViewer: React.FC<ConditionalTextsViewerProps> = ({ texts, wizardTabs }) => {
  const textsWithConditions = useMemo(() => {
    return texts.filter(t => t.conditionalSegments && t.conditionalSegments.length > 0);
  }, [texts]);

  // Mapper les IDs de condition vers les IDs du wizard
  const mapConditionTabIdToWizardTabId = (conditionTabId: string): string => {
    if (conditionTabId.startsWith('hero-')) {
      return conditionTabId.replace(/^hero-/, '');
    }
    return conditionTabId;
  };

  // Analyser toutes les conditions et variables
  const conditionsSummary = useMemo(() => {
    const allConditions: Array<{
      rawCondition: string;
      parsed: { tabId: string; variantId: string; optionId: string } | null;
      wizardTabId: string;
      status: 'ok' | 'error' | 'warning';
      message: string;
      variables?: string[];
    }> = [];

    const seenConditions = new Set<string>();

    textsWithConditions.forEach(text => {
      text.conditionalSegments?.forEach(seg => {
        if (seg.condition && !seenConditions.has(seg.condition)) {
          seenConditions.add(seg.condition);

          const parsed = seg.parsedCondition;
          if (!parsed) {
          allConditions.push({
            rawCondition: seg.condition,
            parsed: null,
            wizardTabId: '',
            status: 'error',
            message: 'Condition non parsée - format invalide',
            variables: seg.variables
          });
          return;
        }

        const wizardTabId = mapConditionTabIdToWizardTabId(parsed.tabId);
        const tab = wizardTabs.find(t => t.id === wizardTabId);
        
        if (!tab) {
          allConditions.push({
            rawCondition: seg.condition,
            parsed,
            wizardTabId,
            status: 'error',
            message: `Tab "${wizardTabId}" introuvable (mappé depuis "${parsed.tabId}")`,
            variables: seg.variables
          });
          return;
        }

        const variant = tab.variants.find(v => v.id === parsed.variantId);
        if (!variant) {
          allConditions.push({
            rawCondition: seg.condition,
            parsed,
            wizardTabId,
            status: 'error',
            message: `Variant "${parsed.variantId}" introuvable dans tab "${tab.label}"`,
            variables: seg.variables
          });
          return;
        }

        const option = variant.options?.find(o => o.id === parsed.optionId);
        if (!option) {
          allConditions.push({
            rawCondition: seg.condition,
            parsed,
            wizardTabId,
            status: 'warning',
            message: `Option "${parsed.optionId}" introuvable`,
            variables: seg.variables
          });
          return;
        }

        allConditions.push({
          rawCondition: seg.condition,
          parsed,
          wizardTabId,
          status: 'ok',
          message: `${tab.label} › ${variant.label} › ${option.label}`,
          variables: seg.variables
        });
        }
      });
    });

    return allConditions;
  }, [textsWithConditions, wizardTabs]);

  if (textsWithConditions.length === 0) {
    return null;
  }

  const okCount = conditionsSummary.filter(c => c.status === 'ok').length;
  const errorCount = conditionsSummary.filter(c => c.status === 'error').length;
  const warningCount = conditionsSummary.filter(c => c.status === 'warning').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <span className="text-purple-600">📝</span>
          Textes conditionnels détectés
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <CheckCircle size={14} /> {okCount} OK
          </span>
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <XCircle size={14} /> {errorCount} Erreurs
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-orange-600 font-medium">
              <AlertTriangle size={14} /> {warningCount} Warnings
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {conditionsSummary.map((cond, idx) => (
          <div 
            key={idx} 
            className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
              cond.status === 'ok' 
                ? 'bg-green-50 border-green-200' 
                : cond.status === 'error'
                ? 'bg-red-50 border-red-200'
                : 'bg-orange-50 border-orange-200'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {cond.status === 'ok' && <CheckCircle size={16} className="text-green-600" />}
              {cond.status === 'error' && <XCircle size={16} className="text-red-600" />}
              {cond.status === 'warning' && <AlertTriangle size={16} className="text-orange-600" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs text-slate-600 mb-1 break-all">
                {cond.rawCondition}
              </div>
              
              {cond.parsed && cond.parsed.tabId !== cond.wizardTabId && (
                <div className="text-xs text-purple-600 mb-1">
                  Mapping : <code className="bg-purple-100 px-1 rounded">{cond.parsed.tabId} → {cond.wizardTabId}</code>
                </div>
              )}
              
              <div className={`text-xs font-medium ${
                cond.status === 'ok' ? 'text-green-700' : 
                cond.status === 'error' ? 'text-red-700' : 
                'text-orange-700'
              }`}>
                {cond.message}
              </div>

              {cond.variables && cond.variables.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="text-slate-500">Variables : </span>
                  {cond.variables.map((v, i) => (
                    <code key={i} className="bg-blue-100 text-blue-700 px-1 rounded ml-1">
                      {'{' + v + '}'}
                    </code>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConditionalTextsViewer;
