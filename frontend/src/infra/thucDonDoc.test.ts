import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// @ts-expect-error — bộ sinh là .mjs thuần, cố ý không có khai báo kiểu: nó chạy được bằng
// `node scripts/menu/build_thuc_don.mjs` mà không cần bước biên dịch nào.
import { dungDanhSachTen, dungMarkdown } from "../../../scripts/menu/thuc_don.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

/**
 * Hai bảng thực đơn phải khớp kết quả sinh lại từ migration.
 *
 * <p>Không có cổng này thì bảng Markdown là nguồn sự thật THỨ HAI cho cùng một thực đơn, và nguồn
 * thứ hai luôn thua: migration đổi giá thì cơ sở dữ liệu đổi ngay, còn bảng thì đổi khi có ai nhớ.
 * Đây đúng là hình dạng lỗi mà docs/THIET_KE_NGHIEP_VU.md §22 đã liệt kê bốn lần.
 *
 * <p>Cổng này ở phía frontend vì `frontend-build` đã có sẵn Node — thêm nó vào job `menu-data` sẽ
 * phải dựng thêm một toolchain chỉ để chạy một phép so chuỗi.
 */
describe("bảng thực đơn quán", () => {
  const bang: Array<[string, (goc: string) => string]> = [
    ["docs/THUC_DON_QUAN.md", dungMarkdown],
    ["docs/THUC_DON_TEN_MON.md", dungDanhSachTen],
  ];

  it.each(bang)("%s khớp kết quả sinh lại từ migration", (duongDan, dung) => {
    const daCommit = readFileSync(repoRoot + duongDan, "utf8");

    expect(daCommit, "chạy: node scripts/menu/build_thuc_don.mjs").toBe(dung(repoRoot));
  });

  /**
   * Bộ sinh phải PHÁT LẠI migration, không chỉ đọc các câu INSERT.
   *
   * <p>V34 xoá bốn món chiên nướng khỏi nhóm Ăn nhẹ và đổi tên nhóm thành Hạt rang. Một bộ đọc
   * chỉ nhìn INSERT vẫn in "Xúc xích nướng" lên thực đơn — sai theo hướng tệ nhất, vì bảng trông
   * vẫn bình thường và không ai có lý do nghi ngờ nó.
   */
  it("không còn món đã bị migration sau xoá", () => {
    const daXoa = ["Xúc xích nướng", "Khoai tây chiên", "Gà viên giòn", "Bánh tráng trộn"];
    const ra = dungDanhSachTen(repoRoot);

    for (const ten of daXoa) {
      expect(ra, ten).not.toContain(ten);
    }
    expect(ra).toContain("Hạt rang");
  });
});
