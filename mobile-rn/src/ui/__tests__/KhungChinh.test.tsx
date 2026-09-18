import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { type Cart, type CartItem } from '../../core/cart/cart';
import { type TableSession } from '../../core/tables/tableSession';
import { KhungChinh } from '../KhungChinh';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));

const PHIEN: TableSession = {
  sessionId: 'ts_abc',
  tableCode: 'T01',
  tableDisplayName: 'Ban 01',
  status: 'Open',
  expiresAt: '2030-01-01T00:00:00.000Z',
  isExpired: false,
  tableSessionToken: 'tst',
  resumeState: 'FreshStart',
  qrToken: 'qr',
};

/**
 * Mỗi tab bấm vào phải mở ra ĐÚNG màn hình của chính nó.
 *
 * Bản Flutter có lỗi lệch chỉ số giữa hai danh sách song song — 6 màn hình, 4 tab — và nó lên tới
 * máy thật: bấm "Đơn" hiện Giỏ hàng, bấm "Tài khoản" hiện Khuyến mãi. Bản Flutter chữa bằng một ca
 * kiểm ĐẾM hai danh sách.
 *
 * Bản này bỏ hẳn danh sách thứ hai, nên phép đếm không còn nghĩa gì. Ca kiểm thay thế phải kiểm
 * điều mà lỗi kia THẬT SỰ gây ra: nhãn tab và nội dung màn hình không khớp nhau.
 */
const API_TRONG = {
  menuApi: { thucDon: async () => ({ categories: [], items: [] }) },
  cartApi: {
    gio: async () => ({ tableSessionId: 'ts', items: [], itemCount: 0, subtotal: 0 }),
    doiSoLuong: async () => ({ tableSessionId: 'ts', items: [], itemCount: 0, subtotal: 0 }),
    xoaHet: async () => ({ tableSessionId: 'ts', items: [], itemCount: 0, subtotal: 0 }),
  },
  createOrderApi: {
    taoDon: async () => ({
      orderId: 'o',
      orderCode: 'DH1',
      status: 'Placed',
      totalAmount: 0,
      customerAccessToken: 't',
    }),
  },
  orderApi: { donCuaPhien: async () => [], huyMon: async () => undefined },
  promotionApi: { dangChay: async () => [] },
  invoiceApi: {
    hoaDon: async () => ({
      invoiceCode: 'HD',
      status: 'NotRequested',
      method: 'Unselected',
      subtotalAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      items: [],
      vietQr: null,
    }),
    yeuCauThanhToan: async () => ({
      invoiceCode: 'HD',
      status: 'Pending',
      method: 'COD',
      subtotalAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      items: [],
      vietQr: null,
    }),
  },
  historyApi: { lichSuCuaToi: async () => [] },
  favouriteApi: { monHayGoi: async () => [] },
  loyaltyApi: {
    cuaToi: async () => ({
      linked: false,
      coHoSo: false,
      phoneNumber: null,
      points: 0,
      availableRewards: [],
      hang: 'BAC' as const,
      tenHang: 'Bạc',
      chiTieu12Thang: 0,
      tenHangKeTiep: 'Vàng',
      conThieu: 5_000_000,
      phieuChuaDung: [],
    }),
    noiSo: async () => ({
      linked: true,
      coHoSo: true,
      phoneNumber: '0901234567',
      points: 0,
      availableRewards: [],
      hang: 'BAC' as const,
      tenHang: 'Bạc',
      chiTieu12Thang: 0,
      tenHangKeTiep: 'Vàng',
      conThieu: 5_000_000,
      phieuChuaDung: [],
    }),
    doiDiem: async () => {
      throw new Error('không dùng');
    },
  },
};

async function dungKhung() {
  const tokenStore = {
    luu: jest.fn().mockResolvedValue(undefined),
    token: jest.fn().mockResolvedValue(null),
    tatCa: jest.fn().mockResolvedValue({}),
    xoaHet: jest.fn().mockResolvedValue(undefined),
  };
  await render(
    <KhungChinh
      {...API_TRONG}
      guiMaOtp={async () => ({ xacNhan: async () => 'token-otp' })}
      cauHinh={{ apiBaseUrl: 'http://test:8081', imageBaseUrl: 'http://test:8080' }}
      dangNhap={null}
      onDangNhap={jest.fn()}
      onDangXuat={jest.fn()}
      onMoCaiDat={jest.fn()}
      onRoiBan={jest.fn()}
      phienBan={PHIEN}
      soDienThoai={null}
      tokenStore={tokenStore as never}
    />,
  );
  return tokenStore;
}

/**
 * Nhãn tab → cách tìm một phần tử CHỈ có ở màn hình của tab đó.
 *
 * Dùng hàm chứ không dùng một biểu thức chính quy chung: hai màn hình chỉ phân biệt được qua
 * placeholder của ô nhập, không qua node văn bản. Và không dùng chính tiêu đề màn hình làm dấu
 * hiệu — tiêu đề trùng nhãn tab, nên phép kiểm sẽ xanh cả khi màn hình mở ra là màn hình khác.
 */
const DAU_HIEU: readonly (readonly [string, () => unknown])[] = [
  ['Thực đơn', () => screen.getByPlaceholderText(/Tìm món/)],
  ['Giỏ', () => screen.getByText(/Giỏ đang trống/)],
  ['Đơn', () => screen.getByText(/Bàn chưa có đơn nào/)],
  ['Khuyến mãi', () => screen.getByText(/Hiện chưa có khuyến mãi nào/)],
  ['Tài khoản', () => screen.getByText(/Khách vãng lai/)],
];

describe('điều hướng theo tab', () => {
  it('KHÔNG còn tab Trợ lý', async () => {
    // Trợ lý AI đã gỡ khỏi hệ thống. Ca này là đối chứng: thiếu nó thì một lần khôi phục nhầm
    // đưa tab đó trở lại mà bộ kiểm vẫn xanh, và khách bấm vào một màn hình gọi API không còn tồn tại.
    await dungKhung();

    expect(screen.queryByLabelText('Trợ lý')).toBeNull();
  });

  it('có đúng 5 tab, không thừa không thiếu', async () => {
    await dungKhung();

    for (const [nhan] of DAU_HIEU) {
      expect(screen.getByLabelText(nhan)).toBeTruthy();
    }
  });

  it.each(DAU_HIEU)('bấm tab "%s" mở ra ĐÚNG màn hình của nó', async (nhan, tim) => {
    // Đây là ca thay cho `dieu_huong_test.dart` của bản Flutter. Nó không đếm hai danh sách nữa
    // (bản này chỉ có một), mà kiểm thứ lỗi kia thật sự gây ra: nhãn tab và nội dung không khớp.
    await dungKhung();

    await fireEvent.press(screen.getByLabelText(nhan));

    await waitFor(() => expect(tim()).toBeTruthy());
  });

  it('tab đang mở được đánh dấu selected cho trình đọc màn hình', async () => {
    await dungKhung();

    expect(screen.getByLabelText('Thực đơn').props.accessibilityState?.selected).toBe(true);

    await fireEvent.press(screen.getByLabelText('Khuyến mãi'));

    expect(screen.getByLabelText('Khuyến mãi').props.accessibilityState?.selected).toBe(true);
    expect(screen.getByLabelText('Thực đơn').props.accessibilityState?.selected).toBe(false);
  });

  it('mở app vào tab Thực đơn, không vào tab trống', async () => {
    await dungKhung();

    await waitFor(() => expect(screen.getByPlaceholderText(/Tìm món/)).toBeTruthy());
  });
});

describe('đặt đơn xong thì khách LUÔN được báo', () => {
  const MON: CartItem = {
    menuItemId: 'm1',
    name: 'Phở bò',
    price: 50_000,
    quantity: 1,
    lineTotal: 50_000,
    isAvailable: true,
    imageUrl: null,
    note: null,
  };

  const GIO_CO_MON: Cart = {
    tableSessionId: 'ts',
    items: [MON],
    itemCount: 1,
    subtotal: 50_000,
  };

  async function datMotDon(luu: jest.Mock) {
    const onBaoTin = jest.fn();
    await render(
      <KhungChinh
        {...API_TRONG}
        cartApi={{ ...API_TRONG.cartApi, gio: async () => GIO_CO_MON }}
        guiMaOtp={async () => ({ xacNhan: async () => 'token-otp' })}
        cauHinh={{ apiBaseUrl: 'http://test:8081', imageBaseUrl: 'http://test:8080' }}
        dangNhap={null}
        onBaoTin={onBaoTin}
        onDangNhap={jest.fn()}
        onDangXuat={jest.fn()}
        onMoCaiDat={jest.fn()}
        onRoiBan={jest.fn()}
        phienBan={PHIEN}
        soDienThoai={null}
        tokenStore={
          {
            luu,
            token: jest.fn().mockResolvedValue(null),
            tatCa: jest.fn().mockResolvedValue({}),
            xoaHet: jest.fn().mockResolvedValue(undefined),
          } as never
        }
      />,
    );

    await fireEvent.press(screen.getByLabelText('Giỏ'));
    await waitFor(() => expect(screen.getByLabelText('Đặt món')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Đặt món'));

    return onBaoTin;
  }

  it('cất token hỏng vẫn báo "Đã gửi bếp" và vẫn chuyển sang tab Đơn', async () => {
    // ĐÂY là ca đáng giá nhất của bộ này. Đơn ĐÃ lên bếp — backend nhận xong mới gọi `onDatXong`.
    // Bản cũ treo lời báo và việc chuyển tab vào `.then()` của lời ghi Keystore, nên một lần ghi
    // hỏng là khách không thấy gì: màn hình đứng im ở giỏ hàng còn đầy, và người ta bấm đặt lại.
    //
    // Keystore ném thật: `SecureStoreModule.kt` ném `DecryptException` khi khoá mã hoá mất hiệu
    // lực — xảy ra khi khách đổi mã khoá màn hình hoặc phục hồi máy từ bản sao lưu.
    const luu = jest.fn().mockRejectedValue(new Error('Keystore từ chối'));

    const onBaoTin = await datMotDon(luu);

    expect(luu).toHaveBeenCalledWith('DH1', 't');
    expect(onBaoTin).toHaveBeenCalledWith('Đã gửi bếp — đơn DH1');
    await waitFor(() => expect(screen.getByText(/Bàn chưa có đơn nào/)).toBeTruthy());
  });

  it('cất token xong thì báo đúng một lần, không báo hai lần', async () => {
    // Đối chứng cho ca trên: sửa bằng cách gọi `onBaoTin` ở CẢ hai nhánh sẽ làm ca này đỏ.
    const luu = jest.fn().mockResolvedValue(undefined);

    const onBaoTin = await datMotDon(luu);

    expect(onBaoTin).toHaveBeenCalledTimes(1);
    expect(onBaoTin).toHaveBeenCalledWith('Đã gửi bếp — đơn DH1');
  });
});
