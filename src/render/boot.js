// Điểm vào của trang: ?bench=1 chạy cảnh benchmark chuẩn, còn lại là game.
const params = new URLSearchParams(location.search);
await import(params.has("bench") ? "./bench.js" : "./main.js");
