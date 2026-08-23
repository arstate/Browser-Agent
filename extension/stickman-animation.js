/**
 * AI Stickman Swarm Animation Engine
 * Realistic Biomechanical Runners, Technicians & Server Racks in Dark Luxury Neon Bento Style
 * Active while AI is generating responses / executing tasks.
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

  const NEON_COLOR = '#CEF128';
  const NEON_BACK = 'rgba(206, 241, 40, 0.38)';
  const floorY = 84;

  function numLerp(a, b, t) {
    const clampedT = Math.max(0, Math.min(1, t));
    return a + (b - a) * clampedT;
  }

  function expLerp(current, target, speed, dt) {
    if (isNaN(current)) return target;
    const factor = 1 - Math.exp(-speed * Math.max(0.001, dt));
    return current + (target - current) * factor;
  }

  // === SEAMLESS UNIFIED SPINE-TO-LEG BEZIER ENGINE ===
  function drawUnifiedSpineAndLeg(neck, chest, pelvis, knee, foot, thickness, color) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(neck.x, neck.y);
    ctx.bezierCurveTo(chest.x, chest.y, pelvis.x, pelvis.y - 4, pelvis.x, pelvis.y);
    
    const cpX = 2 * knee.x - 0.5 * pelvis.x - 0.5 * foot.x;
    const cpY = 2 * knee.y - 0.5 * pelvis.y - 0.5 * foot.y;
    ctx.quadraticCurveTo(cpX, cpY, foot.x, foot.y);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function drawBranchLeg(pelvis, knee, foot, thickness, color) {
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

  function drawSeamlessArm(shoulder, elbow, hand, thickness, color) {
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

  function drawFace(headX, headY, angleY, exprBlend, time) {
    if (!ctx) return;
    const cosY = Math.cos(angleY);
    if (Math.abs(cosY) < 0.12) return;

    const eyeOffX = 3.2 * cosY;
    const eyeDist = 5.0 * cosY;
    const leftEyeX = headX + eyeOffX - eyeDist / 2;
    const rightEyeX = headX + eyeOffX + eyeDist / 2;
    const eyeY = headY - 1;

    ctx.save();
    ctx.fillStyle = '#141414';
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';

    const pant = Math.sin(time * 8) * 0.6 * exprBlend;
    const browAngleL = (-3.2 * (1 - exprBlend)) + (1.6 * exprBlend);
    const browAngleR = (-2.4 * (1 - exprBlend)) + (-1.6 * exprBlend);

    ctx.beginPath();
    ctx.moveTo(leftEyeX - 2.2 * cosY, eyeY - 3 + browAngleL + pant);
    ctx.lineTo(leftEyeX + 1.8 * cosY, eyeY - 1.5 + pant);
    ctx.moveTo(rightEyeX - 1.8 * cosY, eyeY - 1.5 + pant);
    ctx.lineTo(rightEyeX + 2.2 * cosY, eyeY - 3 + browAngleR + pant);
    ctx.stroke();

    const eyeHeight = Math.max(1.0, 3.4 * (1 - exprBlend * 0.7));
    ctx.fillRect(leftEyeX - 1.3 * cosY, eyeY - 0.5 + pant, 2.6 * Math.abs(cosY), eyeHeight);
    ctx.fillRect(rightEyeX - 1.3 * cosY, eyeY - 0.5 + pant, 2.6 * Math.abs(cosY), eyeHeight);
    ctx.restore();
  }

  const serverWorkers = {
    left: { reachOut: 0 },
    right: { reachOut: 0 }
  };

  // === BIOMECHANICALLY REALISTIC GAIT ENGINE ===
  class BiomechanicalRunner {
    constructor(cfg) {
      this.startX = cfg.startX || 92;
      this.gaitType = cfg.gaitType || 'sprint'; // 'slow_walk', 'jog', 'sprint', 'fatigue_cargo'
      
      if (this.gaitType === 'slow_walk') this.maxSpeed = 1.15;
      else if (this.gaitType === 'jog') this.maxSpeed = 1.95;
      else if (this.gaitType === 'sprint') this.maxSpeed = 3.3;
      else this.maxSpeed = 2.4; // fatigue cargo

      this.x = this.startX;
      this.vx = this.maxSpeed;
      this.facing = cfg.facing || 1;
      this.angleY = (this.facing === 1) ? 0 : Math.PI;
      this.gaitPhase = Math.random() * Math.PI * 2;

      this.state = 'traveling';
      this.interactionTimer = 0;
      this.restTimer = 0;
      this.hasRested = false;
      this.hasBox = cfg.hasBox !== false;

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

    update(dt, t) {
      const leftServerBound = (width < 460) ? 62 : 92;
      const rightServerBound = Math.max(140, width - ((width < 460) ? 75 : 110));
      const restTargetX = (leftServerBound + rightServerBound) * 0.48;

      let targetSpeed = this.maxSpeed;
      let targetHunched = 0.0;
      let targetGasp = 0.0;
      let targetHandoverReach = 0.0;

      // 1. Fatigue Stop di Tengah Jalan
      if (this.gaitType === 'fatigue_cargo') {
        if (this.state === 'traveling' && !this.hasRested && this.facing === 1 && Math.abs(this.x - restTargetX) < 35) {
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
            x: this.x + 8 * Math.cos(this.angleY),
            y: floorY - 36,
            vy: 0.9 + Math.random() * 0.8,
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
        if (distToServer < 60) {
          this.state = 'approaching_server';
        }
      } else if (this.state === 'approaching_server') {
        targetSpeed = 0.45;
        const distToServer = (this.facing === 1) ? (rightServerBound - this.x) : (this.x - leftServerBound);

        if (distToServer <= 10) {
          this.state = 'handover';
          this.interactionTimer = 1.3;
        }
      } else if (this.state === 'handover') {
        targetSpeed = 0.0;
        targetHandoverReach = 1.0;
        this.interactionTimer -= dt;

        if (this.facing === 1) serverWorkers.right.reachOut = expLerp(serverWorkers.right.reachOut, 1.0, 6, dt);
        else serverWorkers.left.reachOut = expLerp(serverWorkers.left.reachOut, 1.0, 6, dt);

        if (this.interactionTimer <= 0) {
          this.state = 'pivot_turn';
          this.turnProgress = 0;
          this.hasBox = !this.hasBox;
        }
      } else if (this.state === 'pivot_turn') {
        targetSpeed = 0.0;
        targetHandoverReach = 0.0;

        serverWorkers.left.reachOut = expLerp(serverWorkers.left.reachOut, 0.0, 4, dt);
        serverWorkers.right.reachOut = expLerp(serverWorkers.right.reachOut, 0.0, 4, dt);

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

      // 1. FORWARD LEAN
      const realLean = (targetHunched > 0.5) 
        ? 0.72 
        : (0.06 + Math.pow(speedNorm, 1.35) * 0.62);

      // 2. HEIGHT DROP
      const realHeightDrop = (targetHunched > 0.5) 
        ? 14.0 
        : (Math.pow(speedNorm, 1.25) * 12.0);

      // 3. ARM KINEMATICS
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
        this.x = Math.max(leftServerBound - 5, Math.min(rightServerBound + 5, this.x));
      } else {
        this.gaitPhase += dt * 2.5;
      }
    }

    draw(time) {
      if (!ctx) return;
      const cosY = Math.cos(this.angleY);
      const flightStretch = Math.max(0, Math.cos(this.gaitPhase * 2)) * 3.2 * this.pose.speedFactor;
      const plantSquash = Math.max(0, -Math.cos(this.gaitPhase * 2)) * 2.2 * this.pose.speedFactor;
      const verticalBob = (Math.abs(Math.sin(this.gaitPhase)) * 3.8 * this.pose.speedFactor) + flightStretch - plantSquash;

      let pelvisY = floorY - 38 + verticalBob + this.pose.heightDrop;
      const pelvis = { x: this.x, y: pelvisY };

      const lean = this.pose.forwardLean;
      const torsoLength = 16 + (flightStretch * 0.4);
      const chest = {
        x: this.x + Math.sin(lean) * torsoLength * cosY,
        y: pelvisY - Math.cos(lean) * torsoLength
      };
      const neck = {
        x: chest.x + Math.sin(lean * 1.25) * 8 * cosY,
        y: chest.y - Math.cos(lean * 1.25) * 8
      };

      const pantOffset = Math.sin(time * 8) * (2.8 * this.pose.gaspIntensity);
      const head = {
        x: neck.x + 2 * cosY,
        y: neck.y - 7 + pantOffset
      };

      // Kaki
      const legStride = Math.sin(this.gaitPhase) * (0.3 + this.pose.speedFactor * 0.75);
      const kneeDriveL = Math.max(0, Math.cos(this.gaitPhase)) * (0.2 + this.pose.speedFactor * 1.0);
      const kneeDriveR = Math.max(0, -Math.cos(this.gaitPhase)) * (0.2 + this.pose.speedFactor * 1.0);

      const kneeL_Rest = { x: pelvis.x + 11 * cosY, y: pelvis.y + 16 };
      const footL_Rest = { x: pelvis.x + 6 * cosY, y: floorY };
      const kneeL_Run = {
        x: pelvis.x + (Math.sin(legStride) * 14 + (kneeDriveL * 15)) * cosY,
        y: pelvis.y + 16 - (kneeDriveL * 14)
      };
      const footL_Run = {
        x: pelvis.x + (Math.sin(legStride) * 24) * cosY,
        y: floorY - (kneeDriveL * 6)
      };
      const kneePosL = {
        x: numLerp(kneeL_Run.x, kneeL_Rest.x, this.pose.hunchedTired),
        y: numLerp(kneeL_Run.y, kneeL_Rest.y, this.pose.hunchedTired)
      };
      const footPosL = {
        x: numLerp(footL_Run.x, footL_Rest.x, this.pose.hunchedTired),
        y: numLerp(footL_Run.y, footL_Rest.y, this.pose.hunchedTired)
      };

      const kneeR_Rest = { x: pelvis.x - 9 * cosY, y: pelvis.y + 16 };
      const footR_Rest = { x: pelvis.x - 4 * cosY, y: floorY };
      const kneeR_Run = {
        x: pelvis.x + (Math.sin(-legStride) * 14 + (kneeDriveR * 15)) * cosY,
        y: pelvis.y + 16 - (kneeDriveR * 14)
      };
      const footR_Run = {
        x: pelvis.x + (Math.sin(-legStride) * 24) * cosY,
        y: floorY - (kneeDriveR * 6)
      };
      const kneePosR = {
        x: numLerp(kneeR_Run.x, kneeR_Rest.x, this.pose.hunchedTired),
        y: numLerp(kneeR_Run.y, kneeR_Rest.y, this.pose.hunchedTired)
      };
      const footPosR = {
        x: numLerp(footR_Run.x, footR_Rest.x, this.pose.hunchedTired),
        y: numLerp(footR_Run.y, footR_Rest.y, this.pose.hunchedTired)
      };

      const strokeThickness = 3.0;

      // 1. Kaki Belakang
      if (cosY >= 0) drawBranchLeg(pelvis, kneePosL, footPosL, strokeThickness * 0.85, NEON_BACK);
      else drawBranchLeg(pelvis, kneePosR, footPosR, strokeThickness * 0.85, NEON_BACK);

      // 2. Tulang Punggung Menyatu Mulus dengan Kaki Depan
      if (cosY >= 0) drawUnifiedSpineAndLeg(neck, chest, pelvis, kneePosR, footPosR, strokeThickness, NEON_COLOR);
      else drawUnifiedSpineAndLeg(neck, chest, pelvis, kneePosL, footPosL, strokeThickness, NEON_COLOR);

      // Kepala Avatar Neon Solid
      ctx.beginPath();
      ctx.arc(head.x, head.y, 8.0, 0, Math.PI * 2);
      ctx.fillStyle = NEON_COLOR;
      ctx.fill();

      // === LENGAN BIOMEKANIK ===
      const shoulder = { x: chest.x, y: chest.y };
      const armCycle = -this.gaitPhase;
      const pumpAmp = this.pose.armDriveAmp * 1.15;
      const elbowLock = this.pose.elbowLockAngle;

      // Lengan Kiri (Back Arm)
      const armSwingL = Math.sin(armCycle) * pumpAmp;
      const elbowL_Sprint = {
        x: shoulder.x - Math.sin(armSwingL) * 11 * cosY,
        y: shoulder.y + 9 + Math.cos(armSwingL) * 2
      };
      const handL_Sprint = {
        x: elbowL_Sprint.x + Math.sin(armSwingL + 1.25) * 10 * cosY,
        y: elbowL_Sprint.y - Math.cos(armSwingL + 1.25) * 9.5
      };

      const elbowL_Walk = {
        x: shoulder.x + Math.sin(armSwingL * 0.5) * 8 * cosY,
        y: shoulder.y + 11
      };
      const handL_Walk = {
        x: elbowL_Walk.x + Math.sin(armSwingL * 0.55) * 9 * cosY,
        y: elbowL_Walk.y + 9
      };

      const elbowL_Run = {
        x: numLerp(elbowL_Walk.x, elbowL_Sprint.x, elbowLock),
        y: numLerp(elbowL_Walk.y, elbowL_Sprint.y, elbowLock)
      };
      const handL_Run = {
        x: numLerp(handL_Walk.x, handL_Sprint.x, elbowLock),
        y: numLerp(handL_Walk.y, handL_Sprint.y, elbowLock)
      };

      // Lengan Kanan (Front Arm)
      const armSwingR = Math.sin(-armCycle) * pumpAmp;
      const elbowR_Sprint = {
        x: shoulder.x - Math.sin(armSwingR) * 11 * cosY + 3 * cosY,
        y: shoulder.y + 9 + Math.cos(armSwingR) * 2
      };
      const handR_Sprint = {
        x: elbowR_Sprint.x + Math.sin(armSwingR + 1.25) * 10 * cosY,
        y: elbowR_Sprint.y - Math.cos(armSwingR + 1.25) * 9.5
      };

      const elbowR_Walk = {
        x: shoulder.x + Math.sin(armSwingR * 0.5) * 8 * cosY + 2 * cosY,
        y: shoulder.y + 11
      };
      const handR_Walk = {
        x: elbowR_Walk.x + Math.sin(armSwingR * 0.55) * 9 * cosY,
        y: elbowR_Walk.y + 9
      };

      const elbowR_Run = {
        x: numLerp(elbowR_Walk.x, elbowR_Sprint.x, elbowLock),
        y: numLerp(elbowR_Walk.y, elbowR_Sprint.y, elbowLock)
      };
      const handR_Run = {
        x: numLerp(handR_Walk.x, handR_Sprint.x, elbowLock),
        y: numLerp(handR_Walk.y, handR_Sprint.y, elbowLock)
      };

      const elbowR_Handover = { x: shoulder.x + 10 * cosY, y: shoulder.y + 4 };
      const handR_Handover = { x: shoulder.x + 22 * cosY, y: shoulder.y + 2 };

      const elbowL_Rest = { x: (shoulder.x + kneePosL.x) / 2 - 5 * cosY, y: (shoulder.y + kneePosL.y) / 2 };
      const handL_Rest = { x: kneePosL.x + 1 * cosY, y: kneePosL.y - 2 };
      const elbowR_Rest = { x: (shoulder.x + kneePosR.x) / 2 + 5 * cosY, y: (shoulder.y + kneePosR.y) / 2 };
      const handR_Rest = { x: kneePosR.x + 2 * cosY, y: kneePosR.y - 2 };

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

      drawSeamlessArm(shoulder, elbowPosL, handPosL, strokeThickness * 0.85, this.pose.hunchedTired > 0.5 ? NEON_COLOR : NEON_BACK);
      drawSeamlessArm(shoulder, elbowPosR, handPosR, strokeThickness, NEON_COLOR);

      if (this.pose.hunchedTired > 0.3) {
        ctx.fillStyle = NEON_COLOR;
        this.sweatParticles.forEach(p => {
          ctx.globalAlpha = p.alpha * this.pose.hunchedTired;
          ctx.fillRect(p.x, p.y, 2, 4);
        });
        ctx.globalAlpha = 1;
      }

      if (this.hasBox) {
        ctx.save();
        ctx.fillStyle = '#222222';
        ctx.strokeStyle = NEON_COLOR;
        ctx.lineWidth = 1.5;
        const boxW = 10 * Math.abs(cosY), boxH = 9;
        const boxAlpha = Math.max(0.2, (1 - this.pose.hunchedTired * 0.6));
        ctx.globalAlpha = boxAlpha;
        ctx.fillRect(handPosR.x - 2 * cosY, handPosR.y - boxH + 2, boxW, boxH);
        ctx.strokeRect(handPosR.x - 2 * cosY, handPosR.y - boxH + 2, boxW, boxH);
        ctx.restore();
      }

      drawFace(head.x, head.y, this.angleY, this.pose.hunchedTired, time);
    }
  }

  // === WORKERS DI SERVER KIRI & KANAN ===
  function drawMechanic(time) {
    if (!ctx) return;
    const x = (width < 460) ? 38 : 52;
    const reach = serverWorkers.left.reachOut;
    const bodyLean = Math.sin(time * 2.5) * 0.08 * (1 - reach) + (reach * 0.15);
    const pelvis = { x: x, y: floorY - 35 };
    const chest = { x: x - Math.sin(bodyLean) * 12 + (reach * 4), y: pelvis.y - 15 };
    const neck = { x: chest.x - 4, y: chest.y - 6 };
    const head = { x: neck.x - 1, y: neck.y - 7 };

    drawBranchLeg(pelvis, { x: x - 6, y: floorY - 15 }, { x: x - 10, y: floorY }, 2.8, NEON_COLOR);
    drawUnifiedSpineAndLeg(neck, chest, pelvis, { x: x + 6, y: floorY - 15 }, { x: x + 10, y: floorY }, 2.8, NEON_COLOR);

    ctx.beginPath();
    ctx.arc(head.x, head.y, 8.0, 0, Math.PI * 2);
    ctx.fillStyle = NEON_COLOR;
    ctx.fill();

    const pull = Math.sin(time * 3.5);
    const elbow_Work = { x: chest.x - 10 + pull * 3.5, y: chest.y + 6 + pull * 2 };
    const hand_Work = { x: elbow_Work.x - 8, y: elbow_Work.y - 4 };

    const elbow_Reach = { x: chest.x + 8, y: chest.y + 4 };
    const hand_Reach = { x: chest.x + 20, y: chest.y + 2 };

    const elbow = {
      x: numLerp(elbow_Work.x, elbow_Reach.x, reach),
      y: numLerp(elbow_Work.y, elbow_Reach.y, reach)
    };
    const hand = {
      x: numLerp(hand_Work.x, hand_Reach.x, reach),
      y: numLerp(hand_Work.y, hand_Reach.y, reach)
    };

    drawSeamlessArm(chest, elbow, hand, 2.8, NEON_COLOR);

    if (reach < 0.3) {
      ctx.strokeStyle = NEON_COLOR;
      ctx.lineWidth = 1.8;
      ctx.strokeRect(hand.x - 4, hand.y - 4, 4, 4);

      if (pull > 0.45) {
        ctx.fillStyle = NEON_COLOR;
        ctx.fillRect(hand.x - 6 + Math.random() * 4, hand.y - 6 + Math.random() * 4, 2, 2);
      }
    }

    drawFace(head.x, head.y, (reach > 0.3 ? Math.PI : 0), 0, time);
  }

  function drawCableTech(time) {
    if (!ctx) return;
    const x = width - ((width < 460) ? 38 : 52);
    const reach = serverWorkers.right.reachOut;
    const bodyLean = Math.sin(time * 2) * 0.05 * (1 - reach) - (reach * 0.15);
    const pelvis = { x: x, y: floorY - 35 };
    const chest = { x: x + Math.sin(bodyLean) * 10 - (reach * 4), y: pelvis.y - 15 };
    const neck = { x: chest.x + 3, y: chest.y - 6 };
    const head = { x: neck.x + 1, y: neck.y - 7 };

    drawBranchLeg(pelvis, { x: x - 5, y: floorY - 15 }, { x: x - 8, y: floorY }, 2.8, NEON_COLOR);
    drawUnifiedSpineAndLeg(neck, chest, pelvis, { x: x + 6, y: floorY - 15 }, { x: x + 8, y: floorY }, 2.8, NEON_COLOR);

    ctx.beginPath();
    ctx.arc(head.x, head.y, 8.0, 0, Math.PI * 2);
    ctx.fillStyle = NEON_COLOR;
    ctx.fill();

    const elbow_Work = { x: chest.x + 8, y: chest.y + 5 };
    const hand_Work = { x: elbow_Work.x + 6, y: elbow_Work.y + (Math.sin(time * 3) * 3) };

    const elbow_Reach = { x: chest.x - 8, y: chest.y + 4 };
    const hand_Reach = { x: chest.x - 20, y: chest.y + 2 };

    const elbow = {
      x: numLerp(elbow_Work.x, elbow_Reach.x, reach),
      y: numLerp(elbow_Work.y, elbow_Reach.y, reach)
    };
    const hand = {
      x: numLerp(hand_Work.x, hand_Reach.x, reach),
      y: numLerp(hand_Work.y, hand_Reach.y, reach)
    };

    drawSeamlessArm(chest, elbow, hand, 2.8, NEON_COLOR);

    if (reach < 0.3) {
      ctx.beginPath();
      ctx.moveTo(hand.x, hand.y);
      ctx.quadraticCurveTo(hand.x + 8, hand.y + 8, width - 20, floorY - 26);
      ctx.strokeStyle = '#777777';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawFace(head.x, head.y, (reach > 0.3 ? 0 : Math.PI), 0, time);
  }

  function drawEnvironment(time) {
    if (!ctx) return;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(width, floorY);
    ctx.stroke();

    const rackW = (width < 460) ? 28 : 34;
    drawServerRack(8, floorY - 56, rackW, 56, time, 0);
    drawServerRack(width - (rackW + 8), floorY - 56, rackW, 56, time, 1.5);
  }

  function drawServerRack(x, y, rw, rh, time, offset) {
    if (!ctx) return;
    ctx.fillStyle = '#101014';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.2;
    ctx.fillRect(x, y, rw, rh);
    ctx.strokeRect(x, y, rw, rh);

    const slotCount = 4;
    for (let i = 0; i < slotCount; i++) {
      const slotY = y + 4 + i * 12.5;
      ctx.fillStyle = '#1A1A22';
      ctx.fillRect(x + 2, slotY, rw - 4, 9);

      const blink = Math.sin(time * 4 + i + offset) > 0;
      ctx.fillStyle = blink ? (i === 0 ? '#E11D48' : NEON_COLOR) : '#444444';
      ctx.beginPath();
      ctx.arc(x + 6, slotY + 4.5, 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = !blink ? NEON_COLOR : '#444444';
      ctx.beginPath();
      ctx.arc(x + rw - 6, slotY + 4.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let runners = [];

  function initRunners() {
    if (width < 460) {
      runners = [
        new BiomechanicalRunner({ startX: 68, gaitType: 'sprint', facing: 1 }),
        new BiomechanicalRunner({ startX: Math.max(120, width - 85), gaitType: 'jog', facing: -1 })
      ];
    } else {
      runners = [
        new BiomechanicalRunner({ startX: 95, gaitType: 'fatigue_cargo', facing: 1 }),
        new BiomechanicalRunner({ startX: 140, gaitType: 'sprint', facing: 1 }),
        new BiomechanicalRunner({ startX: Math.max(220, width - 130), gaitType: 'jog', facing: -1 }),
        new BiomechanicalRunner({ startX: 220, gaitType: 'slow_walk', facing: 1, hasBox: false })
      ];
    }
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

    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      drawEnvironment(time);
      drawMechanic(time);
      drawCableTech(time);

      runners.forEach(runner => {
        runner.update(dt, time);
        runner.draw(time);
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
