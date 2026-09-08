import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const frontendRoot = new URL("../../../", import.meta.url);
const doc = (p: string) => readFileSync(fileURLToPath(new URL(p, frontendRoot)), "utf8");

const css = () => doc("src/components/operations/operations.css");
const tabs = () => doc("src/components/operations/OpsHubTabs.tsx");
const hub = () => doc("src/pages/counter/CounterHubPage.tsx");
const numpad = () => doc("src/components/operations/PosNumpad.tsx");

/** Thân của một quy tắc CSS, cân bằng ngoặc. */
function quyTac(ten: string, nguon = css()): string {
  const i = nguon.search(new RegExp(`^\\${ten}\\s*,?[^{]*\\{`, "m"));
  if (i < 0) return "";
  const dau = nguon.indexOf("{", i);
  return nguon.slice(dau, nguon.indexOf("}", dau));
}

/** Đợt 4 của `docs/DAC_TA_THIET_KE_VAN_HANH.md`. Câu hỏi: BÀN NÀO CẦN TÔI NGAY BÂY GIỜ? */
describe("quầy thu ngân", () => {
  /**
   * Sáu panel dựng sẵn rồi ẩn — quyết định đó đúng và được giữ. Nhưng nó có hệ quả: việc nằm trong
   * tab KHÔNG mở là việc không ai thấy. Con số trên nhãn tab là cách duy nhất biết được mà không
   * phải bấm qua từng tab.
   */
  it("nhãn tab hiện được số việc đang chờ", () => {
    expect(tabs(), "OpsHubTab thiếu trường badge").toMatch(/badge\?:\s*number/);
    expect(tabs()).toContain("ops-hub-tab-badge");
  });

  /** Số 0 hiển thị ra là nhiễu: nó chiếm chỗ và bắt mắt dừng lại để đọc một tin "không có gì". */
  it("không hiện huy hiệu khi không có việc", () => {
    expect(tabs(), "phải kiểm > 0 trước khi vẽ huy hiệu").toMatch(/tab\.badge\s*&&\s*tab\.badge\s*>\s*0/);
  });

  it("quầy nối số liệu vào tab từ dữ liệu đã có sẵn", () => {
    const tsx = hub();

    expect(tsx).toContain("useOpsNavBadges");
    expect(tsx, "tab gọi nhân viên phải đếm theo recentAssistance").toMatch(
      /assistance".*badge:\s*recentAssistance\.length/s,
    );
  });

  /**
   * TIỀN THỐI VÀ TIỀN THIẾU PHẢI CÙNG CỠ.
   *
   * Trước đợt này `.ops-cash-change` đặt 1.05rem còn `.ops-cash-short` không đặt gì nên thừa kế cỡ
   * nhỏ hơn. Hai dòng đó là hai kết quả của CÙNG một ô nhập, và cái khẩn hơn — khách đưa THIẾU —
   * lại là cái nhỏ hơn. Người thu ngân liếc qua thấy chữ nhỏ thì dễ hiểu nhầm là đã xong.
   */
  it("tiền thối và tiền thiếu cùng cỡ chữ", () => {
    const c = css();
    const chung = c.match(/\.ops-cash-change,\s*\r?\n\.ops-cash-short\s*\{([^}]*)\}/);

    expect(chung, "hai lớp phải khai chung một cỡ chữ, không tách rời").not.toBeNull();
    expect(chung![1]).toMatch(/font-size:\s*var\(--ops-text-xl\)/);
  });

  it("tổng tiền là con số lớn nhất màn hình", () => {
    expect(quyTac(".pos-amount")).toMatch(/font-size:\s*var\(--ops-text-2xl\)/);
  });

  /**
   * `<summary>` là vùng bấm được nên nó theo sàn chạm như mọi vùng bấm khác. Trước đợt này là 32px
   * — dưới ngưỡng, trên một màn hình CÓ cảm ứng.
   */
  it("mọi vùng bấm ở quầy đạt sàn chạm", () => {
    const c = css();

    expect(quyTac(".pos-items > summary", c)).toMatch(/min-height:\s*var\(--ops-touch\)/);
    expect(quyTac(".ops-bottom-nav-link", c)).toMatch(/min-height:\s*var\(--ops-touch\)/);
    expect(quyTac(".pos-cash input", c)).toMatch(/min-height:\s*var\(--ops-touch-lg\)/);
  });

  /** Mờ nền dưới một thanh điều hướng làm chữ phía sau lấp ló qua. Đây là chỗ bấm, không phải chỗ ngắm. */
  it("thanh điều hướng dưới không dùng blur", () => {
    expect(quyTac(".ops-bottom-nav"), "`backdrop-filter` quay lại thanh điều hướng")
      .not.toMatch(/backdrop-filter/);
  });

  /**
   * Bàn phím số ẩn/hiện bằng CSS chứ không bằng JS: đo bề ngang trong JS cần một `resize` listener
   * và một giá trị đoán trước khi trang gắn vào DOM — hai chỗ để lệch với CSS.
   */
  it("bàn phím số chỉ hiện ở bậc pos, và quyết định đó nằm trong CSS", () => {
    const c = css();

    expect(quyTac(".pos-numpad", c), "mặc định phải ẩn").toMatch(/display:\s*none/);
    expect(c).toMatch(
      /@media \(min-width: 768px\) and \(max-width: 1279px\)[\s\S]*?\.pos-numpad\s*\{[^}]*display:\s*grid/,
    );
    // Bỏ ghi chú trước khi soi: bản đầu của phép kiểm này bắt trúng chữ "resize" nằm trong chính
    // đoạn ghi chú GIẢI THÍCH vì sao không dùng `resize`. Một phép kiểm đọc cả ghi chú thì nó
    // đang canh cách người ta viết chữ, không phải cách mã chạy.
    const maChay = numpad().replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(maChay, "không được đo bề ngang trong JS").not.toMatch(
      /window\.(innerWidth|matchMedia)|addEventListener\(["']resize/,
    );
  });

  /** Mất tiêu điểm thì con trỏ nhảy và người dùng không gõ tiếp bằng bàn phím vật lý được. */
  it("bấm phím không làm ô nhập mất tiêu điểm", () => {
    expect(numpad()).toMatch(/onMouseDown=\{\(e\) => e\.preventDefault\(\)\}/);
  });
});
