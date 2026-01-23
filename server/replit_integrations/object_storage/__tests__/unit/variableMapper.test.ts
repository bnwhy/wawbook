import { describe, it, expect } from 'vitest';
import {
  parseIdmlVariable,
  idmlToWizardVariable,
  wizardToIdmlVariable,
  mapIdmlVariables,
  createWizardOptionsFromIdmlVariables,
} from '../../utils/variableMapper';

describe('variableMapper', () => {
  describe('parseIdmlVariable', () => {
    it('should parse {name_child} correctly', () => {
      const result = parseIdmlVariable('name_child');
      
      expect(result).toEqual({
        heroId: 'child',
        attributeId: 'name'
      });
    });

    it('should parse {hero_father} correctly', () => {
      const result = parseIdmlVariable('hero_father');
      
      expect(result).toEqual({
        heroId: 'father',
        attributeId: 'hero'
      });
    });

    it('should parse {skin_light} correctly', () => {
      const result = parseIdmlVariable('skin_light');
      
      // skin est un attribut, light pourrait être héros ou valeur
      // Selon la logique, light n'est pas un héros connu
      expect(result?.attributeId).toBe('skin');
    });

    it('should handle format with braces', () => {
      const result = parseIdmlVariable('{name_child}');
      
      expect(result).toEqual({
        heroId: 'child',
        attributeId: 'name'
      });
    });

    it('should return null for invalid format', () => {
      const result = parseIdmlVariable('invalid');
      
      expect(result).toBeNull();
    });
  });

  describe('idmlToWizardVariable', () => {
    it('should convert {name_child} to child_name', () => {
      const result = idmlToWizardVariable('name_child');
      
      expect(result).toBe('child_name');
    });

    it('should convert {hero_father} to father_hero', () => {
      const result = idmlToWizardVariable('hero_father');
      
      expect(result).toBe('father_hero');
    });
  });

  describe('wizardToIdmlVariable', () => {
    it('should convert child_name to {name_child}', () => {
      const result = wizardToIdmlVariable('child_name');
      
      expect(result).toBe('{name_child}');
    });

    it('should convert father_hero to {hero_father}', () => {
      const result = wizardToIdmlVariable('father_hero');
      
      expect(result).toBe('{hero_father}');
    });
  });

  describe('mapIdmlVariables', () => {
    it('should map Le château variables', () => {
      const idmlVars = ['name_child'];
      const mappings = mapIdmlVariables(idmlVars);
      
      expect(mappings).toHaveLength(1);
      expect(mappings[0]).toEqual({
        idmlVariable: 'name_child',
        wizardAttribute: 'child_name',
        heroId: 'child',
        attributeId: 'name',
        type: 'text'
      });
    });

    it('should map multiple variables', () => {
      const idmlVars = ['name_child', 'hero_father', 'skin_mother'];
      const mappings = mapIdmlVariables(idmlVars);
      
      expect(mappings).toHaveLength(3);
      expect(mappings[0].wizardAttribute).toBe('child_name');
      expect(mappings[1].wizardAttribute).toBe('father_hero');
    });
  });

  describe('createWizardOptionsFromIdmlVariables', () => {
    it('should create wizard options from Le château', () => {
      const idmlVars = ['name_child'];
      const options = createWizardOptionsFromIdmlVariables(idmlVars);
      
      expect(options.length).toBeGreaterThan(0);
      expect(options[0]).toMatchObject({
        id: 'child_name',
        type: 'text'
      });
    });
  });
});
