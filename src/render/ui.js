// Giao diện DOM: HUD đầy đủ và các màn hình (menu, giới thiệu Đêm, kết quả, Bình Minh, tạm dừng, cài đặt).
import { css, PAL } from "./palette.js";

export const NIGHT_INTRO = {
  1: { name: "Đảo Bến", text: "Cháu à, sương đen đã nuốt hết đèn trên đảo Bến. Hãy thắp lại các đèn lồng, nhưng nhớ: đèn cạn dầu sẽ tắt. Giữ cho ít nhất 3 trong 5 ngọn còn sáng tới bình minh, và châm dầu bằng đom đóm khi đèn yếu. Bóng Mực thích hút dầu những ngọn đèn sắp tắt." },
  2: { name: "Đảo Cau", text: "Hai hòn đảo, một cây cầu tre không lan can. Bục nhảy sẽ đưa cháu sang đảo bên kia. Cần ít nhất 4 trong 6 ngọn đèn sáng khi trời rạng. Coi chừng Gió Lạc, nó thích cướp đom đóm của cháu lắm đấy." },
  3: { name: "Đảo Chuông", text: "Đảo Chuông có ba tầng và một tháp chuông cũ. Cần ít nhất 5 trong 7 ngọn đèn còn sáng tới bình minh. Cứ nửa phút lại có một cơn gió mạnh, hãy bám chắc. Bùa Gió màu đỏ sẽ giúp cháu chạy nhanh hơn." },
};

const $ = (id) => document.getElementById(id);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function createUI({ settings, onSettings, handlers }) {
  const screen = $("screen");
  const hud = $("hud");
  const cache = {};
  const set = (key, el, html) => {
    if (cache[key] !== html) {
      cache[key] = html;
      el.innerHTML = html;
    }
  };

  const el = {
    flames: $("hud-flames"), timer: $("hud-timer"), lanterns: $("hud-lanterns"), score: $("hud-score"), night: $("hud-night"),
    motes: $("hud-motes"), dash: $("cd-dash"), pulse: $("cd-pulse"), charm: $("hud-charm"), prompt: $("hud-prompt"),
    arrow: $("hud-arrow"), wind: $("hud-wind"), flash: $("flash"), fps: $("fps"),
  };

  function showScreen(html, bind) {
    screen.innerHTML = `<div class="panel">${html}</div>`;
    screen.style.display = "flex";
    bind?.(screen);
  }
  const hideScreen = () => {
    screen.style.display = "none";
    screen.innerHTML = "";
  };
  const btn = (id, label) => `<button id="${id}" class="btn">${label}</button>`;
  const on = (root, id, fn) => root.querySelector("#" + id)?.addEventListener("click", () => (handlers.ui?.(), fn()));

  function settingsPanel(back) {
    showScreen(
      `<h2>Cài đặt</h2>
       <label>Âm lượng <span id="v-val">${Math.round(settings.volume * 100)}%</span><input id="s-vol" type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}"></label>
       <label>Độ nhạy chuột <span id="s-val">${settings.sensitivity.toFixed(1)}×</span><input id="s-sens" type="range" min="2" max="30" value="${Math.round(settings.sensitivity * 10)}"></label>
       <label class="check"><input id="s-cb" type="checkbox" ${settings.colorblind ? "checked" : ""}> Bảng màu dễ phân biệt (chế độ mù màu)</label>
       <p class="hint">Cài đặt được lưu lại cho lần mở game sau.</p>
       ${btn("back", "Quay lại")}`,
      (root) => {
        root.querySelector("#s-vol").addEventListener("input", (e) => {
          settings.volume = e.target.value / 100;
          root.querySelector("#v-val").textContent = `${e.target.value}%`;
          onSettings(settings);
        });
        root.querySelector("#s-sens").addEventListener("input", (e) => {
          settings.sensitivity = e.target.value / 10;
          root.querySelector("#s-val").textContent = `${settings.sensitivity.toFixed(1)}×`;
          onSettings(settings);
        });
        root.querySelector("#s-cb").addEventListener("change", (ev) => {
          settings.colorblind = ev.target.checked;
          onSettings(settings);
        });
        on(root, "back", back);
      },
    );
  }

  return {
    showHUD: (v) => (hud.style.display = v ? "block" : "none"),
    hideScreen,
    isScreenOpen: () => screen.style.display === "flex",

    menu() {
      showScreen(
        `<h1>Đảo Đèn Lồng</h1>
         <p class="sub">Mây, người giữ đèn nhỏ tuổi, thắp lại ba hòn đảo giữa biển mây.</p>
         ${btn("start", "Bắt đầu")}${btn("settings", "Cài đặt")}
         <p class="hint">WASD/mũi tên đi · Space nhảy · Shift lướt · E nạp đèn · Q tỏa sáng · Esc/P tạm dừng · kéo chuột xoay camera</p>`,
        (root) => {
          on(root, "start", handlers.start);
          on(root, "settings", () => settingsPanel(() => this.menu()));
        },
      );
    },
    intro(night, total) {
      const n = NIGHT_INTRO[night];
      showScreen(
        `<p class="sub">Đêm ${night}</p><h1>${n.name}</h1>
         <p class="quote"><b>Ông Đăng:</b> “${n.text}”</p>
         ${total ? `<p class="hint">Tổng điểm hiện tại: ${total}</p>` : ""}
         ${btn("go", "Bắt đầu Đêm " + night)}`,
        (root) => on(root, "go", handlers.begin),
      );
    },
    result(win, info) {
      const title = win ? "Bình minh! Đảo vẫn sáng" : info.reason === "dawn" ? "Trời đã sáng..." : "Ngọn lửa đã tắt...";
      const why = win
        ? `Giữ được ${info.lit}/${info.n} đèn tới bình minh (cần ≥ ${info.need}).`
        : info.reason === "dawn"
          ? `Trời sáng mà chỉ còn ${info.lit}/${info.n} đèn sáng, cần ≥ ${info.need}.`
          : "Mây đã hết Ngọn Lửa.";
      showScreen(
        `<h1 class="${win ? "good" : "bad"}">${title}</h1>
         <p class="sub">${why}</p>
         <p class="sub">Điểm Đêm ${info.night}: <b>${info.score}</b>${win ? ` · Tổng: <b>${info.total}</b>` : ""}</p>
         ${win ? btn("next", info.night < 3 ? `Đêm kế tiếp` : "Đón Bình Minh") : btn("retry", "Chơi lại Đêm này")}${btn("menu", "Về menu")}`,
        (root) => {
          on(root, "next", handlers.next);
          on(root, "retry", handlers.retry);
          on(root, "menu", handlers.menu);
        },
      );
    },
    dawn(total) {
      showScreen(
        `<h1 class="good">Bình Minh</h1>
         <p class="quote"><b>Ông Đăng:</b> “Ba hòn đảo đã sáng đèn. Cảm ơn cháu, người giữ đèn nhỏ tuổi.”</p>
         <p class="sub">Tổng điểm: <b>${total}</b></p>${btn("menu", "Về menu")}`,
        (root) => on(root, "menu", handlers.menu),
      );
    },
    pause() {
      showScreen(
        `<h2>Tạm dừng</h2>${btn("resume", "Tiếp tục")}${btn("restart", "Chơi lại Đêm")}${btn("settings", "Cài đặt")}${btn("menu", "Về menu")}`,
        (root) => {
          on(root, "resume", handlers.resume);
          on(root, "restart", handlers.restartNight);
          on(root, "settings", () => settingsPanel(() => this.pause()));
          on(root, "menu", handlers.menu);
        },
      );
    },

    flash(color) {
      const cb = document.body.classList.contains("cb");
      el.flash.style.background = css(color ?? (cb ? 0xffffff : PAL.danger));
      el.flash.style.opacity = "0.45";
      requestAnimationFrame(() => requestAnimationFrame(() => (el.flash.style.opacity = "0")));
    },

    // cập nhật HUD mỗi khung hình (chỉ chạm DOM khi nội dung đổi)
    update(game, extra) {
      const tu = game.tuning;
      const p = game.player;
      set("night", el.night, `Đêm ${game.night} · ${game.level.name}`);
      set("flames", el.flames, Array.from({ length: tu.flames }, (_, i) => `<span class="flame ${i < p.flames ? "on" : ""}">🔥</span>`).join(""));
      const left = Math.max(0, game.remaining / 60);
      set("timer", el.timer, fmt(left));
      el.timer.classList.toggle("danger", left <= 30);
      el.timer.classList.toggle("blink", left <= 30 && Math.floor(left * 2) % 2 === 0);
      const lit = game.lanterns.filter((l) => l.lit).length;
      const need = Math.ceil(tu.win_ratio * game.lanterns.length - 1e-9);
      set("lanterns", el.lanterns, `🏮 ${lit}/${game.lanterns.length} <small>cần ≥ ${need}</small>`);
      set("score", el.score, `⭐ ${extra.total + game.score}`);
      const cap = game.capacity();
      set("motes", el.motes, Array.from({ length: cap }, (_, i) => `<i class="${i < p.carried ? "on" : ""}"></i>`).join("") + `<span class="cnt">${p.carried}/${cap}</span>`);
      const dashFrac = p.charm > 0 ? 0 : Math.min(1, p.dashCd / Math.round(tu.dash_cooldown_s * 60));
      const pulseFrac = Math.min(1, p.pulseCd / Math.round(tu.pulse_cooldown_s * 60));
      el.dash.style.setProperty("--p", `${Math.round(dashFrac * 100)}%`);
      el.pulse.style.setProperty("--p", `${Math.round(pulseFrac * 100)}%`);
      el.pulse.classList.toggle("dim", p.carried < tu.pulse_cost);
      set("charm", el.charm, p.charm > 0 ? `<b>Bùa Gió</b> ${Math.ceil(p.charm / 60)}s` : "");
      set("wind", el.wind, extra.windWarning ? "🍃 Gió sắp nổi!" : extra.windActive ? "🍃 Gió mạnh!" : "");

      // nhắc khi đứng trong 2 m của đèn nhận được (chưa sáng, hoặc sáng chưa đầy dầu), đúng thứ tự chọn của luật
      const near = game.lanterns
        .filter((l) => (!l.lit || l.fuel < tu.fuel_max * 60) && Math.hypot(l.x - p.x, l.z - p.z) <= tu.interact_radius)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      set("prompt", el.prompt, near ? (near.lit ? `<b>E</b> — Châm dầu (${Math.round(near.fuel / 60)}/${tu.fuel_max})` : `<b>E</b> — Nạp ánh sáng (${near.deposited}/${near.everLit ? tu.relight_cost : tu.lantern_cost})`) : "");

      // mũi tên chỉ tới đèn chưa sáng gần nhất khi nó nằm ngoài màn hình
      const target = game.lanterns
        .filter((l) => !l.lit)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      if (target) {
        const s = extra.project(target.x, target.y + 3.4, target.z);
        const margin = 40;
        const off = s.behind || s.x < margin || s.x > innerWidth - margin || s.y < margin || s.y > innerHeight - margin;
        if (off) {
          const cx = innerWidth / 2;
          const cy = innerHeight / 2;
          let dx = s.x - cx;
          let dy = s.y - cy;
          if (s.behind) (dx = -dx), (dy = -dy);
          const k = Math.min((innerWidth / 2 - margin) / Math.abs(dx || 1e-6), (innerHeight / 2 - margin) / Math.abs(dy || 1e-6));
          el.arrow.style.display = "block";
          el.arrow.style.transform = `translate(${cx + dx * k - 20}px, ${cy + dy * k - 20}px) rotate(${Math.atan2(dy, dx)}rad)`;
        } else el.arrow.style.display = "none";
      } else el.arrow.style.display = "none";
    },
    setFps(text) {
      el.fps.textContent = text;
      el.fps.style.display = text ? "block" : "none";
    },
  };
}
