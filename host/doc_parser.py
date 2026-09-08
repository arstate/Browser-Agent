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
import concurrent.futures

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

def auto_purge_document_cache(max_age_hours: int = 24, max_cache_mb: int = 50) -> dict:
    """
    Cleans up old ephemeral page images:
    - Scans ~/.browser-agent/cache/document_pages/ and legacy ~/.browser-agent/uploads/pages_*
    - Removes folders older than max_age_hours (default 24h)
    - If total remaining size > max_cache_mb (default 50MB), removes oldest folders first
    Preserves all original master PDF/DOCX files.
    """
    cache_dirs = []
    base_cache = os.path.expanduser("~/.browser-agent/cache/document_pages")
    uploads_dir = os.path.expanduser("~/.browser-agent/uploads")

    if os.path.exists(base_cache):
        for item in os.listdir(base_cache):
            p = os.path.join(base_cache, item)
            if os.path.isdir(p) and item.startswith("pages_"):
                cache_dirs.append(p)

    if os.path.exists(uploads_dir):
        for item in os.listdir(uploads_dir):
            p = os.path.join(uploads_dir, item)
            if os.path.isdir(p) and item.startswith("pages_"):
                cache_dirs.append(p)

    now = time.time()
    deleted_count = 0
    freed_bytes = 0
    remaining_dirs = []

    def get_dir_size(d):
        total = 0
        try:
            for root, _, files in os.walk(d):
                for f in files:
                    fp = os.path.join(root, f)
                    if not os.path.islink(fp):
                        total += os.path.getsize(fp)
        except Exception:
            pass
        return total

    for d in cache_dirs:
        try:
            mtime = os.path.getmtime(d)
            age_hours = (now - mtime) / 3600.0
            if age_hours > max_age_hours:
                sz = get_dir_size(d)
                shutil.rmtree(d, ignore_errors=True)
                deleted_count += 1
                freed_bytes += sz
            else:
                remaining_dirs.append((d, mtime, get_dir_size(d)))
        except Exception:
            pass

    total_remaining = sum(item[2] for item in remaining_dirs)
    max_bytes = max_cache_mb * 1024 * 1024
    if total_remaining > max_bytes:
        remaining_dirs.sort(key=lambda x: x[1])
        target_size = int(max_bytes * 0.7)
        for d, mtime, sz in remaining_dirs:
            try:
                shutil.rmtree(d, ignore_errors=True)
                deleted_count += 1
                freed_bytes += sz
                total_remaining -= sz
                if total_remaining <= target_size:
                    break
            except Exception:
                pass

    return {
        "status": "ok",
        "deleted_dirs": deleted_count,
        "freed_mb": round(freed_bytes / (1024 * 1024), 2),
        "remaining_mb": round(total_remaining / (1024 * 1024), 2)
    }

def extract_document_outline(text: str, total_pages: int = 1) -> list:
    """
    Extracts high-level document chapters, sections, and structural bookmarks
    (e.g., BAB I, BAB II, DAFTAR ISI, DAFTAR TABEL, LAMPIRAN) to build a fast navigation index.
    """
    if not text:
        return []

    outline = []
    lines = text.splitlines()
    seen = set()

    patterns = [
        re.compile(r'^(BAB\s+[IVXLCDM\d]+[^\n\r]*)', re.IGNORECASE),
        re.compile(r'^(DAFTAR\s+(?:ISI|TABEL|GAMBAR|LAMPIRAN|PUSTAKA)[^\n\r]*)', re.IGNORECASE),
        re.compile(r'^(KATA\s+PENGANTAR[^\n\r]*)', re.IGNORECASE),
        re.compile(r'^(RINGKASAN|ABSTRAK|EXECUTIVE\s+SUMMARY)[^\n\r]*', re.IGNORECASE),
        re.compile(r'^(LAMPIRAN(?:\s+[A-Z0-9]+)?[^\n\r]*)', re.IGNORECASE),
        re.compile(r'^(\d+\.\d+\s+[A-Z][^\n\r]{3,60})', re.IGNORECASE),
    ]

    for line in lines:
        cleaned = line.strip()
        if not cleaned or len(cleaned) > 100 or len(cleaned) < 3:
            continue

        for pat in patterns:
            m = pat.match(cleaned)
            if m:
                heading = m.group(1).strip()
                norm = re.sub(r'\s+', ' ', heading).upper()
                if norm not in seen:
                    seen.add(norm)
                    outline.append({
                        "title": heading,
                        "raw": cleaned
                    })
                break

    return outline

def inspect_document_region(
    file_path: str,
    page_num: int = 1,
    region: str = "all",
    dpi: int = 250,
    quality: int = 90
) -> dict:
    """
    Renders a specific page at ultra-high resolution (250 DPI) and optionally crops to
    a target region ('top', 'bottom', 'center', 'table' / middle-third) using Pillow if available.
    """
    file_path = os.path.expanduser(file_path)
    if not os.path.exists(file_path):
        return {"status": "error", "error": f"File not found: {file_path}"}

    ext = os.path.splitext(file_path)[1].lower()
    temp_pdf_dir = None
    pdf_path = file_path

    if ext in {".docx", ".doc", ".odt", ".rtf", ".pptx", ".ppt"}:
        soffice_bin = shutil.which("soffice") or shutil.which("libreoffice")
        if not soffice_bin:
            return {"status": "error", "error": "LibreOffice not found to convert document"}
        temp_pdf_dir = tempfile.mkdtemp(prefix="ba_inspect_doc_")
        conv_cmd = [soffice_bin, "--headless", "--convert-to", "pdf", "--outdir", temp_pdf_dir, file_path]
        res = subprocess.run(conv_cmd, capture_output=True, text=True, timeout=60)
        if res.returncode != 0:
            if temp_pdf_dir and os.path.exists(temp_pdf_dir):
                shutil.rmtree(temp_pdf_dir, ignore_errors=True)
            return {"status": "error", "error": f"Failed to convert document: {res.stderr}"}
        pdf_cands = [f for f in os.listdir(temp_pdf_dir) if f.lower().endswith(".pdf")]
        if not pdf_cands:
            shutil.rmtree(temp_pdf_dir, ignore_errors=True)
            return {"status": "error", "error": "No PDF generated"}
        pdf_path = os.path.join(temp_pdf_dir, pdf_cands[0])

    tmp_dir = tempfile.mkdtemp(prefix="ba_inspect_page_")
    prefix = os.path.join(tmp_dir, f"inspect_p{page_num}")

    try:
        render_cmd = [
            "pdftoppm",
            "-f", str(page_num),
            "-l", str(page_num),
            "-jpeg",
            "-r", str(dpi),
            "-jpegopt", f"quality={quality},progressive=y",
            pdf_path,
            prefix
        ]
        res_r = subprocess.run(render_cmd, capture_output=True, text=True, timeout=30)
        if res_r.returncode != 0:
            shutil.rmtree(tmp_dir, ignore_errors=True)
            return {"status": "error", "error": f"pdftoppm render failed: {res_r.stderr}"}

        rendered_files = [f for f in os.listdir(tmp_dir) if f.endswith(".jpg")]
        if not rendered_files:
            shutil.rmtree(tmp_dir, ignore_errors=True)
            return {"status": "error", "error": "No image generated"}

        rendered_img_path = os.path.join(tmp_dir, rendered_files[0])
        final_img_path = rendered_img_path

        if region in ("top", "bottom", "center", "table"):
            try:
                from PIL import Image
                with Image.open(rendered_img_path) as im:
                    w, h = im.size
                    crop_box = None
                    if region == "top":
                        crop_box = (0, 0, w, int(h * 0.45))
                    elif region == "bottom":
                        crop_box = (0, int(h * 0.55), w, h)
                    elif region in ("center", "table"):
                        crop_box = (0, int(h * 0.25), w, int(h * 0.75))

                    if crop_box:
                        cropped = im.crop(crop_box)
                        cropped_path = os.path.join(tmp_dir, f"cropped_{region}.jpg")
                        cropped.save(cropped_path, format="JPEG", quality=quality)
                        final_img_path = cropped_path
            except Exception:
                pass

        with open(final_img_path, "rb") as f:
            raw_bytes = f.read()
            b64 = base64.b64encode(raw_bytes).decode("ascii")
            data_url = f"data:image/jpeg;base64,{b64}"

        return {
            "status": "ok",
            "page": page_num,
            "region": region,
            "dpi": dpi,
            "file_name": os.path.basename(file_path),
            "file_path": file_path,
            "data_url": data_url,
            "file_size_kb": round(len(raw_bytes) / 1024, 1)
        }
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        if temp_pdf_dir and os.path.exists(temp_pdf_dir):
            shutil.rmtree(temp_pdf_dir, ignore_errors=True)

def convert_document_to_page_images(
    file_path: str,
    output_dir: str = None,
    dpi: int = 150,
    quality: int = 88,
    max_pages: int = 35,
    page_range: str = None,
    img_format: str = "jpg",
    include_base64: bool = True
) -> dict:
    """
    Converts pages of a PDF, Word (DOCX/DOC), ODT, RTF, or PPTX document
    into sequential, high-resolution, lightweight page images (150 DPI JPG/PNG).
    Features:
      - 4x Multi-Core Parallel Chunked Rendering via ThreadPoolExecutor
      - Ephemeral Cache Isolation in ~/.browser-agent/cache/document_pages/
      - Auto-Purge of expired caches (TTL 24h, 50MB quota cap)
      - Document Structure & Outline Mapping
      - Strict sequential page ordering (1, 2, 3... N)
      - Extracted per-page text for dual-layer vision & text accuracy.
    """
    file_path = os.path.expanduser(file_path)
    if not os.path.exists(file_path):
        return {"status": "error", "error": f"File not found: {file_path}"}

    # Proactively trigger auto-purge on old transient cache
    try:
        auto_purge_document_cache(max_age_hours=24, max_cache_mb=50)
    except Exception:
        pass

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

        # Step 4: Setup output directory in cache
        if not output_dir:
            cache_base = os.path.expanduser("~/.browser-agent/cache/document_pages")
            os.makedirs(cache_base, exist_ok=True)
            timestamp = int(time.time() * 1000)
            output_dir = os.path.join(cache_base, f"pages_{timestamp}_{clean_name}")
        os.makedirs(output_dir, exist_ok=True)

        raw_tmp_dir = tempfile.mkdtemp(prefix="ba_render_pages_")

        # Step 5: Render pages - Multi-Core ThreadPool Parallel Rendering
        rendered = False
        total_to_render = max(1, last_page - first_page + 1)
        available_cores = os.cpu_count() or 4
        num_workers = min(4, available_cores, total_to_render)

        if shutil.which("pdftoppm") and total_to_render >= 4 and num_workers > 1:
            chunk_size = (total_to_render + num_workers - 1) // num_workers
            chunks = []
            curr = first_page
            while curr <= last_page:
                chunk_end = min(curr + chunk_size - 1, last_page)
                chunks.append((curr, chunk_end, len(chunks)))
                curr = chunk_end + 1

            def render_chunk(f_pg, l_pg, chunk_id):
                c_prefix = os.path.join(raw_tmp_dir, f"chunk_{chunk_id}")
                cmd = [
                    "pdftoppm",
                    "-f", str(f_pg),
                    "-l", str(l_pg),
                    "-jpeg" if img_format in ("jpg", "jpeg") else "-png",
                    "-r", str(dpi)
                ]
                if img_format in ("jpg", "jpeg"):
                    cmd.extend(["-jpegopt", f"quality={quality},progressive=y"])
                cmd.extend([pdf_path, c_prefix])
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                return res.returncode == 0

            with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
                futures = [executor.submit(render_chunk, c[0], c[1], c[2]) for c in chunks]
                results = [f.result() for f in concurrent.futures.as_completed(futures)]
                if all(results):
                    rendered = True

        # Sequential pdftoppm fallback if parallel wasn't used or had an error
        if not rendered and shutil.which("pdftoppm"):
            prefix = os.path.join(raw_tmp_dir, "raw_page")
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
            prefix = os.path.join(raw_tmp_dir, "raw_page")
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
        raw_files = [f for f in os.listdir(raw_tmp_dir) if f.endswith(f".{img_format}") or f.endswith(".jpg") or f.endswith(".png")]
        def get_pg_num(fn):
            match = re.search(r'-(\d+)\.[a-zA-Z0-9]+$', fn)
            if match:
                return int(match.group(1))
            m2 = re.search(r'(\d+)', fn)
            return int(m2.group(1)) if m2 else 0

        # Sort naturally by exact page number (1, 2, 3... N)
        raw_files.sort(key=get_pg_num)

        # Fast single-pass page text extraction via pdftotext form-feed (\x0c)
        page_texts = {}
        all_extracted_text = ""
        if shutil.which("pdftotext"):
            try:
                txt_cmd = ["pdftotext", "-f", str(first_page), "-l", str(last_page), "-layout", pdf_path, "-"]
                res_txt = subprocess.run(txt_cmd, capture_output=True, text=True, timeout=20)
                if res_txt.returncode == 0 and res_txt.stdout:
                    all_extracted_text = res_txt.stdout
                    chunks = res_txt.stdout.split("\x0c")
                    for offset, chunk in enumerate(chunks):
                        pg_num = first_page + offset
                        page_texts[pg_num] = chunk.strip()
            except Exception:
                pass

        doc_outline = extract_document_outline(all_extracted_text, total_pages=total_pages)

        pages = []
        for raw_f in raw_files:
            pg_idx = get_pg_num(raw_f)
            src_p = os.path.join(raw_tmp_dir, raw_f)
            dest_filename = f"page_{pg_idx:03d}.{img_format}"
            dest_path = os.path.join(output_dir, dest_filename)
            shutil.copy2(src_p, dest_path)

            file_sz = os.path.getsize(dest_path)

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
            "parallel_engine": num_workers > 1,
            "workers_used": num_workers if rendered else 1,
            "outline": doc_outline,
            "pages": pages
        }
    finally:
        if temp_pdf_dir and os.path.exists(temp_pdf_dir):
            shutil.rmtree(temp_pdf_dir, ignore_errors=True)

def parse_and_convert_document(file_path: str, max_pages: int = 35, dpi: int = 150, quality: int = 88) -> dict:
    """Convenience helper returning both clean Markdown and page images."""
    md_res = parse_document_to_markdown(file_path)
    pages_res = convert_document_to_page_images(file_path, max_pages=max_pages, dpi=dpi, quality=quality)
    outline = pages_res.get("outline") or extract_document_outline(md_res.get("markdown", ""))
    return {
        "status": "ok" if (md_res.get("status") == "ok" or pages_res.get("status") == "ok") else "error",
        "file_name": os.path.basename(file_path),
        "file_path": file_path,
        "markdown": md_res.get("markdown", ""),
        "char_count": md_res.get("char_count", 0),
        "total_pages": pages_res.get("total_pages", 0),
        "pages_converted": pages_res.get("pages_converted", 0),
        "pages_dir": pages_res.get("pages_dir", ""),
        "outline": outline,
        "pages": pages_res.get("pages", [])
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "error": "Usage: doc_parser.py <file_path> [--convert-pages] [--both] [--inspect-page N] [--region R] [--clean-cache]"}))
        sys.exit(1)

    args = sys.argv[1:]
    if "--clean-cache" in args:
        res = auto_purge_document_cache(max_age_hours=24, max_cache_mb=50)
        print(json.dumps(res))
        sys.exit(0)

    convert_mode = False
    both_mode = False
    inspect_mode = False
    inspect_page_num = 1
    inspect_region = "all"
    target_path = None
    output_dir = None
    dpi = 150
    quality = 88
    max_pages = 35
    page_range = None
    include_base64 = True

    i = 0
    while i < len(args):
        arg = args[i]
        if arg == "--convert-pages":
            convert_mode = True
        elif arg == "--both":
            both_mode = True
        elif arg == "--inspect-page" and i + 1 < len(args):
            inspect_mode = True
            try:
                inspect_page_num = int(args[i + 1])
            except ValueError:
                inspect_page_num = 1
            i += 1
        elif arg == "--region" and i + 1 < len(args):
            inspect_region = args[i + 1]
            i += 1
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

    if inspect_mode:
        result = inspect_document_region(
            target_path,
            page_num=inspect_page_num,
            region=inspect_region,
            dpi=dpi if dpi != 150 else 250,
            quality=quality if quality != 88 else 90
        )
    elif both_mode:
        result = parse_and_convert_document(target_path, max_pages=max_pages, dpi=dpi, quality=quality)
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

