# Checkpoint 0 - Chuan bi

Cap nhat: 2026-11-20. Trang thai: xong phan moi truong/repo. Con lai cho nguoi lam: hoi tro giang 1 cau, hoi Coach han nop, clone that sau khi push ([ ] / [~]).

| Viec | Trang thai | Bang chung |
|---|---|---|
| Repo ca nhan, Public, dat ten theo SUBMISSION | [x] | `gh repo view`: ghism137/K5-L3A-DAY12-TranThaiHung-2A202603557-AI-SDLC-Dao-Den-Long, PUBLIC (fork cua VinUni-AI20k/K5-L3-LAB-Day12-AI-SDLC) |
| Chon cong cu / engine / ngon ngu | [x] | Claude Code; Node 22 + JS ESM (khong dependency); Three.js se them o Phase 1 neu can; Docker cho Release |
| Chay thu chuong trinh headless | [x] | `docs/proof/phase0/npm-test.txt` (2/2 pass), `docs/proof/phase0/docker-headless.txt` |
| Chay thu 3D tren trinh duyet | [x] | Phase 1: Edge headless chup `docs/proof/phase1/ui-start.png`, `ui-lit3.png` (chay that, khong loi console) |
| Dang nhap claude.ai, mo lab board, mo tab Phase 1 | [x] | Nguoi lam da mo tab Phase 1 va doc PRD-0 (2026-11-20). Chua xac nhan da hoi tro giang cau nao |
| Noi ghi chep gia dinh / nhat ky AI / bang chung | [x] | `docs/notes/`, `docs/proof/` |
| Kiem tra han nop tung phase theo Coach | [ ] | Hoi Coach: ca sang (23h59 cung ngay) hay ca chieu (11h59 hom sau) |
| Clone repo sang thu muc khac va chay duoc | [x] | Clone that tu GitHub o tag `phase-1`: `npm install`, `npm test` 22/22, headless exit 0 (2026-11-20). CI xanh (12s) |

## Quyet dinh stack (ly do)
- JS ESM + `node:test`: khong can cai them, test chay tuc thi, tiet kiem token/thoi gian.
- Logic o `src/core` tach khoi render de chay headless duoc.
- Docker: dong goi Release va "clone sach, chay trong 3 lenh".

## Tu kiem sau khi push
```bash
git clone https://github.com/ghism137/K5-L3A-DAY12-TranThaiHung-2A202603557-AI-SDLC-Dao-Den-Long kiem-tra
cd kiem-tra && npm test && npm run headless
```
