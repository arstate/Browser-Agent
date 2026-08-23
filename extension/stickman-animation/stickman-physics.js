/**
 * ============================================================================
 * 🏃 STICKMAN PHYSICS & BIOMECHANICAL KINEMATICS ENGINE
 * Berisi model matematika pergerakan tubuh, kurva bezier, dan ekspresi wajah.
 * Dioptimalkan untuk tinggi kanvas ramping dengan jarak atas proporsional & tanpa sela bawah.
 * ============================================================================
 */
(() => {
  const cfg = window.STICKMAN_CONFIG || {};
  const C = cfg.COLORS || {
    NEON_MAIN: '#CEF128',
    NEON_SECONDARY: 'rgba(206, 241, 40, 0.38)'
  };
  const L = cfg.LAYOUT || { FLOOR_Y: 47, HEAD_RADIUS: 3.8, LIMB_THICKNESS: 1.6 };

  function numLerp(a, b, t) {
    const clampedT = Math.max(0, Math.min(1, t));
    return a + (b - a) * clampedT;
  }

  function expLerp(current, target, speed, dt) {
    if (isNaN(current)) return target;
    const factor = 1 - Math.exp(-speed * Math.max(0.001, dt));
    return current + (target - current) * factor;
  }

  function drawUnifiedSpineAndLeg(ctx, neck, chest, pelvis, knee, foot, thickness, color) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(neck.x, neck.y);
    ctx.bezierCurveTo(chest.x, chest.y, pelvis.x, pelvis.y - 3, pelvis.x, pelvis.y);
    
    const cpX = 2 * knee.x - 0.5 * pelvis.x - 0.5 * foot.x;
    const cpY = 2 * knee.y - 0.5 * pelvis.y - 0.5 * foot.y;
    ctx.quadraticCurveTo(cpX, cpY, foot.x, foot.y);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function drawBranchLeg(ctx, pelvis, knee, foot, thickness, color) {
    if (!ctx) return;
    const cpX = 2 * knee.x - 0.5 * pelvis.x - 0.5 * foot.x;
    const cpY = 2 * knee.y - 0.5 * pelvis.y - 0.5 * foot.y;

    ctx.beginPath();
    ctx.moveTo(pelvis.x, pelvis.y);
    ctx.quadraticCurveTo(cpX, cpY, foot.x, foot.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function drawSeamlessArm(ctx, shoulder, elbow, hand, thickness, color) {
    if (!ctx) return;
    const cpX = 2 * elbow.x - 0.5 * shoulder.x - 0.5 * hand.x;
    const cpY = 2 * elbow.y - 0.5 * shoulder.y - 0.5 * hand.y;

    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.quadraticCurveTo(cpX, cpY, hand.x, hand.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function drawFace(ctx, headX, headY, angleY, exprBlend, time) {
    if (!ctx) return;
    const cosY = Math.cos(angleY);
    if (Math.abs(cosY) < 0.12) return;

    const eyeOffX = 2.2 * cosY;
    const eyeDist = 3.3 * cosY;
    const leftEyeX = headX + eyeOffX - eyeDist / 2;
    const rightEyeX = headX + eyeOffX + eyeDist / 2;
    const eyeY = headY - 0.7;

    ctx.save();
    ctx.fillStyle = '#141414';
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 1.0;
    ctx.lineCap = 'round';

    const pant = Math.sin(time * 8) * 0.35 * exprBlend;
    const browAngleL = (-2.2 * (1 - exprBlend)) + (1.1 * exprBlend);
    const browAngleR = (-1.6 * (1 - exprBlend)) + (-1.1 * exprBlend);

    ctx.beginPath();
    ctx.moveTo(leftEyeX - 1.4 * cosY, eyeY - 2.0 + browAngleL + pant);
    ctx.lineTo(leftEyeX + 1.2 * cosY, eyeY - 0.9 + pant);
    ctx.moveTo(rightEyeX - 1.2 * cosY, eyeY - 0.9 + pant);
    ctx.lineTo(rightEyeX + 1.4 * cosY, eyeY - 2.0 + browAngleR + pant);
    ctx.stroke();

    const eyeHeight = Math.max(0.7, 2.2 * (1 - exprBlend * 0.7));
    ctx.fillRect(leftEyeX - 0.9 * cosY, eyeY - 0.4 + pant, 1.8 * Math.abs(cosY), eyeHeight);
    ctx.fillRect(rightEyeX - 0.9 * cosY, eyeY - 0.4 + pant, 1.8 * Math.abs(cosY), eyeHeight);
    ctx.restore();
  }

  // Kelas Pelari Biomekanik
  class BiomechanicalRunner {
    constructor(cfgRunner) {
      this.startX = cfgRunner.startX || 75;
      this.gaitType = cfgRunner.gaitType || 'sprint';
      
      if (this.gaitType === 'slow_walk') this.maxSpeed = 1.15;
      else if (this.gaitType === 'jog') this.maxSpeed = 1.95;
      else if (this.gaitType === 'sprint') this.maxSpeed = 3.3;
      else this.maxSpeed = 2.4; // fatigue cargo

      this.x = this.startX;
      this.vx = this.maxSpeed;
      this.facing = cfgRunner.facing || 1;
      this.angleY = (this.facing === 1) ? 0 : Math.PI;
      this.gaitPhase = Math.random() * Math.PI * 2;

      this.state = 'traveling';
      this.interactionTimer = 0;
      this.restTimer = 0;
      this.hasRested = false;
      this.hasBox = cfgRunner.hasBox !== false;

      this.pose = {
        speedFactor: 1.0,
        forwardLean: 0.2,
        heightDrop: 0.0,
        armDriveAmp: 1.0,
        elbowLockAngle: 0.8,
        handoverReach: 0.0,
        hunchedTired: 0.0,
        gaspIntensity: 0.0
      };

      this.sweatParticles = [];
    }

    update(dt, t, width, floorY, serverWorkers) {
      const isNarrow = width < 460;
      const leftServerBound = isNarrow ? 48 : 70;
      const rightServerBound = Math.max(120, width - (isNarrow ? 58 : 85));
      const restTargetX = (leftServerBound + rightServerBound) * 0.48;

      let targetSpeed = this.maxSpeed;
      let targetHunched = 0.0;
      let targetGasp = 0.0;
      let targetHandoverReach = 0.0;

      // 1. Fatigue Stop di Tengah Jalan
      if (this.gaitType === 'fatigue_cargo') {
        if (this.state === 'traveling' && !this.hasRested && this.facing === 1 && Math.abs(this.x - restTargetX) < 30) {
          this.state = 'resting';
          this.restTimer = 3.8;
        }
      }

      if (this.state === 'resting') {
        targetSpeed = 0.0;
        targetHunched = 1.0;
        targetGasp = 1.0;
        this.restTimer -= dt;

        if (Math.random() < 0.25) {
          this.sweatParticles.push({
            x: this.x + 6 * Math.cos(this.angleY),
            y: floorY - 24,
            vy: 0.6 + Math.random() * 0.5,
            alpha: 1
          });
        }

        if (this.restTimer <= 0) {
          this.state = 'traveling';
          this.hasRested = true;
        }
      }

      // 2. Interaksi Serah-Terima Berkas di Server Kiri/Kanan
      if (this.state === 'traveling') {
        const distToServer = (this.facing === 1) ? (rightServerBound - this.x) : (this.x - leftServerBound);
        if (distToServer < 50) {
          this.state = 'approaching_server';
        }
      } else if (this.state === 'approaching_server') {
        targetSpeed = 0.45;
        const distToServer = (this.facing === 1) ? (rightServerBound - this.x) : (this.x - leftServerBound);

        if (distToServer <= 8) {
          this.state = 'handover';
          this.interactionTimer = 1.3;
        }
      } else if (this.state === 'handover') {
        targetSpeed = 0.0;
        targetHandoverReach = 1.0;
        this.interactionTimer -= dt;

        if (this.facing === 1 && serverWorkers && serverWorkers.right) {
          serverWorkers.right.reachOut = expLerp(serverWorkers.right.reachOut, 1.0, 6, dt);
        } else if (serverWorkers && serverWorkers.left) {
          serverWorkers.left.reachOut = expLerp(serverWorkers.left.reachOut, 1.0, 6, dt);
        }

        if (this.interactionTimer <= 0) {
          this.state = 'pivot_turn';
          this.turnProgress = 0;
          this.hasBox = !this.hasBox;
        }
      } else if (this.state === 'pivot_turn') {
        targetSpeed = 0.0;
        targetHandoverReach = 0.0;

        if (serverWorkers && serverWorkers.left) serverWorkers.left.reachOut = expLerp(serverWorkers.left.reachOut, 0.0, 4, dt);
        if (serverWorkers && serverWorkers.right) serverWorkers.right.reachOut = expLerp(serverWorkers.right.reachOut, 0.0, 4, dt);

        this.turnProgress += dt * 3.4;
        if (this.facing === 1) {
          this.angleY = this.turnProgress * Math.PI;
          if (this.turnProgress >= 1) {
            this.angleY = Math.PI;
            this.facing = -1;
            this.state = 'traveling';
            this.hasRested = false;
          }
        } else {
          this.angleY = Math.PI + this.turnProgress * Math.PI;
          if (this.turnProgress >= 1) {
            this.angleY = 0;
            this.facing = 1;
            this.state = 'traveling';
            this.hasRested = false;
          }
        }
      }

      this.vx = expLerp(this.vx, targetSpeed, (targetSpeed === 0 ? 5.0 : 2.5), dt);

      const speedNorm = Math.max(0, Math.min(1.2, this.vx / 3.3));
      const realLean = (targetHunched > 0.5) 
        ? 0.70 
        : (0.06 + Math.pow(speedNorm, 1.35) * 0.60);
      const realHeightDrop = (targetHunched > 0.5) 
        ? 8.5 
        : (Math.pow(speedNorm, 1.25) * 7.5);
      const realElbowLock = (targetHunched > 0.5)
        ? 0.4
        : (0.15 + Math.pow(speedNorm, 1.2) * 0.85);
      const realArmDrive = (targetHunched > 0.5)
        ? 0.0
        : (0.35 + Math.pow(speedNorm, 1.1) * 0.95);

      const blendRate = 5.2;
      this.pose.speedFactor = expLerp(this.pose.speedFactor, speedNorm, blendRate, dt);
      this.pose.forwardLean = expLerp(this.pose.forwardLean, realLean, blendRate, dt);
      this.pose.heightDrop = expLerp(this.pose.heightDrop, realHeightDrop, blendRate, dt);
      this.pose.elbowLockAngle = expLerp(this.pose.elbowLockAngle, realElbowLock, blendRate, dt);
      this.pose.armDriveAmp = expLerp(this.pose.armDriveAmp, realArmDrive, blendRate, dt);
      this.pose.hunchedTired = expLerp(this.pose.hunchedTired, targetHunched, blendRate, dt);
      this.pose.gaspIntensity = expLerp(this.pose.gaspIntensity, targetGasp, blendRate, dt);
      this.pose.handoverReach = expLerp(this.pose.handoverReach, targetHandoverReach, 6.5, dt);

      for (let i = this.sweatParticles.length - 1; i >= 0; i--) {
        const p = this.sweatParticles[i];
        p.y += p.vy;
        p.alpha -= dt * 1.6;
        if (p.alpha <= 0) this.sweatParticles.splice(i, 1);
      }

      if (this.state !== 'handover' && this.state !== 'resting') {
        this.x += this.facing * this.vx * 60 * dt;
        this.gaitPhase += Math.max(0.4, this.vx * 6.8) * dt;
        this.x = Math.max(leftServerBound - 4, Math.min(rightServerBound + 4, this.x));
      } else {
        this.gaitPhase += dt * 2.5;
      }
    }

    draw(ctx, time, floorY) {
      if (!ctx) return;
      const cosY = Math.cos(this.angleY);
      const flightStretch = Math.max(0, Math.cos(this.gaitPhase * 2)) * 1.5 * this.pose.speedFactor;
      const plantSquash = Math.max(0, -Math.cos(this.gaitPhase * 2)) * 1.1 * this.pose.speedFactor;
      const verticalBob = (Math.abs(Math.sin(this.gaitPhase)) * 1.8 * this.pose.speedFactor) + flightStretch - plantSquash;

      let pelvisY = floorY - 18 + verticalBob + this.pose.heightDrop * 0.7;
      const pelvis = { x: this.x, y: pelvisY };

      const lean = this.pose.forwardLean;
      const torsoLength = 8.5 + (flightStretch * 0.2);
      const chest = {
        x: this.x + Math.sin(lean) * torsoLength * cosY,
        y: pelvisY - Math.cos(lean) * torsoLength
      };
      const neck = {
        x: chest.x + Math.sin(lean * 1.25) * 3.8 * cosY,
        y: chest.y - Math.cos(lean * 1.25) * 3.8
      };

      const pantOffset = Math.sin(time * 8) * (1.4 * this.pose.gaspIntensity);
      const head = {
        x: neck.x + 1.0 * cosY,
        y: neck.y - 3.8 + pantOffset
      };

      // Kaki Kinematik Kompak
      const legStride = Math.sin(this.gaitPhase) * (0.3 + this.pose.speedFactor * 0.75);
      const kneeDriveL = Math.max(0, Math.cos(this.gaitPhase)) * (0.2 + this.pose.speedFactor * 1.0);
      const kneeDriveR = Math.max(0, -Math.cos(this.gaitPhase)) * (0.2 + this.pose.speedFactor * 1.0);

      const kneeL_Rest = { x: pelvis.x + 5.5 * cosY, y: pelvis.y + 7.5 };
      const footL_Rest = { x: pelvis.x + 2.8 * cosY, y: floorY };
      const kneeL_Run = {
        x: pelvis.x + (Math.sin(legStride) * 6.5 + (kneeDriveL * 7.5)) * cosY,
        y: pelvis.y + 7.5 - (kneeDriveL * 6.5)
      };
      const footL_Run = {
        x: pelvis.x + (Math.sin(legStride) * 12) * cosY,
        y: floorY - (kneeDriveL * 2.8)
      };
      const kneePosL = {
        x: numLerp(kneeL_Run.x, kneeL_Rest.x, this.pose.hunchedTired),
        y: numLerp(kneeL_Run.y, kneeL_Rest.y, this.pose.hunchedTired)
      };
      const footPosL = {
        x: numLerp(footL_Run.x, footL_Rest.x, this.pose.hunchedTired),
        y: numLerp(footL_Run.y, footL_Rest.y, this.pose.hunchedTired)
      };

      const kneeR_Rest = { x: pelvis.x - 4.5 * cosY, y: pelvis.y + 7.5 };
      const footR_Rest = { x: pelvis.x - 2.0 * cosY, y: floorY };
      const kneeR_Run = {
        x: pelvis.x + (Math.sin(-legStride) * 6.5 + (kneeDriveR * 7.5)) * cosY,
        y: pelvis.y + 7.5 - (kneeDriveR * 6.5)
      };
      const footR_Run = {
        x: pelvis.x + (Math.sin(-legStride) * 12) * cosY,
        y: floorY - (kneeDriveR * 2.8)
      };
      const kneePosR = {
        x: numLerp(kneeR_Run.x, kneeR_Rest.x, this.pose.hunchedTired),
        y: numLerp(kneeR_Run.y, kneeR_Rest.y, this.pose.hunchedTired)
      };
      const footPosR = {
        x: numLerp(footR_Run.x, footR_Rest.x, this.pose.hunchedTired),
        y: numLerp(footR_Run.y, footR_Rest.y, this.pose.hunchedTired)
      };

      const strokeThickness = L.LIMB_THICKNESS || 1.6;

      // 1. Kaki Belakang
      if (cosY >= 0) drawBranchLeg(ctx, pelvis, kneePosL, footPosL, strokeThickness * 0.85, C.NEON_SECONDARY);
      else drawBranchLeg(ctx, pelvis, kneePosR, footPosR, strokeThickness * 0.85, C.NEON_SECONDARY);

      // 2. Tulang Punggung Menyatu Mulus dengan Kaki Depan
      if (cosY >= 0) drawUnifiedSpineAndLeg(ctx, neck, chest, pelvis, kneePosR, footPosR, strokeThickness, C.NEON_MAIN);
      else drawUnifiedSpineAndLeg(ctx, neck, chest, pelvis, kneePosL, footPosL, strokeThickness, C.NEON_MAIN);

      // Kepala Avatar Neon Solid
      ctx.beginPath();
      ctx.arc(head.x, head.y, L.HEAD_RADIUS || 3.8, 0, Math.PI * 2);
      ctx.fillStyle = C.NEON_MAIN;
      ctx.fill();

      // === LENGAN BIOMEKANIK ===
      const shoulder = { x: chest.x, y: chest.y };
      const armCycle = -this.gaitPhase;
      const pumpAmp = this.pose.armDriveAmp * 1.15;
      const elbowLock = this.pose.elbowLockAngle;

      const armSwingL = Math.sin(armCycle) * pumpAmp;
      const elbowL_Sprint = {
        x: shoulder.x - Math.sin(armSwingL) * 5.2 * cosY,
        y: shoulder.y + 4.2 + Math.cos(armSwingL) * 1.0
      };
      const handL_Sprint = {
        x: elbowL_Sprint.x + Math.sin(armSwingL + 1.25) * 5.0 * cosY,
        y: elbowL_Sprint.y - Math.cos(armSwingL + 1.25) * 4.8
      };

      const elbowL_Walk = {
        x: shoulder.x + Math.sin(armSwingL * 0.5) * 4.0 * cosY,
        y: shoulder.y + 5.2
      };
      const handL_Walk = {
        x: elbowL_Walk.x + Math.sin(armSwingL * 0.55) * 4.5 * cosY,
        y: elbowL_Walk.y + 4.5
      };

      const elbowL_Run = {
        x: numLerp(elbowL_Walk.x, elbowL_Sprint.x, elbowLock),
        y: numLerp(elbowL_Walk.y, elbowL_Sprint.y, elbowLock)
      };
      const handL_Run = {
        x: numLerp(handL_Walk.x, handL_Sprint.x, elbowLock),
        y: numLerp(handL_Walk.y, handL_Sprint.y, elbowLock)
      };

      const armSwingR = Math.sin(-armCycle) * pumpAmp;
      const elbowR_Sprint = {
        x: shoulder.x - Math.sin(armSwingR) * 5.2 * cosY + 1.4 * cosY,
        y: shoulder.y + 4.2 + Math.cos(armSwingR) * 1.0
      };
      const handR_Sprint = {
        x: elbowR_Sprint.x + Math.sin(armSwingR + 1.25) * 5.0 * cosY,
        y: elbowR_Sprint.y - Math.cos(armSwingR + 1.25) * 4.8
      };

      const elbowR_Walk = {
        x: shoulder.x + Math.sin(armSwingR * 0.5) * 4.0 * cosY + 1.0 * cosY,
        y: shoulder.y + 5.2
      };
      const handR_Walk = {
        x: elbowR_Walk.x + Math.sin(armSwingR * 0.55) * 4.5 * cosY,
        y: elbowR_Walk.y + 4.5
      };

      const elbowR_Run = {
        x: numLerp(elbowR_Walk.x, elbowR_Sprint.x, elbowLock),
        y: numLerp(elbowR_Walk.y, elbowR_Sprint.y, elbowLock)
      };
      const handR_Run = {
        x: numLerp(handR_Walk.x, handR_Sprint.x, elbowLock),
        y: numLerp(handR_Walk.y, handR_Sprint.y, elbowLock)
      };

      const elbowR_Handover = { x: shoulder.x + 4.8 * cosY, y: shoulder.y + 2.0 };
      const handR_Handover = { x: shoulder.x + 10.5 * cosY, y: shoulder.y + 0.8 };

      const elbowL_Rest = { x: (shoulder.x + kneePosL.x) / 2 - 2.5 * cosY, y: (shoulder.y + kneePosL.y) / 2 };
      const handL_Rest = { x: kneePosL.x + 0.6 * cosY, y: kneePosL.y - 1.0 };
      const elbowR_Rest = { x: (shoulder.x + kneePosR.x) / 2 + 2.5 * cosY, y: (shoulder.y + kneePosR.y) / 2 };
      const handR_Rest = { x: kneePosR.x + 1.0 * cosY, y: kneePosR.y - 1.0 };

      let elbowPosL = {
        x: numLerp(elbowL_Run.x, elbowL_Rest.x, this.pose.hunchedTired),
        y: numLerp(elbowL_Run.y, elbowL_Rest.y, this.pose.hunchedTired)
      };
      let handPosL = {
        x: numLerp(handL_Run.x, handL_Rest.x, this.pose.hunchedTired),
        y: numLerp(handL_Run.y, handL_Rest.y, this.pose.hunchedTired)
      };

      let elbowPosR = {
        x: numLerp(elbowR_Run.x, elbowR_Rest.x, this.pose.hunchedTired),
        y: numLerp(elbowR_Run.y, elbowR_Rest.y, this.pose.hunchedTired)
      };
      let handPosR = {
        x: numLerp(handR_Run.x, handR_Rest.x, this.pose.hunchedTired),
        y: numLerp(handR_Run.y, handR_Rest.y, this.pose.hunchedTired)
      };

      elbowPosR.x = numLerp(elbowPosR.x, elbowR_Handover.x, this.pose.handoverReach);
      elbowPosR.y = numLerp(elbowPosR.y, elbowR_Handover.y, this.pose.handoverReach);
      handPosR.x = numLerp(handPosR.x, handR_Handover.x, this.pose.handoverReach);
      handPosR.y = numLerp(handPosR.y, handR_Handover.y, this.pose.handoverReach);

      drawSeamlessArm(ctx, shoulder, elbowPosL, handPosL, strokeThickness * 0.85, this.pose.hunchedTired > 0.5 ? C.NEON_MAIN : C.NEON_SECONDARY);
      drawSeamlessArm(ctx, shoulder, elbowPosR, handPosR, strokeThickness, C.NEON_MAIN);

      if (this.pose.hunchedTired > 0.3) {
        ctx.fillStyle = C.NEON_MAIN;
        this.sweatParticles.forEach(p => {
          ctx.globalAlpha = p.alpha * this.pose.hunchedTired;
          ctx.fillRect(p.x, p.y, 1.0, 2.0);
        });
        ctx.globalAlpha = 1;
      }

      if (this.hasBox) {
        ctx.save();
        ctx.fillStyle = '#222222';
        ctx.strokeStyle = C.NEON_MAIN;
        ctx.lineWidth = 1.0;
        const boxW = 5.5 * Math.abs(cosY), boxH = 4.8;
        const boxAlpha = Math.max(0.2, (1 - this.pose.hunchedTired * 0.6));
        ctx.globalAlpha = boxAlpha;
        ctx.fillRect(handPosR.x - 1.0 * cosY, handPosR.y - boxH + 1.0, boxW, boxH);
        ctx.strokeRect(handPosR.x - 1.0 * cosY, handPosR.y - boxH + 1.0, boxW, boxH);
        ctx.restore();
      }

      drawFace(ctx, head.x, head.y, this.angleY, this.pose.hunchedTired, time);
    }
  }

  window.StickmanPhysics = {
    numLerp,
    expLerp,
    drawUnifiedSpineAndLeg,
    drawBranchLeg,
    drawSeamlessArm,
    drawFace,
    BiomechanicalRunner
  };
})();
