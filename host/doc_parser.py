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

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "error": "Usage: doc_parser.py <file_path>"}))
        sys.exit(1)

    target_path = sys.argv[1]
    result = parse_document_to_markdown(target_path)
    print(json.dumps(result))
