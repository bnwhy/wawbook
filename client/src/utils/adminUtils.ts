import { WizardTab } from '../types/admin';

export const slugify = (text: string) => {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};

export const generateAvatarCombinations = (tab: WizardTab) => {
    // We only care about variants that are of type 'options' (not text inputs)
    const optionVariants = tab.variants.filter(v => v.type === 'options' || !v.type);
    
    if (optionVariants.length === 0) return [];

    // Recursive function to generate all combinations
    const generate = (index: number, currentCombo: any[]): any[] => {
        if (index === optionVariants.length) {
            return [{
                parts: currentCombo,
                key: currentCombo.map(p => p.id).sort().join('_')
            }];
        }

        const variant = optionVariants[index];
        const combinations: any[] = [];

        // If variant has no options, we still need to proceed (maybe with empty/null?)
        // But assuming options exist
        if (!variant.options || variant.options.length === 0) {
             // Skip this variant if no options? Or treat as empty?
             // For now, let's skip
             return generate(index + 1, currentCombo);
        }

        variant.options.forEach(opt => {
            const part = { 
                variantId: variant.id, 
                variantLabel: variant.label,
                id: opt.id, 
                label: opt.label 
            };
            combinations.push(...generate(index + 1, [...currentCombo, part]));
        });

        return combinations;
    };

    return generate(0, []);
};
