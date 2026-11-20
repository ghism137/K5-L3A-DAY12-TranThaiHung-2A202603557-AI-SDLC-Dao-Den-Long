// Cập nhật tư thế tick trước của Bóng Mực tại chỗ (không tạo đối tượng mới mỗi tick: tránh rác bộ nhớ gây giật).
export function savePrevShades(prevShades, shades) {
  for (const s of shades) {
    const e = prevShades.get(s.id);
    if (e) {
      e.x = s.x;
      e.z = s.z;
    } else prevShades.set(s.id, { x: s.x, z: s.z });
  }
  if (prevShades.size !== shades.length) {
    const alive = new Set(shades.map((s) => s.id));
    for (const k of prevShades.keys()) if (!alive.has(k)) prevShades.delete(k);
  }
}
