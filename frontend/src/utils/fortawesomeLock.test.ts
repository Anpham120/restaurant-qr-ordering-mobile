import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const frontendRoot = new URL("../../", import.meta.url);
const doc = (p: string) => readFileSync(fileURLToPath(new URL(p, frontendRoot)), "utf8");

/** Mọi phiên bản mà lockfile giải ra cho từng gói `@fortawesome/*`. */
function phienBanTheoGoi(): Map<string, Set<string>> {
  const lock = JSON.parse(doc("package-lock.json")) as {
    packages?: Record<string, { version?: string }>;
  };
  const ra = new Map<string, Set<string>>();
  for (const [duongDan, muc] of Object.entries(lock.packages ?? {})) {
    const i = duongDan.lastIndexOf("node_modules/");
    if (i < 0 || !muc.version) continue;
    const ten = duongDan.slice(i + "node_modules/".length);
    if (!ten.startsWith("@fortawesome/")) continue;
    if (!ra.has(ten)) ra.set(ten, new Set());
    ra.get(ten)!.add(muc.version);
  }
  return ra;
}

describe("họ gói @fortawesome trong package-lock.json", () => {
  /**
   * `@fortawesome/free-brands-svg-icons` ghim CỨNG `@fortawesome/fontawesome-common-types` đúng
   * một phiên bản. Nâng lẻ nó thì npm cài thêm một bản LỒNG bên trong, còn `react-fontawesome`
   * vẫn giữ bản cũ ở cấp trên. Hai bản cùng lúc = hai kiểu `IconName` khác nhau, và `tsc` từ chối:
   *
   *     CustomerHomePage.tsx(592,30): error TS2322:
   *     Type 'IconDefinition' is not assignable to type 'IconProp'.
   *       Type '"cricket-bat"' is not assignable to type 'IconName'.
   *
   * Đã xảy ra HAI LẦN với cùng một bản nâng vá (7.3.0 -> 7.3.1): PR #190 nâng lẻ, rồi PR #199
   * nâng theo nhóm — và #199 đỏ y hệt #190.
   *
   * Vì sao gom nhóm KHÔNG đủ, và đây là phần đáng nhớ: gói ghim `fontawesome-common-types` ở cấp
   * trên là `fontawesome-svg-core`, mà gói đó KHÔNG phải phụ thuộc trực tiếp — nó được npm cài tự
   * động vì là peer của `react-fontawesome`. Dependabot chỉ nâng phụ thuộc trực tiếp, nên nhóm
   * `fortawesome` chỉ có đúng MỘT thành viên để gom, và cái phải đi cùng thì nằm ngoài tầm với.
   *
   * Nên `fontawesome-svg-core` được khai báo trực tiếp trong package.json dù mã không import nó.
   * Nó vốn đã bị cài rồi (peer bắt buộc); khai ra chỉ đưa nó vào tầm quản của Dependabot để nhóm
   * có cái để gom.
   *
   * `frontend-build` đã bắt được cả hai lần, nên phép kiểm này không thêm một lưới an toàn mới. Nó
   * đổi chỗ lỗi hiện ra: một dòng nói thẳng "hai bản của cùng một gói", thay vì một lỗi TS2322 về
   * `'cricket-bat'` mà người đọc phải lần ngược mới hiểu là chuyện phiên bản.
   */
  it("mỗi gói chỉ giải ra đúng một phiên bản", () => {
    const trung = [...phienBanTheoGoi()]
      .filter(([, phienBan]) => phienBan.size > 1)
      .map(([ten, phienBan]) => `${ten}: ${[...phienBan].sort().join(", ")}`);

    expect(
      trung,
      "hai bản của cùng một gói @fortawesome — nâng cả họ trong một PR (xem nhóm `fortawesome` trong dependabot.yml)",
    ).toEqual([]);
  });

  it("thật sự đọc được lockfile", () => {
    expect(phienBanTheoGoi().size).toBeGreaterThan(0);
  });
});

describe("nguyên nhân, không phải hậu quả", () => {
  /**
   * Phép kiểm trên bắt HẬU QUẢ (lockfile đã hỏng). Hai cái dưới canh hai điều kiện phải đồng thời
   * đúng thì hậu quả đó mới không xảy ra — gỡ một trong hai là lỗi quay lại ở PR Dependabot kế tiếp.
   */
  it("khai `fontawesome-svg-core` trực tiếp để Dependabot nâng nó cùng nhóm", () => {
    const pkg = JSON.parse(doc("package.json")) as { dependencies?: Record<string, string> };

    expect(
      pkg.dependencies?.["@fortawesome/fontawesome-svg-core"],
      "mã không import gói này, nhưng nó ghim `fontawesome-common-types` ở cấp trên. Bỏ khai báo "
        + "là nó rơi lại thành peer tự cài, Dependabot hết thấy, và nhóm `fortawesome` lại chỉ còn "
        + "một thành viên — đúng trạng thái đã làm đỏ #190 và #199",
    ).toBeDefined();
  });

  it("gom @fortawesome thành một nhóm", () => {
    const config = readFileSync(
      fileURLToPath(new URL("../.github/dependabot.yml", frontendRoot)),
      "utf8",
    );

    expect(config, "mất nhóm `fortawesome` — Dependabot sẽ lại nâng lẻ từng gói").toContain(
      '"@fortawesome/*"',
    );
  });
});
