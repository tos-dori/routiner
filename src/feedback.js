function showToast(text) {
      els.toast.textContent = text;
      els.toast.classList.add("show");
      window.clearTimeout(showToast._timer);
      showToast._timer = window.setTimeout(() => els.toast.classList.remove("show"), 1400);
    }

function showSaved() {
      if (!els.saveStatus || !els.edit.classList.contains("active")) return;
      els.saveStatus.textContent = "저장됨";
      els.saveStatus.classList.add("show");
      window.clearTimeout(showSaved._timer);
      showSaved._timer = window.setTimeout(() => els.saveStatus.classList.remove("show"), 850);
    }

function showReward(mark = "✓", type = "done") {
      if (!els.rewardPop) return;
      const ringRect = els.timerRing?.getBoundingClientRect();
      if (ringRect && ringRect.width > 0 && ringRect.height > 0) {
        els.rewardPop.style.setProperty("--reward-center-x", `${ringRect.left + ringRect.width / 2}px`);
        els.rewardPop.style.setProperty("--reward-center-y", `${ringRect.top + ringRect.height / 2}px`);
      }
      els.rewardPop.textContent = mark;
      els.rewardPop.classList.remove("show", "skip");
      if (type === "skipped") els.rewardPop.classList.add("skip");
      void els.rewardPop.offsetWidth;
      els.rewardPop.classList.add("show");
      window.clearTimeout(showReward._timer);
      showReward._timer = window.setTimeout(() => els.rewardPop.classList.remove("show"), 620);
    }

function chooseCelebrationVariant() {
      const roll = Math.random();
      if (roll < 0.40) return "confetti";
      if (roll < 0.65) return "firework";
      if (roll < 0.85) return "sparkle";
      return "ripple";
    }

function makeCelebrationParticle(variant, index, total, width, height, palette) {
      const centerX = width / 2;
      const centerY = height * 0.43;
      const color = palette[index % palette.length];

      if (variant === "firework") {
        const burstCenters = [
          { x: centerX, y: height * 0.42 },
          { x: width * 0.38, y: height * 0.50 },
          { x: width * 0.62, y: height * 0.50 }
        ];
        const base = burstCenters[index % burstCenters.length];
        const angle = (index / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
        const speed = 4.2 + Math.random() * 5.8;
        return {
          x: base.x,
          y: base.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          gravity: 0.075 + Math.random() * 0.06,
          drag: 0.982,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.32,
          size: 4 + Math.random() * 7,
          color,
          shape: index % 3 === 0 ? "dot" : "rect",
          delay: (index % burstCenters.length) * 85 + Math.random() * 90
        };
      }

      if (variant === "sparkle") {
        const angle = (-155 + Math.random() * 310) * Math.PI / 180;
        const speed = 3.8 + Math.random() * 7.0;
        return {
          x: centerX + (Math.random() - 0.5) * 46,
          y: centerY + (Math.random() - 0.5) * 24,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4.6 - Math.random() * 2.2,
          gravity: 0.10 + Math.random() * 0.08,
          drag: 0.986,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.42,
          size: 4 + Math.random() * 7,
          color,
          shape: index % 4 === 0 ? "star" : "dot",
          delay: Math.random() * 160
        };
      }

      if (variant === "ripple") {
        const ringIndex = index % 2;
        const angle = (index / total) * Math.PI * 2 + Math.random() * 0.35;
        const speed = ringIndex ? 5.8 + Math.random() * 4.8 : 3.8 + Math.random() * 3.8;
        return {
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.2,
          gravity: 0.07 + Math.random() * 0.05,
          drag: 0.985,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.26,
          size: 5 + Math.random() * 6,
          color,
          shape: index % 3 === 0 ? "dot" : "rect",
          delay: ringIndex * 100 + Math.random() * 80
        };
      }

      const angle = (-170 + Math.random() * 340) * Math.PI / 180;
      const speed = 5.2 + Math.random() * 8.2;
      return {
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5.5 - Math.random() * 4,
        gravity: 0.18 + Math.random() * 0.11,
        drag: 0.985,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.34,
        size: 5 + Math.random() * 8,
        color,
        shape: index % 4 === 0 ? "dot" : "rect",
        delay: Math.random() * 120
      };
    }

function drawCelebrationParticle(ctx, p, life) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "star") {
        const r1 = p.size * (0.92 + 0.18 * Math.sin(life * Math.PI * 8));
        const r2 = p.size * 0.34;
        ctx.beginPath();
        for (let i = 0; i < 8; i += 1) {
          const radius = i % 2 === 0 ? r1 : r2;
          const a = -Math.PI / 2 + i * Math.PI / 4;
          const x = Math.cos(a) * radius;
          const y = Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === "dot") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.54, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size * 0.65, -p.size * 0.36, p.size * 1.3, p.size * 0.72);
      }
      ctx.restore();
    }

function showCelebration() {
      const routine = getRoutine(activeRoutineId) || state.routines[0] || DEFAULT_ROUTINES[0];
      const accent = routine.color || "#C85A4A";
      const soft = routine.soft || "#F3DDD9";
      const variant = chooseCelebrationVariant();
      const layer = document.createElement("div");
      layer.className = `celebration-layer variant-${variant}`;
      layer.innerHTML = `<canvas class="celebration-canvas"></canvas><span class="celebration-flash"></span><span class="celebration-ring"></span><span class="celebration-ring second"></span>`;
      document.body.appendChild(layer);

      const canvas = layer.querySelector("canvas");
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        window.setTimeout(() => layer.remove(), 1200);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const resize = () => {
        canvas.width = Math.round(window.innerWidth * dpr);
        canvas.height = Math.round(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();

      const palette = [accent, soft, "#ffffff", "#FFE08A", "#FF9F7A", "#934B8F"];
      const particleCount = variant === "confetti" ? 108 : variant === "firework" ? 96 : variant === "sparkle" ? 92 : 82;
      const duration = variant === "confetti" ? 1750 : variant === "firework" ? 1650 : variant === "sparkle" ? 1550 : 1500;
      const particles = Array.from({ length: particleCount }, (_, i) => makeCelebrationParticle(variant, i, particleCount, window.innerWidth, window.innerHeight, palette));
      const started = performance.now();

      function draw(now) {
        const elapsed = now - started;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        particles.forEach((p) => {
          if (elapsed < p.delay) return;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= p.drag;
          p.vy = p.vy * p.drag + p.gravity;
          p.rot += p.vr;
          const life = Math.min(1, (elapsed - p.delay) / Math.max(1, duration - p.delay));
          const fadePoint = variant === "sparkle" ? 0.64 : 0.72;
          p.alpha = life < fadePoint ? 1 : Math.max(0, 1 - (life - fadePoint) / (1 - fadePoint));
          if (variant === "sparkle") p.alpha *= 0.72 + 0.28 * Math.abs(Math.sin(life * Math.PI * 5));
          drawCelebrationParticle(ctx, p, life);
        });
        if (elapsed < duration) {
          requestAnimationFrame(draw);
        } else {
          layer.remove();
        }
      }
      requestAnimationFrame(draw);
      window.setTimeout(() => layer.remove(), duration + 360);
    }

function escapeHtml(value) {
      return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
    }

function escapeAttr(value) {
      return escapeHtml(value).replace(/'/g, "&#39;");
    }
