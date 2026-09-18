import { docHoacDon, type KhoAnToan, khoTrongBoNho } from '../luuTruAnToan';

/**
 * Kho mô phỏng Keystore đã mất khoá mã hoá.
 *
 * Đây KHÔNG phải tình huống nghĩ ra cho đủ ca kiểm. `SecureStoreModule.kt` ném `DecryptException`
 * ngay khi khoá mã hoá hết hiệu lực, và khoá hết hiệu lực khi khách đổi mã khoá màn hình, đổi vân
 * tay, hoặc phục hồi máy từ bản sao lưu — ba việc khách làm mà không hề nghĩ tới app đặt món.
 */
function khoHongKhiDoc(daXoa: string[] = [], xoaCungHong = false): KhoAnToan {
  return {
    doc: async () => {
      throw new Error('DecryptException: Could not find the encryption scheme used for key');
    },
    ghi: async () => undefined,
    xoa: async (khoa) => {
      if (xoaCungHong) throw new Error('Keystore từ chối cả lệnh xoá');
      daXoa.push(khoa);
    },
  };
}

describe('docHoacDon', () => {
  it('đọc bình thường thì trả đúng giá trị, không đụng tới gì', async () => {
    const kho = khoTrongBoNho({ k: 'giá trị' });

    expect(await docHoacDon(kho, 'k')).toBe('giá trị');
    // Không xoá nhầm: đường đi thuận lợi phải để nguyên dữ liệu.
    expect(await kho.doc('k')).toBe('giá trị');
  });

  it('chưa có gì thì trả null', async () => {
    expect(await docHoacDon(khoTrongBoNho(), 'k')).toBeNull();
  });

  it('kho ném thì trả null thay vì để lỗi lọt ra ngoài', async () => {
    expect(await docHoacDon(khoHongKhiDoc(), 'k')).toBeNull();
  });

  it('kho ném thì XOÁ luôn blob chết, để lần mở app sau không ném lại', async () => {
    // Ca đáng giá nhất của tệp này. Chỉ nuốt lỗi mà không xoá thì blob không giải mã được nằm lại
    // vĩnh viễn: khách bị đăng xuất ở MỌI lần mở app, và lối thoát duy nhất là gỡ app cài lại.
    const daXoa: string[] = [];

    await docHoacDon(khoHongKhiDoc(daXoa), 'auth_session_v1');

    expect(daXoa).toEqual(['auth_session_v1']);
  });

  it('xoá cũng hỏng thì VẪN trả null, không ném', async () => {
    // Nơi gọi là một effect lúc khởi động. Ném ở đây là quay lại đúng lỗi treo màn hình đã sửa.
    expect(await docHoacDon(khoHongKhiDoc([], true), 'k')).toBeNull();
  });
});
