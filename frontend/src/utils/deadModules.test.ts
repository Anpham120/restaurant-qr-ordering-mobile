import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const frontendRoot = fileURLToPath(new URL("../../", import.meta.url));
const srcRoot = join(frontendRoot, "src");

/** Ba ứng dụng thật. `kitchen-web` và `staff-web` là stub chuyển hướng, không nạp gì từ `src/`. */
const ENTRYPOINTS = ["customer-web", "ordering-web", "admin-web"]
  .map((app) => join(frontendRoot, "apps", app, "src", "main.tsx"));

/**
 * Tệp KHÔNG được import bao giờ, và đó là đúng.
 *
 * <p>Danh sách này phải luôn ngắn và mỗi dòng phải nêu lý do. Nó là chỗ duy nhất để một tệp thoát
 * khỏi phép kiểm, nên nó cũng là chỗ mã chết sẽ tìm cách chui vào.
 */
const NGOAI_LE: Record<string, string> = {
  "vite-env.d.ts": "khai báo ambient cho tsc — được đọc, không được import",
};

const LA_NGUON = /\.(tsx?|css)$/;
const LA_TEST = /\.(test|spec)\.tsx?$/;

function moiTepNguon(): string[] {
  const ra: string[] = [];
  (function quet(thuMuc: string) {
    for (const e of readdirSync(thuMuc, { withFileTypes: true })) {
      const p = join(thuMuc, e.name);
      if (e.isDirectory()) quet(p);
      else if (LA_NGUON.test(e.name) && !LA_TEST.test(e.name)) ra.push(p);
    }
  })(srcRoot);
  return ra;
}

/**
 * Đường dẫn thật của một lời import tương đối.
 *
 * <p>`join` cho nhánh thư mục/index chứ KHÔNG nối chuỗi: `resolve` trả về dấu phân tách của hệ
 * điều hành, nên `goc + "/index.ts"` trên Windows sinh ra `...\types/index.ts` — một chuỗi khác
 * với `...\types\index.ts` mà bước quét thư mục tạo ra. Hai khoá lệch nhau thì tệp đó bị coi là
 * không ai dùng. Bản đầu của phép kiểm này dính đúng lỗi đó và báo `src/types/index.ts` — một tệp
 * dùng ở khắp nơi — là mã chết.
 */
function giaiQuyet(tuTep: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const goc = resolve(dirname(tuTep), spec);
  for (const hau of ["", ".tsx", ".ts", ".css", "/index.tsx", "/index.ts"]) {
    const ungVien = hau.startsWith("/") ? join(goc, hau.slice(1)) : goc + hau;
    if (existsSync(ungVien) && statSync(ungVien).isFile()) return ungVien;
  }
  return null;
}

function tapTapToiDuoc(): Set<string> {
  const daTham = new Set<string>();
  const hangDoi = [...ENTRYPOINTS];
  while (hangDoi.length > 0) {
    const tep = hangDoi.pop()!;
    if (daTham.has(tep) || !existsSync(tep)) continue;
    daTham.add(tep);
    if (tep.endsWith(".css")) continue;
    const noiDung = readFileSync(tep, "utf8");
    for (const m of noiDung.matchAll(/(?:from\s+"([^"]+)"|import\s+"([^"]+)")/g)) {
      const dich = giaiQuyet(tep, m[1] ?? m[2]!);
      if (dich) hangDoi.push(dich);
    }
  }
  return daTham;
}

describe("mã chết trong frontend/src", () => {
  /**
   * Mọi tệp nguồn phải tới được từ một trong ba entrypoint.
   *
   * <p>Vì sao cần: mã chết ở kho này sống sót vì nó thành CỤM. Sáu trang là vỏ 6 dòng re-export
   * sang một trang chết khác, nên mỗi tệp nhìn riêng đều "có người dùng" và tìm kiếm thông thường
   * không thấy gì. Chỉ phân tích khả đạt từ entrypoint mới lộ ra.
   *
   * <p>Đợt dọn đầu tiên gỡ 18 tệp / 1.283 dòng, trong đó hơn nửa là hai tệp CSS không ai `@import`.
   */
  it("không tệp nào không tới được từ entrypoint", () => {
    const toiDuoc = tapTapToiDuoc();

    const chet = moiTepNguon()
      .filter((tep) => !toiDuoc.has(tep))
      .map((tep) => relative(srcRoot, tep).replaceAll("\\", "/"))
      .filter((tep) => !(tep in NGOAI_LE));

    expect(chet, "thêm vào NGOAI_LE kèm lý do, hoặc xoá tệp").toEqual([]);
  });

  /** Đối chứng: phép kiểm trên phải PHÂN BIỆT được, không phải luôn xanh. */
  it("chính phép kiểm này bắt được một tệp không ai dùng", () => {
    const toiDuoc = tapTapToiDuoc();

    // Một tệp có thật và đang được dùng — nếu nó không nằm trong tập tới được thì bộ duyệt hỏng,
    // và khi đó phép kiểm trên sẽ báo động giả hàng loạt thay vì im lặng bỏ sót.
    expect(toiDuoc.has(join(srcRoot, "types", "index.ts"))).toBe(true);

    // Một đường dẫn không tồn tại thì đương nhiên không tới được.
    expect(toiDuoc.has(join(srcRoot, "khong-ton-tai.ts"))).toBe(false);
  });
});
