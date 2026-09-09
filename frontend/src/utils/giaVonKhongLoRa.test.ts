import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../../", import.meta.url);
const doc = (p: string) => readFileSync(fileURLToPath(new URL(p, repoRoot)), "utf8");

const JAVA = "backend-java/src/main/java/com/cmc/restaurant/";

/** Thân của một `record Ten(...)` — từ tên tới dấu `)` đóng danh sách tham số. */
function thanRecord(java: string, ten: string): string {
  const dau = java.indexOf(`record ${ten}(`);
  if (dau < 0) return "";
  let sau = 0;
  let i = java.indexOf("(", dau);
  const batDau = i;
  for (; i < java.length; i++) {
    if (java[i] === "(") sau++;
    else if (java[i] === ")" && --sau === 0) break;
  }
  return java.slice(batDau, i);
}

describe("giá vốn không lọt ra thực đơn công khai", () => {
  /**
   * GIÁ VỐN LÀ DỮ LIỆU NỘI BỘ, VÀ `/api/menu` LÀ ĐƯỜNG CÔNG KHAI.
   *
   * `MenuItemResponse` là thứ `MenuQueryService.getPublicMenu()` trả về cho mọi khách quét QR.
   * Thêm `costPrice` vào đó rồi nhớ xoá nó ở đường công khai là đặt cược vào trí nhớ: một lần quên
   * là giá vốn của cả 91 món nằm trong JSON mà bất kỳ ai mở DevTools cũng đọc được — và không có
   * gì báo động, vì trang vẫn chạy đúng.
   *
   * Cách chặn là TÁCH KIỂU: `AdminMenuItemResponse` có trường đó, `MenuItemResponse` thì không.
   * Đường công khai khi ấy không thể rò rỉ vì kiểu trả về của nó không có chỗ chứa.
   *
   * Phép kiểm này canh đúng ranh giới đó. Nó đọc mã Java từ phía frontend vì đây là kho một cục và
   * đó là nơi duy nhất có sẵn một bộ chạy kiểm nhanh — cùng cách `cdPipeline.test.ts` đọc
   * `.github/` và `deploy/`.
   */
  it("MenuItemResponse (công khai) KHÔNG có costPrice", () => {
    const than = thanRecord(doc(`${JAVA}menu/MenuDtos.java`), "MenuItemResponse");

    expect(than, "không đọc được record MenuItemResponse").not.toBe("");
    expect(
      than,
      "record này là thứ /api/menu trả cho KHÁCH — thêm giá vốn vào đây là rò rỉ dữ liệu nội bộ",
    ).not.toContain("costPrice");
  });

  it("AdminMenuItemResponse CÓ costPrice — nếu không thì màn quản lý không nhập được", () => {
    const than = thanRecord(doc(`${JAVA}menu/MenuDtos.java`), "AdminMenuItemResponse");

    expect(than, "không đọc được record AdminMenuItemResponse").not.toBe("");
    expect(than).toContain("costPrice");
  });

  /**
   * Bộ ánh xạ công khai phải dựng `MenuItemResponse`. Nếu ai đó đổi nó sang bản admin cho tiện thì
   * việc tách kiểu ở trên thành vô nghĩa — kiểu vẫn đúng, nhưng đường công khai trả bản có giá vốn.
   */
  it("getPublicMenu dựng bản công khai, không dựng bản admin", () => {
    const java = doc(`${JAVA}menu/MenuQueryService.java`);
    const dau = java.indexOf("getPublicMenu");
    const cuoi = java.indexOf("static MenuItemResponse toResponse");

    expect(dau, "không thấy getPublicMenu").toBeGreaterThan(-1);
    expect(
      java.slice(dau, cuoi > dau ? cuoi : undefined),
      "getPublicMenu gọi toAdminResponse — thực đơn công khai sẽ kèm giá vốn",
    ).not.toContain("toAdminResponse");
  });

  /**
   * Kiểu của web phải khớp ranh giới của máy chủ. `MenuItem` là kiểu cho `/api/menu`; thêm
   * `costPrice` vào đó là mời người viết giao diện khách hiển thị nó.
   */
  it("kiểu MenuItem dùng chung KHÔNG có costPrice", () => {
    const ts = doc("frontend/packages/shared-types/src/index.ts");
    const dong = ts.split(/\r?\n/).find((l) => l.startsWith("export type MenuItem ="));

    expect(dong, "không thấy khai báo MenuItem").toBeTruthy();
    expect(dong, "MenuItem là kiểu của thực đơn CÔNG KHAI").not.toContain("costPrice");
  });
});
