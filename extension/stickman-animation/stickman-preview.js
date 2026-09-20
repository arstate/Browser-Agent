// stickman-preview.js - Sandbox Controller
(function() {
  window.addEventListener('DOMContentLoaded', () => {
    const btnStart = document.getElementById('btn-preview-start');
    const btnStop = document.getElementById('btn-preview-stop');

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        if (typeof window.startStickmanSwarmAnimation === 'function') {
          window.startStickmanSwarmAnimation();
        }
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => {
        if (typeof window.stopStickmanSwarmAnimation === 'function') {
          window.stopStickmanSwarmAnimation();
        }
      });
    }

    if (typeof window.startStickmanSwarmAnimation === 'function') {
      window.startStickmanSwarmAnimation();
    }
  });
})();
