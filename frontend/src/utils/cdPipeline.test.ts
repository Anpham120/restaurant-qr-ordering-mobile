import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../../", import.meta.url);
const doc = (p: string) => readFileSync(fileURLToPath(new URL(p, repoRoot)), "utf8");

const cdWorkflow = () => doc(".github/workflows/cd.yml");
const deployScript = () => doc("deploy/scripts/deploy-vps.sh");

/**
 * Khối heredoc sinh ra tệp `.env` đặt trên máy chủ: từ `cat > "$env_file" <<EOF` tới `EOF` đứng
 * một mình đầu dòng.
 */
function khoiHeredocEnv(): string {
  const sh = deployScript();
  const batDau = sh.indexOf('cat > "$env_file" <<EOF');
  expect(batDau, "không thấy heredoc sinh .env trong deploy-vps.sh").toBeGreaterThan(-1);
  const ketThuc = sh.indexOf("\nEOF\n", batDau);
  expect(ketThuc, "heredoc sinh .env không có dấu đóng EOF").toBeGreaterThan(batDau);
  return sh.slice(batDau, ketThuc);
}

describe("heredoc sinh .env của deploy-vps.sh", () => {
  /**
   * Heredoc này PHẢI không nháy — nó cần `$(env_quote ...)` giãn ra. Hệ quả ít ai nghĩ tới: dấu
   * backtick trong đó cũng là THAY THẾ LỆNH, kể cả khi nó nằm trong một dòng ghi chú.
   *
   * Đã xảy ra. Năm dấu backtick trong các ghi chú kiểu markdown khiến mỗi lượt triển khai thử chạy
   * `/hub/orders`, `WebSocketConfig.addEndpoint`, `write-nginx-config.sh`... Chúng thất bại vô hại
   * nên không ai thấy — nhưng cơ chế thì là: chữ trong ghi chú được THỰC THI trên runner, và số
   * backtick lẻ có thể nuốt mất một dòng khai biến thật.
   *
   * Không phép kiểm nào cũ bắt được: script vẫn thoát 0, tệp .env vẫn đủ biến, deploy vẫn xanh.
   */
  it("không chứa dấu backtick nào", () => {
    const backtick = [...khoiHeredocEnv().matchAll(/^.*`.*$/gm)].map((m) => m[0].trim());

    expect(
      backtick,
      "backtick trong heredoc không nháy là thay thế lệnh — dùng nháy đơn cho ghi chú",
    ).toEqual([]);
  });

  it("vẫn sinh ra các biến bắt buộc", () => {
    const khoi = khoiHeredocEnv();

    for (const ten of ["POSTGRES_PASSWORD", "JWT_SIGNING_KEY", "PUBLIC_API_BASE_URL", "TLS_CERT_DIR"]) {
      expect(khoi, `heredoc không còn sinh ${ten}`).toContain(`${ten}=$(env_quote`);
    }
  });
});

describe("thứ tự các bước trên máy chủ", () => {
  /**
   * SAO LƯU PHẢI ĐỨNG TRƯỚC MIGRATION.
   *
   * Trước đây bản sao lưu duy nhất của một lượt triển khai tên là `pre-health-check` và chạy SAU
   * cả `migrate` lẫn `up -d`. Tức là không có điểm khôi phục nào từ trước khi lược đồ bị đổi —
   * đúng thứ duy nhất mà một lần triển khai lại KHÔNG sửa được, vì Flyway bản cộng đồng không có
   * đường lùi.
   *
   * Đây là ràng buộc về THỨ TỰ, không phải về sự tồn tại. Cả hai lệnh vẫn nằm trong tệp dù ai đó
   * đảo chỗ chúng, nên chỉ so sánh vị trí mới bắt được.
   */
  it("sao lưu Postgres chạy trước khi migrate", () => {
    const sh = deployScript();
    const viTriBackup = sh.indexOf("backup-postgres.sh");
    const viTriMigrate = sh.indexOf("--profile migrate");

    expect(viTriBackup, "không thấy lệnh backup-postgres.sh").toBeGreaterThan(-1);
    expect(viTriMigrate, "không thấy bước migrate").toBeGreaterThan(-1);
    expect(
      viTriBackup,
      "sao lưu chạy sau migration thì không khôi phục được lược đồ cũ — Flyway không có Down()",
    ).toBeLessThan(viTriMigrate);
  });
});

describe("cd.yml tự động hoá", () => {
  it("tự chạy khi merge vào develop", () => {
    const wf = cdWorkflow();
    const khoiOn = wf.slice(wf.indexOf("\non:"), wf.indexOf("\nconcurrency:"));

    expect(khoiOn, "cd.yml không có trigger push").toContain("push:");
    expect(khoiOn, "cd.yml không nhắm nhánh develop").toMatch(/push:[\s\S]*?-\s*develop/);
  });

  /**
   * Trigger `push` không có `inputs`, nên mọi chỗ đọc `inputs.moi_truong` phải có giá trị lùi về.
   * Thiếu một chỗ thì nó rỗng — và `environment: ""` là triển khai KHÔNG có bí mật nào, còn
   * `DEPLOY_ENV=""` là đường dẫn `/opt/cmc-restaurant/` trên máy chủ.
   */
  it("mọi chỗ đọc inputs.moi_truong đều có giá trị lùi về staging", () => {
    const thieu = [...cdWorkflow().matchAll(/^.*inputs\.moi_truong.*$/gm)]
      .map((m) => m[0])
      .filter((dong) => !dong.includes("||"));

    expect(thieu, "thiếu `|| 'staging'` — chạy theo push sẽ ra môi trường rỗng").toEqual([]);
  });

  /**
   * `rollback-vps.sh` nằm trong repo từ lâu, viết đủ và đúng, và KHÔNG AI GỌI NÓ. Phép kiểm này
   * canh đúng chỗ đó: không phải "tệp có tồn tại không" mà "có đường chạy nào tới nó không".
   */
  it("tự lùi lại khi triển khai hỏng", () => {
    const wf = cdWorkflow();

    expect(wf, "cd.yml không gọi rollback-tu-xa.sh").toContain("rollback-tu-xa.sh");
    const buoc = wf.slice(wf.indexOf("Lùi lại nếu triển khai hỏng"));
    expect(
      buoc.slice(0, buoc.indexOf("run:")),
      "bước lùi không có `if: failure()` nên nó chạy cả khi triển khai thành công",
    ).toContain("if: failure()");
  });

  it("cả hai đường tới máy chủ dùng chung một cách dựng SSH", () => {
    for (const p of ["deploy/scripts/deploy-vps.sh", "deploy/scripts/rollback-tu-xa.sh"]) {
      expect(doc(p), `${p} không dùng lib-ssh.sh`).toContain("lib-ssh.sh");
    }
  });
});
