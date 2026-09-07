#!/usr/bin/env node
/**
 * Sinh hai bảng thực đơn từ các migration.
 *
 *   node scripts/menu/build_thuc_don.mjs           # ghi tệp
 *   node scripts/menu/build_thuc_don.mjs --check   # chỉ kiểm, đỏ nếu tệp đã commit lệch
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dungDanhSachTen, dungMarkdown } from "./thuc_don.mjs";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const DAU_RA = [
	["docs/THUC_DON_QUAN.md", dungMarkdown],
	["docs/THUC_DON_TEN_MON.md", dungDanhSachTen],
];

const kiem = process.argv.includes("--check");
const lech = [];

for (const [duongDan, dung] of DAU_RA) {
	const dich = path.join(GOC, duongDan);
	const moi = dung(GOC);
	if (kiem) {
		const cu = fs.existsSync(dich) ? fs.readFileSync(dich, "utf8") : "";
		if (cu !== moi) lech.push(duongDan);
	} else {
		fs.writeFileSync(dich, moi, "utf8");
		console.log("Đã ghi " + duongDan);
	}
}

if (kiem) {
	if (lech.length > 0) {
		console.error("TỆP ĐÃ COMMIT KHÁC KẾT QUẢ SINH LẠI:");
		for (const p of lech) console.error("  " + p);
		console.error("Chạy: node scripts/menu/build_thuc_don.mjs");
		process.exit(1);
	}
	console.log("--check: các tệp đã commit khớp kết quả sinh lại.");
}
