/**
 * Validateur pour les fichiers IDML
 * Inspiré de SimpleIDML - valide la structure avant parsing
 */

import JSZip from 'jszip';
import {
  IdmlParseError,
  IdmlMissingFileError,
  IdmlCorruptedFileError,
  IdmlInvalidXmlError,
} from '../errors/IdmlErrors';

export interface IdmlValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class IdmlValidator {
  /**
   * Valide la structure complète d'un package IDML
   * Vérifie les fichiers essentiels et la structure XML de base
   */
  static async validatePackage(zip: JSZip): Promise<IdmlValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Vérifier fichiers essentiels
    const required = ['designmap.xml', 'Resources/Styles.xml'];
    for (const path of required) {
      if (!zip.file(path)) {
        errors.push(`Missing required file: ${path}`);
      }
    }

    // 2. Vérifier au moins 1 Story
    const stories = Object.keys(zip.files).filter(f =>
      f.startsWith('Stories/') && f.endsWith('.xml')
    );
    if (stories.length === 0) {
      warnings.push('No Story files found - document may be empty');
    }

    // 3. Vérifier au moins 1 Spread
    const spreads = Object.keys(zip.files).filter(f =>
      f.startsWith('Spreads/') && f.endsWith('.xml')
    );
    if (spreads.length === 0) {
      errors.push('No Spread files found - invalid IDML structure');
    }

    // 4. Valider designmap.xml structure
    if (zip.file('designmap.xml')) {
      try {
        const designmap = await zip.file('designmap.xml')!.async('string');
        
        // Vérifier la présence de balises essentielles
        if (!designmap.includes('<idPkg:Manifest') && !designmap.includes('<Manifest')) {
          errors.push('Invalid designmap.xml structure - missing Manifest element');
        }
        
        // Vérifier que c'est du XML valide (basique)
        if (!designmap.trim().startsWith('<?xml') && !designmap.trim().startsWith('<')) {
          errors.push('designmap.xml does not appear to be valid XML');
        }
      } catch (e) {
        errors.push(`Cannot parse designmap.xml: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 5. Vérifier Resources/Styles.xml
    if (zip.file('Resources/Styles.xml')) {
      try {
        const styles = await zip.file('Resources/Styles.xml')!.async('string');
        
        // Vérifier la structure de base
        if (!styles.includes('CharacterStyle') && !styles.includes('ParagraphStyle')) {
          warnings.push('Styles.xml found but contains no CharacterStyle or ParagraphStyle');
        }
      } catch (e) {
        errors.push(`Cannot parse Styles.xml: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 6. Vérifier la présence de polices (optionnel mais recommandé)
    if (zip.file('Resources/Fonts.xml')) {
      try {
        const fonts = await zip.file('Resources/Fonts.xml')!.async('string');
        if (!fonts.includes('FontFamily')) {
          warnings.push('Fonts.xml found but contains no FontFamily definitions');
        }
      } catch (e) {
        warnings.push(`Cannot parse Fonts.xml: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      warnings.push('No Fonts.xml found - font information may be missing');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Valide qu'un style a les attributs minimum requis
   */
  static validateStyle(style: any, styleType: string): void {
    if (!style['@_Self']) {
      throw new IdmlParseError(`${styleType} missing @_Self attribute`);
    }
    
    if (!style['@_Name']) {
      throw new IdmlParseError(`${styleType} '${style['@_Self']}' missing @_Name attribute`);
    }
  }

  /**
   * Valide qu'un TextFrame a les propriétés minimum
   */
  static validateTextFrame(frame: any, frameId: string): void {
    if (!frame) {
      throw new IdmlParseError(`TextFrame ${frameId} is null or undefined`);
    }

    // Un TextFrame doit avoir au moins un ParagraphStyleRange
    if (!frame.ParagraphStyleRange) {
      throw new IdmlParseError(
        `TextFrame ${frameId} has no ParagraphStyleRange - invalid structure`
      );
    }
  }

  /**
   * Valide la structure d'un Story XML
   */
  static validateStoryXml(storyXml: string, storyPath: string): void {
    if (!storyXml || storyXml.trim().length === 0) {
      throw new IdmlInvalidXmlError(storyPath, 'Empty or null XML content');
    }

    if (!storyXml.includes('<Story')) {
      throw new IdmlInvalidXmlError(storyPath, 'Missing <Story> root element');
    }
  }

  /**
   * Valide qu'une couleur a la structure correcte
   */
  static validateColor(color: any, colorId: string): void {
    if (!color['@_ColorValue']) {
      throw new IdmlParseError(`Color ${colorId} missing @_ColorValue attribute`);
    }

    if (!color['@_Space']) {
      throw new IdmlParseError(`Color ${colorId} missing @_Space attribute`);
    }
  }
}
