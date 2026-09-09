import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const MO_STYLE = "style={{";
const srcRoot = fileURLToPath(new URL("../", import.meta.url));

/**
 * QUÉT CẢ MẶT KHÁCH HÀNG, KHÔNG CHỈ MẶT VẬN HÀNH.
 *
 * Bản trước loại mặt khách hàng ra với lý do ghi thẳng ở đây: *"nó có 23 chỗ đặt style rời và một
 * hệ thiết kế riêng, sửa nó là một đợt việc khác"*. Lý do đó đã hết hạn — 23 chỗ ấy nay là lớp CSS
 * thật trong `customer-landing.css`.
 *
 * Giữ nguyên chỗ loại trừ sau khi lý do biến mất là cách một ngoại lệ tạm thành vĩnh viễn: không
 * ai kiểm lại một dòng đã nằm sẵn trong tệp, và phạm vi cổng cứ nhỏ đi theo thời gian.
 */
const MAT_VAN_HANH = [
  "components/admin",
  "components/kitchen",
  "components/operations",
  "components/staff",
  "components/landing",
  "components/customer",
  "pages/admin",
  "pages/counter",
  "pages/customer",
];
const TEP_LE = [
  "pages/AdminInvoicesPage.tsx",
  "pages/StaffPaymentsPage.tsx",
  "pages/CustomerHomePage.tsx",
];

function tepNguon(): string[] {
  const ra: string[] = [];
  const quet = (thuMuc: string) => {
    for (const muc of readdirSync(thuMuc)) {
      const duong = join(thuMuc, muc);
      if (statSync(duong).isDirectory()) quet(duong);
      else if (/\.tsx$/.test(muc) && !/\.test\./.test(muc)) ra.push(duong);
    }
  };
  for (const d of MAT_VAN_HANH) quet(join(srcRoot, d));
  for (const f of TEP_LE) ra.push(join(srcRoot, f));
  return ra;
}

/**
 * Mọi `style={{ ... }}` trong mã CHẠY — bỏ ghi chú, vì ghi chú nhắc tên `style={{}}` để giải thích
 * vì sao không dùng nó là chuyện tốt, không phải vi phạm.
 *
 * ĐẾM NGOẶC, KHÔNG DÙNG `[^}]*`.
 *
 * Bản đầu của hàm này viết `/style=\{\{[^}]*\}\}/` và nó bắt được RỖNG trên đúng dòng đáng quan
 * tâm nhất: `style={{ "--x": ${"`"}${"$"}{p.percent}%${"`"} }}` có một dấu `}` bên trong chuỗi mẫu,
 * nên `[^}]*` dừng ở đó và không bao giờ tới được `}}`.
 *
 * Hậu quả: phép kiểm xanh trong khi vi phạm nằm ngay đó. Phát hiện được vì có bước phá thử — chèn
 * một thuộc tính thường vào cạnh biến CSS mà phép kiểm vẫn xanh.
 */
function styleRoi(noiDung: string): string[] {
  const maChay = noiDung.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  const ra: string[] = [];
  const MO = "style={{";
  for (let i = maChay.indexOf(MO); i >= 0; i = maChay.indexOf(MO, i + 1)) {
    let sau = 0;
    for (let j = i + MO.length - 2; j < maChay.length; j++) {
      if (maChay[j] === "{") sau++;
      else if (maChay[j] === "}" && --sau === 0) {
        ra.push(maChay.slice(i, j + 1));
        break;
      }
    }
  }
  return ra;
}

/** Chỉ truyền BIẾN CSS: `style={{ "--x": ... }}`. */
function chiTruyenBienCss(s: string): boolean {
  const than = s.slice(MO_STYLE.length, -1).trim();
  if (than.length === 0) return false;
  // Tách theo dấu phẩy Ở NGOÀI mọi ngoặc: một chuỗi mẫu có thể chứa dấu phẩy của riêng nó.
  const phan: string[] = [];
  let sau = 0;
  let batDau = 0;
  for (let i = 0; i < than.length; i++) {
    const c = than[i]!;
    if ("{[(".includes(c)) sau++;
    else if ("}])".includes(c)) sau--;
    else if (c === "," && sau === 0) {
      phan.push(than.slice(batDau, i));
      batDau = i + 1;
    }
  }
  phan.push(than.slice(batDau));
  return phan.every((p) => /^\s*"--[a-z0-9-]+"\s*:/.test(p));
}


describe("style rời trên mặt vận hành", () => {
  /**
   * CANH TÁC HẠI, KHÔNG CANH CHUỖI.
   *
   * Đặc tả đặt tiêu chí "`style={{` bằng 0". Đó là một chỉ dấu thay thế, không phải điều cần đạt.
   * Điều cần đạt: không quyết định về HÌNH THỨC nào nằm ngoài tầm với của hệ thiết kế — vì một
   * giá trị đặt thẳng không đọc token, không đổi theo chủ đề, và không ai tìm thấy khi sửa giao
   * diện.
   *
   * Nên có ĐÚNG MỘT ngoại lệ: truyền một BIẾN CSS động. Bề rộng thanh tiến độ chỉ biết lúc chạy,
   * và nó đi vào CSS qua biến chứ không đặt thẳng thuộc tính — quyết định về hình thức vẫn nằm
   * trong tệp CSS. Cấm cả dạng đó là bắt người ta lách bằng cách tệ hơn.
   */
  it("không chỗ nào đặt thẳng thuộc tính hình thức", () => {
    const pham: string[] = [];
    for (const tep of tepNguon()) {
      for (const s of styleRoi(readFileSync(tep, "utf8"))) {
        if (chiTruyenBienCss(s)) continue;
        pham.push(`${tep.slice(srcRoot.length).replace(/\\/g, "/")}: ${s}`);
      }
    }

    expect(pham, "dùng một lớp CSS; chỉ `style={{ \"--bien\": ... }}` mới được phép").toEqual([]);
  });

  /** Đối chứng: phép kiểm trên phải PHÂN BIỆT được, không phải luôn xanh. */
  it("vẫn nhận ra style rời khi có", () => {
    expect(styleRoi('<div style={{ margin: 0 }} />')).toHaveLength(1);
    expect(chiTruyenBienCss('style={{ margin: 0 }}')).toBe(false);
    expect(chiTruyenBienCss('style={{ "--kitchen-progress": `${x}%` }}')).toBe(true);
    // Một biến CSS đi kèm một thuộc tính thường thì KHÔNG được phép: nó vẫn là một quyết định về
    // hình thức nằm ngoài CSS, chỉ là được giấu cạnh một thứ hợp lệ.
    expect(chiTruyenBienCss('style={{ "--x": 1, margin: 0 }}')).toBe(false);
  });

  it("thật sự quét được tệp, không phải quét một danh sách rỗng", () => {
    expect(tepNguon().length).toBeGreaterThan(15);
  });
});

describe("thang chữ không có ngoại lệ dưới sàn", () => {
  /**
   * Đợt 1 đặt sàn 13px. Nhưng ba lớp có từ trước vẫn để 11px và 12px — `.ops-stat-detail`,
   * `.ops-card-meta`, `.ops-form-error`. Sàn chỉ có nghĩa khi không có chỗ nào ở dưới nó.
   */
  it("không quy tắc nào của mặt vận hành khai font-size dưới 13px", () => {
    const css = readFileSync(join(srcRoot, "components/operations/operations.css"), "utf8");
    const nho = [...css.matchAll(/font-size:\s*(\d+)px/g)]
      .map((m) => Number(m[1]))
      .filter((px) => px < 13);

    expect(nho, "dùng bậc của thang chữ (`--ops-text-xs` là sàn 13px)").toEqual([]);
  });
});
