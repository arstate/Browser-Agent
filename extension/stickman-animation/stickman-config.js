/**
 * ============================================================================
 * ⚙️ STICKMAN ANIMATION CONFIGURATION
 * Edit warna, kecepatan, posisi, dan parameter visual di file ini dengan mudah!
 * ============================================================================
 */
window.STICKMAN_CONFIG = {
  // === PALET WARNA (BENTO DARK LUXURY NEON) ===
  COLORS: {
    NEON_MAIN: '#CEF128',                        // Warna utama neon lime avatar & LED
    NEON_SECONDARY: 'rgba(206, 241, 40, 0.38)',   // Warna anggota tubuh belakang (depth)
    BACKGROUND: '#141417',                       // Warna latar panggung kanvas
    FLOOR_LINE: 'rgba(255, 255, 255, 0.08)',     // Garis lantai tempat avatar berlari
    SERVER_BODY: '#101014',                      // Warna bodi rak server
    SERVER_BORDER: 'rgba(255, 255, 255, 0.12)',  // Border rak server
    SERVER_SLOT: '#1A1A22',                      // Warna slot unit server
    LED_ALERT: '#E11D48',                        // LED indikator merah
    LED_OFF: '#444444'                           // LED indikator mati
  },

  // === GEOMETRI & TATA LETAK (COMPACT SLEEK BANNER) ===
  LAYOUT: {
    STAGE_HEIGHT_WIDE: 50,                       // Tinggi kanvas di New Tab (px, ramping & proporsional)
    STAGE_HEIGHT_COMPACT: 44,                    // Tinggi kanvas di Sidepanel (px)
    FLOOR_Y: 47,                                 // Lantai tepat di batas bawah (jarak bawah 0/hilang)
    FLOOR_Y_COMPACT: 41,                         // Lantai Sidepanel
    HEAD_RADIUS: 3.8,                            // Radius lingkaran kepala proporsional & elegan (px)
    LIMB_THICKNESS: 1.6                          // Ketebalan garis tubuh & tulang (px)
  },

  // === DAFTAR PELARI (RUNNERS) LAYAR LEBAR (NEW TAB) ===
  RUNNERS_WIDE: [
    { startX: 75,  gaitType: 'fatigue_cargo', facing: 1,  hasBox: true },   // Pelari capek (bawa paket + istirahat)
    { startX: 120, gaitType: 'sprint',        facing: 1,  hasBox: true },   // Pelari sprint cepat
    { startX: 620, gaitType: 'jog',           facing: -1, hasBox: true },   // Pelari santai arah balik
    { startX: 200, gaitType: 'slow_walk',     facing: 1,  hasBox: false }   // Pelari jalan pelan santai
  ],

  // === DAFTAR PELARI (RUNNERS) LAYAR KOMPAK (SIDEPANEL) ===
  RUNNERS_COMPACT: [
    { startX: 55,  gaitType: 'sprint',        facing: 1,  hasBox: true },
    { startX: 240, gaitType: 'jog',           facing: -1, hasBox: true }
  ]
};
