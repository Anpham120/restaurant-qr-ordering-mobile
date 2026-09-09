import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));

function read(relativePath: string): string {
  return readFileSync(`${root}/${relativePath}`, "utf8");
}

/**
 * Thay ghi chú CSS bằng khoảng trắng, GIỮ NGUYÊN số dòng để báo lỗi còn trỏ đúng chỗ.
 *
 * Bản đầu của cổng bên dưới quét thẳng vào nội dung thô, và nó khớp đúng chuỗi `top: 56px` nằm
 * trong ghi chú giải thích vì sao 56px là sai. Một cổng báo nhầm thì người ta học cách lờ nó đi,
 * và tới lúc nó báo đúng cũng không ai nhìn.
 */
function boGhiChu(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (khoi) => khoi.replace(/[^\n]/g, " "));
}

/** Mọi khối `selector { … }` lá (không chứa khối con), kèm số dòng của selector. */
function khoiLuat(css: string): { selector: string; than: string; dong: number }[] {
  const ra: { selector: string; than: string; dong: number }[] = [];
  let dauCau = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === ";" || c === "}") { dauCau = i + 1; continue; }
    if (c !== "{") continue;
    const selector = css.slice(dauCau, i);
    let sau = 1;
    let k = i + 1;
    while (k < css.length && sau > 0) {
      if (css[k] === "{") sau++;
      else if (css[k] === "}") sau--;
      k++;
    }
    const than = css.slice(i + 1, k - 1);
    // Khối chứa khối con (`@media`) không phải luật — đi tiếp vào trong nó.
    if (!than.includes("{")) {
      ra.push({ selector, than, dong: css.slice(0, dauCau).split("\n").length });
      dauCau = k;
      i = k - 1;
    } else {
      dauCau = i + 1;
    }
  }
  return ra;
}

describe("hub layout audit (no sticky tab scroll gap)", () => {
  it("OpsHubShell keeps hub tabs non-sticky", () => {
    const shell = read("components/operations/OpsHubShell.tsx");
    expect(shell).toContain("const stickyTabs = false");
    expect(shell).not.toMatch(/stickyTabs\s*=\s*true/);
  });

/**
   * SỐ px GÕ TAY LÀM `top` CỦA MỘT PHẦN TỬ STICKY LÀ MỘT LỜI KHẲNG ĐỊNH KHÔNG AI KIỂM.
   *
   * Nó nói "phía trên tôi có đúng chừng này px thứ gì đó đục". Không có gì bắt lời đó đúng, và ở
   * kho này nó đã SAI hai lần, cùng một con số `56px`:
   *
   *   1. `.ops-hub-tabs--sticky` — đã chặn bằng `const stickyTabs = false` ở ngay trên.
   *   2. `.amm-menu-controls` của trang thực đơn — cổng trên không với tới, nên lỗi mọc lại.
   *
   * Vì sao `56px` không thể đúng: ở >800px thanh trên cùng là `display: none`, tức phía trên KHÔNG
   * có gì — 56px đó là một dải trong suốt, và thẻ món trôi xuyên qua nó khi cuộn. Ở ≤800px thanh
   * thật cao 68px, nên vẫn hụt 12px. Một hằng số không thể đúng ở cả hai chế độ.
   *
   * Luật: `top` phải là `0` hoặc lấy từ `--cmc-topbar-h` — biến mà chính `.cmc-mobile-topbar` bị
   * ép nhận làm chiều cao, nên nó không thể lệch khỏi thực tế.
   *
   * Cổng quét MỌI css của mặt vận hành, không riêng tệp đã hỏng. Đó là khác biệt giữa canh một lớp
   * lỗi và canh trí nhớ người viết.
   */
  it("không sticky nào trên mặt vận hành dùng offset gõ tay", () => {
    const thuMuc = ["components/operations", "components/admin", "components/kitchen",
                    "pages/admin", "pages/counter", "pages/kitchen"];
    const pham: string[] = [];

    for (const d of thuMuc) {
      const duong = `${root}/${d}`;
      if (!existsSync(duong)) continue;
      for (const ten of readdirSync(duong).filter((f) => f.endsWith(".css"))) {
        // Bỏ ghi chú TRƯỚC khi quét. Bản đầu của cổng này khớp đúng chuỗi "top: 56px" nằm
        // trong ghi chú giải thích vì sao 56px là sai — một cổng báo nhầm thì người ta học
        // cách lờ nó, và lúc nó báo đúng cũng không ai nhìn.
        const css = boGhiChu(readFileSync(`${duong}/${ten}`, "utf8"));
        for (const { selector, than, dong } of khoiLuat(css)) {
          // Xét cả khối KHÔNG khai `position: sticky` nhưng selector đã mang tên sticky: một khối
          // `@media` chỉ đặt lại `top` cho lớp sticky khai ở nơi khác cũng nguy hiểm y hệt, mà nó
          // không có chữ `sticky` nào trong thân. Bản đầu của cổng neo vào `position: sticky` nên
          // đã bỏ lọt đúng một khối như vậy — `top: 52px` dưới `@media (max-width: 768px)`.
          const laSticky = /position:\s*sticky/.test(than) || /sticky/.test(selector);
          if (!laSticky) continue;
          const m = /(?:^|[;{\s])top:\s*([^;}]+)/.exec(than);
          if (!m) continue;
          const gt = m[1]!.trim();
          if (gt === "0" || gt === "0px" || gt.includes("--cmc-topbar-h")) continue;
          pham.push(`${d}/${ten}:${dong}  ${selector.trim()} { top: ${gt} }`);
        }
      }
    }

    expect(pham, "dùng `top: 0` hoặc `top: var(--cmc-topbar-h, 0px)`").toEqual([]);
  });

  /** Biến chỉ đúng nếu chính thanh trên cùng bị ép nhận nó làm chiều cao. */
  it("thanh trên cùng ép chiều cao bằng đúng biến đó", () => {
    const css = readFileSync(`${root}/../packages/shared-ui/src/styles.css`, "utf8");
    const tokens = readFileSync(`${root}/../packages/shared-ui/src/tokens.css`, "utf8");

    expect(tokens, "`--cmc-topbar-h` phải có ở `:root` trần, mặc định 0").toMatch(
      /--cmc-topbar-h:\s*0px/,
    );
    expect(css, "`.cmc-mobile-topbar` không ép chiều cao — biến sẽ trôi khỏi thực tế").toMatch(
      /\.cmc-mobile-topbar\{[^}]*height:\s*var\(--cmc-topbar-h\)/,
    );
    expect(css, "khối ≤800px phải đặt biến, nếu không thanh lọc dính đè lên thanh trên").toMatch(
      /@media\(max-width:800px\)\{:root\{--cmc-topbar-h:\s*\d+px\}/,
    );
  });

  it("ordering uses one sticky chrome instead of stacked sticky header + nav", () => {
    const layout = read("ordering/OrderingLayout.tsx");
    const css = read("ordering/ordering-layout.css");
    expect(layout).toContain("ordering-chrome");
    expect(css).toContain(".ordering-chrome");
    expect(css).not.toMatch(/\.ordering-nav[\s\S]{0,120}position:\s*sticky/);
    expect(css).not.toMatch(/\.ordering-header[\s\S]{0,120}position:\s*sticky/);
  });

  const hubPages = [
    "pages/admin/OrdersHubPage.tsx",
    "pages/admin/TableHubPage.tsx",
    "pages/admin/MenuHubPage.tsx",
    "pages/counter/CounterHubPage.tsx",
  ];

  it.each(hubPages)("hub page %s does not opt into sticky hub tabs", (pagePath) => {
    const source = read(pagePath);
    expect(source).not.toContain("stickyTabs={true}");
  });

  it("orders hub sends admin table deep links to the scoped table orders page", () => {
    const ordersHub = read("pages/admin/OrdersHubPage.tsx");
    expect(ordersHub).toContain("buildTableOrdersLink(tableFromQuery)");
    const toastRouting = read("components/operations/opsToastRouting.ts");
    expect(toastRouting).toContain("buildTableOrdersLink(tableCode)");
    const toast = read("components/operations/OpsToastProvider.tsx");
    expect(toast).toContain("buildOrderCreatedToastHref");
  });
});
