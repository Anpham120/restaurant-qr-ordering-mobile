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
   * Đã xảy ra ở PR #190 — một bản nâng VÁ (7.3.0 -> 7.3.1) làm đỏ `frontend-build`.
   *
   * `frontend-build` đã bắt được lần đó, nên phép kiểm này không thêm một lưới an toàn mới. Nó
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

describe("dependabot.yml", () => {
  /**
   * Phép kiểm trên bắt HẬU QUẢ. Cái này canh NGUYÊN NHÂN: nếu nhóm bị gỡ, Dependabot lại nâng lẻ
   * từng gói và lỗi trên quay lại ở PR kế tiếp.
   */
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
