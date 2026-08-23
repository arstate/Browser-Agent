/**
 * ============================================================================
 * 🖥️ STICKMAN SCENERY, TECHNICIANS & SERVER RACKS
 * Menggambar teknisi obeng, teknisi kabel, server rack berkedip & lantai.
 * Dioptimalkan untuk tinggi kanvas ramping (Compact Sleek Proportions).
 * ============================================================================
 */
(() => {
  const cfg = window.STICKMAN_CONFIG || {};
  const C = cfg.COLORS || {
    NEON_MAIN: '#CEF128',
    NEON_SECONDARY: 'rgba(206, 241, 40, 0.38)',
    FLOOR_LINE: 'rgba(255, 255, 255, 0.08)',
    SERVER_BODY: '#101014',
    SERVER_BORDER: 'rgba(255, 255, 255, 0.12)',
    SERVER_SLOT: '#1A1A22',
    LED_ALERT: '#E11D48',
    LED_OFF: '#444444'
  };

  const P = window.StickmanPhysics || {};

  function drawMechanic(ctx, time, width, floorY, serverWorkers) {
    if (!ctx) return;
    const isNarrow = width < 460;
    const x = isNarrow ? 28 : 42;
    const reach = serverWorkers.left.reachOut;
    const bodyLean = Math.sin(time * 2.5) * 0.08 * (1 - reach) + (reach * 0.15);
    const pelvis = { x: x, y: floorY - 24 };
    const chest = { x: x - Math.sin(bodyLean) * 8 + (reach * 3), y: pelvis.y - 10 };
    const neck = { x: chest.x - 3, y: chest.y - 4 };
    const head = { x: neck.x - 1, y: neck.y - 5 };

    if (P.drawBranchLeg) P.drawBranchLeg(ctx, pelvis, { x: x - 4, y: floorY - 10 }, { x: x - 7, y: floorY }, 2.0, C.NEON_MAIN);
    if (P.drawUnifiedSpineAndLeg) P.drawUnifiedSpineAndLeg(ctx, neck, chest, pelvis, { x: x + 4, y: floorY - 10 }, { x: x + 7, y: floorY }, 2.0, C.NEON_MAIN);

    ctx.beginPath();
    ctx.arc(head.x, head.y, 5.8, 0, Math.PI * 2);
    ctx.fillStyle = C.NEON_MAIN;
    ctx.fill();

    const pull = Math.sin(time * 3.5);
    const elbow_Work = { x: chest.x - 7 + pull * 2.5, y: chest.y + 4 + pull * 1.5 };
    const hand_Work = { x: elbow_Work.x - 6, y: elbow_Work.y - 3 };

    const elbow_Reach = { x: chest.x + 6, y: chest.y + 3 };
    const hand_Reach = { x: chest.x + 14, y: chest.y + 1.5 };

    const elbow = {
      x: P.numLerp ? P.numLerp(elbow_Work.x, elbow_Reach.x, reach) : elbow_Work.x,
      y: P.numLerp ? P.numLerp(elbow_Work.y, elbow_Reach.y, reach) : elbow_Work.y
    };
    const hand = {
      x: P.numLerp ? P.numLerp(hand_Work.x, hand_Reach.x, reach) : hand_Work.x,
      y: P.numLerp ? P.numLerp(hand_Work.y, hand_Reach.y, reach) : hand_Work.y
    };

    if (P.drawSeamlessArm) P.drawSeamlessArm(ctx, chest, elbow, hand, 2.0, C.NEON_MAIN);

    if (reach < 0.3) {
      ctx.strokeStyle = C.NEON_MAIN;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(hand.x - 3, hand.y - 3, 3, 3);

      if (pull > 0.45) {
        ctx.fillStyle = C.NEON_MAIN;
        ctx.fillRect(hand.x - 4 + Math.random() * 3, hand.y - 4 + Math.random() * 3, 1.5, 1.5);
      }
    }

    if (P.drawFace) P.drawFace(ctx, head.x, head.y, (reach > 0.3 ? Math.PI : 0), 0, time);
  }

  function drawCableTech(ctx, time, width, floorY, serverWorkers) {
    if (!ctx) return;
    const isNarrow = width < 460;
    const x = width - (isNarrow ? 28 : 42);
    const reach = serverWorkers.right.reachOut;
    const bodyLean = Math.sin(time * 2) * 0.05 * (1 - reach) - (reach * 0.15);
    const pelvis = { x: x, y: floorY - 24 };
    const chest = { x: x + Math.sin(bodyLean) * 7 - (reach * 3), y: pelvis.y - 10 };
    const neck = { x: chest.x + 2, y: chest.y - 4 };
    const head = { x: neck.x + 1, y: neck.y - 5 };

    if (P.drawBranchLeg) P.drawBranchLeg(ctx, pelvis, { x: x - 4, y: floorY - 10 }, { x: x - 6, y: floorY }, 2.0, C.NEON_MAIN);
    if (P.drawUnifiedSpineAndLeg) P.drawUnifiedSpineAndLeg(ctx, neck, chest, pelvis, { x: x + 4, y: floorY - 10 }, { x: x + 6, y: floorY }, 2.0, C.NEON_MAIN);

    ctx.beginPath();
    ctx.arc(head.x, head.y, 5.8, 0, Math.PI * 2);
    ctx.fillStyle = C.NEON_MAIN;
    ctx.fill();

    const elbow_Work = { x: chest.x + 6, y: chest.y + 3.5 };
    const hand_Work = { x: elbow_Work.x + 4.5, y: elbow_Work.y + (Math.sin(time * 3) * 2) };

    const elbow_Reach = { x: chest.x - 6, y: chest.y + 3 };
    const hand_Reach = { x: chest.x - 14, y: chest.y + 1.5 };

    const elbow = {
      x: P.numLerp ? P.numLerp(elbow_Work.x, elbow_Reach.x, reach) : elbow_Work.x,
      y: P.numLerp ? P.numLerp(elbow_Work.y, elbow_Reach.y, reach) : elbow_Work.y
    };
    const hand = {
      x: P.numLerp ? P.numLerp(hand_Work.x, hand_Reach.x, reach) : hand_Work.x,
      y: P.numLerp ? P.numLerp(hand_Work.y, hand_Reach.y, reach) : hand_Work.y
    };

    if (P.drawSeamlessArm) P.drawSeamlessArm(ctx, chest, elbow, hand, 2.0, C.NEON_MAIN);

    if (reach < 0.3) {
      ctx.beginPath();
      ctx.moveTo(hand.x, hand.y);
      ctx.quadraticCurveTo(hand.x + 6, hand.y + 6, width - 14, floorY - 18);
      ctx.strokeStyle = '#777777';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (P.drawFace) P.drawFace(ctx, head.x, head.y, (reach > 0.3 ? 0 : Math.PI), 0, time);
  }

  function drawServerRack(ctx, x, y, rw, rh, time, offset) {
    if (!ctx) return;
    ctx.fillStyle = C.SERVER_BODY || '#101014';
    ctx.strokeStyle = C.SERVER_BORDER || 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.0;
    ctx.fillRect(x, y, rw, rh);
    ctx.strokeRect(x, y, rw, rh);

    const slotCount = 4;
    for (let i = 0; i < slotCount; i++) {
      const slotY = y + 3 + i * 8.5;
      ctx.fillStyle = C.SERVER_SLOT || '#1A1A22';
      ctx.fillRect(x + 2, slotY, rw - 4, 6.5);

      const blink = Math.sin(time * 4 + i + offset) > 0;
      ctx.fillStyle = blink ? (i === 0 ? (C.LED_ALERT || '#E11D48') : C.NEON_MAIN) : (C.LED_OFF || '#444444');
      ctx.beginPath();
      ctx.arc(x + 4.5, slotY + 3.2, 1.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = !blink ? C.NEON_MAIN : (C.LED_OFF || '#444444');
      ctx.beginPath();
      ctx.arc(x + rw - 4.5, slotY + 3.2, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnvironment(ctx, width, floorY, time) {
    if (!ctx) return;
    ctx.strokeStyle = C.FLOOR_LINE || 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(width, floorY);
    ctx.stroke();

    const isNarrow = width < 460;
    const rackW = isNarrow ? 20 : 26;
    drawServerRack(ctx, 6, floorY - 38, rackW, 38, time, 0);
    drawServerRack(ctx, width - (rackW + 6), floorY - 38, rackW, 38, time, 1.5);
  }

  window.StickmanScenery = {
    drawMechanic,
    drawCableTech,
    drawServerRack,
    drawEnvironment
  };
})();
