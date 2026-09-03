/**
 * ============================================================================
 * 🚀 STICKMAN ANIMATION MAIN ORCHESTRATOR & LIFECYCLE ENGINE
 * Mengontrol render loop, siklus hidup start/stop (0% CPU idle), & DPR scaling.
 * ============================================================================
 */
(() => {
  let isRunning = false;
  let animFrameId = null;
  let canvas = null;
  let ctx = null;
  let container = null;
  let wrapper = null;
  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;
  let lastTime = 0;

  const serverWorkers = {
    left: { reachOut: 0 },
    right: { reachOut: 0 }
  };

  let runners = [];

  function getFloorY() {
    const cfg = window.STICKMAN_CONFIG || {};
    const isNarrow = width < 460;
    if (isNarrow && cfg.LAYOUT && cfg.LAYOUT.FLOOR_Y_COMPACT) {
      return cfg.LAYOUT.FLOOR_Y_COMPACT;
    }
    return (cfg.LAYOUT && cfg.LAYOUT.FLOOR_Y) || 47;
  }

  function initRunners() {
    const cfg = window.STICKMAN_CONFIG || {};
    const isNarrow = width < 460;
    const runnerList = (isNarrow && cfg.RUNNERS_COMPACT) ? cfg.RUNNERS_COMPACT : (cfg.RUNNERS_WIDE || []);
    
    const RunnerClass = (window.StickmanPhysics && window.StickmanPhysics.BiomechanicalRunner);
    if (!RunnerClass) return;

    runners = runnerList.map(r => new RunnerClass(r));
  }

  function resize() {
    if (!container || !canvas) return;
    width = container.clientWidth || 720;
    height = container.clientHeight || 100;
    dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
  }

  function renderLoop(now) {
    if (!isRunning) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    const time = now / 1000;

    const floorY = getFloorY();
    const S = window.StickmanScenery;

    if (ctx) {
      ctx.clearRect(0, 0, width, height);

      if (S && S.drawEnvironment) S.drawEnvironment(ctx, width, floorY, time);
      if (S && S.drawMechanic) S.drawMechanic(ctx, time, width, floorY, serverWorkers);
      if (S && S.drawCableTech) S.drawCableTech(ctx, time, width, floorY, serverWorkers);

      runners.forEach(runner => {
        runner.update(dt, time, width, floorY, serverWorkers);
        runner.draw(ctx, time, floorY);
      });
    }

    animFrameId = requestAnimationFrame(renderLoop);
  }

  function setupElements() {
    wrapper = document.getElementById('ai-stickman-swarm-container');
    container = document.getElementById('stageContainer') || wrapper;
    canvas = document.getElementById('physicsCanvas');
    if (canvas) {
      ctx = canvas.getContext('2d');
    }
  }

  let hideTimeout = null;

  window.startStickmanSwarmAnimation = () => {
    if (window.location.pathname.includes('sidepanel.html')) return;
    if (window.stickmanAnimationEnabled === false || (typeof stickmanAnimationEnabled !== 'undefined' && !stickmanAnimationEnabled)) {
      window.stopStickmanSwarmAnimation(true);
      return;
    }
    setupElements();
    if (!wrapper || !canvas) return;
    
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    wrapper.classList.remove('is-disabled');
    wrapper.style.display = 'block';
    void wrapper.offsetWidth;
    wrapper.classList.add('is-active');
    document.body.classList.remove('stickman-disabled');
    document.body.classList.add('stickman-active');
    
    resize();
    initRunners();
    
    if (!isRunning) {
      isRunning = true;
      lastTime = performance.now();
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(renderLoop);
    }

    if (typeof scrollToBottom === 'function') {
      setTimeout(() => { scrollToBottom(true); }, 50);
    }
  };

  window.stopStickmanSwarmAnimation = (immediate = false) => {
    setupElements();

    // 1. Immediately halt RAF physics render loop to release CPU/GPU to 0.0% instantly
    isRunning = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    // 2. Hide container and clear canvas without lingering timers
    document.body.classList.remove('stickman-active');
    if (wrapper) {
      wrapper.classList.remove('is-active');
      wrapper.style.display = 'none';
      wrapper.classList.add('is-disabled');
    }

    if (ctx && canvas) {
      ctx.clearRect(0, 0, width, height);
    }
  };

  window.disableStickmanSwarmAnimation = () => {
    window.stickmanAnimationEnabled = false;
    window.stopStickmanSwarmAnimation(true);
  };

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['setting_stickman_animation', 'browser_agent_config'], (res) => {
        if (res?.setting_stickman_animation === false || res?.browser_agent_config?.stickmanAnimation === false) {
          window.stickmanAnimationEnabled = false;
          window.stopStickmanSwarmAnimation(true);
        }
      });

      chrome.storage.onChanged?.addListener((changes, area) => {
        if (area === 'local') {
          if (changes.setting_stickman_animation !== undefined) {
            window.stickmanAnimationEnabled = changes.setting_stickman_animation.newValue !== false;
            if (!window.stickmanAnimationEnabled) window.stopStickmanSwarmAnimation(true);
          } else if (changes.browser_agent_config?.newValue?.stickmanAnimation !== undefined) {
            window.stickmanAnimationEnabled = changes.browser_agent_config.newValue.stickmanAnimation !== false;
            if (!window.stickmanAnimationEnabled) window.stopStickmanSwarmAnimation(true);
          }
        }
      });
    }
  } catch(e) {}

  window.addEventListener('resize', () => {
    if (isRunning) {
      resize();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    setupElements();
  });
})();
