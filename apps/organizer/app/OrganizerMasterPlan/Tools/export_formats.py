from pathlib import Path
import sys

# Dependencies:
# - docx2pdf (for PDF export on Windows via Word COM)
# - mammoth (DOCX -> HTML)
# - html2text (HTML -> Markdown)

DOCX_NAME = "OmniaMasterPlan_FINAL_v1.docx"


def export_pdf(docx_path: Path) -> Path | None:
    try:
        from docx2pdf import convert
    except Exception as e:
        print(f"[WARN] docx2pdf not available or failed to import: {e}")
        return None

    pdf_path = docx_path.with_suffix(".pdf")
    try:
        # Convert single file to single file
        convert(str(docx_path), str(pdf_path))
        print(f"[OK] PDF exported -> {pdf_path}")
        return pdf_path
    except Exception as e:
        print(f"[ERROR] PDF export failed: {e}")
        return None


def export_markdown(docx_path: Path) -> tuple[Path | None, Path | None]:
    try:
        import mammoth
    except Exception as e:
        print(f"[WARN] mammoth not available: {e}")
        return None, None

    try:
        import html2text
    except Exception as e:
        print(f"[WARN] html2text not available: {e}")
        return None, None

    html_path = docx_path.with_suffix(".html")
    md_path = docx_path.with_suffix(".md")

    try:
        with open(docx_path, "rb") as f:
            result = mammoth.convert_to_html(f)
            html = result.value  # The generated HTML
            # You can inspect messages via result.messages if needed
    except Exception as e:
        print(f"[ERROR] DOCX->HTML conversion failed: {e}")
        return None, None

    try:
        # Save HTML for reference
        html_path.write_text(html, encoding="utf-8")
        # Convert HTML to Markdown
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.ignore_images = False
        h.body_width = 0  # don't wrap lines
        markdown_text = h.handle(html)
        md_path.write_text(markdown_text, encoding="utf-8")
        print(f"[OK] Markdown exported -> {md_path}")
        print(f"[OK] HTML exported -> {html_path}")
        return md_path, html_path
    except Exception as e:
        print(f"[ERROR] HTML/Markdown write failed: {e}")
        return None, None


def main() -> int:
    base_dir = Path(__file__).resolve().parent
    docx_path = base_dir / DOCX_NAME

    if not docx_path.exists():
        print(f"[ERROR] DOCX not found: {docx_path}")
        return 1

    print(f"[INFO] Exporting formats for: {docx_path}")
    pdf_path = export_pdf(docx_path)
    md_path, html_path = export_markdown(docx_path)

    print("\n[SUMMARY]")
    print(f"- PDF:   {pdf_path if pdf_path else 'FAILED'}")
    print(f"- MD:    {md_path if md_path else 'FAILED'}")
    print(f"- HTML:  {html_path if html_path else 'FAILED'}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())