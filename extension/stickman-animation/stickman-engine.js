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
    return (cfg.LAYOUT && cfg.LAYOUT.FLOOR_Y) || 84;
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

  window.startStickmanSwarmAnimation = () => {
    setupElements();
    if (!wrapper || !canvas) return;
    
    wrapper.style.display = 'block';
    resize();
    initRunners();
    
    if (!isRunning) {
      isRunning = true;
      lastTime = performance.now();
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(renderLoop);
    }
  };

  window.stopStickmanSwarmAnimation = () => {
    isRunning = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (wrapper) {
      wrapper.style.display = 'none';
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, width, height);
    }
  };

  window.addEventListener('resize', () => {
    if (isRunning) {
      resize();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    setupElements();
  });
})();
