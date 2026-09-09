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
  it("tự chạy khi merge vào develop và vào main", () => {
    const wf = cdWorkflow();
    const khoiOn = wf.slice(wf.indexOf("\non:"), wf.indexOf("\nconcurrency:"));

    expect(khoiOn, "cd.yml không có trigger push").toContain("push:");
    expect(khoiOn, "cd.yml không nhắm nhánh develop").toMatch(/push:[\s\S]*?-\s*develop/);
    expect(khoiOn, "cd.yml không nhắm nhánh main").toMatch(/push:[\s\S]*?-\s*main/);
  });

  /**
   * MÔI TRƯỜNG SUY RA TỪ NHÁNH.
   *
   * Nếu một chỗ nào đó vẫn rơi thẳng về `'staging'` mà không xét nhánh, thì một lần đẩy vào `main`
   * sẽ triển khai lên STAGING trong khi mọi thứ khác của lượt chạy đó nói là production — và nó
   * hỏng im lặng, vì staging deploy thành công nên job vẫn xanh.
   *
   * Không kiểm được từ trong kho: chốt duyệt của environment `production` phải được GỠ, nếu không
   * lượt tự chạy vẫn dừng chờ người y như trước. Đó là cấu hình trên GitHub, ghi ở §2 của
   * `docs/devops/PIPELINE_AND_DEPLOY.md`.
   */
  it("main ra production, còn lại ra staging", () => {
    const dong = [...cdWorkflow().matchAll(/^.*inputs\.moi_truong.*$/gm)].map((m) => m[0]);

    expect(dong.length, "không thấy chỗ nào quyết định môi trường").toBeGreaterThan(3);
    for (const d of dong) {
      expect(d, `thiếu nhánh main -> production: ${d.trim()}`).toContain(
        "github.ref == 'refs/heads/main' && 'production'",
      );
      expect(d, `thiếu giá trị lùi về staging: ${d.trim()}`).toContain("|| 'staging'");
    }
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

describe("kéo ảnh từ registry", () => {
  /**
   * LÙI LẠI PHẢI LÙI CẢ `.env`, KHÔNG CHỈ MÃ.
   *
   * Từ khi `.env` mang TÊN ẢNH, lùi mã mà giữ `.env` mới là chạy ảnh MỚI với mã CŨ — tức không lùi
   * gì cả. Tệ hơn ở nhánh `--build`: nó dựng lại mã cũ rồi GẮN NHÃN bằng tag của bản mới, nên một
   * lần `pull` về sau có thể bỏ qua vì tag đó đã có sẵn trên máy.
   *
   * Không phép kiểm nào cũ bắt được: rollback vẫn thoát 0, health-check vẫn xanh, và máy chủ vẫn
   * phục vụ — chỉ là phục vụ sai thứ.
   */
  it("deploy giữ .env cũ lại trước khi ghi đè", () => {
    const sh = deployScript();

    expect(sh, "gửi thẳng vào .env là mất bản cũ trước khi kịp giữ").toContain(".env.new");
    expect(sh, "không giữ .env.previous — lùi lại sẽ dùng tên ảnh MỚI với mã CŨ").toMatch(
      /cp \.env \.env\.previous/,
    );
  });

  it("rollback khôi phục .env cũ", () => {
    const sh = doc("deploy/scripts/rollback-vps.sh");

    expect(sh, "rollback không lùi .env — mã cũ sẽ chạy bằng ảnh mới").toMatch(
      /mv \.env\.previous \.env/,
    );
    const viTriEnv = sh.indexOf("mv .env.previous .env");
    const viTriNguon = sh.indexOf(". ./.env");
    expect(
      viTriEnv,
      "lùi .env phải TRƯỚC khi đọc nó, nếu không script vẫn nạp giá trị mới",
    ).toBeLessThan(viTriNguon);
  });

  /**
   * ẢNH FRONTEND PHẢI TÁCH THEO MÔI TRƯỜNG.
   *
   * Vite nướng `VITE_API_BASE_URL` vào bundle lúc build. Một tag frontend dùng chung cho cả hai
   * môi trường nghĩa là ảnh nào lên sau sẽ ghi đè ảnh kia, và khách của môi trường này gọi vào API
   * của môi trường kia — thầm lặng, vì trang vẫn tải được.
   *
   * Ảnh `api` thì NGƯỢC LẠI: Java đọc cấu hình lúc chạy, nên dùng chung là đúng và tiết kiệm.
   */
  it("tag frontend mang tên môi trường, tag api thì không cần", () => {
    const wf = cdWorkflow();
    const dongFe = /echo "frontend=([^"]+)"/.exec(wf)?.[1] ?? "";
    const dongApi = /echo "api=([^"]+)"/.exec(wf)?.[1] ?? "";

    expect(dongFe, "không đọc được cách đặt tên ảnh frontend").not.toBe("");
    expect(dongFe, "tag frontend không mang môi trường — hai môi trường sẽ ghi đè nhau").toContain(
      "MOI_TRUONG",
    );
    expect(dongApi, "không đọc được cách đặt tên ảnh api").not.toBe("");
    expect(dongApi, "tag phải neo vào commit, nếu không `latest` che mất bản đang chạy").toContain(
      "GITHUB_SHA",
    );
  });

  /**
   * Bỏ sót một `--build-arg` là bundle rơi về mặc định GHI CỨNG trong `frontend/Dockerfile` — một
   * địa chỉ production. Staging sẽ gọi thẳng vào API thật mà không báo gì.
   */
  it("dựng frontend truyền đủ bộ URL công khai", () => {
    const wf = cdWorkflow();
    for (const ten of [
      "VITE_API_BASE_URL",
      "VITE_ORDER_HUB_URL",
      "VITE_ORDERING_BASE_URL",
      "VITE_MARKETING_BASE_URL",
    ]) {
      expect(wf, `thiếu --build-arg ${ten} — bundle rơi về mặc định của Dockerfile`).toContain(
        `--build-arg ${ten}=`,
      );
    }
  });

  /** Thiếu tên ảnh thì phải quay về dựng tại chỗ: chạy tay và chạy local không có registry. */
  it("vẫn dựng được trên máy chủ khi không có tên ảnh", () => {
    const sh = deployScript();

    expect(sh, "không còn đường dự phòng `--build`").toContain('che_do_anh="build"');
    expect(sh, "không kiểm tên ảnh trước khi chọn chế độ").toMatch(
      /-n "\$\{BACKEND_JAVA_IMAGE:-\}"/,
    );
  });
});
