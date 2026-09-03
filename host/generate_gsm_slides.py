import math
import os
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch

# Canvas dimensions 16:9 Landscape (1920x1080 pt / 16:9)
WIDTH = 1920
HEIGHT = 1080

# Official Brand Colors
C_CANVAS_BASE = HexColor('#F5F2EB')
C_CANVAS_CARD = HexColor('#FBF9F5')
C_CANVAS_WHITE = HexColor('#FFFFFF')
C_TEXT_PRIMARY = HexColor('#0F1115')
C_TEXT_MUTED = HexColor('#64748B')
C_ACTION_HERO = HexColor('#FF3E1D')
C_ACTION_HOVER = HexColor('#E03212')
C_TECH_COBALT = HexColor('#2563EB')
C_POP_WASABI = HexColor('#E2F952')
C_BORDER_SUBTLE = HexColor('#E2DDD5')
C_BORDER_BOLD = HexColor('#0F1115')
C_GRID_LINE = HexColor('#EAE5DC')
C_CYAN_TECH = HexColor('#0284C7')

OUTPUT_DIR = os.path.expanduser("~/Downloads/Djadi_Master_GSM_50_Pages/GSM")
OUTPUT_PDF = os.path.join(OUTPUT_DIR, "GSM Djadi Creative.pdf")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def draw_background_grid(c):
    c.setFillColor(C_CANVAS_BASE)
    c.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    
    # Subtle 0.5px hairline architectural grid
    c.setStrokeColor(C_GRID_LINE)
    c.setLineWidth(0.75)
    
    step = 80
    for x in range(step, WIDTH, step):
        c.line(x, 0, x, HEIGHT)
    for y in range(step, HEIGHT, step):
        c.line(0, y, WIDTH, y)

def draw_header_footer(c, slide_num, category="PANDUAN STANDAR GRAFIS (GSM v2.5)"):
    # Header Top Bar (Safe zone Y: 1000 - 1040)
    c.setStrokeColor(C_BORDER_SUBTLE)
    c.setLineWidth(1)
    c.line(80, 1000, WIDTH - 80, 1000)
    
    # Category badge
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(80, 1015, "DJADI CREATIVE")
    
    c.setFillColor(C_TECH_COBALT)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(230, 1015, f"// {category.upper()}")
    
    # Right meta info
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 11)
    c.drawRightString(WIDTH - 80, 1015, "SISTEM IDENTITAS LOGO RESMI • EDISI PERUSAHAAN")
    
    # Footer Bottom Bar (Safe zone Y: 60)
    c.setStrokeColor(C_BORDER_SUBTLE)
    c.setLineWidth(1)
    c.line(80, 70, WIDTH - 80, 70)
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(80, 48, "DOKUMEN HAK CIPTA © 2026 DJADI CREATIVE (PT DJADI KREATIF DIGITAL NUSANTARA). HAK CIPTA DILINDUNGI.")
    
    # Slide pagination badge
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 13)
    c.drawRightString(WIDTH - 80, 48, f"HALAMAN {slide_num:02d} / 50")

def draw_logo_mark(c, x, y, scale=1.0, color_d=C_ACTION_HERO, color_arrow=C_CANVAS_WHITE, color_sparks=C_ACTION_HERO):
    c.saveState()
    c.translate(x, y)
    c.scale(scale, scale)
    
    # 1. Base 'D' Shape: solid rounded D
    # Width ~140, Height ~140, Origin (-70, -70)
    p = c.beginPath()
    # Left vertical stem
    p.moveTo(-60, -60)
    p.lineTo(-60, 60)
    # Top edge and curve
    p.lineTo(0, 60)
    p.curveTo(40, 60, 60, 35, 60, 0)
    p.curveTo(60, -35, 40, -60, 0, -60)
    p.lineTo(-60, -60)
    p.closeSubpath()
    
    c.setFillColor(color_d)
    c.drawPath(p, fill=1, stroke=0)
    
    # 2. Inner White Looping Growth Arrow
    # Continuous fluid loop starting bottom, curving up, ending in 45-degree arrow
    c.setFillColor(color_arrow)
    c.setStrokeColor(color_arrow)
    c.setLineWidth(14)
    c.setLineCap(1) # Round cap
    c.setLineJoin(1) # Round join
    
    # Loop path
    lp = c.beginPath()
    lp.moveTo(-25, -25)
    lp.curveTo(-40, -25, -40, 5, -20, 5)
    lp.curveTo(0, 5, 5, -15, 15, 5)
    lp.lineTo(25, 20)
    c.drawPath(lp, fill=0, stroke=1)
    
    # Arrow head (at 25, 20 pointing 45 deg NE)
    ap = c.beginPath()
    ap.moveTo(10, 25)
    ap.lineTo(30, 25)
    ap.lineTo(30, 5)
    ap.closeSubpath()
    c.drawPath(ap, fill=1, stroke=0)
    
    # 3. Three Spark Rays radiating outside upper-right curve
    c.setStrokeColor(color_sparks)
    c.setLineWidth(10)
    c.setLineCap(1)
    
    # Spark 1 (approx 75 deg)
    c.line(38, 70, 45, 88)
    # Spark 2 (approx 45 deg)
    c.line(62, 55, 76, 68)
    # Spark 3 (approx 15 deg)
    c.line(72, 30, 90, 35)
    
    c.restoreState()

def draw_card(c, x, y, w, h, bg=C_CANVAS_CARD, border_color=C_BORDER_SUBTLE, border_width=1, corner_radius=12):
    c.setFillColor(bg)
    c.setStrokeColor(border_color)
    c.setLineWidth(border_width)
    c.roundRect(x, y, w, h, corner_radius, fill=1, stroke=1)

def draw_badge(c, x, y, text, bg=C_TECH_COBALT, fg=C_CANVAS_WHITE, font_size=11, pad_x=12, pad_y=5):
    c.setFont("Helvetica-Bold", font_size)
    text_w = c.stringWidth(text, "Helvetica-Bold", font_size)
    w = text_w + pad_x * 2
    h = font_size + pad_y * 2
    
    c.setFillColor(bg)
    c.roundRect(x, y, w, h, 4, fill=1, stroke=0)
    
    c.setFillColor(fg)
    c.drawString(x + pad_x, y + pad_y + 1, text)
    return w

# -------------------------------------------------------------
# SLIDE BUILDERS (1 TO 10)
# -------------------------------------------------------------

def build_slide_01(c):
    # COVER SLIDE
    draw_background_grid(c)
    
    # Document ID top meta
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(100, 980, "[DOKUMEN_ID: GSM-LOGO-50P // CETAK_BIRU_UTAMA]")
    
    draw_badge(c, 100, 935, "EDISI RESMI PERUSAHAAN v2.5", bg=C_TECH_COBALT, fg=C_CANVAS_WHITE, font_size=12, pad_x=14, pad_y=6)
    draw_badge(c, 370, 935, "PANDUAN LENGKAP 50 HALAMAN", bg=C_POP_WASABI, fg=C_TEXT_PRIMARY, font_size=12, pad_x=14, pad_y=6)
    
    # Center Big Card with Master Logo
    card_w = 1720
    card_h = 750
    draw_card(c, 100, 150, card_w, card_h, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=2, corner_radius=16)
    
    # Inside Card Layout (Split Left & Right)
    # Left: Big Icon Monogram
    draw_logo_mark(c, 400, 525, scale=2.8)
    
    # Divider line
    c.setStrokeColor(C_BORDER_SUBTLE)
    c.setLineWidth(1.5)
    c.line(700, 220, 700, 830)
    
    # Right: Massive Typography
    rx = 760
    c.setFillColor(C_ACTION_HERO)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(rx, 750, "PANDUAN STANDAR GRAFIS RESMI (GSM)")
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 54)
    c.drawString(rx, 670, "DJADI CREATIVE")
    
    # Cobalt badge for wordmark secondary
    draw_badge(c, rx, 600, "AGENCY BRANDING & PERFORMANCE", bg=C_TECH_COBALT, fg=C_CANVAS_WHITE, font_size=16, pad_x=18, pad_y=8)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(rx, 530, "Spesifikasi Baku Identitas Visual & Rekayasa Logo")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 16)
    intro_lines = [
        "Dokumen tata kelola identitas visual resmi agensi Djadi Creative.",
        "Mengatur anatomi geometris logo monogram 'D', kurva panah kinetik 45°,",
        "tiga percikan pancaran pertumbuhan, sistem warna 60-30-10, dan aturan",
        "penerapan lintas media cetak, antarmuka digital, serta billboard skala besar."
    ]
    cur_y = 470
    for line in intro_lines:
        c.drawString(rx, cur_y, line)
        cur_y -= 26
        
    # Bottom info grid in cover card
    c.setStrokeColor(C_BORDER_SUBTLE)
    c.setLineWidth(1)
    c.line(rx, 320, 1740, 320)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(rx, 280, "PENANGGUNG JAWAB UTAMA:")
    c.drawString(rx + 320, 280, "TANGGAL PENETAPAN:")
    c.drawString(rx + 620, 280, "STATUS DOKUMEN:")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 13)
    c.drawString(rx, 255, "Direksi & Tim Kreatif Djadi")
    c.drawString(rx + 320, 255, "September 2026 (Tahun Berjalan)")
    c.drawString(rx + 620, 255, "TERKUNCI & TERVALIDASI 100%")

    # Footer
    draw_header_footer(c, 1, category="SAMPUL DOKUMEN GSM")

def build_slide_02(c):
    # MANIFESTO SLIDE
    draw_background_grid(c)
    draw_header_footer(c, 2, category="BAB 01 // FONDASI & MANIFESTO BRAND")
    
    # Title Section
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(100, 920, "01 // MANIFESTO EKSEKUTIF: KEPASTIAN PERTUMBUHAN")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 16)
    c.drawString(100, 885, "Mengubah Strategi Pemasaran Menjadi Hasil Riil Melalui Presisi Data & Momentum Kreatif.")
    
    # Left Card: Big Highlight Quote & Core Belief
    draw_card(c, 100, 160, 1040, 680, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    # Red accent bar on left of quote
    c.setFillColor(C_ACTION_HERO)
    c.roundRect(140, 640, 12, 140, 4, fill=1, stroke=0)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 32)
    c.drawString(170, 735, "\"Ide hebat tanpa eksekusi hanyalah ilusi.")
    c.drawString(170, 690, "Di Djadi Creative, kami memastikan setiap gagasan")
    c.setFillColor(C_ACTION_HERO)
    c.drawString(170, 645, "benar-benar DJADI dan menghasilkan dampak riil.\"")
    
    # Manifesto body paragraph
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica", 17)
    manifesto_text = [
        "Nama 'Djadi' bukan sekadar sebutan merek, melainkan janji operasional dan filosofi kerja.",
        "Kami menolak birokrasi bertele-tele, presentasi hampa tanpa hasil, serta desain kosmetik yang",
        "tidak menggerakkan roda konversi penjualan.",
        "",
        "Setiap kurva dalam identitas visual kami merefleksikan pergerakan naik (Growth Loop Arrow),",
        "didukung oleh tiga pancaran daya ledak kreatif (Spark Rays) yang terukur secara matematis.",
        "Kami memadukan disiplin analitik data performa iklan dengan standar seni desain visual Swiss",
        "Modernism untuk melahirkan pertumbuhan bisnis yang konsisten dan berkelanjutan."
    ]
    my = 570
    for p in manifesto_text:
        c.drawString(140, my, p)
        my -= 30
        
    # Signature box inside left card
    c.setStrokeColor(C_BORDER_SUBTLE)
    c.setLineWidth(1)
    c.line(140, 270, 1080, 270)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(140, 235, "Bachtiar Arya (CEO & Strategist)")
    c.drawString(480, 235, "Tim Direksi Djadi Creative")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 13)
    c.drawString(140, 210, "Founder & Performance Director")
    c.drawString(480, 210, "Divisi Branding & Visual System")
    
    # Right Side: 2 Modular Focus Cards
    # Card Right 1: Visual Icon Symbolism
    draw_card(c, 1170, 520, 650, 320, bg=C_CANVAS_CARD, border_color=C_BORDER_SUBTLE, border_width=1, corner_radius=14)
    draw_logo_mark(c, 1270, 680, scale=1.1)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(1370, 710, "Simbol Kepastian & Eksekusi")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 14)
    sym_lines = [
        "Monogram 'D' tebal solid mewakili fondasi",
        "stabilitas bisnis yang kokoh dan teruji.",
        "Aksen Signal Vermillion Orange memicu",
        "energi, urgensi aksi, dan konversi tinggi."
    ]
    sy = 670
    for sl in sym_lines:
        c.drawString(1370, sy, sl)
        sy -= 24
        
    # Card Right 2: 3 Core Pillars
    draw_card(c, 1170, 160, 650, 330, bg=C_CANVAS_CARD, border_color=C_BORDER_SUBTLE, border_width=1, corner_radius=14)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(1210, 440, "3 Janji Inti untuk Setiap Klien:")
    
    pillars = [
        ("01", "Presisi Data Analitik", "Setiap keputusan kreatif berbasis metrik riil & ROI."),
        ("02", "Kecepatan Tanpa Hambatan", "Eksekusi sat-set, ringkas, terarah, dan solutif."),
        ("03", "Standar Visual Kelas Dunia", "Estetika modern Swiss bebas elemen murahan.")
    ]
    py = 390
    for num, title, desc in pillars:
        c.setFillColor(C_ACTION_HERO)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(1210, py, num)
        
        c.setFillColor(C_TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 15)
        c.drawString(1250, py, title)
        
        c.setFillColor(C_TEXT_MUTED)
        c.setFont("Helvetica", 13)
        c.drawString(1250, py - 20, desc)
        py -= 65

def build_slide_03(c):
    # PHILOSOPHY & ETYMOLOGY
    draw_background_grid(c)
    draw_header_footer(c, 3, category="BAB 01 // FILOSOFI & ETIMOLOGI BRAND")
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(100, 920, "01 // FILOSOFI EJAAN HISTORIS & ANATOMI MAKNA")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 16)
    c.drawString(100, 885, "Menghubungkan Warisan Budaya Nusantara dengan Akselerasi Pertumbuhan Modern.")
    
    # 3 Horizontal Modular Cards
    card_w = 545
    card_h = 680
    gap = 42
    
    # Card 1: Ejaan Klasik 'Djadi'
    x1 = 100
    draw_card(c, x1, 160, card_w, card_h, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    draw_badge(c, x1 + 35, 780, "PILAR MAKNA 01", bg=C_ACTION_HERO, fg=C_CANVAS_WHITE, font_size=12, pad_x=12, pad_y=6)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(x1 + 35, 725, "Ejaan Historis 'Djadi'")
    
    c.setFillColor(C_TECH_COBALT)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x1 + 35, 685, "Makna: Terwujud • Sukses • Nyata")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 15)
    c1_text = [
        "Penggunaan huruf 'Dj' mengadopsi",
        "ejaan klasik Nusantara (Van Ophuijsen",
        "& Soewandi) yang sarat akan wibawa,",
        "keaslian, dan ketegasan karakter.",
        "",
        "Secara semantik, kata 'Djadi' adalah",
        "konfirmasi keberhasilan atas proses.",
        "Ini menjadi janji bahwa semua strategi,",
        "kampanye iklan, dan desain visual akan",
        "benar-benar membuahkan hasil nyata."
    ]
    ty = 635
    for t in c1_text:
        c.drawString(x1 + 35, ty, t)
        ty -= 26
        
    # Card 2: Inner Growth Arrow
    x2 = x1 + card_w + gap
    draw_card(c, x2, 160, card_w, card_h, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    draw_badge(c, x2 + 35, 780, "PILAR MAKNA 02", bg=C_TECH_COBALT, fg=C_CANVAS_WHITE, font_size=12, pad_x=12, pad_y=6)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(x2 + 35, 725, "Kurva Panah Kinetik")
    
    c.setFillColor(C_TECH_COBALT)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x2 + 35, 685, "Makna: Continuous Growth Loop")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 15)
    c2_text = [
        "Garis putih kontinu melingkar dari",
        "dasar kurva ke atas melambangkan siklus",
        "optimasi tiada henti (iterative testing).",
        "",
        "Ujung panah membulat mengarah 45°",
        "ke kanan atas (Northeast Growth Vector),",
        "merefleksikan penskalaan omzet (scaling),",
        "efisiensi CPR iklan, dan akselerasi",
        "jangka panjang yang stabil."
    ]
    ty = 635
    for t in c2_text:
        c.drawString(x2 + 35, ty, t)
        ty -= 26
        
    # Card 3: 3 Spark Rays
    x3 = x2 + card_w + gap
    draw_card(c, x3, 160, card_w, card_h, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    draw_badge(c, x3 + 35, 780, "PILAR MAKNA 03", bg=C_POP_WASABI, fg=C_TEXT_PRIMARY, font_size=12, pad_x=12, pad_y=6)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(x3 + 35, 725, "3 Percikan Cahaya")
    
    c.setFillColor(C_TECH_COBALT)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x3 + 35, 685, "Makna: Viral Reach & Dampak")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 15)
    c3_text = [
        "Tiga balok lonjong (pill spark rays) di",
        "luar sudut kanan atas monogram 'D'",
        "melambangkan daya pancar inovasi:",
        "",
        "1. Percikan Ide & Gagasan Segar",
        "2. Daya Jangkau Viralitas Konten",
        "3. Konversi Penjualan Eksponensial",
        "",
        "Menjadi aksen dinamis yang menegaskan",
        "antusiasme dan energi positif agensi."
    ]
    ty = 635
    for t in c3_text:
        c.drawString(x3 + 35, ty, t)
        ty -= 26

def build_slide_04(c):
    # MISSION & 4 ACTION PILLARS
    draw_background_grid(c)
    draw_header_footer(c, 4, category="BAB 01 // MISI STRATEGIS & 4 PILAR AKSI")
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(100, 920, "01 // MISI STRATEGIS & 4 PILAR LAYANAN AKSI")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 16)
    c.drawString(100, 885, "Ekosistem Pertumbuhan Lengkap: Dari Akuisisi Trafik Hingga Edukasi Mentoring.")
    
    # 4 Horizontal Stacked Pillar Cards
    pillars_data = [
        ("PILAR 01", "Precision Meta Ads & CPR Hacking", 
         "Arsitektur kampanye Advantage+ CBO terpusat, pengujian 3-Hook video dinamis, eliminasi junk leads, dan optimasi CPR super efisien di bawah benchmark pasar untuk mendatangkan prospek siap closing."),
        ("PILAR 02", "Omnichannel Organic SEO & GEO Dominance", 
         "Dominasi mesin pencari multi-modal, optimasi Generative Engine Optimization (SearchGPT, Perplexity AI, Google AI Overviews), Core Web Vitals berkecepatan tinggi, dan local map dominance."),
        ("PILAR 03", "High-Retention Visual & Kinetic Design", 
         "Produksi aset grafis feed carousel 4:5, Instagram Reels 9:16 high-hook retention, perancangan identitas merek GSM kelas enterprise, dan UI/UX modern berbasis Swiss Brutalist estetik."),
        ("PILAR 04", "Djadi Academy (Mentoring & Transfer Knowledge)", 
         "Program edukasi 1-on-1 private mentoring dan kurikulum praktis untuk meningkatkan kapabilitas tim internal klien agar mandiri dalam mengelola kampanye performa tinggi.")
    ]
    
    py = 720
    card_h = 145
    for badge, title, desc in pillars_data:
        draw_card(c, 100, py, 1720, card_h, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.2, corner_radius=14)
        
        # Pillar Badge
        draw_badge(c, 135, py + 85, badge, bg=C_ACTION_HERO if "01" in badge or "03" in badge else C_TECH_COBALT, fg=C_CANVAS_WHITE, font_size=12, pad_x=14, pad_y=5)
        
        # Pillar Title
        c.setFillColor(C_TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 22)
        c.drawString(250, py + 90, title)
        
        # Pillar Description
        c.setFillColor(C_TEXT_MUTED)
        c.setFont("Helvetica", 15)
        c.drawString(135, py + 40, desc)
        
        py -= 175

def build_slide_05(c):
    # CORE VALUES & DUAL-TRACK MODEL
    draw_background_grid(c)
    draw_header_footer(c, 5, category="BAB 01 // NILAI INTI & MODEL BISNIS")
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(100, 920, "01 // NILAI INTI 'J-A-D-I' & DUAL-TRACK MODEL")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 16)
    c.drawString(100, 885, "Pedoman Etika Kerja Agensi dan Arsitektur Penetrasi Pasar.")
    
    # Left Box: J-A-D-I Values (Width: 830)
    draw_card(c, 100, 160, 830, 680, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    draw_badge(c, 140, 780, "NILAI OPERASIONAL RESMI", bg=C_ACTION_HERO, fg=C_CANVAS_WHITE, font_size=12, pad_x=14, pad_y=6)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(140, 730, "Akronim Nilai: J - A - D - I")
    
    jadi_items = [
        ("J", "Jujur & Transparan", "Laporan dashboard metrik iklan apa adanya tanpa manipulasi angka performa."),
        ("A", "Adaptif & Tangkas", "Cepat beradaptasi terhadap perubahan algoritma media sosial dan tren pasar."),
        ("D", "Dampak Nyata", "Fokus tunggal pada metrik yang menggerakkan omzet riil dan kepuasan klien."),
        ("I", "Inovasi Berkelanjutan", "Pemanfaatan alur kerja kecerdasan buatan (AI) mutakhir tanpa kompromi kualitas.")
    ]
    jy = 660
    for letter, heading, desc in jadi_items:
        # Red letter box
        c.setFillColor(C_ACTION_HERO)
        c.roundRect(140, jy - 38, 45, 45, 8, fill=1, stroke=0)
        c.setFillColor(C_CANVAS_WHITE)
        c.setFont("Helvetica-Bold", 24)
        c.drawCenterString(162, jy - 27, letter)
        
        c.setFillColor(C_TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(205, jy - 10, heading)
        
        c.setFillColor(C_TEXT_MUTED)
        c.setFont("Helvetica", 14)
        c.drawString(205, jy - 30, desc)
        
        jy -= 95
        
    # Right Box: Dual-Track Business Model (Width: 845)
    draw_card(c, 975, 160, 845, 680, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    draw_badge(c, 1015, 780, "STRUKTUR PENETRASI PASAR", bg=C_TECH_COBALT, fg=C_CANVAS_WHITE, font_size=12, pad_x=14, pad_y=6)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(1015, 730, "Dual-Track Execution Model")
    
    # Track 1 Card Inside
    draw_card(c, 1015, 455, 765, 225, bg=C_CANVAS_CARD, border_color=C_BORDER_SUBTLE, border_width=1, corner_radius=12)
    draw_badge(c, 1045, 625, "TRACK 01", bg=C_ACTION_HERO, fg=C_CANVAS_WHITE, font_size=11, pad_x=10, pad_y=4)
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(1140, 632, "Direct Growth Partnership (Startup & Brand)")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 14)
    t1_lines = [
        "Kolaborasi langsung dengan pemilik bisnis, startup, dan korporasi.",
        "Menyediakan solusi full-funnel: Audit Merek, Produksi Konten Kreatif,",
        "Meta Ads Performance, Landing Page Conversion, dan WhatsApp Closing Setup."
    ]
    ty1 = 585
    for l in t1_lines:
        c.drawString(1045, ty1, l)
        ty1 -= 24
        
    # Track 2 Card Inside
    draw_card(c, 1015, 200, 765, 225, bg=C_CANVAS_CARD, border_color=C_BORDER_SUBTLE, border_width=1, corner_radius=12)
    draw_badge(c, 1045, 370, "TRACK 02", bg=C_TECH_COBALT, fg=C_CANVAS_WHITE, font_size=11, pad_x=10, pad_y=4)
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(1140, 377, "White-Label & Agency Fulfillment Partner")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 14)
    t2_lines = [
        "Bermitra di belakang layar dengan agensi periklanan lain (B2B Fulfillment).",
        "Menjadi mesin eksekusi teknis untuk kampanye performa tinggi, riset data,",
        "dan perancangan sistem visual komprehensif tanpa mencantumkan identitas kami."
    ]
    ty2 = 330
    for l in t2_lines:
        c.drawString(1045, ty2, l)
        ty2 -= 24

def build_slide_06(c):
    # LOGO GEOMETRY & MODULAR 16x16 GRID
    draw_background_grid(c)
    draw_header_footer(c, 6, category="BAB 02 // GEOMETRI LOGO & CETAK BIRU")
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(100, 920, "02 // CETAK BIRU KONSTRUKSI VEKTOR & GRID MODULAR 16x16")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 16)
    c.drawString(100, 885, "Proporsi Geometris Berpresisi Tinggi dengan Toleransi 0.01 mm untuk Skalabilitas Mutlak.")
    
    # Left Blueprint Canvas Card (Width: 980)
    bx = 100
    by = 160
    bw = 980
    bh = 680
    draw_card(c, bx, by, bw, bh, bg=HexColor('#0F172A'), border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    # Draw CAD Blue Grid inside
    c.setStrokeColor(HexColor('#1E293B'))
    c.setLineWidth(1)
    for gx in range(bx + 40, bx + bw - 20, 40):
        c.line(gx, by + 30, gx, by + bh - 30)
    for gy in range(by + 40, by + bh - 20, 40):
        c.line(bx + 30, gy, bx + bw - 30, gy)
        
    # Center Tech Logo Drawing
    draw_logo_mark(c, bx + bw/2, by + bh/2 + 10, scale=2.4)
    
    # CAD Dimension lines and callouts in Cyan
    c.setStrokeColor(HexColor('#38BDF8'))
    c.setLineWidth(1)
    # Dimension box
    c.rect(bx + 230, by + 130, 520, 460, fill=0, stroke=1)
    
    c.setFillColor(HexColor('#38BDF8'))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(bx + 240, by + 570, "GRID MASTER: 16X x 16X")
    c.drawString(bx + 620, by + 145, "RADIUS UTAMA: R = 8X")
    c.drawRightString(bx + bw - 50, by + bh - 60, "TOLERANSI: ±0.01mm")
    
    # Right Side: Specification Data Table (Width: 695)
    tx = 1125
    tw = 695
    draw_card(c, tx, by, tw, bh, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    draw_badge(c, tx + 40, 780, "PARAMETRI GEOMETRIS", bg=C_TECH_COBALT, fg=C_CANVAS_WHITE, font_size=12, pad_x=14, pad_y=6)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(tx + 40, 730, "Tabel Rasio Konstruksi")
    
    specs = [
        ("Tinggi Keseluruhan", "16X (Unit Dasar Konstruksi)", "Tinggi master monogram 'D'"),
        ("Lebar Batang Kiri", "3X (Unit Stem Vertikal)", "Ketebalan pilar penopang kiri"),
        ("Radius Kurva Luar", "8X (Setengah Lingkaran)", "Lengkung luar kurva kanan"),
        ("Radius Kurva Dalam", "4X (Golden Proportion)", "Rongga sirkulasi dalam logo"),
        ("Sudut Arah Panah", "45.0° (Northeast Momentum)", "Orientasi pertumbuhan omzet"),
        ("Ketebalan Garis Loop", "1.8X (Stroke Width)", "Garis dinamis loop panah"),
        ("Jarak Antar Percikan", "1.2X (Sparks Gap)", "Interval 3 balok percikan")
    ]
    
    sy = 670
    for param, val, note in specs:
        c.setStrokeColor(C_BORDER_SUBTLE)
        c.setLineWidth(1)
        c.line(tx + 40, sy - 12, tx + tw - 40, sy - 12)
        
        c.setFillColor(C_TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(tx + 40, sy + 6, param)
        
        c.setFillColor(C_ACTION_HERO)
        c.setFont("Helvetica-Bold", 14)
        c.drawRightString(tx + tw - 40, sy + 6, val)
        
        c.setFillColor(C_TEXT_MUTED)
        c.setFont("Helvetica", 12)
        c.drawString(tx + 40, sy - 8, note)
        
        sy -= 65

def build_slide_07(c):
    # VERTICAL STEM & 90 DEGREE CORNER
    draw_background_grid(c)
    draw_header_footer(c, 7, category="BAB 02 // GEOMETRI LOGO: BATANG VERTIKAL")
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(100, 920, "02 // BATANG VERTIKAL KIRI & SUDUT SIKU 90°")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 16)
    c.drawString(100, 885, "Pilar Fondasi: Ketebalan Batang 3X dan Struktur Tegak Penopang Kestabilan.")
    
    # Left Diagram Card (Width: 840)
    draw_card(c, 100, 160, 840, 680, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    # Drawing zoomed stem focus
    c.setFillColor(C_ACTION_HERO)
    c.rect(260, 300, 120, 420, fill=1, stroke=0)
    
    # Dimension line
    c.setStrokeColor(C_CYAN_TECH)
    c.setLineWidth(2)
    c.line(260, 260, 380, 260)
    c.line(260, 250, 260, 270)
    c.line(380, 250, 380, 270)
    
    c.setFillColor(C_CYAN_TECH)
    c.setFont("Helvetica-Bold", 16)
    c.drawCenterString(320, 235, "LEBAR = 3X")
    
    # 90 degree angle indicator
    c.setStrokeColor(C_TEXT_PRIMARY)
    c.setLineWidth(2)
    c.rect(260, 680, 40, 40, fill=0, stroke=1)
    c.circle(280, 700, 4, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(315, 695, "Siku Presisi 90.0°")
    
    # Ghost curve
    c.setStrokeColor(C_BORDER_SUBTLE)
    c.setLineWidth(2)
    c.arc(260, 300, 660, 720, -90, 180)
    
    # Right Content Details (Width: 835)
    rx = 985
    rw = 835
    draw_card(c, rx, 160, rw, 680, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    draw_badge(c, rx + 40, 780, "BEDAH ANATOMI 01", bg=C_ACTION_HERO, fg=C_CANVAS_WHITE, font_size=12, pad_x=14, pad_y=6)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(rx + 40, 730, "Ketegasan Batang Penopang")
    
    points = [
        ("Proporsi Baku Batang (Width = 3X)", 
         "Batang vertikal sebelah kiri memiliki ketebalan tepat 3X dari total 16X grid. Ketebalan ini menjadi nilai acuan master (Konstanta X) untuk penentuan zona aman (exclusion zone) dan jarak spasi lockup logo."),
        ("Sudut Siku Kiri 90° Tanpa Bevel", 
         "Pertemuan antara garis vertikal kiri dengan garis horizontal atas dan bawah membentuk sudut siku sempurna 90°. Ini memberikan kesan arsitektural yang kokoh, tegas, dan berwibawa khas Swiss Modernism."),
        ("Keseimbangan Optik (Optical Weight)", 
         "Ketebalan batang 3X memastikan logo tetap terlihat solid dan jelas terbaca saat diaplikasikan pada media ultra-kecil (seperti favicon browser 16px atau watermark video di smartphone).")
    ]
    
    py = 660
    for title, body in points:
        c.setFillColor(C_TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(rx + 40, py, title)
        
        c.setFillColor(C_TEXT_MUTED)
        c.setFont("Helvetica", 14)
        
        # Word wrap manually
        words = body.split()
        lines = []
        cur_l = ""
        for w in words:
            if len(cur_l + " " + w) > 65:
                lines.append(cur_l)
                cur_l = w
            else:
                cur_l += (" " if cur_l else "") + w
        if cur_l:
            lines.append(cur_l)
            
        ly = py - 24
        for l in lines:
            c.drawString(rx + 40, ly, l)
            ly -= 22
            
        py -= 140

def build_slide_08(c):
    # GOLDEN RATIO CURVE
    draw_background_grid(c)
    draw_header_footer(c, 8, category="BAB 02 // GEOMETRI LOGO: LENGKUNG KURVA")
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(100, 920, "02 // LENGKUNG KURVA GOLDEN RATIO (φ = 1.618)")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 16)
    c.drawString(100, 885, "Proporsi Lengkung Setengah Lingkaran Luar (R=8X) dan Rongga Sirkulasi Dalam (R=4X).")
    
    # Left Diagram Card (Width: 840)
    draw_card(c, 100, 160, 840, 680, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    # Outer & Inner Circles
    cx = 500
    cy = 500
    # Outer Arc (Radius 220)
    c.setStrokeColor(C_ACTION_HERO)
    c.setLineWidth(3)
    c.circle(cx, cy, 220, fill=0, stroke=1)
    
    # Inner Arc (Radius 110)
    c.setStrokeColor(C_TECH_COBALT)
    c.setLineWidth(3)
    c.circle(cx, cy, 110, fill=0, stroke=1)
    
    # Radius annotations
    c.setStrokeColor(C_CYAN_TECH)
    c.setLineWidth(1.5)
    c.line(cx, cy, cx + 220, cy)
    c.line(cx, cy, cx, cy + 110)
    
    c.setFillColor(C_ACTION_HERO)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(cx + 80, cy + 10, "R_Luar = 8X")
    
    c.setFillColor(C_TECH_COBALT)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(cx + 10, cy + 60, "R_Dalam = 4X")
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 16)
    c.drawCenterString(cx, cy - 250, "Harmonisasi Skala Rasio Emas (1:2)")
    
    # Right Side Explanations (Width: 835)
    rx = 985
    rw = 835
    draw_card(c, rx, 160, rw, 680, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    draw_badge(c, rx + 40, 780, "BEDAH ANATOMI 02", bg=C_TECH_COBALT, fg=C_CANVAS_WHITE, font_size=12, pad_x=14, pad_y=6)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(rx + 40, 730, "Rasio Keanggunan Geometris")
    
    c_points = [
        ("Proporsi Radius Luar (R = 8X)",
         "Radius busur setengah lingkaran luar bernilai 8X (separuh dari tinggi total 16X). Hal ini menciptakan kurva kubah yang halus, aerodinamis, dan menyatu secara mulus dengan batang vertikal."),
        ("Rongga Sirkulasi Udara Dalam (R = 4X)",
         "Rongga dalam memiliki radius 4X, menghasilkan rasio matematis 1:2 terhadap radius luar. Rasio ini menjamin ruang pernapasan (negative space) yang cukup bagi jalur panah kinetik di dalamnya."),
        ("Pencegahan Titik Buta (Visual Clogging)",
         "Dengan rasio kurva yang terukur rapi, logo tidak akan mengalami penyumbatan visual (ink clogging) saat dicetak pada media berpori seperti kertas koran atau disulam pada kain topi/kaos.")
    ]
    
    py = 660
    for title, body in c_points:
        c.setFillColor(C_TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(rx + 40, py, title)
        
        c.setFillColor(C_TEXT_MUTED)
        c.setFont("Helvetica", 14)
        
        words = body.split()
        lines = []
        cur_l = ""
        for w in words:
            if len(cur_l + " " + w) > 65:
                lines.append(cur_l)
                cur_l = w
            else:
                cur_l += (" " if cur_l else "") + w
        if cur_l:
            lines.append(cur_l)
            
        ly = py - 24
        for l in lines:
            c.drawString(rx + 40, ly, l)
            ly -= 22
            
        py -= 140

def build_slide_09(c):
    # KINETIC GROWTH ARROW 45 DEGREE
    draw_background_grid(c)
    draw_header_footer(c, 9, category="BAB 02 // GEOMETRI LOGO: PANAH KINETIK")
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(100, 920, "02 // SUDUT POTONG KINETIK 45° (GROWTH ARROW)")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 16)
    c.drawString(100, 885, "Jalur Loop Kontinu Memutar dari Bawah ke Atas Berorientasi Vektor Kanan Atas (Northeast).")
    
    # Left Diagram Card (Width: 840)
    draw_card(c, 100, 160, 840, 680, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    # Loop arrow drawing zoomed in
    lx = 500
    ly = 500
    c.setStrokeColor(C_TECH_COBALT)
    c.setLineWidth(24)
    c.setLineCap(1)
    
    # Draw path
    lp = c.beginPath()
    lp.moveTo(lx - 120, ly - 100)
    lp.curveTo(lx - 200, ly - 100, lx - 200, ly + 20, lx - 100, ly + 20)
    lp.curveTo(lx, ly + 20, lx + 30, ly - 60, lx + 80, ly + 40)
    lp.lineTo(lx + 130, ly + 100)
    c.drawPath(lp, fill=0, stroke=1)
    
    # Arrow head
    c.setFillColor(C_TECH_COBALT)
    ap = c.beginPath()
    ap.moveTo(lx + 70, ly + 120)
    ap.lineTo(lx + 160, ly + 120)
    ap.lineTo(lx + 160, ly + 30)
    ap.closeSubpath()
    c.drawPath(ap, fill=1, stroke=0)
    
    # 45 degree guideline line
    c.setStrokeColor(C_ACTION_HERO)
    c.setLineWidth(2)
    c.setDash(4, 4)
    c.line(lx - 150, ly - 180, lx + 220, ly + 190)
    c.setDash()
    
    c.setFillColor(C_ACTION_HERO)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(lx + 120, ly + 150, "Sudut Elevasi: 45.0°")
    
    # Right Side Specs (Width: 835)
    rx = 985
    rw = 835
    draw_card(c, rx, 160, rw, 680, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    draw_badge(c, rx + 40, 780, "BEDAH ANATOMI 03", bg=C_POP_WASABI, fg=C_TEXT_PRIMARY, font_size=12, pad_x=14, pad_y=6)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(rx + 40, 730, "Vektor Momentum Akselerasi")
    
    a_points = [
        ("Jalur Loop Tak Terputus (Continuous Loop)",
         "Garis putih loop berawal dari dasar kurva bagian dalam, melingkar mulus tanpa sudut patah. Ini melambangkan proses iterasi data iklan, pengujian kreatif (creative fatigue defense), dan perbaikan berkelanjutan."),
        ("Ujung Kepala Panah Membulat (Rounded Arrowhead)",
         "Kepala panah dirancang dengan ujung membulat halus (rounded cap radius 2X) agar senada dengan estetika ramah dan modern monogram 'D', menghindari sudut lancip yang terkesan tajam atau agresif."),
        ("Orientasi Pertumbuhan Kuadran Kanan Atas",
         "Arah 45° secara universal diakui dalam grafik bisnis sebagai simbol peningkatan omzet, kenaikan skala traffic, dan performa kampanye yang selalu bergerak ke arah positif.")
    ]
    
    py = 660
    for title, body in a_points:
        c.setFillColor(C_TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(rx + 40, py, title)
        
        c.setFillColor(C_TEXT_MUTED)
        c.setFont("Helvetica", 14)
        
        words = body.split()
        lines = []
        cur_l = ""
        for w in words:
            if len(cur_l + " " + w) > 65:
                lines.append(cur_l)
                cur_l = w
            else:
                cur_l += (" " if cur_l else "") + w
        if cur_l:
            lines.append(cur_l)
            
        ly = py - 24
        for l in lines:
            c.drawString(rx + 40, ly, l)
            ly -= 22
            
        py -= 140

def build_slide_10(c):
    # BEZIER CURVES & TANGENT POINTS
    draw_background_grid(c)
    draw_header_footer(c, 10, category="BAB 02 // GEOMETRI LOGO: TITIK TANGEN BEZIER")
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(100, 920, "02 // TITIK TANGEN VEKTOR & KURVA BEZIER PRESISI")
    
    c.setFillColor(C_TEXT_MUTED)
    c.setFont("Helvetica", 16)
    c.drawString(100, 885, "Cetak Biru Vektor Lossless untuk Reproduksi Murni Tanpa Distorsi pada Billboard Raksasa.")
    
    # Left Diagram: Anchor point nodes
    draw_card(c, 100, 160, 840, 680, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    # Base Logo outline with node handles
    draw_logo_mark(c, 520, 500, scale=2.2)
    
    # Draw Cyan Node Points (Square Anchors)
    nodes = [
        (388, 368), (388, 632), (520, 632), (652, 500), (520, 368),
        (550, 680), (600, 650), (630, 570)
    ]
    for nx, ny in nodes:
        c.setFillColor(C_CYAN_TECH)
        c.setStrokeColor(C_CANVAS_WHITE)
        c.setLineWidth(1.5)
        c.rect(nx - 7, ny - 7, 14, 14, fill=1, stroke=1)
        
    c.setFillColor(C_CYAN_TECH)
    c.setFont("Helvetica-Bold", 14)
    c.drawCenterString(520, 240, "Node Titik Anchor Vektor (Lossless 100%)")
    
    # Right Side Rules (Width: 835)
    rx = 985
    rw = 835
    draw_card(c, rx, 160, rw, 680, bg=C_CANVAS_WHITE, border_color=C_BORDER_BOLD, border_width=1.5, corner_radius=16)
    
    draw_badge(c, rx + 40, 780, "STANDAR TEKNIS PRODUKSI", bg=C_TECH_COBALT, fg=C_CANVAS_WHITE, font_size=12, pad_x=14, pad_y=6)
    
    c.setFillColor(C_TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(rx + 40, 730, "Spesifikasi Vektor Tanpa Batas")
    
    v_points = [
        ("Titik Anchor Minimalis & Efisien",
         "Kontur vektor logo dirancang dengan jumlah titik anchor seminimal mungkin untuk menghasilkan kurva Bezier yang licin (smooth) tanpa sudut patah atau ketidaksempurnaan kurvatura (kinks)."),
        ("Skalabilitas Resolusi Tak Terbatas (Lossless Scaling)",
         "Berkat konstruksi matematis yang solid, berkas master logo (AI, EPS, SVG, PDF) dapat dibesarkan hingga ukuran billboard 12 meter atau gedung tanpa terjadi penurunan ketajaman (zero pixelation)."),
        ("Kepatuhan Pemotongan CNC & Laser Cutting",
         "Kurva yang tertutup sempurna (closed compound paths) memastikan logo siap digunakan langsung untuk mesin CNC router, laser akrilik, dan pemotongan stiker vinyl tanpa error lintasan pisau potong.")
    ]
    
    py = 660
    for title, body in v_points:
        c.setFillColor(C_TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(rx + 40, py, title)
        
        c.setFillColor(C_TEXT_MUTED)
        c.setFont("Helvetica", 14)
        
        words = body.split()
        lines = []
        cur_l = ""
        for w in words:
            if len(cur_l + " " + w) > 65:
                lines.append(cur_l)
                cur_l = w
            else:
                cur_l += (" " if cur_l else "") + w
        if cur_l:
            lines.append(cur_l)
            
        ly = py - 24
        for l in lines:
            c.drawString(rx + 40, ly, l)
            ly -= 22
            
        py -= 140

def generate_pdf():
    print(f"Generating PDF: {OUTPUT_PDF}")
    c = canvas.Canvas(OUTPUT_PDF, pagesize=(WIDTH, HEIGHT))
    
    slides = [
        build_slide_01,
        build_slide_02,
        build_slide_03,
        build_slide_04,
        build_slide_05,
        build_slide_06,
        build_slide_07,
        build_slide_08,
        build_slide_09,
        build_slide_10
    ]
    
    for idx, slide_fn in enumerate(slides, start=1):
        print(f"Rendering Slide {idx:02d} / 10...")
        slide_fn(c)
        c.showPage()
        
    c.save()
    print("PDF Generated Successfully!")

if __name__ == "__main__":
    generate_pdf()
