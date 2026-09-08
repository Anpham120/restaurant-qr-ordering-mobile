import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../../", import.meta.url);
const doc = (p: string) => readFileSync(fileURLToPath(new URL(p, repoRoot)), "utf8");

/** Khối `on:` / thân của một job, tính theo thụt lề. */
function khoiJob(yml: string, ten: string): string {
  const dong = yml.split(/\r?\n/);
  const batDau = dong.findIndex((d) => new RegExp(`^  ${ten}:`).test(d));
  if (batDau < 0) return "";
  const conLai = dong.slice(batDau + 1);
  const ketThuc = conLai.findIndex((d) => /^  \S/.test(d));
  return conLai.slice(0, ketThuc < 0 ? undefined : ketThuc).join("\n");
}

describe("secret-scan", () => {
  /**
   * MỘT LẦN QUÉT SẠCH KHÔNG ĐƯỢC CHO RA MỘT PHÉP KIỂM ĐỎ.
   *
   * `gitleaks-action` mặc định tải một tệp SARIF lên làm phụ lục của lượt chạy. Bước đó nằm SAU
   * khi quét xong, và nó hỏng thì cả job đỏ — dù kết quả quét là sạch.
   *
   * Xảy ra ngày 08/09 trên PR #207: log ghi "no leaks found", rồi job chết ở
   * "Failed to FinalizeArtifact: (403) Forbidden". `secret-scan` là phép kiểm BẮT BUỘC, nên một
   * lần chập chờn ở hạ tầng GitHub là một PR bị chặn cho tới khi có người nhận ra và bấm chạy lại.
   */
  it("không tải phụ lục SARIF — một bước phụ không được làm đỏ cả phép kiểm", () => {
    const job = khoiJob(doc(".github/workflows/security.yml"), "secret-scan");

    expect(job, "không đọc được job secret-scan").not.toBe("");
    expect(job, "thiếu GITLEAKS_ENABLE_UPLOAD_ARTIFACT: false").toMatch(
      /GITLEAKS_ENABLE_UPLOAD_ARTIFACT:\s*false/,
    );
  });

  it("vẫn quét thật, không phải chỉ tắt phụ lục rồi bỏ quét", () => {
    const job = khoiJob(doc(".github/workflows/security.yml"), "secret-scan");

    expect(job).toMatch(/uses:\s*gitleaks\/gitleaks-action@/);
    expect(job, "`continue-on-error` biến một phép kiểm an ninh thành trang trí").not.toMatch(
      /continue-on-error:\s*true/,
    );
  });
});

describe("backtick trong chuỗi nháy kép của bash", () => {
  /**
   * LỚP LỖI NÀY ĐÃ XUẤT HIỆN BA LẦN TRONG CÙNG MỘT KHO.
   *
   *   1. `auto-merge.yml` — `echo "PR nhắm `main` từ..."` nuốt mất chữ "main" (sửa ở #195)
   *   2. `deploy-vps.sh` — năm backtick trong ghi chú của một heredoc không nháy, mỗi lượt triển
   *      khai thử chạy `/hub/orders`, `write-nginx-config.sh`… (sửa ở #184)
   *   3. Và một lần nữa lúc viết chính tệp workflow này, bằng một lệnh bash sinh mã.
   *
   * Điểm chung: nó KHÔNG làm hỏng gì ồn ào. Chữ chỉ biến mất, và bản còn lại đọc vẫn xuôi. Cả ba
   * lần đều chỉ lộ ra khi có người đọc lại đúng dòng đó.
   *
   * Phép kiểm quét mọi workflow, bỏ dòng ghi chú (`#`) và các đoạn nháy đơn — hai chỗ backtick vô
   * hại — rồi bắt phần còn lại.
   */
  it("không workflow nào có backtick bị thực thi ngoài ý muốn", () => {
    const pham: string[] = [];
    for (const ten of [
      "auto-merge.yml",
      "cd.yml",
      "ci.yml",
      "ci-java.yml",
      "ci-mobile.yml",
      "security.yml",
      "dependency-review.yml",
    ]) {
      const yml = doc(`.github/workflows/${ten}`);
      let trongRun = false;
      let thut = -1;
      for (const dong of yml.split(/\r?\n/)) {
        if (/^\s*run: \|/.test(dong)) {
          trongRun = true;
          thut = dong.search(/\S/);
          continue;
        }
        if (!trongRun) continue;
        if (dong.trim() === "") continue;
        if (dong.search(/\S/) <= thut && /^\s*[a-z-]+:/.test(dong)) {
          trongRun = false;
          continue;
        }
        if (dong.trim().startsWith("#")) continue;
        if (dong.replace(/'[^']*'/g, "").includes("`")) pham.push(`${ten}: ${dong.trim()}`);
      }
    }

    expect(
      pham,
      "backtick trong chuỗi nháy kép là thay thế lệnh — bash chạy nó rồi thay bằng chuỗi rỗng, "
        + "và câu chữ mất đi một cách im lặng",
    ).toEqual([]);
  });
});
