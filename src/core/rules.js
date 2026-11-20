// Hằng số luật chuẩn của Ticket-02 mà Test Contract không đòi khai trong `tuning`.
// Các số có trong tuning (tốc độ, sức chứa, giá đèn, ...) đọc từ game.contract.json, không lặp lại ở đây.
export const TPS = 60;

export const R = {
  jumpSpeed: 7,
  gravity: 20,
  stepUp: 0.35, // bước lên bề mặt cao hơn quá mức này: bị chặn (vách đứng)
  fallY: -10,
  fallWaitTicks: 60,
  respawnInvulnTicks: 90,
  pickupDy: 1.5,
  hitDy: 1.5,

  moteStart: 20,
  moteMax: 30,
  moteEvery: 240,
  dropTtl: 480,
  dropRing: [1.5, 2.5],

  charmTicks: 600,
  charmRespawnTicks: 2700,
  charmSpeedMul: 1.2,

  pulseCenterDy: 0.8,
  pulsePushTicks: 15,

  shadeY: 1.0,
  shadeSpawningTicks: 30,
  shadeWanderSpeed: 2,
  shadeWanderReroll: 120,
  shadeDetect: 12,
  shadeGiveUp: 18,
  shadeRecoilM: 2,
  shadeRecoilTicks: 60,
  shadeFirstTick: 300,
  shadeFirstCount: 2,
  spawnMinDist: 15,
  safePushTicks: 30,

  drifter: { speed: 7, idleSpeed: 2, max: 2, every: 1200, aggroCarried: 5, aggroDist: 15, touch: 1.2, steal: 3, fleeTicks: 240, dropVanishTicks: 120, y: 1.5 },
  wind: { every: 1800, dur: 300, warn: 120, speed: 2 },
};

export const SHADE_STATES = ["spawning", "wander", "chase", "recoil", "stunned"];
export const DRIFTER_STATES = ["idle", "chase", "flee"];
