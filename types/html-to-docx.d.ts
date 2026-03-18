declare module "html-to-docx" {
  interface Options {
    table?: { row?: { cantSplit?: boolean } };
    footer?: boolean;
    header?: boolean;
    font?: string;
    fontSize?: number;
    margins?: Record<string, unknown>;
  }

  export default function htmlToDocx(
    htmlString: string,
    headerHTMLString: string | null,
    options?: Options,
  ): Promise<Blob>;
}
