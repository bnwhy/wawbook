import { NATIVE_LINUX_FONTS } from "./cssHelpers";

export type FontPreflightStatus = "ok" | "warning" | "error";

export type FontPreflightIssueReason =
  | "missing_family"
  | "missing_variant"
  | "non_local_src"
  | "no_font_defined";

export interface FontPreflightRequirement {
  fontFamily: string; // normalized (lowercase, primary family)
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  count: number;
}

export interface FontPreflightIssue {
  fontFamily: string; // normalized
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  reason: FontPreflightIssueReason;
  message: string;
}

interface FontFace {
  fontFamily: string; // normalized
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  srcType: "data" | "assets" | "other";
  src?: string;
}

export interface FontPreflightReport {
  status: FontPreflightStatus;
  required: FontPreflightRequirement[];
  issues: FontPreflightIssue[];
  summary: {
    requiredVariants: number;
    missingVariants: number;
    usedFamilies: number;
  };
}

export function computeFontPreflightFromTexts(params: {
  cssContent: string;
  texts: Array<{ id?: string; style?: any }>;
}): FontPreflightReport {
  const { cssContent, texts } = params;

  const requiredMap = new Map<string, FontPreflightRequirement>();
  let textsWithoutFont = 0;
  
  for (const t of texts || []) {
    const style = t?.style || {};
    const familyRaw = String(style.fontFamily || "").trim();
    const family = normalizeFontFamily(familyRaw);
    
    // Detect texts with no font defined
    if (!family) {
      textsWithoutFont++;
      continue;
    }

    const weight = normalizeFontWeight(style.fontWeight);
    const fontStyle = normalizeFontStyle(style.fontStyle);
    const key = `${family}|${weight}|${fontStyle}`;
    const existing = requiredMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      requiredMap.set(key, { fontFamily: family, fontWeight: weight, fontStyle, count: 1 });
    }
  }

  const required = Array.from(requiredMap.values()).sort((a, b) => {
    if (a.fontFamily !== b.fontFamily) return a.fontFamily.localeCompare(b.fontFamily);
    if (a.fontWeight !== b.fontWeight) return a.fontWeight.localeCompare(b.fontWeight);
    return a.fontStyle.localeCompare(b.fontStyle);
  });

  const fontFaces = extractFontFaces(cssContent || "");
  const facesByKey = new Map<string, FontFace>();
  const familiesWithAnyFace = new Set<string>();
  const familiesWithLocalFace = new Set<string>();

  for (const face of fontFaces) {
    familiesWithAnyFace.add(face.fontFamily);
    if (face.srcType === "data" || face.srcType === "assets") {
      familiesWithLocalFace.add(face.fontFamily);
      const key = `${face.fontFamily}|${face.fontWeight}|${face.fontStyle}`;
      if (!facesByKey.has(key)) {
        facesByKey.set(key, face);
      }
    }
  }

  const issues: FontPreflightIssue[] = [];

  // Add issue for texts without any font defined
  if (textsWithoutFont > 0) {
    issues.push({
      fontFamily: "(non définie)",
      fontWeight: "normal",
      fontStyle: "normal",
      reason: "no_font_defined",
      message: `${textsWithoutFont} texte(s) sans police définie dans l'IDML. Vérifiez que tous les textes ont un CharacterStyle avec une police.`,
    });
  }

  for (const req of required) {
    if (NATIVE_LINUX_FONTS.has(req.fontFamily)) continue;

    const key = `${req.fontFamily}|${req.fontWeight}|${req.fontStyle}`;
    if (facesByKey.has(key)) continue;

    const hasAny = familiesWithAnyFace.has(req.fontFamily);
    const hasLocal = familiesWithLocalFace.has(req.fontFamily);

    if (hasAny && !hasLocal) {
      issues.push({
        fontFamily: req.fontFamily,
        fontWeight: req.fontWeight,
        fontStyle: req.fontStyle,
        reason: "non_local_src",
        message: `La police "${req.fontFamily}" est déclarée dans le CSS mais ses sources ne sont pas locales (data:/assets). Le preview ne sera pas 100% local.`,
      });
      continue;
    }

    if (hasLocal) {
      issues.push({
        fontFamily: req.fontFamily,
        fontWeight: req.fontWeight,
        fontStyle: req.fontStyle,
        reason: "missing_variant",
        message: `Variante manquante pour "${req.fontFamily}" (${req.fontWeight}/${req.fontStyle}). Le navigateur peut synthétiser (faux gras/italique) → rendu potentiellement différent d'InDesign.`,
      });
      continue;
    }

    issues.push({
      fontFamily: req.fontFamily,
      fontWeight: req.fontWeight,
      fontStyle: req.fontStyle,
      reason: "missing_family",
      message: `Police manquante "${req.fontFamily}". Aucune @font-face locale trouvée (data:/assets) → rendu différent.`,
    });
  }

  const status: FontPreflightStatus =
    issues.some(i => 
      i.reason === "missing_family" || 
      i.reason === "missing_variant" || 
      i.reason === "non_local_src" ||
      i.reason === "no_font_defined"
    )
      ? "error"
      : "ok";

  return {
    status,
    required,
    issues,
    summary: {
      requiredVariants: required.length,
      missingVariants: issues.length,
      usedFamilies: new Set(required.map(r => r.fontFamily)).size,
    },
  };
}

function normalizeFontFamily(fontFamilyRaw: string): string {
  if (!fontFamilyRaw) return "";
  // Keep only the primary family (before fallbacks) and strip quotes
  const primary = fontFamilyRaw.split(",")[0]?.trim() || "";
  return primary.replace(/["']/g, "").trim().toLowerCase();
}

function normalizeFontWeight(fontWeightRaw: any): "normal" | "bold" {
  const s = String(fontWeightRaw ?? "normal").trim().toLowerCase();
  if (!s) return "normal";
  if (s === "bold" || s === "bolder") return "bold";
  const n = Number(s);
  if (!Number.isNaN(n)) return n >= 600 ? "bold" : "normal";
  return s.includes("bold") || s.includes("black") ? "bold" : "normal";
}

function normalizeFontStyle(fontStyleRaw: any): "normal" | "italic" {
  const s = String(fontStyleRaw ?? "normal").trim().toLowerCase();
  if (!s) return "normal";
  return s.includes("italic") || s.includes("oblique") ? "italic" : "normal";
}

function extractFontFaces(css: string): FontFace[] {
  const faces: FontFace[] = [];
  const blocks = css.match(/@font-face\s*\{[\s\S]*?\}/gi) || [];

  for (const block of blocks) {
    const familyMatch = block.match(/font-family\s*:\s*([^;]+);/i);
    const family = normalizeFontFamily(familyMatch ? familyMatch[1] : "");
    if (!family) continue;

    const weightMatch = block.match(/font-weight\s*:\s*([^;]+);/i);
    const styleMatch = block.match(/font-style\s*:\s*([^;]+);/i);

    const srcUrlMatch = block.match(/url\(["']?([^"')]+)["']?\)/i);
    const src = srcUrlMatch ? srcUrlMatch[1] : undefined;

    let srcType: FontFace["srcType"] = "other";
    if (src) {
      if (src.startsWith("data:")) srcType = "data";
      else if (src.startsWith("/assets/")) srcType = "assets";
    }

    faces.push({
      fontFamily: family,
      fontWeight: normalizeFontWeight(weightMatch ? weightMatch[1] : "normal"),
      fontStyle: normalizeFontStyle(styleMatch ? styleMatch[1] : "normal"),
      srcType,
      src,
    });
  }

  return faces;
}

