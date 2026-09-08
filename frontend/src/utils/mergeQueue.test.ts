import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../../", import.meta.url);
const wf = (ten: string) =>
  readFileSync(fileURLToPath(new URL(`.github/workflows/${ten}`, repoRoot)), "utf8");

/**
 * Workflow nào sinh ra phép kiểm BẮT BUỘC của `develop`/`main`.
 *
 * Danh sách này chép tay vì danh sách check bắt buộc là cấu hình trên GitHub, không nằm trong repo
 * — không có tệp nào để đọc ra. Nên nó phải được cập nhật khi danh sách kia đổi, và ghi rõ ở đây
 * để người sửa biết hai chỗ này đi đôi.
 */
const WORKFLOW_SINH_CHECK_BAT_BUOC: Record<string, string[]> = {
  "ci.yml": ["frontend-build", "menu-data", "realtime-e2e", "docker-compose-config"],
  "ci-java.yml": ["backend-java-build"],
  "ci-mobile.yml": ["mobile-rn-build"],
  "security.yml": ["codeql", "secret-scan", "trivy-filesystem"],
  "dependency-review.yml": ["dependency-review"],
};

/** Khối `on:` — từ dòng `on:` tới khoá cấp cao nhất kế tiếp. */
function khoiOn(noiDung: string): string {
  const dong = noiDung.split(/\r?\n/);
  const batDau = dong.findIndex((d) => /^on:/.test(d));
  if (batDau < 0) return "";
  const conLai = dong.slice(batDau + 1);
  const ketThuc = conLai.findIndex((d) => /^[a-zA-Z]/.test(d));
  return conLai.slice(0, ketThuc < 0 ? undefined : ketThuc).join("\n");
}

describe("hàng đợi merge", () => {
  /**
   * HỎNG THEO KIỂU IM LẶNG, NÊN PHẢI CÓ PHÉP KIỂM.
   *
   * Hàng đợi dựng một nhánh tạm `gh-readonly-queue/<đích>/...` gồm base mới nhất cộng các PR đứng
   * trước, rồi ĐỢI đúng những phép kiểm bắt buộc báo về trên nhánh đó.
   *
   * Một workflow thiếu `merge_group:` thì không chạy ở đấy. Phép kiểm nó sinh ra không bao giờ báo,
   * và GitHub coi "chưa báo" là "chưa xong" chứ không phải "bỏ qua" — mục xếp hàng bị đá ra sau khi
   * hết giờ chờ. Không job nào đỏ, không log nào để đọc: PR chỉ đơn giản là không merge.
   *
   * Đúng lớp lỗi mà repo này đã gặp hai lần trong một ngày — chốt migration grep đường dẫn không
   * tồn tại, và `allow_auto_merge` tắt khiến workflow bất động mà vẫn báo SUCCESS. Cả hai đều là
   * thứ chạy đúng, không tìm thấy gì, và không nói gì.
   */
  it("mọi workflow sinh check bắt buộc đều chạy trong hàng đợi", () => {
    const thieu = Object.keys(WORKFLOW_SINH_CHECK_BAT_BUOC).filter(
      (ten) => !/^\s*merge_group:/m.test(khoiOn(wf(ten))),
    );

    expect(
      thieu,
      "thiếu `merge_group:` — phép kiểm bắt buộc của workflow này sẽ không bao giờ báo về "
        + "trên nhánh hàng đợi, và mục xếp hàng bị đá ra trong im lặng",
    ).toEqual([]);
  });

  it("vẫn chạy trên pull request", () => {
    const thieu = Object.keys(WORKFLOW_SINH_CHECK_BAT_BUOC).filter(
      (ten) => !/^\s*pull_request:/m.test(khoiOn(wf(ten))),
    );

    expect(thieu, "check bắt buộc phải báo trên PR nữa, không chỉ trong hàng đợi").toEqual([]);
  });

  it("thật sự đọc được khối `on:`", () => {
    for (const ten of Object.keys(WORKFLOW_SINH_CHECK_BAT_BUOC)) {
      expect(khoiOn(wf(ten)), `không đọc được khối on: của ${ten}`).not.toBe("");
    }
  });

  /**
   * `dependency-review-action` suy ra base/head từ PR. Trong hàng đợi không có PR, nên nó phải được
   * truyền tay `merge_group.base_sha`/`head_sha` — thiếu thì bước đỏ, và một check bắt buộc đỏ
   * trong hàng đợi chặn mọi thứ phía sau.
   */
  it("dependency-review được truyền base/head trong hàng đợi", () => {
    const noiDung = wf("dependency-review.yml");

    expect(noiDung, "thiếu base-ref cho merge_group").toContain(
      "base-ref: ${{ github.event.merge_group.base_sha }}",
    );
    expect(noiDung, "thiếu head-ref cho merge_group").toContain(
      "head-ref: ${{ github.event.merge_group.head_sha }}",
    );
    expect(
      noiDung,
      "trong hàng đợi không có PR để bình luận — phải tắt comment-summary-in-pr",
    ).toContain("comment-summary-in-pr: never");
  });
});
