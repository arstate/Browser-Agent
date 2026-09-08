#!/usr/bin/env python3
"""
Browser Agent - Anydoc High Performance Document Parser
Converts PDF, DOCX, DOC, XLSX, XLS, PPTX, PPT, RTF, ODT, EPUB, CSV, and code to clean Markdown.
Powered by Firecrawl Anydoc with robust fallback mechanisms.
"""

import os
import sys
import json
import re
import subprocess
import zipfile
import xml.etree.ElementTree as ET
import time
import shutil
import tempfile
import base64

# Try importing anydoc (Rust-powered high performance parser by Firecrawl)
try:
    import anydoc
    HAS_ANYDOC = True
except ImportError:
    HAS_ANYDOC = False

DOC_EXTENSIONS = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".doc": "doc",
    ".xlsx": "xlsx",
    ".xls": "xls",
    ".pptx": "pptx",
    ".ppt": "ppt",
    ".odt": "odt",
    ".ods": "ods",
    ".odp": "odp",
    ".rtf": "rtf",
    ".epub": "epub",
    ".csv": "csv",
    ".tsv": "csv",
    ".html": "html",
    ".htm": "html"
}

TEXT_EXTENSIONS = {
    ".txt", ".md", ".json", ".xml", ".yaml", ".yml", ".log",
    ".js", ".ts", ".jsx", ".tsx", ".py", ".rs", ".go", ".c", ".cpp",
    ".h", ".hpp", ".css", ".scss", ".sql", ".sh", ".bash", ".zsh",
    ".toml", ".ini", ".env", ".cfg", ".conf"
}

def clean_markdown_output(text: str) -> str:
    """Normalize markdown and strip redundant blank lines to maximize token efficiency."""
    if not text:
        return ""
    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Remove excessive blank lines (more than 2 consecutive newlines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Strip trailing whitespace on each line
    lines = [l.rstrip() for l in text.split("\n")]
    return "\n".join(lines).strip()

def fallback_parse_pdf(file_path: str) -> str:
    """Fallback PDF parser using system pdftotext."""
    try:
        pdftotext = subprocess.run(
            ["pdftotext", "-layout", file_path, "-"],
            capture_output=True,
            text=True,
            check=False
        )
        if pdftotext.returncode == 0 and pdftotext.stdout.strip():
            return pdftotext.stdout
    except Exception:
        pass
    return ""

def fallback_parse_docx(file_path: str) -> str:
    """Fallback DOCX parser using built-in zipfile and XML extraction."""
    try:
        with zipfile.ZipFile(file_path, "r") as z:
            xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            paragraphs = []
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            for p in tree.iter(f"{{{ns['w']}}}p"):
                texts = [node.text for node in p.iter(f"{{{ns['w']}}}t") if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n\n".join(paragraphs)
    except Exception:
        return ""

def fallback_parse_xlsx(file_path: str) -> str:
    """Fallback XLSX parser using built-in zipfile and XML extraction."""
    try:
        with zipfile.ZipFile(file_path, "r") as z:
            shared_strings = []
            if "xl/sharedStrings.xml" in z.namelist():
                ss_xml = z.read("xl/sharedStrings.xml")
                ss_tree = ET.fromstring(ss_xml)
                for si in ss_tree.iter():
                    if si.tag.endswith("}t") and si.text:
                        shared_strings.append(si.text)
            
            if "xl/worksheets/sheet1.xml" in z.namelist():
                s_xml = z.read("xl/worksheets/sheet1.xml")
                s_tree = ET.fromstring(s_xml)
                rows = []
                for row_el in s_tree.iter():
                    if row_el.tag.endswith("}row"):
                        cell_vals = []
                        for c in row_el.iter():
                            if c.tag.endswith("}c"):
                                t_attr = c.attrib.get("t", "")
                                v_el = None
                                for child in c:
                                    if child.tag.endswith("}v"):
                                        v_el = child
                                        break
                                if v_el is not None and v_el.text:
                                    val = v_el.text
                                    if t_attr == "s" and val.isdigit() and int(val) < len(shared_strings):
                                        val = shared_strings[int(val)]
                                    cell_vals.append(val)
                                else:
                                    cell_vals.append("")
                        if any(cell_vals):
                            rows.append(" | ".join(cell_vals))
                if rows:
                    return "\n".join(rows)
    except Exception:
        pass
    return ""

def fallback_parse_plaintext(file_path: str) -> str:
    """Read plaintext or code file with utf-8 encoding fallback."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception:
        return ""

def parse_document_to_markdown(file_path: str, format_hint: str = "") -> dict:
    """
    Parses any document file to clean GitHub-Flavored Markdown.
    Returns: { "status": "ok"|"error", "markdown": str, "format": str, "char_count": int, "engine": str }
    """
    file_path = os.path.expanduser(file_path)
    if not os.path.exists(file_path):
        return {"status": "error", "error": f"File not found: {file_path}"}

    file_size = os.path.getsize(file_path)
    ext = os.path.splitext(file_path)[1].lower()
    doc_fmt = format_hint.lower() if format_hint else DOC_EXTENSIONS.get(ext, "")

    markdown_res = ""
    engine_used = "unknown"

    # Tier 1: Firecrawl Anydoc (Rust-powered high performance conversion)
    if HAS_ANYDOC:
        try:
            if doc_fmt in ("doc", "docx", "odt", "pdf", "ppt", "pptx", "rtf", "epub", "xlsx", "ods", "odp", "csv"):
                md = anydoc.to_markdown(file_path)
                if md and md.strip():
                    markdown_res = md
                    engine_used = "anydoc"
            elif ext in TEXT_EXTENSIONS or ext == "":
                markdown_res = fallback_parse_plaintext(file_path)
                engine_used = "plaintext"
        except Exception:
            pass

    # Tier 2: Specialized Fallback Converters
    if not markdown_res or not markdown_res.strip():
        if ext == ".pdf":
            markdown_res = fallback_parse_pdf(file_path)
            engine_used = "pdftotext_fallback"
        elif ext == ".docx":
            markdown_res = fallback_parse_docx(file_path)
            engine_used = "docx_xml_fallback"
        elif ext in (".xlsx", ".xls"):
            markdown_res = fallback_parse_xlsx(file_path)
            engine_used = "xlsx_xml_fallback"
        elif ext in TEXT_EXTENSIONS or ext in (".txt", ".csv", ".tsv", ".html", ".htm", ".json", ".xml"):
            markdown_res = fallback_parse_plaintext(file_path)
            engine_used = "plaintext"
        else:
            candidate = fallback_parse_plaintext(file_path)
            non_printable = sum(1 for c in candidate[:1000] if ord(c) < 32 and c not in "\n\r\t")
            if non_printable < 20:
                markdown_res = candidate
                engine_used = "plaintext_sniff"

    clean_md = clean_markdown_output(markdown_res)
    if not clean_md:
        return {
            "status": "error",
            "error": f"Failed to extract readable content from {os.path.basename(file_path)}",
            "format": ext.lstrip("."),
            "file_size": file_size
        }

    return {
        "status": "ok",
        "markdown": clean_md,
        "format": ext.lstrip(".") or doc_fmt or "text",
        "char_count": len(clean_md),
        "approx_tokens": max(1, (len(clean_md) + 3) // 4),
        "file_size": file_size,
        "engine": engine_used
    }

def convert_document_to_page_images(
    file_path: str,
    output_dir: str = None,
    dpi: int = 140,
    quality: int = 80,
    max_pages: int = 35,
    page_range: str = None,
    img_format: str = "jpg",
    include_base64: bool = True
) -> dict:
    """
    Converts all pages of a PDF, Word (DOCX/DOC), ODT, RTF, or PPTX document
    into sequential, high-resolution, lightweight page images (150 DPI JPG/PNG).
    Ensures:
      - Low file size (approx. 80-140 KB per page)
      - Razor-sharp clarity (not blurry / 'ga burik')
      - Strict sequential page ordering (halaman urut 1, 2, 3... N)
      - Extracted per-page text for multimodal LLM vision & text accuracy.
    """
    file_path = os.path.expanduser(file_path)
    if not os.path.exists(file_path):
        return {"status": "error", "error": f"File not found: {file_path}"}

    orig_name = os.path.basename(file_path)
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', orig_name).strip('_') or "document"
    ext = os.path.splitext(file_path)[1].lower()
    
    doc_convert_exts = {".docx", ".doc", ".odt", ".rtf", ".pptx", ".ppt"}
    supported_exts = {".pdf"}.union(doc_convert_exts)
    if ext not in supported_exts:
        return {"status": "error", "error": f"Unsupported file format {ext}. Supported: PDF, DOCX, DOC, ODT, RTF, PPTX"}

    temp_pdf_dir = None
    pdf_path = file_path

    # Step 1: If Word or presentation, convert to PDF via LibreOffice headless
    if ext in doc_convert_exts:
        soffice_bin = shutil.which("soffice") or shutil.which("libreoffice")
        if not soffice_bin:
            return {"status": "error", "error": "LibreOffice (soffice) not found to convert Word/presentation to PDF"}
        
        temp_pdf_dir = tempfile.mkdtemp(prefix="ba_doc2pdf_")
        try:
            conv_cmd = [soffice_bin, "--headless", "--convert-to", "pdf", "--outdir", temp_pdf_dir, file_path]
            conv_res = subprocess.run(conv_cmd, capture_output=True, text=True, timeout=90)
            if conv_res.returncode != 0:
                shutil.rmtree(temp_pdf_dir, ignore_errors=True)
                return {"status": "error", "error": f"Failed to convert {orig_name} to PDF: {conv_res.stderr}"}
            
            pdf_candidates = [f for f in os.listdir(temp_pdf_dir) if f.lower().endswith(".pdf")]
            if not pdf_candidates:
                shutil.rmtree(temp_pdf_dir, ignore_errors=True)
                return {"status": "error", "error": f"No PDF generated from {orig_name}"}
            pdf_path = os.path.join(temp_pdf_dir, pdf_candidates[0])
        except Exception as e:
            if temp_pdf_dir and os.path.exists(temp_pdf_dir):
                shutil.rmtree(temp_pdf_dir, ignore_errors=True)
            return {"status": "error", "error": f"Word to PDF conversion failed: {e}"}

    try:
        # Step 2: Determine total pages in PDF
        total_pages = 0
        if shutil.which("pdfinfo"):
            try:
                info_res = subprocess.run(["pdfinfo", pdf_path], capture_output=True, text=True, timeout=15)
                for line in info_res.stdout.splitlines():
                    if line.startswith("Pages:"):
                        total_pages = int(line.split(":", 1)[1].strip())
                        break
            except Exception:
                pass

        if total_pages == 0:
            try:
                with open(pdf_path, "rb") as f:
                    pdf_data = f.read()
                    matches = re.findall(rb'/Type\s*/Page\b', pdf_data)
                    total_pages = len(matches) if matches else 1
            except Exception:
                total_pages = 1

        # Step 3: Determine page bounds
        first_page = 1
        last_page = min(total_pages, max_pages) if total_pages > 0 else max_pages
        if page_range and page_range.lower() != "all":
            m = re.match(r'(\d+)\s*[-:]\s*(\d+)', page_range.strip())
            if m:
                first_page = max(1, int(m.group(1)))
                last_page = min(total_pages or 9999, int(m.group(2)))
            else:
                try:
                    single_pg = int(page_range.strip())
                    first_page = single_pg
                    last_page = single_pg
                except ValueError:
                    pass

        # Step 4: Setup output directory
        if not output_dir:
            uploads_dir = os.path.expanduser("~/.browser-agent/uploads")
            os.makedirs(uploads_dir, exist_ok=True)
            timestamp = int(time.time() * 1000)
            output_dir = os.path.join(uploads_dir, f"pages_{timestamp}_{clean_name}")
        os.makedirs(output_dir, exist_ok=True)

        raw_tmp_dir = tempfile.mkdtemp(prefix="ba_render_pages_")
        prefix = os.path.join(raw_tmp_dir, "raw_page")

        # Step 5: Render pages via pdftoppm or gs fallback
        rendered = False
        if shutil.which("pdftoppm"):
            render_cmd = [
                "pdftoppm",
                "-f", str(first_page),
                "-l", str(last_page),
                "-jpeg" if img_format in ("jpg", "jpeg") else "-png",
                "-r", str(dpi)
            ]
            if img_format in ("jpg", "jpeg"):
                render_cmd.extend(["-jpegopt", f"quality={quality},progressive=y"])
            render_cmd.extend([pdf_path, prefix])

            res_render = subprocess.run(render_cmd, capture_output=True, text=True, timeout=90)
            if res_render.returncode == 0:
                rendered = True

        # Fallback to gs if pdftoppm failed
        if not rendered and shutil.which("gs"):
            gs_cmd = [
                "gs", "-dNOPAUSE", "-dBATCH",
                f"-sDEVICE=jpeg" if img_format in ("jpg", "jpeg") else "-sDEVICE=png16m",
                f"-r{dpi}",
                f"-dJPEGQ={quality}",
                f"-dFirstPage={first_page}",
                f"-dLastPage={last_page}",
                f"-sOutputFile={prefix}-%d.{img_format}",
                pdf_path
            ]
            res_gs = subprocess.run(gs_cmd, capture_output=True, text=True, timeout=90)
            if res_gs.returncode == 0:
                rendered = True

        if not rendered:
            shutil.rmtree(raw_tmp_dir, ignore_errors=True)
            return {"status": "error", "error": "No suitable renderer found (pdftoppm or gs)"}

        # Step 6: Collect, sort naturally, and organize pages sequentially
        raw_files = [f for f in os.listdir(raw_tmp_dir) if f.startswith("raw_page")]
        def get_pg_num(fn):
            match = re.search(r'raw_page[^\d]*(\d+)', fn)
            return int(match.group(1)) if match else 0

        # Sort naturally by page number (1, 2, 3... 10)
        raw_files.sort(key=get_pg_num)

        # Fast single-pass page text extraction via pdftotext form-feed (\x0c)
        page_texts = {}
        if shutil.which("pdftotext"):
            try:
                txt_cmd = ["pdftotext", "-f", str(first_page), "-l", str(last_page), "-layout", pdf_path, "-"]
                res_txt = subprocess.run(txt_cmd, capture_output=True, text=True, timeout=20)
                if res_txt.returncode == 0 and res_txt.stdout:
                    chunks = res_txt.stdout.split("\x0c")
                    for offset, chunk in enumerate(chunks):
                        pg_num = first_page + offset
                        page_texts[pg_num] = chunk.strip()
            except Exception:
                pass

        pages = []
        for raw_f in raw_files:
            pg_idx = get_pg_num(raw_f)
            src_p = os.path.join(raw_tmp_dir, raw_f)
            dest_filename = f"page_{pg_idx:03d}.{img_format}"
            dest_path = os.path.join(output_dir, dest_filename)
            shutil.copy2(src_p, dest_path)

            file_sz = os.path.getsize(dest_path)
            
            # Extract page text from pre-extracted dictionary with single-page fallback
            page_text = page_texts.get(pg_idx, "")
            if not page_text and shutil.which("pdftotext"):
                try:
                    txt_cmd = ["pdftotext", "-f", str(pg_idx), "-l", str(pg_idx), "-layout", pdf_path, "-"]
                    res_txt = subprocess.run(txt_cmd, capture_output=True, text=True, timeout=5)
                    if res_txt.returncode == 0:
                        page_text = res_txt.stdout.strip()
                except Exception:
                    pass

            b64_url = ""
            if include_base64:
                try:
                    with open(dest_path, "rb") as img_f:
                        raw_img_bytes = img_f.read()
                        mime = "image/jpeg" if img_format in ("jpg", "jpeg") else "image/png"
                        b64_str = base64.b64encode(raw_img_bytes).decode("ascii")
                        b64_url = f"data:{mime};base64,{b64_str}"
                except Exception:
                    pass

            pages.append({
                "page": pg_idx,
                "file_name": dest_filename,
                "file_path": dest_path,
                "file_size": file_sz,
                "file_size_kb": round(file_sz / 1024, 1),
                "char_count": len(page_text),
                "text": page_text,
                "data_url": b64_url
            })

        shutil.rmtree(raw_tmp_dir, ignore_errors=True)

        return {
            "status": "ok",
            "file_name": orig_name,
            "file_path": file_path,
            "total_pages": total_pages or len(pages),
            "pages_converted": len(pages),
            "pages_dir": output_dir,
            "dpi": dpi,
            "format": img_format,
            "pages": pages
        }
    finally:
        if temp_pdf_dir and os.path.exists(temp_pdf_dir):
            shutil.rmtree(temp_pdf_dir, ignore_errors=True)

def parse_and_convert_document(file_path: str, max_pages: int = 35, dpi: int = 140, quality: int = 80) -> dict:
    """Convenience helper returning both clean Markdown and page images."""
    md_res = parse_document_to_markdown(file_path)
    pages_res = convert_document_to_page_images(file_path, max_pages=max_pages, dpi=dpi, quality=quality)
    return {
        "status": "ok" if (md_res.get("status") == "ok" or pages_res.get("status") == "ok") else "error",
        "file_name": os.path.basename(file_path),
        "file_path": file_path,
        "markdown": md_res.get("markdown", ""),
        "char_count": md_res.get("char_count", 0),
        "total_pages": pages_res.get("total_pages", 0),
        "pages_converted": pages_res.get("pages_converted", 0),
        "pages_dir": pages_res.get("pages_dir", ""),
        "pages": pages_res.get("pages", [])
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "error": "Usage: doc_parser.py <file_path> [--convert-pages] [--both] [--output-dir DIR] [--dpi 150] [--quality 85] [--max-pages 30] [--range 1-10] [--no-base64]"}))
        sys.exit(1)

    args = sys.argv[1:]
    convert_mode = False
    both_mode = False
    target_path = None
    output_dir = None
    dpi = 150
    quality = 85
    max_pages = 30
    page_range = None
    include_base64 = True

    i = 0
    while i < len(args):
        arg = args[i]
        if arg == "--convert-pages":
            convert_mode = True
        elif arg == "--both":
            both_mode = True
        elif arg == "--output-dir" and i + 1 < len(args):
            output_dir = args[i + 1]
            i += 1
        elif arg == "--dpi" and i + 1 < len(args):
            dpi = int(args[i + 1])
            i += 1
        elif arg == "--quality" and i + 1 < len(args):
            quality = int(args[i + 1])
            i += 1
        elif arg == "--max-pages" and i + 1 < len(args):
            max_pages = int(args[i + 1])
            i += 1
        elif arg in ("--range", "--page-range") and i + 1 < len(args):
            page_range = args[i + 1]
            i += 1
        elif arg == "--no-base64":
            include_base64 = False
        elif not arg.startswith("--") and target_path is None:
            target_path = arg
        i += 1

    if not target_path:
        print(json.dumps({"status": "error", "error": "No target file path specified"}))
        sys.exit(1)

    if both_mode:
        result = parse_and_convert_document(target_path, max_pages=max_pages)
    elif convert_mode:
        result = convert_document_to_page_images(
            target_path,
            output_dir=output_dir,
            dpi=dpi,
            quality=quality,
            max_pages=max_pages,
            page_range=page_range,
            include_base64=include_base64
        )
    else:
        result = parse_document_to_markdown(target_path)

    print(json.dumps(result))

