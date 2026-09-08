import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = new URL("../", import.meta.url);
const doc = (p: string) => readFileSync(fileURLToPath(new URL(p, srcRoot)), "utf8");

const tokens = () => doc("components/operations/ops-tokens.css");
const operations = () => doc("components/operations/operations.css");

/** Mọi tên biến `--x` được khai bên trong một khối, kèm khối đó là khối nào. */
function bienTheoKhoi(css: string): { ten: string; trongKhoiDieuKien: boolean }[] {
  const ra: { ten: string; trongKhoiDieuKien: boolean }[] = [];
  let sau = 0; // độ sâu ngoặc bên trong một @media
  let trongMedia = false;
  for (const dong of css.split(/\r?\n/)) {
    if (/^\s*@media/.test(dong)) {
      trongMedia = true;
      sau = 0;
    }
    if (trongMedia) {
      sau += (dong.match(/\{/g) ?? []).length - (dong.match(/\}/g) ?? []).length;
      if (sau <= 0 && /\}/.test(dong)) trongMedia = false;
    }
    const m = /^\s*(--[a-z0-9-]+)\s*:/.exec(dong);
    if (m) ra.push({ ten: m[1]!, trongKhoiDieuKien: trongMedia || /\[data-theme/.test(dong) });
  }
  return ra;
}

/** Đọc thân của khối bắt đầu tại `batDau`, cân bằng ngoặc nhọn. */
function thanKhoi(css: string, batDau: number): string {
  if (batDau < 0) return "";
  const dau = css.indexOf("{", batDau);
  let sau = 0;
  let i = dau;
  for (; i < css.length; i++) {
    if (css[i] === "{") sau++;
    else if (css[i] === "}" && --sau === 0) break;
  }
  return css.slice(dau, i);
}

/**
 * Biến khai trong khối `:root[data-theme="dark"]` — khối người dùng CHỌN TAY chế độ tối.
 *
 * Phải neo vào đúng selector đó. Bản đầu của phép kiểm này bắt `[data-theme` đầu tiên gặp được,
 * mà cái đó lại là `:not([data-theme="light"])` NẰM TRONG khối `@media` — nên nó so khối tối với
 * chính nó và luôn xanh. Đã kiểm: xoá một biến khỏi khối chọn-tay mà phép kiểm không đỏ.
 */
function bienTrongDataTheme(css: string): Set<string> {
  const ra = new Set<string>();
  const than = thanKhoi(css, css.indexOf(':root[data-theme="dark"]'));
  for (const m of than.matchAll(/(--[a-z0-9-]+)\s*:/g)) ra.add(m[1]!);
  return ra;
}

/**
 * Biến khai trong khối `@media (prefers-color-scheme: dark)`.
 *
 * Phải tách riêng khỏi "mọi khối @media": tệp này còn một khối `@media` nữa cho bậc `pos`, và
 * khối đó CỐ Ý đặt lại cỡ chữ với vùng chạm mà không liên quan gì tới chủ đề. Gộp chúng lại là
 * so một danh sách với một danh sách khác loại.
 */
function bienTrongMediaToi(css: string): Set<string> {
  const ra = new Set<string>();
  const batDau = css.indexOf("@media (prefers-color-scheme: dark)");
  if (batDau < 0) return ra;
  let sau = 0;
  let i = css.indexOf("{", batDau);
  const dau = i;
  for (; i < css.length; i++) {
    if (css[i] === "{") sau++;
    else if (css[i] === "}" && --sau === 0) break;
  }
  for (const m of css.slice(dau, i).matchAll(/(--[a-z0-9-]+)\s*:/g)) ra.add(m[1]!);
  return ra;
}

/** `.ops-btn--sm` dùng làm SELECTOR, không tính chỗ nhắc tới nó trong ghi chú. */
function selectorOpsBtnSm(css: string): string[] {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/\.ops-btn--sm\s*[,{]/g)].map((m) => m[0]);
}

/** Biến khai ở `:root` TRẦN — không @media, không [data-theme]. */
function bienORootTran(css: string): Set<string> {
  const ra = new Set<string>();
  for (const khoi of css.matchAll(/(^|\n):root\s*\{([\s\S]*?)\n\}/g)) {
    for (const m of khoi[2]!.matchAll(/(--[a-z0-9-]+)\s*:/g)) ra.add(m[1]!);
  }
  return ra;
}

describe("token của mặt vận hành", () => {
  /**
   * LỖI KINH ĐIỂN CỦA CHẾ ĐỘ TỐI, VÀ NÓ CHỈ HIỆN VỚI MỘT NHÓM NGƯỜI DÙNG.
   *
   * Trình duyệt báo BA trạng thái, không phải hai: chọn sáng, chọn tối, và — mặc định —
   * KHÔNG chọn gì, lúc đó chỉ `prefers-color-scheme` phân biệt.
   *
   * Một màu chỉ được khai bên trong `@media` hay `[data-theme]` thì ở trạng thái mặc định nó
   * KHÔNG tồn tại. Trang hiện chữ của chủ đề này trên nền của chủ đề kia — và chỉ hiện với người
   * để thiết lập mặc định, tức phần lớn người dùng, tức nhóm ít có khả năng đi báo lỗi nhất.
   *
   * Nên mọi biến phải có mặt ở `:root` trần trước đã; khối điều kiện chỉ ĐỊNH NGHĨA LẠI.
   */
  it("không màu nào chỉ tồn tại trong @media hoặc [data-theme]", () => {
    const css = tokens();
    const oRootTran = bienORootTran(css);
    const chiTrongDieuKien = [
      ...new Set([
        ...bienTheoKhoi(css).filter((b) => b.trongKhoiDieuKien).map((b) => b.ten),
        ...bienTrongDataTheme(css),
      ]),
    ].filter((ten) => !oRootTran.has(ten));

    expect(
      chiTrongDieuKien,
      "biến này không có ở `:root` trần — người để thiết lập mặc định sẽ không có nó",
    ).toEqual([]);
  });

  /**
   * Hai biến này được DÙNG 12 lần (operations.css 9, floor-map.css 3) nhưng trước đợt này không
   * được khai ở đâu trong repo. `var()` không có giá trị dự phòng và không tìm thấy biến thì khai
   * báo VÔ HIỆU: `background` rơi về `transparent`, `color` rơi về màu thừa kế.
   *
   * Một trong 12 chỗ đó là nền của chính thanh tab quầy. Nó "trông vẫn được" vì nền cha tình cờ
   * hợp mắt — đúng kiểu hỏng không ai thấy.
   */
  it("khai đủ những biến mà CSS khác đang dùng", () => {
    const khai = bienORootTran(tokens());

    for (const ten of ["--color-surface", "--color-text"]) {
      expect(khai.has(ten), `${ten} được dùng nhưng không khai — mọi khai báo dùng nó vô hiệu`)
        .toBe(true);
    }
  });

  it("chế độ tối định nghĩa lại cùng bộ biến ở cả hai đường", () => {
    const css = tokens();
    const quaMedia = bienTrongMediaToi(css);
    const quaDataTheme = bienTrongDataTheme(css);

    expect(quaMedia.size, "không đọc được khối @media chế độ tối").toBeGreaterThan(0);

    // Thiếu một biến ở một trong hai đường = nút chuyển chủ đề cho kết quả khác với hệ điều hành.
    const lech = [...quaMedia].filter((t) => !quaDataTheme.has(t))
      .concat([...quaDataTheme].filter((t) => !quaMedia.has(t)));

    expect(lech, "hai đường vào chế độ tối phải đặt cùng một bộ biến").toEqual([]);
  });
});

describe("vùng chạm", () => {
  /**
   * Quầy CÓ màn cảm ứng, bếp dùng tablet — đã xác nhận, ghi ở §1.2 của đặc tả. Nên 44px là ngưỡng
   * dùng-được, không phải ngưỡng cho đẹp.
   *
   * `.ops-btn--sm` cao ~26px và được dùng 65 lần (28 trong `pages/`, 37 trong `components/`).
   * Phép kiểm canh cả hai đầu: quy tắc CSS không được quay lại, và không tệp nào được dùng lại
   * tên lớp đó.
   */
  it("không còn lớp ops-btn--sm trong CSS", () => {
    // Bắt SELECTOR, không bắt chuỗi: `ops-tokens.css` cố ý nhắc tên lớp này trong ghi chú giải
    // thích vì sao nó bị xoá, và ghi chú đó đáng giữ.
    expect(
      selectorOpsBtnSm(operations()),
      "`.ops-btn--sm` quay lại — 26px dưới ngón tay là bấm nhầm có hệ thống",
    ).toEqual([]);
    expect(selectorOpsBtnSm(tokens())).toEqual([]);
  });

  it("không tệp nguồn nào còn dùng ops-btn--sm", () => {
    const goc = fileURLToPath(srcRoot);
    const pham: string[] = [];
    const quet = (thuMuc: string) => {
      for (const muc of readdirSync(thuMuc)) {
        const duong = join(thuMuc, muc);
        if (statSync(duong).isDirectory()) quet(duong);
        // Bỏ qua chính các tệp kiểm: chúng phải nhắc tên lớp này để canh nó, và một phép kiểm tự
        // bắt mình thì không bao giờ xanh được.
        else if (/\.tsx?$/.test(muc) && !/\.test\.tsx?$/.test(muc)
          && readFileSync(duong, "utf8").includes("ops-btn--sm")) {
          pham.push(duong.slice(goc.length).replace(/\\/g, "/"));
        }
      }
    };
    quet(goc);

    expect(pham, "dùng lại `ops-btn--sm`; cỡ nút chuẩn là `.ops-btn` (44px)").toEqual([]);
  });

  it("nút và ô nhập đều có sàn 44px", () => {
    const css = tokens();

    expect(css).toMatch(/--ops-touch:\s*44px/);
    expect(css).toMatch(/--ops-touch-lg:\s*56px/);
    // Sàn phải áp qua `min-height`, không phải qua `padding` — padding cộng với cỡ chữ thì cao
    // bao nhiêu là tuỳ chữ, và chữ thì người dùng chỉnh được.
    expect(css, "sàn vùng chạm phải là min-height, không phải padding").toMatch(
      /min-height:\s*var\(--ops-touch\)/,
    );
  });
});

describe("thang chữ", () => {
  it("đúng 6 bậc, không hơn", () => {
    const bac = [...tokens().matchAll(/--ops-text-([a-z0-9]+):/g)].map((m) => m[1]!);

    expect([...new Set(bac)].sort()).toEqual(["2xl", "base", "lg", "sm", "xl", "xs"]);
  });

  /**
   * `rem` chứ không `px`: người trực ca chỉnh cỡ chữ hệ thống thì giao diện phải theo. `px` bỏ qua
   * thiết lập đó, và đây là màn hình người ta nhìn cả ca.
   */
  it("thang chữ dùng rem, không dùng px", () => {
    const px = [...tokens().matchAll(/--ops-text-[a-z0-9]+:\s*([^;]+);/g)]
      .map((m) => m[1]!.trim())
      .filter((v) => v.endsWith("px"));

    expect(px, "cỡ chữ khai bằng px thì bỏ qua cỡ chữ hệ thống của người dùng").toEqual([]);
  });

  it("sàn là 13px, không nhỏ hơn", () => {
    const xs = /--ops-text-xs:\s*([0-9.]+)rem/.exec(tokens());

    expect(xs, "không đọc được --ops-text-xs").not.toBeNull();
    expect(Number(xs![1]) * 16).toBeGreaterThanOrEqual(13);
  });
});

describe("nối vào operations.css", () => {
  /**
   * Một tệp token không ai nạp là mã chết, và repo này có cổng chặn mã chết. `@import` còn phải
   * đứng ĐẦU tệp — CSS bỏ qua `@import` nằm sau bất kỳ quy tắc nào, im lặng.
   */
  it("operations.css nạp ops-tokens.css ở đầu tệp", () => {
    const css = operations();
    const viTri = css.indexOf('@import "./ops-tokens.css"');

    expect(viTri, "operations.css không nạp ops-tokens.css").toBeGreaterThan(-1);

    // Neo vào DÒNG, không vào ký tự: `@import` phải là dòng lệnh đầu tiên của tệp sau khi bỏ ghi
    // chú và dòng trống. Bản đầu chỉ kiểm "phía trước không có quy tắc nào" — quá lỏng, vì
    // `@import` đứng sau một `@charset` hay một `@import` khác vẫn lọt, mà thứ tự đó thì đổi
    // được kết quả.
    const dongLenh = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(/\r?\n/)
      .map((d) => d.trim())
      .filter((d) => d !== "");

    expect(
      dongLenh[0],
      "`@import` phải là dòng lệnh ĐẦU TIÊN — CSS bỏ qua `@import` nằm sau bất kỳ quy tắc nào, "
        + "và bỏ qua trong im lặng",
    ).toBe('@import "./ops-tokens.css";');
  });
});
