"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Image as ImageIcon,
  Italic,
  Loader2,
  Minus,
  Plus,
  Presentation,
  Save,
  Trash2,
  Type,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface SlideContent {
  id: string;
  title: string;
  bodyItems: BodyItem[];
  backgroundColor: string;
  titleColor: string;
  bodyColor: string;
  titleAlign: "left" | "center" | "right";
  titleBold: boolean;
  titleItalic: boolean;
  titleUnderline: boolean;
  titleFontSize: number;
}

interface BodyItem {
  id: string;
  type: "text" | "image";
  content: string; // text content or image data URL
  align?: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
}

interface PresentationEditorProps {
  documentId: string;
  title: string;
  readOnly?: boolean;
  onSaved?: () => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function createEmptySlide(): SlideContent {
  return {
    id: generateId(),
    title: "",
    bodyItems: [{ id: generateId(), type: "text", content: "", fontSize: 18 }],
    backgroundColor: "#FFFFFF",
    titleColor: "#1a1a2e",
    bodyColor: "#333333",
    titleAlign: "left",
    titleBold: true,
    titleItalic: false,
    titleUnderline: false,
    titleFontSize: 32,
  };
}

const BG_COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Dark", value: "#1a1a2e" },
  { label: "Navy", value: "#16213e" },
  { label: "Blue", value: "#0066ff" },
  { label: "Green", value: "#1b5e20" },
  { label: "Red", value: "#b71c1c" },
  { label: "Orange", value: "#e65100" },
  { label: "Purple", value: "#4a148c" },
  { label: "Gray", value: "#424242" },
  { label: "Teal", value: "#004d40" },
];

export function PresentationEditor({ documentId, title, readOnly, onSaved }: PresentationEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slides, setSlides] = useState<SlideContent[]>([createEmptySlide()]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedBodyItem, setSelectedBodyItem] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const currentSlide = slides[currentSlideIndex];

  const loadPresentation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/content`);
      if (!response.ok) throw new Error("Failed to load presentation");

      const arrayBuffer = await response.arrayBuffer();
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Detect slide dimensions
      let slideW = 12192000;
      let slideH = 6858000;
      const presXml = await zip.file("ppt/presentation.xml")?.async("text");
      if (presXml) {
        const szMatch = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
        if (szMatch) { slideW = parseInt(szMatch[1]); slideH = parseInt(szMatch[2]); }
      }

      // Parse theme colors
      const themeColors = new Map<string, string>();
      const themeFile = Object.keys(zip.files).find((f) => /^ppt\/theme\/theme\d*\.xml$/.test(f));
      if (themeFile) {
        const themeXml = await zip.file(themeFile)?.async("text");
        if (themeXml) parseThemeColors(themeXml, themeColors);
      }

      const parsedSlides: SlideContent[] = [];

      const slideFiles = Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
          const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
          return numA - numB;
        });

      for (const slideFile of slideFiles) {
        const slideXml = await zip.file(slideFile)?.async("text");
        if (!slideXml) continue;

        // Background color
        const bgColor = extractBgColor(slideXml, themeColors) || "#FFFFFF";
        const isDark = isColorDark(bgColor);

        // Parse shapes to extract title & body items
        const slideNum = slideFile.match(/slide(\d+)/)?.[1];
        const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
        const relsXml = await zip.file(relsFile)?.async("text");

        // Build image relationship map
        const relMap = new Map<string, string>();
        if (relsXml) {
          const relMatches = [...relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]*)"/g)];
          for (const m of relMatches) {
            let target = m[2];
            if (target.startsWith("../")) target = "ppt/" + target.slice(3);
            if (/\.(png|jpe?g|gif|bmp|svg|tiff?|emf|wmf)$/i.test(target)) {
              const file = zip.file(target);
              if (file) {
                const ext = target.split(".").pop()!.toLowerCase();
                const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : "image/png";
                const b64 = await file.async("base64");
                relMap.set(m[1], `data:${mime};base64,${b64}`);
              }
            }
          }
        }

        // Extract title from the title placeholder shape
        let slideTitle = "";
        let titleColor = isDark ? "#FFFFFF" : "#1a1a2e";
        let titleBold = true;
        let titleItalic = false;
        let titleUnderline = false;
        let titleAlign: "left" | "center" | "right" = "left";
        let titleFontSize = 32;

        const titleShapeMatch = slideXml.match(/<p:sp\b[^>]*>[\s\S]*?<p:ph[^>]*type="(title|ctrTitle)"[\s\S]*?<\/p:sp>/i);
        if (titleShapeMatch) {
          const titleShape = titleShapeMatch[0];
          const titleParas = parseEditorParagraphs(titleShape, themeColors);
          if (titleParas.length > 0) {
            slideTitle = titleParas.map((p) => p.runs.map((r) => r.text).join("")).join("\n");
            const firstRun = titleParas[0].runs[0];
            if (firstRun) {
              if (firstRun.color) titleColor = firstRun.color;
              if (firstRun.bold !== undefined) titleBold = firstRun.bold;
              if (firstRun.italic) titleItalic = true;
              if (firstRun.underline) titleUnderline = true;
              if (firstRun.fontSize) titleFontSize = firstRun.fontSize;
            }
            if (titleParas[0].align) titleAlign = titleParas[0].align as "left" | "center" | "right";
          }
        }

        // Extract body items from non-title shapes
        const bodyItems: BodyItem[] = [];
        const allShapes = [...slideXml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)];

        for (const [shapeXml] of allShapes) {
          const isTitleShape = /<p:ph[^>]*type="(title|ctrTitle)"/i.test(shapeXml);
          if (isTitleShape) continue;

          const paras = parseEditorParagraphs(shapeXml, themeColors);
          for (const para of paras) {
            const text = para.runs.map((r) => r.text).join("");
            if (!text.trim()) continue;
            const firstRun = para.runs[0];
            bodyItems.push({
              id: generateId(),
              type: "text",
              content: text,
              fontSize: firstRun?.fontSize || 18,
              bold: firstRun?.bold || false,
              italic: firstRun?.italic || false,
              underline: firstRun?.underline || false,
              align: (para.align as "left" | "center" | "right") || "left",
            });
          }
        }

        // Extract images from <p:pic> elements
        const picBlocks = [...slideXml.matchAll(/<p:pic\b[\s\S]*?<\/p:pic>/g)];
        for (const [picXml] of picBlocks) {
          const embedMatch = picXml.match(/r:embed="(rId\d+)"/);
          if (embedMatch) {
            const url = relMap.get(embedMatch[1]);
            if (url) {
              bodyItems.push({ id: generateId(), type: "image", content: url });
            }
          }
        }

        if (bodyItems.length === 0) {
          bodyItems.push({ id: generateId(), type: "text", content: "", fontSize: 18 });
        }

        parsedSlides.push({
          id: generateId(),
          title: slideTitle,
          bodyItems,
          backgroundColor: bgColor,
          titleColor,
          bodyColor: isDark ? "#e0e0e0" : "#333333",
          titleAlign,
          titleBold,
          titleItalic,
          titleUnderline,
          titleFontSize,
        });
      }

      if (parsedSlides.length > 0) {
        setSlides(parsedSlides);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load presentation");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadPresentation();
  }, [loadPresentation]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!readOnly && !saving) void handleSave();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function updateSlide(index: number, updates: Partial<SlideContent>) {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  }

  function updateBodyItem(slideIndex: number, itemId: string, updates: Partial<BodyItem>) {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIndex
          ? { ...s, bodyItems: s.bodyItems.map((b) => (b.id === itemId ? { ...b, ...updates } : b)) }
          : s,
      ),
    );
  }

  function addSlide() {
    const newSlide = createEmptySlide();
    setSlides((prev) => {
      const copy = [...prev];
      copy.splice(currentSlideIndex + 1, 0, newSlide);
      return copy;
    });
    setCurrentSlideIndex(currentSlideIndex + 1);
  }

  function duplicateSlide() {
    const copy: SlideContent = JSON.parse(JSON.stringify(currentSlide));
    copy.id = generateId();
    copy.bodyItems.forEach((b) => (b.id = generateId()));
    setSlides((prev) => {
      const arr = [...prev];
      arr.splice(currentSlideIndex + 1, 0, copy);
      return arr;
    });
    setCurrentSlideIndex(currentSlideIndex + 1);
  }

  function deleteSlide() {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== currentSlideIndex));
    setCurrentSlideIndex(Math.min(currentSlideIndex, slides.length - 2));
  }

  function addTextBlock() {
    const newItem: BodyItem = { id: generateId(), type: "text", content: "", fontSize: 18 };
    updateSlide(currentSlideIndex, {
      bodyItems: [...currentSlide.bodyItems, newItem],
    });
    setSelectedBodyItem(newItem.id);
  }

  function addImage(dataUrl: string) {
    const newItem: BodyItem = { id: generateId(), type: "image", content: dataUrl };
    updateSlide(currentSlideIndex, {
      bodyItems: [...currentSlide.bodyItems, newItem],
    });
  }

  function removeBodyItem(itemId: string) {
    updateSlide(currentSlideIndex, {
      bodyItems: currentSlide.bodyItems.filter((b) => b.id !== itemId),
    });
    if (selectedBodyItem === itemId) setSelectedBodyItem(null);
  }

  async function handleSave() {
    if (readOnly || saving) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/documents/${documentId}/save-presentation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      const result = await res.json();
      toast.success(`Presentation saved (v${result.data.version})`);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save presentation");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    try {
      const res = await fetch(`/api/documents/${documentId}/save-presentation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides, downloadOnly: true }),
      });

      if (!res.ok) throw new Error("Failed to generate presentation");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download presentation");
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        addImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  const isDark = currentSlide?.backgroundColor
    ? isColorDark(currentSlide.backgroundColor)
    : false;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--color-text-tertiary)]" />
        <span className="ml-2 text-sm text-[var(--color-text-secondary)]">Loading presentation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--color-error)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      {!readOnly && (
        <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="flex flex-wrap items-center gap-1 px-3 py-1.5">
            {/* Slide actions */}
            <Button type="button" variant="secondary" size="sm" onClick={addSlide}>
              <Plus className="mr-1 size-3.5" /> Slide
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={duplicateSlide}>
              <Copy className="mr-1 size-3.5" /> Duplicate
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={deleteSlide} disabled={slides.length <= 1}>
              <Trash2 className="mr-1 size-3.5" /> Delete
            </Button>

            <div className="mx-2 h-6 w-px bg-[var(--color-border)]" />

            {/* Content actions */}
            <Button type="button" variant="secondary" size="sm" onClick={addTextBlock}>
              <Type className="mr-1 size-3.5" /> Text
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => imageInputRef.current?.click()}>
              <ImageIcon className="mr-1 size-3.5" /> Image
            </Button>

            <div className="mx-2 h-6 w-px bg-[var(--color-border)]" />

            {/* Background color */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--color-text-tertiary)]">BG:</span>
              <div className="flex gap-0.5">
                {BG_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      const autoTitleColor = isColorDark(c.value) ? "#FFFFFF" : "#1a1a2e";
                      const autoBodyColor = isColorDark(c.value) ? "#e0e0e0" : "#333333";
                      updateSlide(currentSlideIndex, {
                        backgroundColor: c.value,
                        titleColor: autoTitleColor,
                        bodyColor: autoBodyColor,
                      });
                    }}
                    className={`size-5 border ${
                      currentSlide.backgroundColor === c.value
                        ? "border-[var(--color-accent-primary)] ring-1 ring-[var(--color-accent-primary)]"
                        : "border-[var(--color-border)]"
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleDownload()}>
                <Download className="mr-1 size-3.5" /> Download
              </Button>
              <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
                {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Save className="mr-1 size-3.5" />}
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Slide thumbnails */}
        <div className="w-48 shrink-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => { setCurrentSlideIndex(i); setSelectedBodyItem(null); }}
              className={`mb-2 w-full border-2 transition-colors ${
                i === currentSlideIndex
                  ? "border-[var(--color-accent-primary)]"
                  : "border-transparent hover:border-[var(--color-border)]"
              }`}
            >
              <div
                className="flex aspect-[16/9] flex-col items-start justify-start overflow-hidden p-2"
                style={{ backgroundColor: slide.backgroundColor }}
              >
                {slide.title && (
                  <p
                    className="w-full truncate text-left text-[7px] font-bold leading-tight"
                    style={{ color: slide.titleColor }}
                  >
                    {slide.title}
                  </p>
                )}
                {slide.bodyItems.slice(0, 2).map((item) =>
                  item.type === "text" ? (
                    <p key={item.id} className="w-full truncate text-left text-[5px] leading-tight" style={{ color: slide.bodyColor }}>
                      {item.content}
                    </p>
                  ) : (
                    <div key={item.id} className="mt-0.5 text-[5px] text-gray-400">[img]</div>
                  ),
                )}
              </div>
              <p className="bg-[var(--color-bg-secondary)] py-0.5 text-center text-[10px] text-[var(--color-text-tertiary)]">
                {i + 1}
              </p>
            </button>
          ))}
        </div>

        {/* Main editing area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-bg-primary)]">
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <div
              className="relative w-full max-w-5xl overflow-hidden shadow-2xl"
              style={{
                backgroundColor: currentSlide.backgroundColor,
                aspectRatio: "16 / 9",
                maxHeight: "100%",
              }}
            >
              <div className="flex h-full flex-col p-8">
                {/* Slide title */}
                {readOnly ? (
                  currentSlide.title && (
                    <h2
                      className="mb-4 text-2xl lg:text-3xl"
                      style={{
                        color: currentSlide.titleColor,
                        fontWeight: currentSlide.titleBold ? "bold" : "normal",
                        fontStyle: currentSlide.titleItalic ? "italic" : "normal",
                        textDecoration: currentSlide.titleUnderline ? "underline" : "none",
                        textAlign: currentSlide.titleAlign,
                        fontSize: `${currentSlide.titleFontSize}px`,
                      }}
                    >
                      {currentSlide.title}
                    </h2>
                  )
                ) : (
                  <input
                    type="text"
                    value={currentSlide.title}
                    onChange={(e) => updateSlide(currentSlideIndex, { title: e.target.value })}
                    placeholder="Click to add title"
                    className="mb-4 w-full bg-transparent outline-none placeholder:opacity-40"
                    style={{
                      color: currentSlide.titleColor,
                      fontWeight: currentSlide.titleBold ? "bold" : "normal",
                      fontStyle: currentSlide.titleItalic ? "italic" : "normal",
                      textDecoration: currentSlide.titleUnderline ? "underline" : "none",
                      textAlign: currentSlide.titleAlign,
                      fontSize: `${currentSlide.titleFontSize}px`,
                    }}
                  />
                )}

                {/* Body items */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {currentSlide.bodyItems.map((item) => (
                    <div
                      key={item.id}
                      className={`group relative ${
                        !readOnly && selectedBodyItem === item.id
                          ? "ring-2 ring-[var(--color-accent-primary)]"
                          : !readOnly
                          ? "hover:ring-1 hover:ring-[var(--color-border)]"
                          : ""
                      }`}
                      onClick={() => !readOnly && setSelectedBodyItem(item.id)}
                    >
                      {item.type === "text" ? (
                        readOnly ? (
                          <p
                            style={{
                              color: currentSlide.bodyColor,
                              fontWeight: item.bold ? "bold" : "normal",
                              fontStyle: item.italic ? "italic" : "normal",
                              textDecoration: item.underline ? "underline" : "none",
                              textAlign: item.align || "left",
                              fontSize: `${item.fontSize || 18}px`,
                            }}
                          >
                            {item.content}
                          </p>
                        ) : (
                          <textarea
                            value={item.content}
                            onChange={(e) => updateBodyItem(currentSlideIndex, item.id, { content: e.target.value })}
                            placeholder="Click to add text..."
                            rows={2}
                            className="w-full resize-none bg-transparent outline-none placeholder:opacity-40"
                            style={{
                              color: currentSlide.bodyColor,
                              fontWeight: item.bold ? "bold" : "normal",
                              fontStyle: item.italic ? "italic" : "normal",
                              textDecoration: item.underline ? "underline" : "none",
                              textAlign: item.align || "left",
                              fontSize: `${item.fontSize || 18}px`,
                            }}
                          />
                        )
                      ) : (
                        <img
                          src={item.content}
                          alt="Slide image"
                          className="max-h-64 max-w-full rounded object-contain"
                        />
                      )}

                      {/* Item action bar */}
                      {!readOnly && selectedBodyItem === item.id && (
                        <div className="absolute -top-8 left-0 z-10 flex items-center gap-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-1 py-0.5 shadow">
                          {item.type === "text" && (
                            <>
                              <button type="button" onClick={() => updateBodyItem(currentSlideIndex, item.id, { bold: !item.bold })}
                                className={`inline-flex size-6 items-center justify-center ${item.bold ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                                <Bold className="size-3" />
                              </button>
                              <button type="button" onClick={() => updateBodyItem(currentSlideIndex, item.id, { italic: !item.italic })}
                                className={`inline-flex size-6 items-center justify-center ${item.italic ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                                <Italic className="size-3" />
                              </button>
                              <button type="button" onClick={() => updateBodyItem(currentSlideIndex, item.id, { underline: !item.underline })}
                                className={`inline-flex size-6 items-center justify-center ${item.underline ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                                <UnderlineIcon className="size-3" />
                              </button>
                              <div className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />
                              <button type="button" onClick={() => updateBodyItem(currentSlideIndex, item.id, { align: "left" })}
                                className={`inline-flex size-6 items-center justify-center ${item.align === "left" || !item.align ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                                <AlignLeft className="size-3" />
                              </button>
                              <button type="button" onClick={() => updateBodyItem(currentSlideIndex, item.id, { align: "center" })}
                                className={`inline-flex size-6 items-center justify-center ${item.align === "center" ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                                <AlignCenter className="size-3" />
                              </button>
                              <button type="button" onClick={() => updateBodyItem(currentSlideIndex, item.id, { align: "right" })}
                                className={`inline-flex size-6 items-center justify-center ${item.align === "right" ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                                <AlignRight className="size-3" />
                              </button>
                              <div className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />
                              <button type="button" onClick={() => updateBodyItem(currentSlideIndex, item.id, { fontSize: Math.max(10, (item.fontSize || 18) - 2) })}
                                className="inline-flex size-6 items-center justify-center text-[var(--color-text-secondary)]">
                                <Minus className="size-3" />
                              </button>
                              <span className="min-w-[24px] text-center text-[10px] text-[var(--color-text-tertiary)]">{item.fontSize || 18}</span>
                              <button type="button" onClick={() => updateBodyItem(currentSlideIndex, item.id, { fontSize: Math.min(72, (item.fontSize || 18) + 2) })}
                                className="inline-flex size-6 items-center justify-center text-[var(--color-text-secondary)]">
                                <Plus className="size-3" />
                              </button>
                            </>
                          )}
                          <div className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />
                          <button type="button" onClick={() => removeBodyItem(item.id)}
                            className="inline-flex size-6 items-center justify-center text-[var(--color-error)]">
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom status bar */}
          <div className="flex shrink-0 items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-1.5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-text-tertiary)]">
                Slide {currentSlideIndex + 1} of {slides.length}
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {currentSlide.bodyItems.length} element{currentSlide.bodyItems.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" disabled={currentSlideIndex <= 0}
                onClick={() => setCurrentSlideIndex((p) => p - 1)}
                className="text-[var(--color-text-secondary)] disabled:opacity-30">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" disabled={currentSlideIndex >= slides.length - 1}
                onClick={() => setCurrentSlideIndex((p) => p + 1)}
                className="text-[var(--color-text-secondary)] disabled:opacity-30">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar: Title formatting */}
        {!readOnly && (
          <div className="w-56 shrink-0 overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Title Format
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => updateSlide(currentSlideIndex, { titleBold: !currentSlide.titleBold })}
                  className={`inline-flex size-7 items-center justify-center border ${currentSlide.titleBold ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]" : "border-[var(--color-border)] text-[var(--color-text-secondary)]"}`}>
                  <Bold className="size-3.5" />
                </button>
                <button type="button" onClick={() => updateSlide(currentSlideIndex, { titleItalic: !currentSlide.titleItalic })}
                  className={`inline-flex size-7 items-center justify-center border ${currentSlide.titleItalic ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]" : "border-[var(--color-border)] text-[var(--color-text-secondary)]"}`}>
                  <Italic className="size-3.5" />
                </button>
                <button type="button" onClick={() => updateSlide(currentSlideIndex, { titleUnderline: !currentSlide.titleUnderline })}
                  className={`inline-flex size-7 items-center justify-center border ${currentSlide.titleUnderline ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]" : "border-[var(--color-border)] text-[var(--color-text-secondary)]"}`}>
                  <UnderlineIcon className="size-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button type="button" onClick={() => updateSlide(currentSlideIndex, { titleAlign: "left" })}
                  className={`inline-flex size-7 items-center justify-center border ${currentSlide.titleAlign === "left" ? "border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]" : "border-[var(--color-border)] text-[var(--color-text-secondary)]"}`}>
                  <AlignLeft className="size-3.5" />
                </button>
                <button type="button" onClick={() => updateSlide(currentSlideIndex, { titleAlign: "center" })}
                  className={`inline-flex size-7 items-center justify-center border ${currentSlide.titleAlign === "center" ? "border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]" : "border-[var(--color-border)] text-[var(--color-text-secondary)]"}`}>
                  <AlignCenter className="size-3.5" />
                </button>
                <button type="button" onClick={() => updateSlide(currentSlideIndex, { titleAlign: "right" })}
                  className={`inline-flex size-7 items-center justify-center border ${currentSlide.titleAlign === "right" ? "border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]" : "border-[var(--color-border)] text-[var(--color-text-secondary)]"}`}>
                  <AlignRight className="size-3.5" />
                </button>
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-[var(--color-text-tertiary)]">Font Size</label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => updateSlide(currentSlideIndex, { titleFontSize: Math.max(16, currentSlide.titleFontSize - 2) })}
                    className="inline-flex size-6 items-center justify-center border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                    <Minus className="size-3" />
                  </button>
                  <span className="min-w-[30px] text-center text-xs text-[var(--color-text-primary)]">{currentSlide.titleFontSize}</span>
                  <button type="button" onClick={() => updateSlide(currentSlideIndex, { titleFontSize: Math.min(72, currentSlide.titleFontSize + 2) })}
                    className="inline-flex size-6 items-center justify-center border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-[var(--color-text-tertiary)]">Title Color</label>
                <input
                  type="color"
                  value={currentSlide.titleColor}
                  onChange={(e) => updateSlide(currentSlideIndex, { titleColor: e.target.value })}
                  className="h-7 w-full cursor-pointer border border-[var(--color-border)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-[var(--color-text-tertiary)]">Body Color</label>
                <input
                  type="color"
                  value={currentSlide.bodyColor}
                  onChange={(e) => updateSlide(currentSlideIndex, { bodyColor: e.target.value })}
                  className="h-7 w-full cursor-pointer border border-[var(--color-border)]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function isColorDark(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

/* ── Theme color parsing ── */
function parseThemeColors(themeXml: string, map: Map<string, string>) {
  const tags: Record<string, string> = {
    dk1: "dk1", dk2: "dk2", lt1: "lt1", lt2: "lt2",
    accent1: "accent1", accent2: "accent2", accent3: "accent3",
    accent4: "accent4", accent5: "accent5", accent6: "accent6",
    hlink: "hlink", folHlink: "folHlink",
  };
  for (const [tag, name] of Object.entries(tags)) {
    const m = themeXml.match(
      new RegExp(`<a:${tag}>\\s*(?:<a:sysClr[^>]*lastClr="([A-Fa-f0-9]{6})"[^/]*/>|<a:srgbClr val="([A-Fa-f0-9]{6})")`),
    );
    if (m) map.set(name, "#" + (m[1] || m[2]));
  }
}

function resolveColor(node: string, themeColors: Map<string, string>): string | undefined {
  const srgb = node.match(/<a:srgbClr\s+val="([A-Fa-f0-9]{3,8})"/);
  if (srgb) return "#" + srgb[1].slice(0, 6);
  const scheme = node.match(/<a:schemeClr\s+val="(\w+)"/);
  if (scheme) return themeColors.get(scheme[1]);
  return undefined;
}

function extractBgColor(xml: string, themeColors: Map<string, string>): string | undefined {
  const bgMatch = xml.match(/<p:bg>[\s\S]*?<p:bgPr>[\s\S]*?<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
  if (bgMatch) return resolveColor(bgMatch[1], themeColors);
  const bgRef = xml.match(/<p:bgRef[^>]*>([\s\S]*?)<\/p:bgRef>/);
  if (bgRef) return resolveColor(bgRef[1], themeColors);
  return undefined;
}

interface EditorTextRun { text: string; bold?: boolean; italic?: boolean; underline?: boolean; fontSize?: number; color?: string; }
interface EditorParagraph { runs: EditorTextRun[]; align?: string; }

function parseEditorParagraphs(shapeXml: string, themeColors: Map<string, string>): EditorParagraph[] {
  const txBody = shapeXml.match(/<p:txBody>([\s\S]*?)<\/p:txBody>/);
  if (!txBody) return [];

  const defRPr = txBody[1].match(/<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/);
  const defaultFontSize = defRPr ? parseFontSize(defRPr[1]) : undefined;
  const defaultColor = defRPr ? resolveColor(defRPr[0], themeColors) : undefined;

  const paragraphs: EditorParagraph[] = [];
  const paraBlocks = txBody[1].split(/<\/a:p>/);

  for (const paraBlock of paraBlocks) {
    if (!paraBlock.includes("<a:r>") && !paraBlock.includes("<a:r ")) continue;

    const pPr = paraBlock.match(/<a:pPr[^>]*algn="(\w+)"/);
    const align = pPr ? ({ l: "left", ctr: "center", r: "right" } as Record<string, string>)[pPr[1]] : undefined;

    const runs: EditorTextRun[] = [];
    const runBlocks = [...paraBlock.matchAll(/<a:r>([\s\S]*?)<\/a:r>/g)];

    for (const [_, runContent] of runBlocks) {
      const textMatch = runContent.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/);
      if (!textMatch) continue;
      const text = textMatch[1]
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      if (!text) continue;

      const rPr = runContent.match(/<a:rPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:rPr>)/);
      let bold = false, italic = false, underline = false;
      let fontSize = defaultFontSize;
      let color = defaultColor;

      if (rPr) {
        if (/\bb="1"/.test(rPr[1])) bold = true;
        if (/\bi="1"/.test(rPr[1])) italic = true;
        if (/\bu="sng"/.test(rPr[1])) underline = true;
        const sz = parseFontSize(rPr[1]);
        if (sz) fontSize = sz;
        const clr = resolveColor(rPr[0], themeColors);
        if (clr) color = clr;
      }

      runs.push({ text, bold, italic, underline, fontSize, color });
    }

    if (runs.length > 0) paragraphs.push({ runs, align });
  }

  return paragraphs;
}

function parseFontSize(attrs: string): number | undefined {
  const m = attrs.match(/\bsz="(\d+)"/);
  return m ? parseInt(m[1]) / 100 : undefined;
}
