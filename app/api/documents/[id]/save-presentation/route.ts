import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { buildObjectKey, uploadObject, getPublicObjectUrl } from "@/lib/storage";

interface BodyItem {
  type: "text" | "image";
  content: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
}

interface SlideContent {
  title: string;
  bodyItems: BodyItem[];
  backgroundColor: string;
  titleColor: string;
  bodyColor: string;
  titleBold: boolean;
  titleItalic: boolean;
  titleUnderline: boolean;
  titleAlign: "left" | "center" | "right";
  titleFontSize: number;
}

function buildPptx(title: string, slides: SlideContent[]): PptxGenJS {
  const pres = new PptxGenJS();
  pres.title = title;
  pres.layout = "LAYOUT_WIDE";

  for (const slide of slides) {
    const pptSlide = pres.addSlide();
    pptSlide.background = { fill: slide.backgroundColor.replace("#", "") };

    if (slide.title) {
      pptSlide.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: "90%",
        h: 1,
        fontSize: slide.titleFontSize,
        color: slide.titleColor.replace("#", ""),
        bold: slide.titleBold,
        italic: slide.titleItalic,
        underline: slide.titleUnderline ? { style: "sng" } : undefined,
        align: slide.titleAlign,
        fontFace: "Calibri",
      });
    }

    let yPos = 1.5;
    for (const item of slide.bodyItems) {
      if (item.type === "text" && item.content) {
        pptSlide.addText(item.content, {
          x: 0.5,
          y: yPos,
          w: "90%",
          h: 0.8,
          fontSize: item.fontSize || 18,
          color: slide.bodyColor.replace("#", ""),
          bold: item.bold || false,
          italic: item.italic || false,
          underline: item.underline ? { style: "sng" } : undefined,
          align: item.align || "left",
          fontFace: "Calibri",
        });
        yPos += 0.8;
      } else if (item.type === "image" && item.content) {
        pptSlide.addImage({
          data: item.content,
          x: 0.5,
          y: yPos,
          w: 5,
          h: 3,
          sizing: { type: "contain", w: 5, h: 3 },
        });
        yPos += 3.2;
      }
    }
  }

  return pres;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        projectId: true,
        title: true,
        fileUrl: true,
        fileKey: true,
        fileSize: true,
        createdById: true,
        folder: { select: { isPublic: true } },
      },
    });

    if (!document) return fail("Document not found", 404);

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: document.projectId, userId: auth.session.user.id },
    });

    if (!membership) return fail("Forbidden", 403);

    const isOwner = document.createdById === auth.session.user.id;
    if (!isOwner) {
      const access = await prisma.documentAccess.findUnique({
        where: { documentId_userId: { documentId: id, userId: auth.session.user.id } },
        select: { accessLevel: true },
      });
      if (access?.accessLevel !== "editor") {
        return fail("You don't have edit access to this document", 403);
      }
    }

    const body = await request.json();
    const { slides, downloadOnly } = body as { slides: SlideContent[]; downloadOnly?: boolean };

    if (!Array.isArray(slides) || slides.length === 0) {
      return fail("Slides data is required", 400);
    }

    const pres = buildPptx(document.title, slides);

    // Download-only mode: return the PPTX binary directly
    if (downloadOnly) {
      const arrayBuffer = (await pres.write({ outputType: "arraybuffer" })) as ArrayBuffer;
      return new NextResponse(Buffer.from(arrayBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${document.title}.pptx"`,
        },
      });
    }

    // Save mode: generate PPTX and upload to S3
    const arrayBuffer = (await pres.write({ outputType: "arraybuffer" })) as ArrayBuffer;
    const buffer = Buffer.from(arrayBuffer);

    const contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    const key = buildObjectKey({
      scope: "document",
      userId: auth.session.user.id,
      originalFileName: `${document.title}.pptx`,
      projectId: document.projectId,
    });

    await uploadObject({ key, contentType, body: buffer });
    const fileUrl = getPublicObjectUrl(key);

    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version ?? 0) + 1;

    const [version] = await prisma.$transaction([
      prisma.documentVersion.create({
        data: {
          documentId: id,
          version: nextVersion,
          fileUrl: document.fileUrl,
          fileKey: document.fileKey,
          fileSize: document.fileSize,
          createdById: auth.session.user.id,
        },
      }),
      prisma.document.update({
        where: { id },
        data: {
          fileUrl,
          fileKey: key,
          fileSize: buffer.length,
          mimeType: contentType,
        },
      }),
    ]);

    return ok({ version: version.version });
  } catch (error) {
    return handleRouteError(error);
  }
}
