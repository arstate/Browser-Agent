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

  // === GEOMETRI & TATA LETAK ===
  LAYOUT: {
    STAGE_HEIGHT_WIDE: 100,                      // Tinggi kanvas di New Tab (px)
    STAGE_HEIGHT_COMPACT: 90,                    // Tinggi kanvas di Sidepanel (px)
    FLOOR_Y: 84,                                 // Posisi Y lantai pijakan kaki (px)
    HEAD_RADIUS: 8.0,                            // Radius lingkaran kepala (px)
    LIMB_THICKNESS: 3.0                          // Ketebalan garis tubuh & tulang (px)
  },

  // === DAFTAR PELARI (RUNNERS) LAYAR LEBAR (NEW TAB) ===
  RUNNERS_WIDE: [
    { startX: 95,  gaitType: 'fatigue_cargo', facing: 1,  hasBox: true },   // Pelari capek (bawa paket + istirahat)
    { startX: 140, gaitType: 'sprint',        facing: 1,  hasBox: true },   // Pelari sprint cepat
    { startX: 620, gaitType: 'jog',           facing: -1, hasBox: true },   // Pelari santai arah balik
    { startX: 220, gaitType: 'slow_walk',     facing: 1,  hasBox: false }   // Pelari jalan pelan santai
  ],

  // === DAFTAR PELARI (RUNNERS) LAYAR KOMPAK (SIDEPANEL) ===
  RUNNERS_COMPACT: [
    { startX: 68,  gaitType: 'sprint',        facing: 1,  hasBox: true },
    { startX: 240, gaitType: 'jog',           facing: -1, hasBox: true }
  ]
};
