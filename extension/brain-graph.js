// =========================================================================
// 🧠 Obsidian Neural Brain Graph Visualizer Engine (Standalone Module)
// Anatomical Human Brain Topology: Dual-Hemisphere Cerebral Cortex Architecture
// Left Hemisphere (Knowledge & Logic Vaults) <---> Corpus Callosum <---> Right Hemisphere (Multi-Agent Executive)
// =========================================================================

/**
 * Helper to safely escape HTML strings for tooltips and modal content.
 */
function escapeGraphHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Helper to clean up verbose IDs into elegant Obsidian-style note titles.
 */
function formatGraphLabel(rawName, type) {
  if (!rawName) return type || 'Node';
  let clean = String(rawName).trim();
  
  // Remove common prefixes
  clean = clean.replace(/^(tiar[-_]|agent[-_]|skill[-_]|custom[-_]|user_mem_)/i, '');
  clean = clean.replace(/[-_]+/g, ' ');
  
  // Title Case
  clean = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  // Cap length nicely
  if (clean.length > 18) {
    clean = clean.substring(0, 16) + '...';
  }
  return clean;
}

class BrainGraphEngine {
  constructor(canvas, container, tooltip) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.container = container;
    this.tooltip = tooltip;
    
    this.nodes = [];
    this.links = [];
    this.filteredNodes = [];
    this.filteredLinks = [];
    
    this.filterType = 'all';
    this.isFrozen = false;
    this.showAllLabels = false; // 'smart' by default (Obsidian style)
    
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    
    this.alpha = 1.0;
    this.alphaMin = 0.002;
    this.alphaDecay = 0.95; // Smooth fast convergence to stable human brain silhouette
    
    this.draggedNode = null;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.hoveredNode = null;
    this.mouseMoved = false;
    this.mouseDownPos = { x: 0, y: 0 };
    
    this.animId = null;
    this.setupEvents();
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 800;
    this.height = Math.max(rect.height || 620, 620);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  buildGraphData(brain, configData, agentsList = [], skillsList = [], memoriesList = []) {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    const degreeMap = new Map();

    const addNode = (n) => {
      if (!nodeMap.has(n.id)) {
        nodeMap.set(n.id, n);
        nodes.push(n);
        degreeMap.set(n.id, 0);
      }
      return nodeMap.get(n.id);
    };

    const addLink = (sourceId, targetId, length = 60, strength = 0.06) => {
      const src = nodeMap.get(sourceId);
      const tgt = nodeMap.get(targetId);
      if (src && tgt && src.id !== tgt.id) {
        const exists = links.some(l => (l.source.id === src.id && l.target.id === tgt.id) || (l.source.id === tgt.id && l.target.id === src.id));
        if (!exists) {
          links.push({ source: src, target: tgt, length, strength });
          degreeMap.set(src.id, (degreeMap.get(src.id) || 0) + 1);
          degreeMap.set(tgt.id, (degreeMap.get(tgt.id) || 0) + 1);
        }
      }
    };

    const cx = this.width / 2 || 400;
    const cy = this.height / 2 || 310;

    // =========================================================================
    // 🧠 1. LEFT HEMISPHERE CORE: AI Brain Core (Logical & Memory Cortex)
    // =========================================================================
    addNode({
      id: 'core_brain',
      label: 'AI Brain Core',
      fullTitle: 'Central Brain Knowledge & Memory Core (Left Hemisphere)',
      type: 'core',
      color: '#38BDF8',
      baseRadius: 11,
      radius: 11,
      x: cx - 110,
      y: cy,
      fx: cx - 110, // Firmly anchored in Left Hemisphere
      fy: cy,
      vx: 0,
      vy: 0
    });

    // =========================================================================
    // 🧠 2. RIGHT HEMISPHERE CORE: Master Agent (Executive & Multi-Agent Cortex)
    // =========================================================================
    addNode({
      id: 'agent_master_agent',
      rawId: 'master_agent',
      label: 'Master Agent',
      fullTitle: 'Master Agent: Supreme Multi-Agent Orchestrator (Right Hemisphere)',
      type: 'agent',
      color: '#F472B6',
      baseRadius: 10,
      radius: 10,
      is_boss: true,
      data: { id: 'master_agent', name: 'Master Agent (Supreme Orchestrator)', is_boss: true },
      x: cx + 110,
      y: cy,
      fx: cx + 110, // Firmly anchored in Right Hemisphere
      fy: cy,
      vx: 0,
      vy: 0
    });

    // 🌉 CORPUS CALLOSUM BRIDGE (Lobe-to-Lobe Central Synapse Bridge)
    addLink('core_brain', 'agent_master_agent', 210, 0.08);

    // =========================================================================
    // 🤖 3. MULTI-AGENTS (Organized anatomically in Right & Left Hemispheres)
    // =========================================================================
    const combinedAgents = [
      ...(Array.isArray(agentsList) && agentsList.length > 0 ? agentsList : (configData?.agents || [])),
      ...(brain?.autonomous_agents || [])
    ];
    const uniqueAgents = new Map();
    combinedAgents.forEach(ag => {
      if (ag && ag.id && !uniqueAgents.has(ag.id) && ag.id !== 'master_agent' && ag.id !== 'boss_agent' && !ag.is_boss) {
        uniqueAgents.set(ag.id, ag);
      }
    });

    const subAgentNodeMap = new Map();

    // Anatomical Brain Lobe Target Coordinates for Multi-Agents:
    // Right Hemisphere: Tiar Property, Sales, Ads, Copywriter, Visual, Admin
    // Left Hemisphere: Deep Web Researcher, Coding System Agent
    const agentAnatomyMap = {
      // Right Frontal Lobe (Top-Right)
      'tiar_property_agent': { x: cx + 140, y: cy - 160, lobe: 'right_frontal' },
      'tiar_copywriter_expert': { x: cx + 220, y: cy - 140, lobe: 'right_frontal' },
      'tiar-genz-copywriter': { x: cx + 220, y: cy - 140, lobe: 'right_frontal' },
      
      // Right Parietal & Temporal Lobe (Mid & Outer Right)
      'tiar_sales_closer_cs': { x: cx + 250, y: cy - 20, lobe: 'right_temporal' },
      'tiar-chat-agent': { x: cx + 250, y: cy - 20, lobe: 'right_temporal' },
      'tiar_meta_ads_auditor_analyst': { x: cx + 220, y: cy + 100, lobe: 'right_temporal' },
      'tiar_meta_ads_strategist': { x: cx + 220, y: cy + 100, lobe: 'right_temporal' },
      'tiar-meta-ads': { x: cx + 220, y: cy + 100, lobe: 'right_temporal' },
      'tiar_visual_designer': { x: cx + 260, y: cy + 40, lobe: 'right_temporal' },
      'tiar-visual-planner': { x: cx + 260, y: cy + 40, lobe: 'right_temporal' },

      // Right Cerebellum / Brainstem (Bottom-Right)
      'tiar_admin_customer_cs': { x: cx + 150, y: cy + 180, lobe: 'right_cerebellum' },
      'general_browser_agent': { x: cx + 80, y: cy + 200, lobe: 'right_brainstem' },

      // Left Frontal & Parietal Lobe (Top-Left & Mid-Left)
      'deep_web_researcher': { x: cx - 210, y: cy - 130, lobe: 'left_frontal' },
      'research': { x: cx - 210, y: cy - 130, lobe: 'left_frontal' },
      'coding_system_agent': { x: cx - 240, y: cy + 20, lobe: 'left_temporal' },
      'self': { x: cx - 240, y: cy + 20, lobe: 'left_temporal' }
    };

    let genericIdx = 0;
    uniqueAgents.forEach((ag) => {
      const anatomy = agentAnatomyMap[ag.id] || {
        x: cx + 160 * Math.cos((2 * Math.PI * genericIdx) / uniqueAgents.size),
        y: cy + 140 * Math.sin((2 * Math.PI * genericIdx) / uniqueAgents.size)
      };
      genericIdx++;

      const aNode = addNode({
        id: 'agent_' + ag.id,
        rawId: ag.id,
        label: formatGraphLabel(ag.name || ag.id, 'Agent'),
        fullTitle: 'Sub-Agent: ' + (ag.name || ag.id),
        type: 'agent',
        color: '#C084FC',
        baseRadius: 7.5,
        radius: 7.5,
        targetX: anatomy.x,
        targetY: anatomy.y,
        data: ag,
        x: anatomy.x + (Math.random() - 0.5) * 20,
        y: anatomy.y + (Math.random() - 0.5) * 20,
        vx: 0, vy: 0
      });
      subAgentNodeMap.set(ag.id, aNode);
      
      // Multi-Agents connect to Master Agent (Executive Hub)
      addLink('agent_master_agent', aNode.id, Math.hypot(anatomy.x - (cx + 110), anatomy.y - cy), 0.055);
    });

    // Helper to find the most specific Sub-Agent for skills / memories / experiences
    const findSubAgent = (textId, content = '') => {
      const lower = (textId + ' ' + content).toLowerCase();
      
      // WhatsApp Sales & Closer CS
      if (lower.includes('closer') || lower.includes('chat') || lower.includes('anti-price') || lower.includes('harga') || lower.includes('sales')) {
        if (subAgentNodeMap.has('tiar_sales_closer_cs')) return subAgentNodeMap.get('tiar_sales_closer_cs');
        if (subAgentNodeMap.has('tiar-chat-agent')) return subAgentNodeMap.get('tiar-chat-agent');
      }
      // Meta Ads Strategist & Auditor
      if (lower.includes('ads') || lower.includes('cpr') || lower.includes('meta')) {
        if (subAgentNodeMap.has('tiar_meta_ads_auditor_analyst')) return subAgentNodeMap.get('tiar_meta_ads_auditor_analyst');
        if (subAgentNodeMap.has('tiar_meta_ads_strategist')) return subAgentNodeMap.get('tiar_meta_ads_strategist');
        if (subAgentNodeMap.has('tiar-meta-ads')) return subAgentNodeMap.get('tiar-meta-ads');
      }
      // Admin CS & CRM
      if (lower.includes('admin') || lower.includes('crm') || lower.includes('dm-batch') || lower.includes('fonnte')) {
        if (subAgentNodeMap.has('tiar_admin_customer_cs')) return subAgentNodeMap.get('tiar_admin_customer_cs');
      }
      // Copywriter
      if (lower.includes('copy') || lower.includes('caption') || lower.includes('gaya-bicara') || lower.includes('trend')) {
        if (subAgentNodeMap.has('tiar_copywriter_expert')) return subAgentNodeMap.get('tiar_copywriter_expert');
        if (subAgentNodeMap.has('tiar-genz-copywriter')) return subAgentNodeMap.get('tiar-genz-copywriter');
      }
      // Visual Designer
      if (lower.includes('visual') || lower.includes('feed') || lower.includes('desain') || lower.includes('upload')) {
        if (subAgentNodeMap.has('tiar_visual_designer')) return subAgentNodeMap.get('tiar_visual_designer');
        if (subAgentNodeMap.has('tiar-visual-planner')) return subAgentNodeMap.get('tiar-visual-planner');
      }
      // Tiar General Property
      if (lower.includes('tiar') || lower.includes('surabaya') || lower.includes('property') || lower.includes('kpr')) {
        if (subAgentNodeMap.has('tiar_property_agent')) return subAgentNodeMap.get('tiar_property_agent');
      }
      // Research & Science
      if (lower.includes('research') || lower.includes('search') || lower.includes('arxiv') || lower.includes('pubmed') || lower.includes('science') || lower.includes('blast') || lower.includes('database')) {
        if (subAgentNodeMap.has('deep_web_researcher')) return subAgentNodeMap.get('deep_web_researcher');
        if (subAgentNodeMap.has('research')) return subAgentNodeMap.get('research');
      }
      // Coding & System Developer
      if (lower.includes('code') || lower.includes('xcode') || lower.includes('firebase') || lower.includes('python') || lower.includes('debug') || lower.includes('a11y') || lower.includes('chrome-extension')) {
        if (subAgentNodeMap.has('coding_system_agent')) return subAgentNodeMap.get('coding_system_agent');
        if (subAgentNodeMap.has('self')) return subAgentNodeMap.get('self');
      }
      // General Browser Agent
      if (subAgentNodeMap.has('general_browser_agent')) return subAgentNodeMap.get('general_browser_agent');
      const allSub = Array.from(subAgentNodeMap.values());
      return allSub.length > 0 ? allSub[0] : null;
    };

    // =========================================================================
    // ⚡ 4. SKILLS & TOOLS (Cluster around their respective Sub-Agent)
    // =========================================================================
    const combinedSkills = [
      ...(Array.isArray(skillsList) && skillsList.length > 0 ? skillsList : (configData?.skills || [])),
      ...(brain?.autonomous_skills || [])
    ];
    const uniqueSkills = new Map();
    combinedSkills.forEach(sk => {
      if (sk && sk.id && !uniqueSkills.has(sk.id)) uniqueSkills.set(sk.id, sk);
    });

    const skillNodesList = [];
    uniqueSkills.forEach(sk => {
      let targetAgent = null;
      uniqueAgents.forEach(ag => {
        const agSkills = ag.skills || ag.assigned_skills || [];
        if (Array.isArray(agSkills) && agSkills.includes(sk.id)) {
          targetAgent = subAgentNodeMap.get(ag.id);
        }
      });
      if (!targetAgent) {
        targetAgent = findSubAgent(sk.id, sk.description || sk.name || '');
      }

      const anchorX = targetAgent ? targetAgent.x : (cx + 120);
      const anchorY = targetAgent ? targetAgent.y : cy;
      const sAngle = Math.random() * Math.PI * 2;
      const sDist = 42 + Math.random() * 38;

      const sNode = addNode({
        id: 'skill_' + sk.id,
        rawId: sk.id,
        label: formatGraphLabel(sk.name || sk.id, 'Skill'),
        fullTitle: 'Skill: ' + (sk.name || sk.id),
        type: 'skill',
        color: '#34D399',
        baseRadius: 4.0,
        radius: 4.0,
        data: sk,
        x: anchorX + sDist * Math.cos(sAngle),
        y: anchorY + sDist * Math.sin(sAngle),
        vx: 0, vy: 0
      });
      skillNodesList.push(sNode);

      if (targetAgent) {
        addLink(targetAgent.id, sNode.id, 48, 0.075);
      } else {
        addLink('agent_master_agent', sNode.id, 65, 0.05);
      }
    });

    // Cross-link closely related sister skills
    for (let i = 0; i < skillNodesList.length; i++) {
      for (let j = i + 1; j < skillNodesList.length; j++) {
        const s1 = skillNodesList[i];
        const s2 = skillNodesList[j];
        if (s1.rawId.startsWith('tiar') && s2.rawId.startsWith('tiar')) {
          if (s1.rawId.includes('closer') && s2.rawId.includes('closer')) addLink(s1.id, s2.id, 32, 0.06);
          else if (s1.rawId.includes('ads') && s2.rawId.includes('ads')) addLink(s1.id, s2.id, 32, 0.06);
          else if (s1.rawId.includes('ig') && s2.rawId.includes('ig')) addLink(s1.id, s2.id, 32, 0.06);
        } else if (s1.rawId.startsWith('firebase') && s2.rawId.startsWith('firebase')) {
          addLink(s1.id, s2.id, 32, 0.06);
        }
      }
    }

    // =========================================================================
    // 🧠 5. AI MODELS (Left Frontal Lobe - Top Left of Brain)
    // =========================================================================
    const modelsList = configData?.models || [];
    modelsList.forEach((m, mIdx) => {
      if (m && m.id) {
        const mAngle = -Math.PI / 2 - 0.4 + (mIdx * 0.4);
        const mDist = 110 + (mIdx % 2) * 25;
        const mx = (cx - 110) + mDist * Math.cos(mAngle);
        const my = cy + mDist * Math.sin(mAngle);

        const mNode = addNode({
          id: 'model_' + m.id,
          rawId: m.id,
          label: formatGraphLabel(m.name || m.id, 'Model'),
          fullTitle: `LLM Model: ${m.name || m.id} (${m.provider || 'AI'})`,
          type: 'model',
          color: '#818CF8',
          baseRadius: 5.2,
          radius: 5.2,
          data: m,
          x: mx,
          y: my,
          vx: 0, vy: 0
        });
        addLink('core_brain', mNode.id, 85, 0.055);

        uniqueAgents.forEach(ag => {
          if (ag.model === m.id) {
            addLink(mNode.id, 'agent_' + ag.id, 90, 0.04);
          }
        });
      }
    });

    // =========================================================================
    // 📜 6. MEMORY & RULES (Left Parietal Lobe - Outer Left of Brain)
    // =========================================================================
    const combinedMemories = [
      ...(Array.isArray(memoriesList) ? memoriesList : []),
      ...(brain?.user_memories || [])
    ];
    const uniqueMemories = new Map();
    combinedMemories.forEach((mem, idx) => {
      const memId = mem.id || ('user_mem_' + idx);
      if (!uniqueMemories.has(memId)) uniqueMemories.set(memId, mem);
    });

    uniqueMemories.forEach((mem, memId) => {
      const rawText = mem.name || mem.content || 'Memory';
      let targetAgent = null;
      uniqueAgents.forEach(ag => {
        const agMems = ag.memories || [];
        if (Array.isArray(agMems) && agMems.includes(memId)) {
          targetAgent = subAgentNodeMap.get(ag.id);
        }
      });
      if (!targetAgent) {
        targetAgent = findSubAgent(memId, rawText);
      }

      const isGlobal = !targetAgent || mem.category === 'Global' || mem.category === 'Core';
      const mAngle = Math.PI * 0.7 + (Math.random() - 0.5) * 1.2;
      const mDist = 65 + Math.random() * 45;
      const anchorX = isGlobal ? (cx - 110) : targetAgent.x;
      const anchorY = isGlobal ? cy : targetAgent.y;

      const mNode = addNode({
        id: 'mem_' + memId,
        rawId: memId,
        label: formatGraphLabel(rawText, 'Rule'),
        fullTitle: 'Memory & Rule: ' + (mem.name || mem.content || 'Untitled'),
        type: 'memory',
        color: '#38BDF8',
        baseRadius: 4.0,
        radius: 4.0,
        data: mem,
        x: anchorX + mDist * Math.cos(mAngle),
        y: anchorY + mDist * Math.sin(mAngle),
        vx: 0, vy: 0
      });

      if (!isGlobal && targetAgent) {
        addLink(targetAgent.id, mNode.id, 48, 0.07);
      } else {
        addLink('core_brain', mNode.id, 75, 0.06);
      }
    });

    // =========================================================================
    // 🔮 7. EXPERIENCE LEDGER (Left Temporal Lobe - Lower Left of Brain)
    // =========================================================================
    const expArr = brain?.experience_ledger || [];
    expArr.forEach((exp, i) => {
      const rawLabel = exp.task || exp.domain || ('Experience #' + (i + 1));
      const expAngle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.8;
      const expDist = 70 + Math.random() * 40;

      const expNode = addNode({
        id: 'exp_' + (exp.id || i),
        rawId: exp.id || i,
        label: formatGraphLabel(rawLabel, 'Experience'),
        fullTitle: 'Experience: ' + (exp.task || exp.domain || 'Resolved Task'),
        type: 'experience',
        color: '#A78BFA',
        baseRadius: 4.2,
        radius: 4.2,
        data: exp,
        x: (cx - 110) + expDist * Math.cos(expAngle),
        y: cy + expDist * Math.sin(expAngle),
        vx: 0, vy: 0
      });
      // Connect to AI Brain Core
      addLink('core_brain', expNode.id, 80, 0.055);

      const relAgent = findSubAgent(exp.domain || '', exp.task || '');
      if (relAgent) {
        addLink(relAgent.id, expNode.id, 75, 0.04);
      }
    });

    // =========================================================================
    // ⚠️ 8. ANTI-PATTERNS (Left Cerebellum - Bottom Left of Brain)
    // =========================================================================
    const apArr = brain?.anti_patterns || [];
    apArr.forEach((ap, i) => {
      const rawLabel = ap.target_domain || ap.mistake_description || ('Anti-Pattern #' + (i + 1));
      const apAngle = Math.PI * 0.35 + (Math.random() - 0.5) * 0.6;
      const apDist = 90 + Math.random() * 40;

      const apNode = addNode({
        id: 'ap_' + (ap.id || i),
        rawId: ap.id || i,
        label: formatGraphLabel(rawLabel, 'AntiPattern'),
        fullTitle: 'Anti-Pattern: ' + (ap.mistake_description || ap.target_domain || 'Failure Learning'),
        type: 'antipattern',
        color: '#FB7185',
        baseRadius: 4.2,
        radius: 4.2,
        data: ap,
        x: (cx - 110) + apDist * Math.cos(apAngle),
        y: cy + apDist * Math.sin(apAngle),
        vx: 0, vy: 0
      });
      addLink('core_brain', apNode.id, 90, 0.05);

      const relAgent = findSubAgent(ap.target_domain || '', ap.mistake_description || '');
      if (relAgent) {
        addLink(relAgent.id, apNode.id, 75, 0.04);
      }
    });

    // =========================================================================
    // 📜 9. TRAINING CORPUS (Left Occipital Lobe - Lower Mid-Left)
    // =========================================================================
    const tcArr = brain?.training_corpus || [];
    tcArr.forEach((tc, i) => {
      const rawTitle = tc.title || tc.session_id || ('Corpus #' + (i + 1));
      const tAngle = Math.PI * 0.6 + (Math.random() - 0.5) * 0.7;
      const tDist = 100 + Math.random() * 45;

      const tNode = addNode({
        id: 'tc_' + (tc.id || i),
        rawId: tc.id || i,
        label: formatGraphLabel(rawTitle, 'Training'),
        fullTitle: 'Training Corpus: ' + (tc.title || tc.session_id || 'Session Archive'),
        type: 'training',
        color: '#FBBF24',
        baseRadius: 4.0,
        radius: 4.0,
        data: tc,
        x: (cx - 110) + tDist * Math.cos(tAngle),
        y: cy + tDist * Math.sin(tAngle),
        vx: 0, vy: 0
      });
      addLink('core_brain', tNode.id, 95, 0.045);

      const relAgent = findSubAgent(tc.session_id || '', tc.distilled_points_md || '');
      if (relAgent) {
        addLink(relAgent.id, tNode.id, 75, 0.035);
      }
    });

    // =========================================================================
    // 🕸️ 10. DYNAMIC EPISTEMIC KNOWLEDGE GRAPH (Left Hemisphere Semantic Network)
    // =========================================================================
    const tripletsArr = brain?.epistemic_triplets || [];
    tripletsArr.forEach((t, i) => {
      const isNeg = t.negative_constraint === 1;
      const conf = t.decayed_confidence || t.confidence || 1.0;
      const tAngle = Math.PI * 0.85 + (Math.random() - 0.5) * 1.1;
      const tDist = 105 + Math.random() * 45;

      const subNodeId = 'epistemic_' + (t.id || i);
      const tripNode = addNode({
        id: subNodeId,
        rawId: t.id || i,
        label: formatGraphLabel(t.subject + ' → ' + t.object, 'Epistemic'),
        fullTitle: `Epistemic Triplet: (${t.subject}) ──[${t.predicate}]──► (${t.object})`,
        type: 'epistemic',
        color: isNeg ? '#EF4444' : '#06B6D4',
        baseRadius: Math.max(3.5, Math.min(8.0, 3.5 + conf * 4.0)),
        radius: Math.max(3.5, Math.min(8.0, 3.5 + conf * 4.0)),
        isNegative: isNeg,
        confidence: conf,
        data: t,
        x: (cx - 110) + tDist * Math.cos(tAngle),
        y: cy + tDist * Math.sin(tAngle),
        vx: 0, vy: 0
      });

      addLink('core_brain', tripNode.id, 90, 0.05);

      const relAgent = findSubAgent(t.subject || '', t.predicate + ' ' + t.object);
      if (relAgent) {
        addLink(relAgent.id, tripNode.id, 80, 0.04);
      }
    });

    // Degree-based Dynamic Sizing
    nodes.forEach(n => {
      const deg = degreeMap.get(n.id) || 1;
      n.radius = Math.max(3.5, Math.min(11.5, n.baseRadius + Math.sqrt(deg) * 0.35));
    });

    this.nodes = nodes;
    this.links = links;
    this.applyFilter();
    
    // Warm-up physics run for 50 iterations silently so graph renders already settled into human brain shape
    for (let step = 0; step < 50; step++) {
      this.updatePhysics();
    }
    this.alpha = 0.4;
  }

  applyFilter() {
    if (this.filterType === 'all') {
      this.filteredNodes = this.nodes;
      this.filteredLinks = this.links;
    } else {
      this.filteredNodes = this.nodes.filter(n => n.type === 'core' || n.type === this.filterType);
      const activeIds = new Set(this.filteredNodes.map(n => n.id));
      this.filteredLinks = this.links.filter(l => activeIds.has(l.source.id) && activeIds.has(l.target.id));
    }
    this.alpha = Math.max(this.alpha, 0.35);
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.panX) / this.zoom,
      y: (screenY - this.panY) / this.zoom
    };
  }

  getNodeAt(worldX, worldY) {
    for (let i = this.filteredNodes.length - 1; i >= 0; i--) {
      const n = this.filteredNodes[i];
      const dx = worldX - n.x;
      const dy = worldY - n.y;
      const hitRadius = Math.max(n.radius + 6, 12);
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return n;
      }
    }
    return null;
  }

  setupEvents() {
    const ro = new ResizeObserver(() => {
      this.resizeCanvas();
    });
    if (this.container) ro.observe(this.container);

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      this.mouseDownPos = { x: sx, y: sy };
      this.mouseMoved = false;

      const world = this.screenToWorld(sx, sy);
      const hit = this.getNodeAt(world.x, world.y);

      if (hit) {
        this.draggedNode = hit;
        hit.fx = world.x;
        hit.fy = world.y;
        hit.vx = 0;
        hit.vy = 0;
        this.alpha = Math.max(this.alpha, 0.25);
      } else {
        this.isPanning = true;
        this.panStartX = sx - this.panX;
        this.panStartY = sy - this.panY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.canvas.offsetParent) return;
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (Math.hypot(sx - this.mouseDownPos.x, sy - this.mouseDownPos.y) > 3) {
        this.mouseMoved = true;
      }

      if (this.draggedNode) {
        const world = this.screenToWorld(sx, sy);
        this.draggedNode.x = world.x;
        this.draggedNode.y = world.y;
        this.draggedNode.fx = world.x;
        this.draggedNode.fy = world.y;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
        this.alpha = Math.max(this.alpha, 0.2);
      } else if (this.isPanning) {
        this.panX = sx - this.panStartX;
        this.panY = sy - this.panStartY;
      } else {
        const world = this.screenToWorld(sx, sy);
        const hit = this.getNodeAt(world.x, world.y);
        this.hoveredNode = hit;

        if (hit && this.tooltip) {
          this.tooltip.style.display = 'block';
          this.tooltip.style.left = (sx + 14) + 'px';
          this.tooltip.style.top = (sy - 15) + 'px';
          this.tooltip.innerHTML = `
            <div class="brain-graph-tooltip-type" style="color: ${hit.color}">${(hit.type || 'NODE').toUpperCase()}</div>
            <div style="font-weight: 700; font-size: 12px; color: #F1F5F9;">${escapeGraphHtml(hit.fullTitle || hit.label)}</div>
            <div style="color: #94A3B8; font-size: 10px; margin-top: 3px;">Klik untuk melihat rincian</div>
          `;
          this.canvas.style.cursor = 'pointer';
        } else {
          if (this.tooltip) this.tooltip.style.display = 'none';
          this.canvas.style.cursor = 'grab';
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.draggedNode) {
        if (this.draggedNode.id !== 'core_brain' && this.draggedNode.id !== 'agent_master_agent') {
          this.draggedNode.fx = null;
          this.draggedNode.fy = null;
        }
        this.draggedNode = null;
      }
      this.isPanning = false;
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.mouseMoved) return;
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);
      const hit = this.getNodeAt(world.x, world.y);

      if (hit && hit.type !== 'core') {
        this.openNodeModal(hit);
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newZoom = Math.max(0.2, Math.min(4.0, this.zoom * zoomFactor));

      this.panX = sx - (sx - this.panX) * (newZoom / this.zoom);
      this.panY = sy - (sy - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;
    }, { passive: false });

    // Toolbar Controls
    document.getElementById('btn-graph-labels')?.addEventListener('click', (e) => {
      this.showAllLabels = !this.showAllLabels;
      e.currentTarget.textContent = this.showAllLabels ? '🏷️ Label: Semua' : '🏷️ Label: Smart';
    });
    document.getElementById('btn-graph-zoom-in')?.addEventListener('click', () => {
      this.zoom = Math.min(4.0, this.zoom * 1.25);
    });
    document.getElementById('btn-graph-zoom-out')?.addEventListener('click', () => {
      this.zoom = Math.max(0.2, this.zoom / 1.25);
    });
    document.getElementById('btn-graph-reset')?.addEventListener('click', () => {
      this.panX = 0;
      this.panY = 0;
      this.zoom = 1;
      this.alpha = 0.35;
    });
    document.getElementById('btn-graph-freeze')?.addEventListener('click', (e) => {
      this.isFrozen = !this.isFrozen;
      e.currentTarget.textContent = this.isFrozen ? '▶' : '⏸';
      e.currentTarget.title = this.isFrozen ? 'Jalankan Fisika' : 'Bekukan Fisika';
    });

    // Fullscreen Toggle
    const btnFullscreen = document.getElementById('btn-graph-fullscreen');
    const graphContainer = document.getElementById('brain-graph-view');

    const toggleFullscreen = () => {
      if (!graphContainer) return;
      const isFull = graphContainer.classList.toggle('is-fullscreen');
      document.body.classList.toggle('graph-fullscreen-active', isFull);
      if (btnFullscreen) {
        btnFullscreen.innerHTML = isFull 
          ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg> <span>Tutup</span>` 
          : `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> <span>Layar Penuh</span>`;
        btnFullscreen.title = isFull ? "Keluar dari Layar Penuh (Esc)" : "Perluas ke Layar Penuh";
        if (isFull) {
          btnFullscreen.classList.add('active');
        } else {
          btnFullscreen.classList.remove('active');
        }
      }
      setTimeout(() => {
        this.resizeCanvas();
        this.render();
      }, 60);
    };

    btnFullscreen?.addEventListener('click', toggleFullscreen);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && graphContainer && graphContainer.classList.contains('is-fullscreen')) {
        toggleFullscreen();
      }
    });

    document.querySelectorAll('.brain-graph-legend .legend-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.brain-graph-legend .legend-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterType = btn.getAttribute('data-filter') || 'all';
        this.applyFilter();
      });
    });
  }

  openNodeModal(node) {
    const modal = document.getElementById('modal-brain-detail');
    const titleEl = document.getElementById('modal-brain-detail-title');
    const badgeEl = document.getElementById('modal-brain-detail-badge');
    const metaEl = document.getElementById('modal-brain-detail-meta');
    const codeEl = document.getElementById('modal-brain-detail-code');

    if (!modal || !titleEl || !badgeEl || !codeEl) return;

    if (node.type === 'agent') {
      const ag = node.data;
      titleEl.textContent = `Agent: ${ag.name || ag.id}`;
      badgeEl.textContent = ag.is_boss ? "Master Orchestrator" : "Specialist Sub-Agent";
      badgeEl.className = "brain-badge agent";
      metaEl.textContent = `ID: ${ag.id} | Model: ${ag.model || 'Default'} | Skills: ${Array.isArray(ag.skills) ? ag.skills.length : 0}`;
      codeEl.textContent = ag.content || ag.description || JSON.stringify(ag, null, 2);
    } else if (node.type === 'skill') {
      const sk = node.data;
      titleEl.textContent = `Skill: ${sk.name || sk.id}`;
      badgeEl.textContent = "Autonomous Skill";
      badgeEl.className = "brain-badge skill";
      metaEl.textContent = `ID: ${sk.id} | Updated: ${new Date(sk.updated_at || Date.now()).toLocaleString('id-ID')}`;
      codeEl.textContent = sk.content || sk.description || JSON.stringify(sk, null, 2);
    } else if (node.type === 'memory' || node.type === 'facts') {
      const mem = node.data;
      titleEl.textContent = mem.name ? `Memory: ${mem.name}` : `User Fact & Rule`;
      badgeEl.textContent = mem.category || "Rule / Guideline";
      badgeEl.className = "brain-badge category";
      metaEl.textContent = `Alasan: ${mem.reason || 'General guideline'} | Updated: ${new Date(mem.updated_at || Date.now()).toLocaleString('id-ID')}`;
      codeEl.textContent = mem.content || JSON.stringify(mem, null, 2);
    } else if (node.type === 'experience') {
      const exp = node.data;
      titleEl.textContent = `Experience: ${exp.domain || exp.task || 'Resolved Task'}`;
      badgeEl.textContent = "Experience Ledger";
      badgeEl.className = "brain-badge category";
      metaEl.textContent = `Outcome: ${exp.outcome || 'Success'} | Created: ${new Date(exp.created_at || Date.now()).toLocaleString('id-ID')}`;
      codeEl.textContent = `## Task\n${exp.task || ''}\n\n## Winning Solution\n${exp.solution_summary || exp.content || JSON.stringify(exp, null, 2)}\n\n## Lessons Learned\n${exp.lessons_learned || ''}`;
    } else if (node.type === 'antipattern') {
      const ap = node.data;
      titleEl.textContent = `Anti-Pattern: ${ap.target_domain || ap.mistake_description || 'Failure Learning'}`;
      badgeEl.textContent = "Anti-Pattern";
      badgeEl.className = "brain-badge anti-pattern";
      metaEl.textContent = `Domain: ${ap.target_domain || 'General'} | Created: ${new Date(ap.created_at || Date.now()).toLocaleString('id-ID')}`;
      codeEl.textContent = `## Mistake / Gejala\n${ap.mistake_description || ''}\n\n## Winning Fix\n${ap.winning_fix || ''}\n\n## Aturan Pencegahan\n${ap.prevention_rule || ''}`;
    } else if (node.type === 'training') {
      const tc = node.data;
      titleEl.textContent = `Training Corpus: ${tc.title || tc.session_id || 'Archive'}`;
      badgeEl.textContent = "Training Corpus";
      badgeEl.className = "brain-badge category";
      metaEl.textContent = `Session: ${tc.session_id} | Created: ${new Date(tc.created_at || Date.now()).toLocaleString('id-ID')}`;
      codeEl.textContent = tc.distilled_points_md || JSON.stringify(tc, null, 2);
    } else if (node.type === 'model') {
      const m = node.data;
      titleEl.textContent = `AI Model: ${m.name || m.id}`;
      badgeEl.textContent = "LLM Engine";
      badgeEl.className = "brain-badge agent";
      metaEl.textContent = `Provider: ${m.provider || 'API'} | Model ID: ${m.id}`;
      codeEl.textContent = JSON.stringify(m, null, 2);
    } else if (node.type === 'epistemic') {
      const t = node.data;
      titleEl.textContent = `Triplet: ${t.subject} ➔ ${t.object}`;
      badgeEl.textContent = t.negative_constraint ? "🚨 Negative Constraint" : "✅ Epistemic Triplet";
      badgeEl.className = t.negative_constraint ? "brain-badge anti-pattern" : "brain-badge category";
      const liveC = t.decayed_confidence !== undefined ? t.decayed_confidence : t.confidence;
      metaEl.textContent = `Confidence: ${(liveC * 100).toFixed(1)}% | Provenance: ${t.source_kappa || 'user_chat'} | Updated: ${new Date(t.updated_at || Date.now()).toLocaleString('id-ID')}`;
      codeEl.textContent = `## Epistemic Knowledge Fact\n- **Subjek:** ${t.subject}\n- **Predikat / Relasi:** ${t.predicate}\n- **Objek:** ${t.object}\n\n## Status & Metadata\n- **Confidence Base:** ${t.confidence}\n- **Decayed Live Score:** ${liveC}\n- **Half-Life (Tau):** ${t.decay_tau || 2592000} detik (~30 hari)\n- **Negative / Forbidden:** ${t.negative_constraint ? 'Ya (Anti-Pattern / Constraint)' : 'Tidak'}\n- **Provenance / Source:** ${t.source_kappa || 'user_chat'}`;
    }

    modal.style.display = 'flex';
  }

  updatePhysics() {
    if (this.isFrozen) return;
    
    // When alpha has settled, zero velocities for rock-solid stability
    if (this.alpha < this.alphaMin) {
      for (let i = 0; i < this.filteredNodes.length; i++) {
        this.filteredNodes[i].vx = 0;
        this.filteredNodes[i].vy = 0;
      }
      return;
    }

    const nodes = this.filteredNodes;
    const links = this.filteredLinks;
    const nCount = nodes.length;

    const cx = this.width / 2;
    const cy = this.height / 2;

    // 1. Soft-Core Coulomb Repulsion
    for (let i = 0; i < nCount; i++) {
      const n1 = nodes[i];
      for (let j = i + 1; j < nCount; j++) {
        const n2 = nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;

        const force = Math.min((2200 / (distSq + 450)) * this.alpha, 7);

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (n1.fx === null || n1.fx === undefined) {
          n1.vx -= fx;
          n1.vy -= fy;
        }
        if (n2.fx === null || n2.fx === undefined) {
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }

    // 2. Hooke's Elastic Springs
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      const dx = l.target.x - l.source.x;
      const dy = l.target.y - l.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const diff = dist - l.length;
      
      const force = Math.max(-8, Math.min(8, diff * (l.strength || 0.05) * this.alpha));

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (l.source.fx === null || l.source.fx === undefined) {
        l.source.vx += fx;
        l.source.vy += fy;
      }
      if (l.target.fx === null || l.target.fx === undefined) {
        l.target.vx -= fx;
        l.target.vy -= fy;
      }
    }

    // 3. Human Brain Contour Magnetic Field (Dual-Hemisphere Morphological Confinement)
    for (let i = 0; i < nCount; i++) {
      const n = nodes[i];
      if (n.fx !== null && n.fx !== undefined) continue;

      const isLeft = (n.x < cx);
      const hCenter = isLeft ? (cx - 120) : (cx + 120);
      
      // Dual-hemisphere elliptical boundary
      const dx = (n.x - hCenter) / 160;
      const dy = (n.y - cy) / 190;
      const distFromLobe = dx * dx + dy * dy;

      if (distFromLobe > 1.0) {
        // Gently pull stray nodes back into the brain curvature
        const pull = (distFromLobe - 1.0) * 0.3 * this.alpha;
        n.vx -= dx * pull;
        n.vy -= dy * pull;
      }

      // Medial Fissure indentation (keeps the gap visible between Left & Right hemispheres at top and bottom)
      const distFromCenterLine = Math.abs(n.x - cx);
      if (distFromCenterLine < 28 && Math.abs(n.y - cy) > 50) {
        const pushAway = (28 - distFromCenterLine) * 0.015 * this.alpha;
        n.vx += isLeft ? -pushAway : pushAway;
      }

      // High damping factor (0.78) for instant settling
      n.vx = n.vx * 0.78;
      n.vy = n.vy * 0.78;

      n.x += n.vx;
      n.y += n.vy;
    }

    // Decay alpha smoothly
    if (!this.draggedNode) {
      this.alpha *= this.alphaDecay;
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);

    const nodes = this.filteredNodes;
    const links = this.filteredLinks;
    const hovered = this.hoveredNode;

    const searchInput = document.getElementById('search-brain-input');
    const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";

    // 1. Draw Visible Obsidian Synapse Lines (High Contrast, Clean & Sharp)
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      const isConnected = hovered && (l.source.id === hovered.id || l.target.id === hovered.id);
      const isCorpusCallosum = (l.source.id === 'core_brain' && l.target.id === 'agent_master_agent') || 
                               (l.source.id === 'agent_master_agent' && l.target.id === 'core_brain');

      this.ctx.beginPath();
      this.ctx.moveTo(l.source.x, l.source.y);
      this.ctx.lineTo(l.target.x, l.target.y);

      const isNegativeLink = (l.source.isNegative || l.target.isNegative);

      if (isNegativeLink) {
        this.ctx.strokeStyle = '#EF4444';
        this.ctx.lineWidth = 1.6;
        this.ctx.setLineDash([4, 4]);
        this.ctx.globalAlpha = hovered ? 0.4 : 0.85;
      } else if (isConnected) {
        this.ctx.strokeStyle = hovered.color || '#38BDF8';
        this.ctx.lineWidth = 2.2;
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1.0;
      } else if (isCorpusCallosum) {
        // Glowing bridge between Left & Right Hemispheres
        this.ctx.strokeStyle = '#F472B6';
        this.ctx.lineWidth = 1.8;
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = hovered ? 0.35 : 0.85;
      } else {
        this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
        this.ctx.lineWidth = 0.9;
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = hovered ? 0.08 : 0.65;
      }
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
    this.ctx.globalAlpha = 1;

    // 2. Draw Nodes (Sleek Obsidian Glowing Dots)
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const isHovered = hovered && hovered.id === n.id;
      const isNeighbor = hovered && links.some(l => (l.source.id === hovered.id && l.target.id === n.id) || (l.target.id === hovered.id && l.source.id === n.id));
      
      const isSearchMatch = searchVal && (
        (n.label || '').toLowerCase().includes(searchVal) || 
        (n.fullTitle || '').toLowerCase().includes(searchVal)
      );

      let alpha = 1;
      if (searchVal) {
        alpha = isSearchMatch ? 1 : 0.15;
      } else if (hovered) {
        alpha = (isHovered || isNeighbor || n.type === 'core' || n.is_boss) ? 1 : 0.2;
      }

      this.ctx.globalAlpha = alpha;

      // Outer Glowing Halo for Hovered / Active Nodes / Boss Nodes
      if (isHovered || isSearchMatch || n.is_boss || n.type === 'core') {
        this.ctx.beginPath();
        this.ctx.arc(n.x, n.y, n.radius + (isHovered ? 5.5 : 3.5), 0, Math.PI * 2);
        this.ctx.fillStyle = isSearchMatch ? '#FBBF24' : (n.color || '#38BDF8');
        this.ctx.globalAlpha = isHovered ? 0.45 : 0.22;
        this.ctx.fill();
        this.ctx.globalAlpha = alpha;
      }

      // Main Obsidian Node Dot
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = n.color || '#38BDF8';
      this.ctx.fill();

      // Delicate Glow Rim
      this.ctx.lineWidth = isHovered ? 1.5 : 0.6;
      this.ctx.strokeStyle = isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)';
      this.ctx.stroke();
    }

    // 3. Obsidian Ambient Typography with Spatial Collision Avoidance
    const occupiedBoxes = [];

    const isBoxColliding = (bx, by, bw, bh) => {
      for (let k = 0; k < occupiedBoxes.length; k++) {
        const b = occupiedBoxes[k];
        if (bx < b.x + b.w && bx + bw > b.x && by < b.y + b.h && by + bh > b.y) {
          return true;
        }
      }
      return false;
    };

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const isHovered = hovered && hovered.id === n.id;
      const isNeighbor = hovered && links.some(l => (l.source.id === hovered.id && l.target.id === n.id) || (l.target.id === hovered.id && l.source.id === n.id));
      const isBossOrCore = n.type === 'core' || n.is_boss || (n.type === 'agent' && n.data?.is_boss);
      
      const isSearchMatch = searchVal && (
        (n.label || '').toLowerCase().includes(searchVal) || 
        (n.fullTitle || '').toLowerCase().includes(searchVal)
      );

      const shouldShowLabel = isHovered || isSearchMatch || (hovered ? isNeighbor : (isBossOrCore || (this.showAllLabels && this.zoom >= 0.8)));

      if (shouldShowLabel) {
        this.ctx.font = `${isHovered ? 'bold 11px' : (isBossOrCore ? '600 9.5px' : '500 8.5px')} Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        const textWidth = this.ctx.measureText(n.label).width;
        const textHeight = 12;
        const lx = n.x - textWidth / 2;
        const ly = n.y + n.radius + 4;

        if (!isHovered && !isSearchMatch && isBoxColliding(lx - 4, ly - 2, textWidth + 8, textHeight + 4)) {
          continue;
        }

        occupiedBoxes.push({ x: lx - 4, y: ly - 2, w: textWidth + 8, h: textHeight + 4 });

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        if (isHovered) {
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          this.ctx.shadowBlur = 5;
          this.ctx.fillText(n.label, n.x, n.y + n.radius + 5);
          this.ctx.shadowBlur = 0;
        } else {
          this.ctx.fillStyle = isSearchMatch ? '#FDE68A' : (isBossOrCore ? '#F1F5F9' : 'rgba(203, 213, 225, 0.75)');
          this.ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          this.ctx.shadowBlur = 3;
          this.ctx.fillText(n.label, n.x, n.y + n.radius + 4);
          this.ctx.shadowBlur = 0;
        }
      }
    }

    this.ctx.restore();
  }

  start() {
    if (!this.animId) {
      this.resizeCanvas();
      const loop = () => {
        this.updatePhysics();
        this.render();
        this.animId = requestAnimationFrame(loop);
      };
      this.animId = requestAnimationFrame(loop);
    }
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}

// Attach to window for global access
window.BrainGraphEngine = BrainGraphEngine;
