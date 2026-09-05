// =========================================================================
// DESIGN AGENT DEFINITION & MULTI-AGENT HIERARCHY
// Master Agent (Supreme Commander) & Master Design (Right-Hand Lead Architect)
// =========================================================================

const MASTER_DESIGN_AGENT = {
  id: 'master_design',
  name: 'Master Design',
  role: 'Lead Creative Director & Slide Architect',
  badge: 'Tangan Kanan Master Agent',
  description: 'Tangan kanan Master Agent untuk perancangan visual, tata letak 16:9 widescreen, sistem desain adaptif sesuai materi, kurasi tipografi harmonis, dan interaktivitas canvas.',
  category: 'Design & Presentation',
  capabilities: [
    'slide_deck_16_9',
    'adaptive_design_systems',
    'bento_grid_layout',
    'bespoke_theming',
    'interactive_dock',
    'pdf_export_ready'
  ]
};

function createDesignHierarchyAgentInfo() {
  return {
    isBoss: true,
    name: 'Master Agent',
    role: 'Supreme Commander & Chief Orchestrator',
    badge: 'Supreme Orchestrator',
    workers: [
      {
        id: MASTER_DESIGN_AGENT.id,
        name: MASTER_DESIGN_AGENT.name,
        role: MASTER_DESIGN_AGENT.role,
        badge: MASTER_DESIGN_AGENT.badge,
        description: MASTER_DESIGN_AGENT.description,
        capabilities: MASTER_DESIGN_AGENT.capabilities
      }
    ]
  };
}

function getDesignMilestones(userTopic = '') {
  const topicSnippet = (userTopic || 'Topik Presentasi').slice(0, 32);
  return [
    {
      title: '👑 Master Agent: Analisis Brief & Strategi Konseptual',
      completed: false,
      inProgress: true
    },
    {
      title: '🤝 Delegasi ke Master Design: Kurasi Style Visual & Palet Sesuai Materi',
      completed: false,
      inProgress: false
    },
    {
      title: '🎨 Master Design: Sintesis Konten 16:9 Widescreen & Struktur Bab',
      completed: false,
      inProgress: false
    },
    {
      title: '🎨 Master Design: Penerapan Tipografi Sesuai Tema & Visual Polish',
      completed: false,
      inProgress: false
    },
    {
      title: '👑 Master Agent: Review Kualitas, Anti-Slop Audit & Final Approval',
      completed: false,
      inProgress: false
    }
  ];
}

// Attach to window for global extension access
if (typeof window !== 'undefined') {
  window.MASTER_DESIGN_AGENT = MASTER_DESIGN_AGENT;
  window.createDesignHierarchyAgentInfo = createDesignHierarchyAgentInfo;
  window.getDesignMilestones = getDesignMilestones;
}
