/**
 * ============================================================================
 * 🖥️ STICKMAN SCENERY, TECHNICIANS & SERVER RACKS
 * Menggambar teknisi obeng, teknisi kabel, server rack berkedip & lantai.
 * Dioptimalkan dengan jarak atas proporsional & tanpa sela kosong di bawah.
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
    const x = isNarrow ? 22 : 32;
    const reach = serverWorkers.left.reachOut;
    const bodyLean = Math.sin(time * 2.5) * 0.08 * (1 - reach) + (reach * 0.15);
    const pelvis = { x: x, y: floorY - 17 };
    const chest = { x: x - Math.sin(bodyLean) * 5.5 + (reach * 2.0), y: pelvis.y - 7.5 };
    const neck = { x: chest.x - 2.0, y: chest.y - 3.0 };
    const head = { x: neck.x - 0.8, y: neck.y - 3.6 };

    if (P.drawBranchLeg) P.drawBranchLeg(ctx, pelvis, { x: x - 2.8, y: floorY - 7.5 }, { x: x - 4.8, y: floorY }, 1.5, C.NEON_MAIN);
    if (P.drawUnifiedSpineAndLeg) P.drawUnifiedSpineAndLeg(ctx, neck, chest, pelvis, { x: x + 2.8, y: floorY - 7.5 }, { x: x + 4.8, y: floorY }, 1.5, C.NEON_MAIN);

    ctx.beginPath();
    ctx.arc(head.x, head.y, 4.0, 0, Math.PI * 2);
    ctx.fillStyle = C.NEON_MAIN;
    ctx.fill();

    const pull = Math.sin(time * 3.5);
    const elbow_Work = { x: chest.x - 5.0 + pull * 1.8, y: chest.y + 2.8 + pull * 1.0 };
    const hand_Work = { x: elbow_Work.x - 4.5, y: elbow_Work.y - 2.0 };

    const elbow_Reach = { x: chest.x + 4.5, y: chest.y + 2.0 };
    const hand_Reach = { x: chest.x + 10.5, y: chest.y + 1.0 };

    const elbow = {
      x: P.numLerp ? P.numLerp(elbow_Work.x, elbow_Reach.x, reach) : elbow_Work.x,
      y: P.numLerp ? P.numLerp(elbow_Work.y, elbow_Reach.y, reach) : elbow_Work.y
    };
    const hand = {
      x: P.numLerp ? P.numLerp(hand_Work.x, hand_Reach.x, reach) : hand_Work.x,
      y: P.numLerp ? P.numLerp(hand_Work.y, hand_Reach.y, reach) : hand_Work.y
    };

    if (P.drawSeamlessArm) P.drawSeamlessArm(ctx, chest, elbow, hand, 1.5, C.NEON_MAIN);

    if (reach < 0.3) {
      ctx.strokeStyle = C.NEON_MAIN;
      ctx.lineWidth = 1.0;
      ctx.strokeRect(hand.x - 2.0, hand.y - 2.0, 2.0, 2.0);

      if (pull > 0.45) {
        ctx.fillStyle = C.NEON_MAIN;
        ctx.fillRect(hand.x - 2.8 + Math.random() * 2.0, hand.y - 2.8 + Math.random() * 2.0, 1.0, 1.0);
      }
    }

    if (P.drawFace) P.drawFace(ctx, head.x, head.y, (reach > 0.3 ? Math.PI : 0), 0, time);
  }

  function drawCableTech(ctx, time, width, floorY, serverWorkers) {
    if (!ctx) return;
    const isNarrow = width < 460;
    const x = width - (isNarrow ? 22 : 32);
    const reach = serverWorkers.right.reachOut;
    const bodyLean = Math.sin(time * 2) * 0.05 * (1 - reach) - (reach * 0.15);
    const pelvis = { x: x, y: floorY - 17 };
    const chest = { x: x + Math.sin(bodyLean) * 5.0 - (reach * 2.0), y: pelvis.y - 7.5 };
    const neck = { x: chest.x + 1.5, y: chest.y - 3.0 };
    const head = { x: neck.x + 0.6, y: neck.y - 3.6 };

    if (P.drawBranchLeg) P.drawBranchLeg(ctx, pelvis, { x: x - 2.8, y: floorY - 7.5 }, { x: x - 4.5, y: floorY }, 1.5, C.NEON_MAIN);
    if (P.drawUnifiedSpineAndLeg) P.drawUnifiedSpineAndLeg(ctx, neck, chest, pelvis, { x: x + 2.8, y: floorY - 7.5 }, { x: x + 4.5, y: floorY }, 1.5, C.NEON_MAIN);

    ctx.beginPath();
    ctx.arc(head.x, head.y, 4.0, 0, Math.PI * 2);
    ctx.fillStyle = C.NEON_MAIN;
    ctx.fill();

    const elbow_Work = { x: chest.x + 4.5, y: chest.y + 2.5 };
    const hand_Work = { x: elbow_Work.x + 3.2, y: elbow_Work.y + (Math.sin(time * 3) * 1.5) };

    const elbow_Reach = { x: chest.x - 4.5, y: chest.y + 2.0 };
    const hand_Reach = { x: chest.x - 10.5, y: chest.y + 1.0 };

    const elbow = {
      x: P.numLerp ? P.numLerp(elbow_Work.x, elbow_Reach.x, reach) : elbow_Work.x,
      y: P.numLerp ? P.numLerp(elbow_Work.y, elbow_Reach.y, reach) : elbow_Work.y
    };
    const hand = {
      x: P.numLerp ? P.numLerp(hand_Work.x, hand_Reach.x, reach) : hand_Work.x,
      y: P.numLerp ? P.numLerp(hand_Work.y, hand_Reach.y, reach) : hand_Work.y
    };

    if (P.drawSeamlessArm) P.drawSeamlessArm(ctx, chest, elbow, hand, 1.5, C.NEON_MAIN);

    if (reach < 0.3) {
      ctx.beginPath();
      ctx.moveTo(hand.x, hand.y);
      ctx.quadraticCurveTo(hand.x + 4, hand.y + 4, width - 10, floorY - 12);
      ctx.strokeStyle = '#777777';
      ctx.lineWidth = 1.0;
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
    const slotH = (rh - 5) / slotCount;
    for (let i = 0; i < slotCount; i++) {
      const slotY = y + 1.5 + i * slotH;
      ctx.fillStyle = C.SERVER_SLOT || '#1A1A22';
      ctx.fillRect(x + 1.8, slotY, rw - 3.6, slotH - 1.0);

      const blink = Math.sin(time * 4 + i + offset) > 0;
      ctx.fillStyle = blink ? (i === 0 ? (C.LED_ALERT || '#E11D48') : C.NEON_MAIN) : (C.LED_OFF || '#444444');
      ctx.beginPath();
      ctx.arc(x + 3.2, slotY + (slotH - 1.0) * 0.5, 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = !blink ? C.NEON_MAIN : (C.LED_OFF || '#444444');
      ctx.beginPath();
      ctx.arc(x + rw - 3.2, slotY + (slotH - 1.0) * 0.5, 0.8, 0, Math.PI * 2);
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
    const rackW = isNarrow ? 15 : 18;
    const rackH = isNarrow ? 20 : 24;
    drawServerRack(ctx, 4, floorY - rackH, rackW, rackH, time, 0);
    drawServerRack(ctx, width - (rackW + 4), floorY - rackH, rackW, rackH, time, 1.5);
  }

  window.StickmanScenery = {
    drawMechanic,
    drawCableTech,
    drawServerRack,
    drawEnvironment
  };
})();
