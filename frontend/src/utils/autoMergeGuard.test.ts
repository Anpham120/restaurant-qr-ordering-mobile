import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../../", import.meta.url);
const workflowPath = fileURLToPath(new URL(".github/workflows/auto-merge.yml", repoRoot));

/**
 * Chốt chặn migration trong `auto-merge.yml` nhận diện PR nguy hiểm bằng ĐÚNG MỘT chuỗi: đường dẫn
 * thư mục migration. Chuỗi đó là một hằng số chép tay, không phải một tham chiếu — nên khi thư mục
 * đổi chỗ, chốt không hỏng ồn ào, nó chỉ ngừng khớp và im lặng cho mọi thứ đi qua.
 *
 * Đã xảy ra: chốt grep `Data/Migrations/` của codebase .NET cũ rất lâu sau khi dự án chuyển sang
 * Flyway ở `backend-java/src/main/resources/db/migration/`. Không phép kiểm nào đỏ, vì workflow vẫn
 * chạy đúng — nó chỉ không tìm thấy gì. Lỗi còn ẩn thêm một lớp nữa vì `allow_auto_merge` của repo
 * đang tắt, khiến cả job bất động mà vẫn báo SUCCESS.
 *
 * Nên phép kiểm này không đọc mã, nó đối chiếu chuỗi trong workflow với ĐĨA. Đó là thứ duy nhất
 * phát hiện được một hằng số đã lạc khỏi thứ nó trỏ tới.
 */
function migrationGlobsInWorkflow(): string[] {
  const workflow = readFileSync(workflowPath, "utf8");
  return [...workflow.matchAll(/grep -q(?:\s+)'([^']+)'/g)].map((m) => m[1]!);
}

describe("chốt chặn migration của auto-merge", () => {
  it("grep đúng thư mục migration đang tồn tại trên đĩa", () => {
    const globs = migrationGlobsInWorkflow();

    expect(globs.length, "không tìm thấy dòng `grep -q` nào trong auto-merge.yml").toBeGreaterThan(0);
    for (const glob of globs) {
      expect(
        existsSync(fileURLToPath(new URL(`backend-java/src/main/resources/${glob}`, repoRoot))),
        `auto-merge.yml grep '${glob}' nhưng không có thư mục nào khớp — chốt migration đã chết`,
      ).toBe(true);
    }
  });

  /**
   * Hướng còn lại: chốt phải nhìn thấy migration THẬT. Phép kiểm trên chứng minh chuỗi trỏ tới một
   * thư mục có thật; phép kiểm này chứng minh đường dẫn đầy đủ mà `gh pr diff --name-only` in ra
   * thực sự khớp chuỗi đó. Hai việc khác nhau: một chuỗi đúng thư mục vẫn có thể sai tiền tố.
   */
  it("khớp đường dẫn đầy đủ mà `gh pr diff --name-only` sinh ra", () => {
    const duongDanThat = "backend-java/src/main/resources/db/migration/V32__promotion_usage_limit.sql";

    expect(
      existsSync(fileURLToPath(new URL(duongDanThat, repoRoot))),
      "migration mẫu đã bị đổi tên — cập nhật phép kiểm cho khớp",
    ).toBe(true);
    for (const glob of migrationGlobsInWorkflow()) {
      expect(duongDanThat.includes(glob), `'${duongDanThat}' không chứa '${glob}'`).toBe(true);
    }
  });
});
