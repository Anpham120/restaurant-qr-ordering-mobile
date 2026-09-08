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

/**
 * Mọi dòng nằm trong một khối `run: |` của workflow, tức mọi dòng bash thật sự chạy.
 */
function dongBashTrongWorkflow(): string[] {
  const dong = readFileSync(workflowPath, "utf8").split("\n");
  const ra: string[] = [];
  let thut = -1;
  for (const d of dong) {
    if (/^\s*run: \|/.test(d)) {
      thut = d.search(/\S/);
      continue;
    }
    if (thut < 0) continue;
    if (d.trim() === "") continue;
    // Ra khỏi khối khi gặp một khoá YAML thụt bằng hoặc nông hơn chính `run:`.
    if (d.search(/\S/) <= thut && /^\s*[a-z-]+:/.test(d)) {
      thut = -1;
      continue;
    }
    ra.push(d);
  }
  return ra;
}

describe("bash trong auto-merge.yml", () => {
  /**
   * Dấu backtick trong chuỗi NHÁY KÉP là thay thế lệnh.
   *
   * Đã xảy ra ở nhánh "PR nhắm `main` từ nhánh X" — bash đi tìm một lệnh tên `main`, không thấy,
   * và chữ `main` BIẾN MẤT khỏi thông báo: người đọc log thấy "PR nhắm  từ nhánh 'x'". Không phải
   * lỗi gãy — exit code vẫn 0 — nên nó không bao giờ tự lộ ra. Nó chỉ làm thông báo sai đúng vào
   * lúc người ta đang đọc log để hiểu vì sao PR không tự merge.
   *
   * Backtick trong dòng `#` thì bash bỏ qua, và trong chuỗi nháy đơn thì là ký tự thường — nên chỉ
   * bắt phần còn lại, đúng chỗ nó có nghĩa.
   */
  it("không có backtick nào bị thực thi ngoài ý muốn", () => {
    const pham = dongBashTrongWorkflow()
      .filter((d) => !d.trim().startsWith("#"))
      .filter((d) => d.replace(/'[^']*'/g, "").includes("`"));

    expect(pham, "backtick trong chuỗi nháy kép là thay thế lệnh — dùng nháy đơn").toEqual([]);
  });

  it("thật sự đọc được các dòng bash", () => {
    expect(dongBashTrongWorkflow().length).toBeGreaterThan(10);
  });
});

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
