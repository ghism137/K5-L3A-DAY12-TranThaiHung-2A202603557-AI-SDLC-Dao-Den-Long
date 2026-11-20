// Giao diện DOM: HUD đầy đủ, chỉ báo hình ảnh (phụ đề + mũi tên), và các màn hình
// (menu, bảng xếp hạng, cài đặt, đổi phím, giới thiệu Đêm, kết quả, Bình Minh, tạm dừng). Chỉ chữ ≥ 18 px (rem).
import { css, PAL } from "./palette.js";
import { validateName } from "../core/leaderboard.js";
import { ACTIONS, ACTION_LABEL, DEFAULT_KEYMAP, bindKey, cloneKeymap, keyLabel, normalizeKey } from "../core/keymap.js";

export const NIGHT_INTRO = {
  1: { name: "Đảo Bến", text: "Cháu à, sương đen đã nuốt hết đèn trên đảo Bến. Hãy thắp lại các đèn lồng, nhưng nhớ: đèn cạn dầu sẽ tắt. Giữ cho ít nhất 3 trong 5 ngọn còn sáng tới bình minh, và châm dầu bằng đom đóm khi đèn yếu. Bóng Mực thích hút dầu những ngọn đèn sắp tắt." },
  2: { name: "Đảo Cau", text: "Hai hòn đảo, một cây cầu tre không lan can. Bục nhảy sẽ đưa cháu sang đảo bên kia. Cần ít nhất 4 trong 6 ngọn đèn sáng khi trời rạng. Coi chừng Gió Lạc, nó thích cướp đom đóm của cháu lắm đấy." },
  3: { name: "Đảo Chuông", text: "Đảo Chuông có ba tầng và một tháp chuông cũ. Cần ít nhất 5 trong 7 ngọn đèn còn sáng tới bình minh. Cứ nửa phút lại có một cơn gió mạnh, hãy bám chắc. Bùa Gió màu đỏ sẽ giúp cháu chạy nhanh hơn." },
};

const $ = (id) => document.getElementById(id);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function createUI({ settings, onSettings, handlers }) {
  const screen = $("screen");
  const hud = $("hud");
  const cache = {};
  const stats = { flashes: 0, cues: 0 };
  const set = (key, node, html) => {
    if (cache[key] !== html) {
      cache[key] = html;
      node.innerHTML = html;
    }
  };
  const setText = (key, node, text) => {
    if (cache[key] !== text) {
      cache[key] = text;
      node.textContent = text;
    }
  };

  const el = {
    flames: $("hud-flames"), timer: $("hud-timer"), lanterns: $("hud-lanterns"), score: $("hud-score"), night: $("hud-night"),
    motes: $("hud-motes"), dash: $("cd-dash"), pulse: $("cd-pulse"), charm: $("hud-charm"), prompt: $("hud-prompt"),
    arrow: $("hud-arrow"), wind: $("hud-wind"), flash: $("flash"), fps: $("fps"), cues: $("cues"), spawn: $("spawn-arrows"),
  };
  const primaryKey = (a) => keyLabel(settings.keymap[a][0] ?? settings.keymap[a][1]);

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

  // đặt mũi tên ở mép màn hình chỉ về điểm s = {x, y, behind}; trả về true nếu đang hiện
  function placeArrow(node, s) {
    const margin = 40;
    const off = s.behind || s.x < margin || s.x > innerWidth - margin || s.y < margin || s.y > innerHeight - margin;
    if (!off) {
      node.style.display = "none";
      return false;
    }
    const cx = innerWidth / 2;
    const cy = innerHeight / 2;
    let dx = s.x - cx;
    let dy = s.y - cy;
    if (s.behind) (dx = -dx), (dy = -dy);
    const k = Math.min((innerWidth / 2 - margin) / Math.abs(dx || 1e-6), (innerHeight / 2 - margin) / Math.abs(dy || 1e-6));
    node.style.display = "block";
    node.style.transform = `translate(${cx + dx * k - 20}px, ${cy + dy * k - 20}px) rotate(${Math.atan2(dy, dx)}rad)`;
    return true;
  }

  // ---------- cài đặt ----------
  function settingsPanel(back) {
    showScreen(
      `<h2>Cài đặt</h2>
       <label>Âm lượng <span id="v-val">${Math.round(settings.volume * 100)}%</span><input id="s-vol" type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}"></label>
       <label>Độ nhạy chuột <span id="s-val">${settings.sensitivity.toFixed(1)}×</span><input id="s-sens" type="range" min="2" max="30" value="${Math.round(settings.sensitivity * 10)}"></label>
       <label class="check"><input id="s-cues" type="checkbox" ${settings.cues ? "checked" : ""}> Phụ đề và chỉ báo hình ảnh (Bóng Mực xuất hiện, gió, 10 giây cuối, đèn sắp tắt)</label>
       <label class="check"><input id="s-reduce" type="checkbox" ${settings.reduceMotion ? "checked" : ""}> Giảm chuyển động (tắt rung camera và chớp màn hình)</label>
       <label class="check"><input id="s-large" type="checkbox" ${settings.largeText ? "checked" : ""}> Chữ lớn (×1.25)</label>
       <label class="check"><input id="s-cb" type="checkbox" ${settings.colorblind ? "checked" : ""}> Bảng màu dễ phân biệt (chế độ mù màu)</label>
       ${btn("keys", "Đổi phím")}
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
        for (const [id, key] of [["s-cues", "cues"], ["s-reduce", "reduceMotion"], ["s-large", "largeText"], ["s-cb", "colorblind"]]) {
          root.querySelector("#" + id).addEventListener("change", (ev) => {
            settings[key] = ev.target.checked;
            onSettings(settings);
          });
        }
        on(root, "keys", () => controlsPanel(() => settingsPanel(back)));
        on(root, "back", back);
      },
    );
  }

  // ---------- đổi phím ----------
  function controlsPanel(back) {
    const draw = (message = "", ok = false) => {
      showScreen(
        `<h2>Đổi phím</h2>
         <p class="hint">Bấm một ô rồi nhấn phím mới. <b>Backspace</b>: xóa phím, <b>Esc</b>: hủy.</p>
         ${ACTIONS.map((a) => `<div class="keyrow"><b>${ACTION_LABEL[a]}</b>${[0, 1].map((s) => `<button class="keybtn" data-a="${a}" data-s="${s}" aria-label="${ACTION_LABEL[a]}, ô ${s + 1}">${keyLabel(settings.keymap[a][s])}</button>`).join("")}</div>`).join("")}
         <p id="kmsg" class="msg ${ok ? "ok" : ""}" role="alert">${esc(message)}</p>
         ${btn("kreset", "Khôi phục mặc định")}${btn("kback", "Quay lại")}`,
        (root) => {
          for (const b of root.querySelectorAll(".keybtn")) b.addEventListener("click", () => capture(root, b));
          on(root, "kreset", () => {
            settings.keymap = cloneKeymap(DEFAULT_KEYMAP);
            onSettings(settings);
            draw("Đã khôi phục phím mặc định.", true);
          });
          on(root, "kback", back);
        },
      );
    };
    const capture = (root, b) => {
      const action = b.dataset.a;
      const slot = Number(b.dataset.s);
      b.classList.add("wait");
      b.textContent = "…";
      const done = (msg, ok) => {
        removeEventListener("keydown", onKey, true);
        draw(msg, ok);
      };
      const onKey = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation(); // không cho game xử lý phím này
        const k = normalizeKey(e.key);
        if (k === "escape") return done("Đã hủy.", false);
        const r = bindKey(settings.keymap, action, slot, k === "backspace" || k === "delete" ? null : k);
        if (!r.ok) {
          if (r.conflict) return done(`Phím ${keyLabel(k)} đang dùng cho «${ACTION_LABEL[r.conflict]}». Hãy chọn phím khác.`, false);
          return done(r.error ?? "Không đổi được phím.", false);
        }
        settings.keymap = r.map;
        onSettings(settings);
        done(`Đã đặt «${ACTION_LABEL[action]}» = ${keyLabel(r.map[action][slot])}.`, true);
      };
      addEventListener("keydown", onKey, true);
    };
    draw();
  }

  // ---------- bảng xếp hạng ----------
  function leaderboardPanel(back) {
    showScreen(`<h2>Bảng xếp hạng</h2><div id="lbbody"><p class="hint">Đang tải…</p></div>${btn("lbback", "Quay lại")}`, (root) => on(root, "lbback", back));
    handlers
      .fetchBoard()
      .then((entries) => {
        const body = screen.querySelector("#lbbody");
        if (!body) return;
        body.innerHTML = entries.length
          ? `<table class="lb"><thead><tr><th>#</th><th>Tên</th><th class="n">Điểm</th><th class="n">Đêm thắng</th><th>Ngày</th></tr></thead><tbody>${entries
              .map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.name)}</td><td class="n">${e.score}</td><td class="n">${e.nights_won}/3</td><td>${esc(e.achieved_at.slice(0, 16).replace("T", " "))}</td></tr>`)
              .join("")}</tbody></table>`
          : `<p class="hint">Chưa có ai trên bảng. Hãy chơi và lưu điểm của bạn!</p>`;
      })
      .catch((err) => {
        const body = screen.querySelector("#lbbody");
        if (body) body.innerHTML = `<p class="msg" role="alert">Không tải được bảng xếp hạng (${esc(err.message)}). Hãy chạy game bằng npm start.</p>`;
      });
  }

  // ---------- lưu điểm ----------
  const saveFormHtml = (data) => `<div class="save">
      <p class="hint">Lưu điểm: <b>${data.score}</b> · Đêm thắng: <b>${data.nights_won}/3</b></p>
      <label for="pname">Tên (3–12 ký tự: chữ, số hoặc _)</label>
      <input id="pname" type="text" maxlength="12" autocomplete="off" spellcheck="false" aria-describedby="pmsg">
      <p id="pmsg" class="msg" role="alert"></p>
      ${btn("psave", "Lưu điểm")}</div>`;
  function bindSave(root, back) {
    const input = root.querySelector("#pname");
    const msg = root.querySelector("#pmsg");
    const b = root.querySelector("#psave");
    if (!input) return;
    const check = () => {
      const ok = validateName(input.value);
      msg.className = "msg";
      msg.textContent = input.value && !ok ? "Tên phải gồm 3–12 ký tự: chữ cái, chữ số hoặc dấu gạch dưới _." : "";
      return ok;
    };
    input.addEventListener("input", check);
    b.addEventListener("click", async () => {
      handlers.ui?.();
      if (!check() || !input.value) {
        msg.className = "msg";
        msg.textContent = "Hãy nhập tên hợp lệ (3–12 ký tự: chữ cái, chữ số hoặc _).";
        return;
      }
      b.disabled = true;
      try {
        const r = await handlers.save(input.value);
        msg.className = "msg ok";
        msg.textContent = r.rank ? `Đã lưu! Bạn đứng hạng ${r.rank}.` : "Đã lưu, nhưng chưa vào top 10.";
        input.disabled = true;
        b.textContent = "Xem bảng xếp hạng";
        b.disabled = false;
        b.onclick = () => leaderboardPanel(back);
      } catch (err) {
        msg.className = "msg";
        msg.textContent = err.message;
        b.disabled = false;
      }
    });
  }

  const ui = {
    stats,
    showHUD: (v) => (hud.style.display = v ? "block" : "none"),
    hideScreen,
    isScreenOpen: () => screen.style.display === "flex",

    menu() {
      showScreen(
        `<h1>Đảo Đèn Lồng</h1>
         <p class="sub">Mây, người giữ đèn nhỏ tuổi, thắp lại ba hòn đảo giữa biển mây.</p>
         ${btn("start", "Bắt đầu")}${btn("board", "Bảng xếp hạng")}${btn("settings", "Cài đặt")}
         <p class="hint">Đi: ${primaryKey("up")}/${primaryKey("left")}/${primaryKey("down")}/${primaryKey("right")} · Nhảy: ${primaryKey("jump")} · Lướt: ${primaryKey("dash")} · Nạp/châm dầu: ${primaryKey("interact")} · Tỏa sáng: ${primaryKey("pulse")} · Tạm dừng: ${primaryKey("pause")} · kéo chuột xoay camera</p>`,
        (root) => {
          on(root, "start", handlers.start);
          on(root, "board", () => leaderboardPanel(() => ui.menu()));
          on(root, "settings", () => settingsPanel(() => ui.menu()));
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
         ${win ? btn("next", info.night < 3 ? `Đêm kế tiếp` : "Đón Bình Minh") : btn("retry", "Chơi lại Đêm này")}${btn("menu", "Về menu")}
         ${win ? "" : saveFormHtml(info.save)}`,
        (root) => {
          on(root, "next", handlers.next);
          on(root, "retry", handlers.retry);
          on(root, "menu", handlers.menu);
          bindSave(root, () => ui.result(win, info));
        },
      );
    },
    dawn(total, save) {
      showScreen(
        `<h1 class="good">Bình Minh</h1>
         <p class="quote"><b>Ông Đăng:</b> “Ba hòn đảo đã sáng đèn. Cảm ơn cháu, người giữ đèn nhỏ tuổi.”</p>
         <p class="sub">Tổng điểm: <b>${total}</b></p>${btn("menu", "Về menu")}
         ${saveFormHtml(save)}`,
        (root) => {
          on(root, "menu", handlers.menu);
          bindSave(root, () => ui.dawn(total, save));
        },
      );
    },
    pause() {
      showScreen(
        `<h2>Tạm dừng</h2>${btn("resume", "Tiếp tục")}${btn("restart", "Chơi lại Đêm")}${btn("settings", "Cài đặt")}${btn("menu", "Về menu")}`,
        (root) => {
          on(root, "resume", handlers.resume);
          on(root, "restart", handlers.restartNight);
          on(root, "settings", () => settingsPanel(() => ui.pause()));
          on(root, "menu", handlers.menu);
        },
      );
    },

    // chớp màn hình: tắt hẳn khi bật "Giảm chuyển động"
    flash(color) {
      if (settings.reduceMotion) return;
      stats.flashes++;
      const cb = document.body.classList.contains("cb");
      el.flash.style.background = css(color ?? (cb ? 0xffffff : PAL.danger));
      el.flash.style.opacity = "0.45";
      requestAnimationFrame(() => requestAnimationFrame(() => (el.flash.style.opacity = "0")));
    },

    // phụ đề / chỉ báo hình ảnh (có thể tắt trong Cài đặt)
    cue(text, kind = "info", ms = 4000) {
      if (!settings.cues) return;
      stats.cues++;
      const d = document.createElement("div");
      d.className = `cue ${kind}`;
      d.textContent = text;
      el.cues.appendChild(d);
      while (el.cues.children.length > 3) el.cues.firstChild.remove();
      setTimeout(() => d.remove(), ms);
    },
    // mũi tên ở mép màn hình chỉ tới Bóng Mực vừa xuất hiện; items: [{ x, y, behind }] (toạ độ màn hình)
    updateSpawnArrows(items) {
      while (el.spawn.children.length < items.length) {
        const a = document.createElement("div");
        a.className = "sarrow";
        el.spawn.appendChild(a);
      }
      [...el.spawn.children].forEach((node, i) => {
        if (i < items.length && settings.cues) placeArrow(node, items[i]);
        else node.style.display = "none";
      });
    },

    // cập nhật HUD mỗi khung hình (chỉ chạm DOM khi nội dung đổi)
    update(game, extra) {
      const tu = game.tuning;
      const p = game.player;
      set("night", el.night, `Đêm ${game.night} · ${game.level.name}`);
      set("flames", el.flames, Array.from({ length: tu.flames }, (_, i) => `<span class="flame ${i < p.flames ? "on" : ""}">🔥</span>`).join(""));
      const left = Math.max(0, game.remaining / 60);
      setText("timer", el.timer, fmt(left));
      el.timer.classList.toggle("danger", left <= 30);
      el.timer.classList.toggle("blink", left <= 30 && !settings.reduceMotion && Math.floor(left * 2) % 2 === 0);
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
      setText("lbl-dash", el.dash.firstElementChild, `Lướt ${primaryKey("dash")}`);
      setText("lbl-pulse", el.pulse.firstElementChild, `Tỏa sáng ${primaryKey("pulse")}`);
      set("charm", el.charm, p.charm > 0 ? `<b>Bùa Gió</b> ${Math.ceil(p.charm / 60)}s` : "");
      set("wind", el.wind, extra.windWarning ? "🍃 Gió sắp nổi!" : extra.windActive ? "🍃 Gió mạnh!" : "");

      // nhắc khi đứng trong 2 m của đèn nhận được (chưa sáng, hoặc sáng chưa đầy dầu), đúng thứ tự chọn của luật
      const near = game.lanterns
        .filter((l) => (!l.lit || l.fuel < tu.fuel_max * 60) && Math.hypot(l.x - p.x, l.z - p.z) <= tu.interact_radius)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      const ik = esc(primaryKey("interact"));
      set("prompt", el.prompt, near ? (near.lit ? `<b>${ik}</b> — Châm dầu (${Math.round(near.fuel / 60)}/${tu.fuel_max})` : `<b>${ik}</b> — Nạp ánh sáng (${near.deposited}/${near.everLit ? tu.relight_cost : tu.lantern_cost})`) : "");

      // mũi tên chỉ tới đèn chưa sáng gần nhất khi nó nằm ngoài màn hình
      const target = game.lanterns
        .filter((l) => !l.lit)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      if (target) placeArrow(el.arrow, extra.project(target.x, target.y + 3.4, target.z));
      else el.arrow.style.display = "none";
    },
    setFps(text) {
      el.fps.textContent = text;
      el.fps.style.display = text ? "block" : "none";
    },
  };
  return ui;
}
