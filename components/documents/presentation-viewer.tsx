"use client";

import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, Presentation } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* ─── Rich slide data structures ─── */

interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;  // points
  color?: string;     // #hex
  fontFamily?: string;
}

interface TextParagraph {
  runs: TextRun[];
  align?: "left" | "center" | "right" | "justify";
  bullet?: boolean;
}

interface ShapeElement {
  type: "text" | "image";
  x: number;      // % of slide width
  y: number;      // % of slide height
  width: number;  // % of slide width
  height: number; // % of slide height
  paragraphs?: TextParagraph[];
  imageUrl?: string;
  fill?: string;
  isTitle?: boolean;
}

interface ParsedSlide {
  index: number;
  backgroundColor?: string;
  backgroundImage?: string;
  elements: ShapeElement[];
  notes: string;
}

/* ─── Constants ─── */
const WIDE_W = 12192000;   // EMU – widescreen
const WIDE_H = 6858000;
const STD_W = 9144000;     // EMU – standard 4:3
const STD_H = 6858000;

interface PresentationViewerProps {
  documentId: string;
  title: string;
}

export function PresentationViewer({ documentId, title }: PresentationViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slides, setSlides] = useState<ParsedSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const loadPresentation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/content`);
      if (!response.ok) throw new Error("Failed to load presentation");

      const arrayBuffer = await response.arrayBuffer();
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Detect slide dimensions from presentation.xml
      let slideW = WIDE_W;
      let slideH = WIDE_H;
      const presXml = await zip.file("ppt/presentation.xml")?.async("text");
      if (presXml) {
        const sldSzMatch = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
        if (sldSzMatch) {
          slideW = parseInt(sldSzMatch[1]);
          slideH = parseInt(sldSzMatch[2]);
        }
      }

      /* ─── Parse theme colors ─── */
      const themeColors = new Map<string, string>();
      const themeFile = Object.keys(zip.files).find((f) => /^ppt\/theme\/theme\d*\.xml$/.test(f));
      if (themeFile) {
        const themeXml = await zip.file(themeFile)?.async("text");
        if (themeXml) {
          parseThemeColors(themeXml, themeColors);
        }
      }

      /* ─── Parse slide layouts for inheritance ─── */
      const layoutBgs = new Map<string, string>();
      const layoutFiles = Object.keys(zip.files).filter((f) =>
        /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(f),
      );
      for (const lf of layoutFiles) {
        const xml = await zip.file(lf)?.async("text");
        if (xml) {
          const bg = extractBgColor(xml, themeColors);
          if (bg) layoutBgs.set(lf, bg);
        }
      }

      /* ─── Parse each slide ─── */
      const slideFiles = Object.keys(zip.files)
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a, b) => {
          const na = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
          const nb = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
          return na - nb;
        });

      const parsedSlides: ParsedSlide[] = [];

      for (let i = 0; i < slideFiles.length; i++) {
        const slideFile = slideFiles[i];
        const slideXml = await zip.file(slideFile)?.async("text");
        if (!slideXml) continue;

        // ── Background ──
        let bgColor = extractBgColor(slideXml, themeColors);

        // Fallback: check slide layout relationship
        if (!bgColor) {
          const slideNum = slideFile.match(/slide(\d+)/)?.[1];
          const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
          const relsXml = await zip.file(relsFile)?.async("text");
          if (relsXml) {
            const layoutRef = relsXml.match(
              /Target="([^"]*slideLayout[^"]*)"/,
            );
            if (layoutRef) {
              let layoutPath = layoutRef[1];
              if (layoutPath.startsWith("../"))
                layoutPath = "ppt/" + layoutPath.slice(3);
              bgColor = layoutBgs.get(layoutPath) ?? undefined;
            }
          }
        }

        // ── Build relationship map for images ──
        const slideNum = slideFile.match(/slide(\d+)/)?.[1];
        const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
        const relsXml = await zip.file(relsFile)?.async("text");
        const relMap = new Map<string, string>();    // rId → data:… URL
        const relPathMap = new Map<string, string>(); // rId → ppt/... path

        if (relsXml) {
          const relMatches = [
            ...relsXml.matchAll(
              /Id="(rId\d+)"[^>]*Target="([^"]*)"/g,
            ),
          ];
          for (const m of relMatches) {
            let target = m[2];
            if (target.startsWith("../")) target = "ppt/" + target.slice(3);
            relPathMap.set(m[1], target);
          }

          // Pre-load images
          for (const [rId, path] of relPathMap.entries()) {
            if (/\.(png|jpe?g|gif|bmp|svg|tiff?|emf|wmf)$/i.test(path)) {
              const file = zip.file(path);
              if (file) {
                const ext = path.split(".").pop()!.toLowerCase();
                const mime =
                  ext === "jpg" || ext === "jpeg"
                    ? "image/jpeg"
                    : ext === "gif"
                      ? "image/gif"
                      : ext === "svg"
                        ? "image/svg+xml"
                        : ext === "bmp"
                          ? "image/bmp"
                          : "image/png";
                const b64 = await file.async("base64");
                relMap.set(rId, `data:${mime};base64,${b64}`);
              }
            }
          }
        }

        // Background image
        let backgroundImage: string | undefined;
        const bgImgMatch = slideXml.match(
          /<p:bg>[\s\S]*?<a:blipFill[\s\S]*?r:embed="(rId\d+)"/,
        );
        if (bgImgMatch) {
          backgroundImage = relMap.get(bgImgMatch[1]);
        }

        // ── Parse shapes ──
        const elements: ShapeElement[] = [];

        // Match each shape (<p:sp>) or picture (<p:pic>)
        const shapeBlocks = [
          ...slideXml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g),
        ];
        const picBlocks = [
          ...slideXml.matchAll(/<p:pic\b[\s\S]*?<\/p:pic>/g),
        ];

        for (const [shapeXml] of shapeBlocks) {
          const pos = parsePosition(shapeXml, slideW, slideH);
          const fill = extractShapeFill(shapeXml, themeColors);
          const isTitle =
            /<p:ph[^>]*type="(title|ctrTitle)"/i.test(shapeXml);
          const isSubtitle = /<p:ph[^>]*type="subTitle"/i.test(shapeXml);

          // Extract paragraphs with rich formatting
          const paragraphs = parseParagraphs(shapeXml, themeColors, isTitle);

          if (paragraphs.length > 0) {
            elements.push({
              type: "text",
              ...pos,
              paragraphs,
              fill,
              isTitle: isTitle || isSubtitle,
            });
          }
        }

        for (const [picXml] of picBlocks) {
          const pos = parsePosition(picXml, slideW, slideH);
          // Find embedded image reference
          const embedMatch = picXml.match(/r:embed="(rId\d+)"/);
          if (embedMatch) {
            const url = relMap.get(embedMatch[1]);
            if (url) {
              elements.push({
                type: "image",
                ...pos,
                imageUrl: url,
              });
            }
          }
        }

        // ── Notes ──
        let notes = "";
        const notesFile = `ppt/notesSlides/notesSlide${slideNum}.xml`;
        const notesXml = await zip.file(notesFile)?.async("text");
        if (notesXml) {
          notes = extractPlainTexts(notesXml).join(" ");
        }

        parsedSlides.push({
          index: i,
          backgroundColor: bgColor || "#FFFFFF",
          backgroundImage,
          elements,
          notes,
        });
      }

      setSlides(parsedSlides);
      setCurrentSlide(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load presentation",
      );
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadPresentation();
  }, [loadPresentation]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        e.key === " "
      ) {
        e.preventDefault();
        setCurrentSlide((p) => Math.min(p + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentSlide((p) => Math.max(p - 1, 0));
      } else if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length, fullscreen]);

  const slide = slides[currentSlide];

  return (
    <div
      className={`flex h-full flex-col overflow-hidden ${fullscreen ? "fixed inset-0 z-50 bg-black" : ""}`}
    >
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2">
        <Presentation className="size-4 text-orange-400" />
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {title}
        </span>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          View Only
        </span>
        <div className="ml-auto flex items-center gap-2">
          {slides.length > 0 && (
            <span className="text-xs text-[var(--color-text-tertiary)]">
              Slide {currentSlide + 1} of {slides.length}
            </span>
          )}
          <button
            type="button"
            onClick={() => setFullscreen(!fullscreen)}
            className="inline-flex size-7 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            {fullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-[var(--color-text-tertiary)]" />
          <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
            Loading presentation...
          </span>
        </div>
      )}

      {error && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        </div>
      )}

      {!loading && !error && slides.length > 0 && (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Slide thumbnails sidebar */}
          <div className="w-48 shrink-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentSlide(i)}
                className={`mb-2 w-full border-2 transition-colors ${
                  i === currentSlide
                    ? "border-[var(--color-accent-primary)] bg-[var(--color-bg-tertiary)]"
                    : "border-transparent hover:border-[var(--color-border)]"
                }`}
              >
                {/* Mini slide preview */}
                <div className="relative aspect-[16/9] overflow-hidden" style={{ backgroundColor: s.backgroundColor }}>
                  {s.backgroundImage && (
                    <img src={s.backgroundImage} alt="" className="absolute inset-0 size-full object-cover" />
                  )}
                  {s.elements.slice(0, 4).map((el, j) => (
                    <div
                      key={j}
                      className="absolute overflow-hidden"
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        width: `${el.width}%`,
                        height: `${el.height}%`,
                      }}
                    >
                      {el.type === "text" && el.paragraphs?.[0]?.runs?.[0] && (
                        <p
                          className="truncate leading-tight"
                          style={{
                            fontSize: "5px",
                            color: el.paragraphs[0].runs[0].color || "#333",
                            fontWeight: el.isTitle ? "bold" : "normal",
                          }}
                        >
                          {el.paragraphs
                            .flatMap((p) => p.runs.map((r) => r.text))
                            .join(" ")
                            .slice(0, 60)}
                        </p>
                      )}
                      {el.type === "image" && el.imageUrl && (
                        <img src={el.imageUrl} alt="" className="size-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-0.5 text-center text-[10px] text-[var(--color-text-tertiary)]">
                  {i + 1}
                </p>
              </button>
            ))}
          </div>

          {/* Main slide view */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--color-bg-primary)] p-4">
              <div
                className="relative w-full max-w-5xl overflow-hidden shadow-2xl"
                style={{
                  backgroundColor: slide?.backgroundColor || "#FFF",
                  aspectRatio: "16 / 9",
                  maxHeight: "100%",
                }}>
                {slide?.backgroundImage && (
                  <img
                    src={slide.backgroundImage}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
                {slide?.elements.map((el, i) => (
                  <div
                    key={i}
                    className="absolute overflow-hidden"
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.width}%`,
                      height: `${el.height}%`,
                      backgroundColor:
                        el.fill && el.type === "text" ? el.fill : undefined,
                      borderRadius: el.fill ? "4px" : undefined,
                    }}
                  >
                    {el.type === "text" && el.paragraphs && (
                      <div className="flex size-full flex-col justify-center px-[2%]">
                        {el.paragraphs.map((para, pi) => (
                          <p
                            key={pi}
                            className="leading-snug"
                            style={{ textAlign: para.align || "left" }}
                          >
                            {para.bullet && (
                              <span className="mr-1">•</span>
                            )}
                            {para.runs.map((run, ri) => (
                              <span
                                key={ri}
                                style={{
                                  fontSize: run.fontSize
                                    ? `${Math.max(
                                        run.fontSize * 0.65,
                                        8,
                                      )}px`
                                    : el.isTitle
                                      ? "24px"
                                      : "13px",
                                  color: run.color || "#333333",
                                  fontWeight: run.bold ? "bold" : "normal",
                                  fontStyle: run.italic
                                    ? "italic"
                                    : "normal",
                                  textDecoration: run.underline
                                    ? "underline"
                                    : "none",
                                  fontFamily:
                                    run.fontFamily || "Calibri, sans-serif",
                                }}
                              >
                                {run.text}
                              </span>
                            ))}
                          </p>
                        ))}
                      </div>
                    )}
                    {el.type === "image" && el.imageUrl && (
                      <img
                        src={el.imageUrl}
                        alt={`Slide ${(slide?.index ?? 0) + 1} image`}
                        className="size-full object-contain"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex shrink-0 items-center justify-center gap-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2">
              <button
                type="button"
                disabled={currentSlide <= 0}
                onClick={() => setCurrentSlide((p) => p - 1)}
                className="inline-flex size-8 items-center justify-center text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] disabled:opacity-30"
              >
                <ChevronLeft className="size-5" />
              </button>
              <span className="min-w-[100px] text-center text-sm text-[var(--color-text-secondary)]">
                Slide {currentSlide + 1} / {slides.length}
              </span>
              <button
                type="button"
                disabled={currentSlide >= slides.length - 1}
                onClick={() => setCurrentSlide((p) => p + 1)}
                className="inline-flex size-8 items-center justify-center text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] disabled:opacity-30"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>

            {/* Notes */}
            {slide?.notes && (
              <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  Speaker Notes
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {slide.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && slides.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            No slides found in this presentation
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
 *  OOXML Parsing Helpers
 * ═══════════════════════════════════════════════════ */

/** Parse theme color definitions (a:dk1, a:lt1, accent1, etc.) */
function parseThemeColors(themeXml: string, map: Map<string, string>) {
  const mappings: Record<string, string> = {
    dk1: "dk1", dk2: "dk2", lt1: "lt1", lt2: "lt2",
    accent1: "accent1", accent2: "accent2", accent3: "accent3",
    accent4: "accent4", accent5: "accent5", accent6: "accent6",
    hlink: "hlink", folHlink: "folHlink",
  };
  for (const [tag, name] of Object.entries(mappings)) {
    const m = themeXml.match(
      new RegExp(`<a:${tag}>\\s*(?:<a:sysClr[^>]*lastClr="([A-Fa-f0-9]{6})"[^/]*/>|<a:srgbClr val="([A-Fa-f0-9]{6})")`),
    );
    if (m) {
      map.set(name, "#" + (m[1] || m[2]));
    }
  }
}

/** Resolve a color reference to #hex */
function resolveColor(
  node: string,
  themeColors: Map<string, string>,
): string | undefined {
  // Direct srgbClr
  const srgb = node.match(/<a:srgbClr\s+val="([A-Fa-f0-9]{3,8})"/);
  if (srgb) return "#" + srgb[1].slice(0, 6);

  // Theme reference (schemeClr)
  const scheme = node.match(/<a:schemeClr\s+val="(\w+)"/);
  if (scheme) return themeColors.get(scheme[1]);

  return undefined;
}

/** Extract background color from a slide or layout XML */
function extractBgColor(
  xml: string,
  themeColors: Map<string, string>,
): string | undefined {
  // <p:bg> → <p:bgPr> → <a:solidFill>
  const bgMatch = xml.match(
    /<p:bg>[\s\S]*?<p:bgPr>[\s\S]*?<a:solidFill>([\s\S]*?)<\/a:solidFill>/,
  );
  if (bgMatch) return resolveColor(bgMatch[1], themeColors);

  // <p:bg> → <p:bgRef> with idx > 0 and color
  const bgRef = xml.match(/<p:bgRef[^>]*>([\s\S]*?)<\/p:bgRef>/);
  if (bgRef) return resolveColor(bgRef[1], themeColors);

  return undefined;
}

/** Extract shape fill color */
function extractShapeFill(
  shape: string,
  themeColors: Map<string, string>,
): string | undefined {
  // <p:spPr> → <a:solidFill>
  const spPr = shape.match(/<p:spPr[^>]*>([\s\S]*?)<\/p:spPr>/);
  if (!spPr) return undefined;
  const fillMatch = spPr[1].match(
    /<a:solidFill>([\s\S]*?)<\/a:solidFill>/,
  );
  if (fillMatch) return resolveColor(fillMatch[1], themeColors);
  return undefined;
}

/** Parse position and size from EMU to % of slide */
function parsePosition(
  xml: string,
  slideW: number,
  slideH: number,
): { x: number; y: number; width: number; height: number } {
  const off = xml.match(/<a:off\s+x="(\d+)"\s+y="(\d+)"/);
  const ext = xml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);

  if (off && ext) {
    return {
      x: (parseInt(off[1]) / slideW) * 100,
      y: (parseInt(off[2]) / slideH) * 100,
      width: (parseInt(ext[1]) / slideW) * 100,
      height: (parseInt(ext[2]) / slideH) * 100,
    };
  }
  // Fallback: centered text area
  return { x: 5, y: 10, width: 90, height: 80 };
}

/** Parse paragraphs with rich text runs from a shape */
function parseParagraphs(
  shapeXml: string,
  themeColors: Map<string, string>,
  isTitle: boolean,
): TextParagraph[] {
  const txBody = shapeXml.match(/<p:txBody>([\s\S]*?)<\/p:txBody>/);
  if (!txBody) return [];

  // Get default run properties for the shape
  const defRPrMatch = txBody[1].match(/<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/);
  const defaultFontSize = defRPrMatch
    ? parseFontSizeAttr(defRPrMatch[1])
    : isTitle ? 36 : 18;
  const defaultColor = defRPrMatch
    ? resolveColor(defRPrMatch[0], themeColors)
    : undefined;

  const paragraphs: TextParagraph[] = [];
  const paraBlocks = txBody[1].split(/<\/a:p>/);

  for (const paraBlock of paraBlocks) {
    if (!paraBlock.includes("<a:r>") && !paraBlock.includes("<a:r ")) continue;

    // Paragraph alignment
    const pPrMatch = paraBlock.match(/<a:pPr[^>]*algn="(\w+)"/);
    const align = pPrMatch
      ? (({ l: "left", ctr: "center", r: "right", just: "justify" } as Record<string, string>)[pPrMatch[1]] as TextParagraph["align"])
      : undefined;

    // Detect bullet
    const hasBullet = /<a:buChar/.test(paraBlock) || /<a:buAutoNum/.test(paraBlock);

    // Parse runs
    const runs: TextRun[] = [];
    const runBlocks = [
      ...paraBlock.matchAll(
        /<a:r>([\s\S]*?)<\/a:r>/g,
      ),
    ];

    for (const [_, runContent] of runBlocks) {
      const textMatch = runContent.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/);
      if (!textMatch) continue;

      const text = textMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      if (!text) continue;

      // Run properties
      const rPr = runContent.match(/<a:rPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:rPr>)/);
      let bold = isTitle;
      let italic = false;
      let underline = false;
      let fontSize = defaultFontSize;
      let color = defaultColor;
      let fontFamily: string | undefined;

      if (rPr) {
        const attrs = rPr[1];
        if (/\bb="1"/.test(attrs)) bold = true;
        if (/\bb="0"/.test(attrs)) bold = false;
        if (/\bi="1"/.test(attrs)) italic = true;
        if (/\bu="sng"/.test(attrs)) underline = true;
        const sz = parseFontSizeAttr(attrs);
        if (sz) fontSize = sz;
        const fullRPr = rPr[0];
        const clr = resolveColor(fullRPr, themeColors);
        if (clr) color = clr;

        // Font face
        const latin = fullRPr.match(/<a:latin\s+typeface="([^"]+)"/);
        if (latin) fontFamily = latin[1];
      }

      runs.push({ text, bold, italic, underline, fontSize, color, fontFamily });
    }

    if (runs.length > 0) {
      paragraphs.push({ runs, align, bullet: hasBullet });
    }
  }

  return paragraphs;
}

function parseFontSizeAttr(attrs: string): number | undefined {
  const m = attrs.match(/\bsz="(\d+)"/);
  return m ? parseInt(m[1]) / 100 : undefined;
}

/** Simple plain-text extraction (for notes) */
function extractPlainTexts(xml: string): string[] {
  const texts: string[] = [];
  const paragraphs = xml.split(/<\/a:p>/);
  for (const para of paragraphs) {
    const parts: string[] = [];
    const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let m;
    while ((m = re.exec(para)) !== null) {
      const d = m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      if (d) parts.push(d);
    }
    const combined = parts.join("");
    if (combined.trim()) texts.push(combined.trim());
  }
  return texts;
}
