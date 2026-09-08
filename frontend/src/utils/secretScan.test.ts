import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

/**
 * Mọi dòng bash trong một tệp `.sh`, kèm cờ nó có nằm trong một heredoc KHÔNG NHÁY hay không.
 *
 * `<<EOF` giãn biến và THAY THẾ LỆNH; `<<'EOF'` thì không. Backtick trong heredoc không nháy bị
 * chạy y như trong chuỗi nháy kép — kể cả khi nó nằm trong một dòng bắt đầu bằng `#`, vì bên trong
 * heredoc thì `#` chỉ là một ký tự chứ không phải dấu mở ghi chú.
 *
 * BỎ QUA BACKTICK ĐÃ ESCAPE. Bản đầu của hàm này không bỏ, và nó báo nhầm hai dòng
 * ``\`\`\`json`` trong `health-check.sh` — đó là hàng rào mã markdown viết ĐÚNG cách: `\`` in ra
 * một dấu backtick thật, bash không chạy gì cả. Một cổng báo nhầm thì người ta học cách lờ nó, và
 * lúc nó báo đúng cũng không ai nhìn.
 */
function dongCoBacktickTrongScript(noiDung: string): string[] {
  const ra: string[] = [];
  let trongHeredocKhongNhay = false;
  for (const dong of noiDung.split(/\r?\n/)) {
    if (/<<'[A-Za-z_]+'|<<"[A-Za-z_]+"/.test(dong)) continue;
    if (/<<[A-Za-z_]+\s*$/.test(dong)) {
      trongHeredocKhongNhay = true;
      continue;
    }
    if (trongHeredocKhongNhay && /^[A-Za-z_]+$/.test(dong.trim())) {
      trongHeredocKhongNhay = false;
      continue;
    }
    // Ngoài heredoc, một dòng `#` là ghi chú thật và bash không đụng tới nó.
    if (!trongHeredocKhongNhay && dong.trim().startsWith("#")) continue;
    const conLai = dong.replace(/\\`/g, "").replace(/'[^']*'/g, "");
    if (conLai.includes("`")) ra.push(dong.trim());
  }
  return ra;
}

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

  /**
   * LẦN THỨ TƯ, VÀ NÓ Ở NGOÀI TẦM CỦA CỔNG.
   *
   * Bản đầu của cổng này chỉ quét `.github/workflows/`. Ngay sau khi nó được viết, một lượt triển
   * khai thật in ra:
   *
   *     write-nginx-config.sh: line 46: /hub/: No such file or directory
   *     write-nginx-config.sh: line 46: /hubs/: No such file or directory
   *
   * Backtick nằm trong ghi chú kiểu markdown BÊN TRONG một heredoc `<<EOF`. Hai điều khiến nó thoát:
   * tệp là `.sh` chứ không phải workflow, và dòng bắt đầu bằng `#` — nhưng bên trong heredoc thì `#`
   * chỉ là một ký tự, không phải dấu mở ghi chú, nên bash vẫn chạy backtick.
   *
   * Cổng chỉ quét chỗ mình nghĩ tới thì nó canh phạm vi của trí nhớ người viết, không canh lớp lỗi.
   */
  it("không script triển khai nào có backtick bị thực thi ngoài ý muốn", () => {
    const pham: string[] = [];
    const thuMuc = fileURLToPath(new URL("deploy/scripts/", repoRoot));
    for (const tep of readdirSync(thuMuc).filter((f) => f.endsWith(".sh"))) {
      for (const dong of dongCoBacktickTrongScript(readFileSync(join(thuMuc, tep), "utf8"))) {
        pham.push(`${tep}: ${dong}`);
      }
    }

    expect(pham, "dùng nháy đơn trong ghi chú, hoặc `<<'EOF'` cho heredoc không cần giãn biến")
      .toEqual([]);
  });
});
