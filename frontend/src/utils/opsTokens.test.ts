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
   * KHỐI ĐIỀU KIỆN CHỈ ĐƯỢC ĐỊNH NGHĨA LẠI, KHÔNG ĐƯỢC LÀ NƠI KHAI DUY NHẤT.
   *
   * Chế độ tối đã bị gỡ bỏ, nên đường điều kiện duy nhất còn lại trong tệp này là khối `@media`
   * của bậc POS. Luật thì không đổi vì nó không nói về chủ đề, nó nói về điểm ngắt.
   *
   * Một biến chỉ được khai bên trong `@media` thì ở ngoài điểm ngắt đó nó KHÔNG tồn tại, và mọi
   * chỗ `var()` của nó im lặng rơi về giá trị dự phòng — hoặc về không có gì. Hỏng kiểu này không
   * báo lỗi ở đâu cả; nó chỉ hiện ra thành một màn hình trông sai, trên đúng nhóm máy không ai
   * ngồi thử.
   *
   * Nên mọi biến phải có mặt ở `:root` trần trước đã; khối điều kiện chỉ ĐỊNH NGHĨA LẠI.
   */
  it("không màu nào chỉ tồn tại trong khối @media", () => {
    const css = tokens();
    const oRootTran = bienORootTran(css);
    const chiTrongDieuKien = [
      ...new Set([
        ...bienTheoKhoi(css).filter((b) => b.trongKhoiDieuKien).map((b) => b.ten),
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

  /**
   * KHÔNG CÒN CHẾ ĐỘ TỐI — VÀ CỔNG NÀY QUÉT CẢ KHO, KHÔNG CHỈ TỆP NÓ NHỚ.
   *
   * Chế độ tối đã được thử và bị gỡ bỏ có chủ đích. Lý do không phải "làm chưa xong" mà là ĐO
   * ĐƯỢC: năm mặt nền cách nhau 1.02–1.12:1 (mắt người không phân biệt nổi, nên ranh giới thẻ
   * nhoè thành một mảng), chữ chính 14.1:1 gây halation, và mười sắc trạng thái bão hoà trung
   * bình 72% với sáu cặp cách nhau dưới 30° — tức chúng không mã hoá nổi ý nghĩa khác nhau, chỉ
   * thêm nhiễu. Người vận hành báo mỏi mắt hơn cả khi không có chế độ tối.
   *
   * Bài học về PHẠM VI, đã trả giá ba lần trong kho này: cổng cũ chỉ quét `ops-tokens.css`, nên
   * khi khối tối mọc sang `operations.css`, `floor-map.css` và `counter-hub.css` thì nó không
   * thấy gì. Cổng chỉ quét chỗ người viết nhớ tới thì nó canh trí nhớ, không canh luật.
   *
   * Nên cổng này quét MỌI tệp css/ts/tsx của frontend. Muốn dựng lại chế độ tối thì xoá phép
   * kiểm này một cách công khai, kèm bảng màu đã đo — đừng để nó bò về từng khối một.
   */
  it("không còn chế độ tối ở bất cứ đâu trong frontend", () => {
    const goc = fileURLToPath(new URL("../../", import.meta.url));
    const boQua = new Set(["node_modules", "dist", "build", ".vite", "coverage"]);
    const pham: string[] = [];

    const quet = (thuMuc: string) => {
      for (const ten of readdirSync(thuMuc)) {
        if (boQua.has(ten)) continue;
        const duong = join(thuMuc, ten);
        if (statSync(duong).isDirectory()) { quet(duong); continue; }
        if (!/\.(css|ts|tsx)$/.test(ten)) continue;
        if (duong.endsWith("opsTokens.test.ts")) continue; // tệp này nhắc tên trong ghi chú
        const noiDung = readFileSync(duong, "utf8");
        for (const [i, dong] of noiDung.split(/\r?\n/).entries()) {
          if (/prefers-color-scheme|data-theme/.test(dong)) {
            pham.push(`${duong.slice(goc.length).split(String.fromCharCode(92)).join("/")}:${i + 1}  ${dong.trim()}`);
          }
        }
      }
    };
    quet(goc);

    expect(pham, "chế độ tối đã bị gỡ bỏ có chủ đích — xem ghi chú ngay trên").toEqual([]);
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
