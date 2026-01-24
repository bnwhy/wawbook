import React, { useMemo } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ConditionalSegment {
  text: string;
  condition?: string;
  parsedCondition?: {
    tabId: string;
    variantId: string;
    optionId: string;
  };
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

  const totalConditions = useMemo(() => {
    const allConditions = new Set<string>();
    textsWithConditions.forEach(t => {
      t.conditionalSegments?.forEach(seg => {
        if (seg.condition) allConditions.add(seg.condition);
      });
    });
    return allConditions.size;
  }, [textsWithConditions]);

  // Fonction pour mapper les IDs de condition vers les IDs du wizard
  const mapConditionTabIdToWizardTabId = (conditionTabId: string): string => {
    if (conditionTabId.startsWith('hero-')) {
      return conditionTabId.replace(/^hero-/, '');
    }
    return conditionTabId;
  };

  // Vérifier si une condition est bien mappée
  const checkConditionMapping = (parsedCondition: ConditionalSegment['parsedCondition']) => {
    if (!parsedCondition) return { status: 'unknown', message: 'Non parsée' };

    const { tabId, variantId, optionId } = parsedCondition;
    const wizardTabId = mapConditionTabIdToWizardTabId(tabId);

    // Chercher le tab dans le wizard
    const tab = wizardTabs.find(t => t.id === wizardTabId);
    if (!tab) {
      return { 
        status: 'error', 
        message: `Tab "${wizardTabId}" introuvable (mappé depuis "${tabId}")` 
      };
    }

    // Chercher le variant
    const variant = tab.variants.find(v => v.id === variantId);
    if (!variant) {
      return { 
        status: 'error', 
        message: `Variant "${variantId}" introuvable dans tab "${tab.label}"` 
      };
    }

    // Chercher l'option
    const option = variant.options?.find(o => o.id === optionId);
    if (!option) {
      return { 
        status: 'warning', 
        message: `Option "${optionId}" introuvable dans variant "${variant.label}"` 
      };
    }

    return { 
      status: 'success', 
      message: `✓ ${tab.label} > ${variant.label} > ${option.label}`,
      details: { tab: tab.label, variant: variant.label, option: option.label }
    };
  };

  if (textsWithConditions.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-700 text-sm">
          Aucun texte conditionnel détecté dans ce livre.
        </p>
        <p className="text-blue-600 text-xs mt-2">
          Pour utiliser des textes conditionnels, ajoutez des conditions InDesign avec le format : <code className="bg-blue-100 px-1 rounded">(TXTCOND)tabId_variantId-optionId</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
        <h3 className="font-bold text-indigo-900 mb-2">📝 Textes conditionnels détectés</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-indigo-600">Textes avec conditions :</span>
            <span className="font-bold ml-2">{textsWithConditions.length}</span>
          </div>
          <div>
            <span className="text-indigo-600">Conditions uniques :</span>
            <span className="font-bold ml-2">{totalConditions}</span>
          </div>
        </div>
      </div>

      {/* Liste des textes */}
      <div className="space-y-3">
        {textsWithConditions.map((text, idx) => (
          <div key={text.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="font-mono text-xs text-gray-500">Texte #{idx + 1} ({text.id})</span>
              <span className="text-xs text-gray-400">{text.conditionalSegments?.length} segment(s)</span>
            </div>
            
            <div className="p-4 space-y-3">
              {text.conditionalSegments?.map((seg, segIdx) => {
                const mapping = checkConditionMapping(seg.parsedCondition);
                
                return (
                  <div key={segIdx} className="border-l-4 pl-3 py-2" style={{
                    borderColor: mapping.status === 'success' ? '#10b981' : mapping.status === 'error' ? '#ef4444' : '#f59e0b'
                  }}>
                    <div className="flex items-start gap-2 mb-1">
                      {mapping.status === 'success' && <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />}
                      {mapping.status === 'error' && <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />}
                      {mapping.status === 'warning' && <AlertCircle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />}
                      {mapping.status === 'unknown' && <AlertCircle size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 break-words">
                          "{seg.text.trim()}"
                        </p>
                        
                        {seg.condition && (
                          <p className="text-xs font-mono text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded inline-block">
                            {seg.condition}
                          </p>
                        )}
                        
                        <div className="mt-2 text-xs">
                          {mapping.status === 'success' && (
                            <span className="text-green-700 font-medium">{mapping.message}</span>
                          )}
                          {mapping.status === 'error' && (
                            <span className="text-red-700 font-medium">❌ {mapping.message}</span>
                          )}
                          {mapping.status === 'warning' && (
                            <span className="text-orange-700 font-medium">⚠️ {mapping.message}</span>
                          )}
                          {mapping.status === 'unknown' && (
                            <span className="text-gray-500">{mapping.message}</span>
                          )}
                        </div>

                        {seg.parsedCondition && (
                          <div className="mt-2 text-xs bg-indigo-50 px-2 py-1 rounded inline-block">
                            <span className="text-indigo-600">Mapping : </span>
                            <code className="text-indigo-900">
                              {seg.parsedCondition.tabId} 
                              {seg.parsedCondition.tabId.startsWith('hero-') && 
                                <span className="text-indigo-500"> → {mapConditionTabIdToWizardTabId(seg.parsedCondition.tabId)}</span>
                              }
                              .{seg.parsedCondition.variantId} = {seg.parsedCondition.optionId}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConditionalTextsViewer;
