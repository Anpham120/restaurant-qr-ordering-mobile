import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
// SafeAreaView của react-native là NO-OP trên Android: nó chỉ chừa lề trên iOS. Trên máy Android
// thật, tiêu đề mọi màn hình bị thanh trạng thái đè lên — và jest render vào cây ảo nên không có
// thanh nào để đè, phép kiểm nào cũng xanh. Bản của react-native-safe-area-context đọc lề thật từ
// hệ điều hành ở cả hai nền tảng, và là thứ Expo khuyến nghị.
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { HttpAuthApi } from './src/core/auth/authApi';
import { AuthRepository } from './src/core/auth/authRepository';
import { type AuthSession } from './src/core/auth/authSession';
import { SecureTokenStore } from './src/core/auth/tokenStore';
import { HttpCartApi } from './src/core/cart/cartApi';
import { CAU_HINH_MAC_DINH, type CauHinhMayChu } from './src/core/cauHinh/cauHinh';
import { CauHinhStore } from './src/core/cauHinh/cauHinhStore';
import { dongBoTaiKhoan } from './src/core/loyalty/dongBoTaiKhoan';
import { HttpLoyaltyApi } from './src/core/loyalty/loyaltyApi';
import { HttpMenuApi } from './src/core/menu/menuApi';
import { HttpCreateOrderApi } from './src/core/orders/createOrderApi';
import { HttpFavouriteApi } from './src/core/orders/favouriteApi';
import { HttpOrderApi } from './src/core/orders/orderApi';
import { HttpOrderHistoryApi } from './src/core/orders/orderHistoryApi';
import { OrderTokenStore } from './src/core/orders/orderTokenStore';
import { HttpInvoiceApi } from './src/core/payment/invoiceApi';
import { HttpPromotionApi } from './src/core/promotions/promotionApi';
import { type TableSession } from './src/core/tables/tableSession';
import { HttpTableSessionApi } from './src/core/tables/tableSessionApi';
import { TableSessionRepository } from './src/core/tables/tableSessionRepository';
import { SecureTableSessionStore } from './src/core/tables/tableSessionStore';
import { KhungChinh } from './src/ui/KhungChinh';
import { layTokenGoogleThat } from './src/core/auth/googleSignIn';
import { layGuiMaOtpThat } from './src/core/auth/phoneOtp';
import { HoSoTaiKhoan } from './src/ui/HoSoTaiKhoan';
import { DangKySoDienThoai } from './src/ui/DangKySoDienThoai';
import { LoginScreen } from './src/ui/LoginScreen';
import { ManCoNutVe } from './src/ui/ManCoNutVe';
import { OpenTableScreen } from './src/ui/OpenTableScreen';
import { ServerSettingsScreen } from './src/ui/ServerSettingsScreen';
import { MauQuan, kieuChung } from './src/ui/theme';

const cauHinhStore = new CauHinhStore();
const tokenStore = new SecureTokenStore();
const banStore = new SecureTableSessionStore();
const orderTokenStore = new OrderTokenStore();

/** Màn hình đang mở ở tầng ngoài cùng. */
type ManNgoai = 'caiDat' | 'dangNhap' | 'dangKy' | 'hoSo' | null;

/**
 * Dựng lại TOÀN BỘ client theo địa chỉ hiện tại.
 *
 * Mỗi client giữ `baseUrl` bên trong, nên đổi máy chủ bắt buộc phải dựng lại chúng — sửa một biến
 * dùng chung sẽ không chạm tới những client đã tạo, và app sẽ nửa nói chuyện với máy cũ nửa với
 * máy mới.
 */
function dungClient(cauHinh: CauHinhMayChu) {
  const api = cauHinh.apiBaseUrl;
  const auth = new AuthRepository(new HttpAuthApi(api), tokenStore);
  return {
    auth,
    ban: new TableSessionRepository(new HttpTableSessionApi(api), banStore, auth),
    menuApi: new HttpMenuApi(api),
    cartApi: new HttpCartApi(api),
    createOrderApi: new HttpCreateOrderApi(api),
    orderApi: new HttpOrderApi(api),
    promotionApi: new HttpPromotionApi(api),
    invoiceApi: new HttpInvoiceApi(api),
    historyApi: new HttpOrderHistoryApi(api),
    favouriteApi: new HttpFavouriteApi(api),
    loyaltyApi: new HttpLoyaltyApi(api),
  };
}

/**
 * Tính MỘT lần lúc nạp module, không tính lại mỗi lần vẽ lại.
 *
 * Hàm này chạm vào require của thư viện native; gọi nó trong thân component nghĩa là mỗi lần vẽ
 * lại đều dựng một hàm mới, và LoginScreen sẽ thấy prop đổi liên tục.
 */
const LAY_TOKEN_GOOGLE = layTokenGoogleThat();

/** Cùng lý do như {@link LAY_TOKEN_GOOGLE}: chạm vào require của thư viện native, tính một lần. */
const GUI_MA_OTP = layGuiMaOtpThat();

export default function App() {
  return (
    <SafeAreaProvider>
      <NoiDungApp />
    </SafeAreaProvider>
  );
}

function NoiDungApp() {
  const [cauHinh, setCauHinh] = useState<CauHinhMayChu | null>(null);
  const [dangNhap, setDangNhap] = useState<AuthSession | null>(null);
  const [phienBan, setPhienBan] = useState<TableSession | null>(null);
  const [soDienThoai, setSoDienThoai] = useState<string | null>(null);
  const [manNgoai, setManNgoai] = useState<ManNgoai>(null);
  const [tin, setTin] = useState<string | null>(null);
  const [dangKhoiPhuc, setDangKhoiPhuc] = useState(true);

  const client = useMemo(() => (cauHinh === null ? null : dungClient(cauHinh)), [cauHinh]);

  /**
   * Gọi luật ở {@link dongBoTaiKhoan} rồi đổ kết quả vào state.
   *
   * Luật nằm ở core chứ không ở đây, vì `App.tsx` không có phép kiểm nào — và đó chính là chỗ lỗi
   * "đơn không mang số điện thoại" đã sống suốt nhiều lượt xây tính năng mà không ai thấy.
   */
  const dongBo = useCallback(
    async (ses: AuthSession | null, ban: TableSession | null) => {
      if (client === null) return;
      const kq = await dongBoTaiKhoan(client.loyaltyApi, client.ban, ses?.accessToken ?? null, ban);
      setSoDienThoai(kq.soDienThoai);
      if (kq.phienBan !== null) setPhienBan(kq.phienBan);
    },
    [client],
  );

  // Khôi phục cấu hình, phiên đăng nhập và phiên bàn — theo đúng thứ tự đó, vì hai thứ sau cần
  // địa chỉ máy chủ mới đọc được.
  useEffect(() => {
    let huy = false;
    void (async () => {
      let ch: CauHinhMayChu | null = null;
      try {
        ch = await cauHinhStore.doc();
      } catch {
        // Kho an toàn không đọc được. Có thật trên web: `expo-secure-store` không có bản cài cho
        // nền tảng đó (`ExpoSecureStore.web.js` là một object rỗng), nên lời gọi ném
        // `getValueWithKeyAsync is not a function`. Trên máy thật thì hiếm hơn, nhưng Keystore vẫn
        // từ chối được.
        //
        // Để lỗi lọt ra ngoài thì `setDangKhoiPhuc(false)` KHÔNG BAO GIỜ chạy, và app đứng ở vòng
        // quay vĩnh viễn — không thông báo, không lối thoát, không cách nào biết vì sao.
        //
        // Coi như chưa có cấu hình là hành vi đúng: app rơi về máy chủ mặc định ngay dưới đây, và
        // khách đi tiếp được.
      }
      if (huy) return;
      // Chưa lưu gì (lần mở đầu tiên) hoặc đọc kho hỏng → dùng máy chủ thật.
      //
      // Trước đây chỗ này để `null`, và `null` đẩy khách vào màn hình nhập địa chỉ máy chủ NGAY Ở
      // MÀN ĐẦU TIÊN. Khách của một quán ăn không biết địa chỉ đó. Màn hình ấy sinh ra để kiểm thử
      // trên máy thật trong mạng LAN, và nó vẫn còn — nhưng là lối rẽ trong Cài đặt, không phải cửa
      // vào.
      setCauHinh(ch ?? CAU_HINH_MAC_DINH);
      setDangKhoiPhuc(false);
    })();
    return () => {
      huy = true;
    };
  }, []);

  useEffect(() => {
    if (client === null) return;
    let huy = false;
    void (async () => {
      let ses: AuthSession | null = null;
      let ban: TableSession | null = null;
      try {
        [ses, ban] = await Promise.all([client.auth.khoiPhuc(), client.ban.khoiPhuc()]);
      } catch {
        // Cùng nguyên nhân với effect khôi phục cấu hình ở trên: kho an toàn ném được.
        //
        // Bản cũ dùng `.then()` không kèm `.catch()`, nên một lần ném là `setDangNhap` và
        // `setPhienBan` KHÔNG BAO GIỜ chạy — khách bị đăng xuất âm thầm và mất luôn phiên bàn, mà
        // không có câu nào giải thích. Kèm theo một lời hứa bị bỏ rơi.
        //
        // Coi như chưa đăng nhập và chưa vào bàn là hành vi đúng: quét lại mã bàn là đi tiếp được.
      }
      if (huy) return;
      setDangNhap(ses);
      setPhienBan(ban);
      // Mở lại app cũng phải đồng bộ: số điện thoại KHÔNG được cất xuống máy, nên không khôi phục
      // được cùng hai thứ kia.
      void dongBo(ses, ban);
    })();
    return () => {
      huy = true;
    };
    // `dongBo` chỉ đổi khi `client` đổi, nên thêm nó vào đây không làm effect chạy thêm lần nào.
  }, [client, dongBo]);

  // Dải báo tin tự tắt. Không có nó thì lời báo nằm đè đáy màn hình cho tới khi khách bấm trúng
  // đúng dải đó — mà không có gì nói cho khách biết là phải bấm. Bấm vào vẫn tắt được ngay.
  useEffect(() => {
    if (tin === null) return;
    const hen = setTimeout(() => setTin(null), 4000);
    return () => clearTimeout(hen);
  }, [tin]);

  const luuCauHinh = useCallback(async (moi: CauHinhMayChu) => {
    // Cố ý KHÔNG bắt lỗi ở đây: `ServerSettingsScreen` bắt và báo "không lưu được" ngay trên màn
    // hình khách đang nhìn. Dải báo tin ở cuối tệp này KHÔNG vẽ ở màn hình đó, nên `setTin` sẽ
    // rơi vào hư không.
    await cauHinhStore.luu(moi);
    // Đổi máy chủ thì token cũ vô nghĩa. Xoá hết thay vì để app gửi token của máy khác và nhận
    // 401 ở một chỗ ngẫu nhiên.
    //
    // `allSettled` chứ không `all`: địa chỉ ĐÃ ghi xong ở dòng trên. Để một lần xoá hỏng ném ra
    // ngoài là báo "không lưu được" cho một việc đã lưu rồi — rồi mở lại app, khách thấy máy chủ
    // mới, trái hẳn lời vừa báo. Token thừa nằm lại chỉ đổi lấy vài lần 401.
    await Promise.allSettled([tokenStore.xoa(), banStore.xoa(), orderTokenStore.xoaHet()]);
    setDangNhap(null);
    setPhienBan(null);
    setCauHinh(moi);
    setManNgoai(null);
  }, []);

  const roiBan = useCallback(async () => {
    if (client === null) return;
    try {
      await client.ban.roiBan();
    } catch {
      // Xoá phiên bàn hỏng thì KHÔNG được dọn màn hình. Kho vẫn giữ phiên, nên mở lại app là
      // khách ngồi lại đúng bàn vừa "rời" — một nút bấm xong tự hoàn tác là thứ không ai hiểu nổi.
      //
      // Bản cũ không bắt gì: `onRoiBan={() => void roiBan()}` nuốt lời hứa bị từ chối, nút Rời bàn
      // đứng im, và không có câu nào nói vì sao.
      setTin('Không rời bàn được. Thử lại.');
      return;
    }
    // Token đơn của bàn cũ không dùng được nữa — không có lý do giữ. Nhưng phiên bàn đã xoá xong
    // rồi: chặn khách rời bàn vì một việc dọn dẹp là đổi lỗi nhỏ lấy lỗi to.
    try {
      await orderTokenStore.xoaHet();
    } catch {
      // Token thừa của bàn cũ chỉ còn mở được quyền huỷ món trên những đơn của phiên đã đóng.
    }
    setPhienBan(null);
  }, [client]);

  const dangXuat = useCallback(async () => {
    if (client === null) return;
    try {
      await client.auth.dangXuat();
    } catch {
      // Cùng luật với `roiBan`, và ở đây là chuyện bảo mật chứ không chỉ chuyện khó hiểu: token
      // còn nguyên trong Keystore. Dọn màn hình như thể đã đăng xuất sẽ cho khách tin là mình đã
      // ra — rồi người cầm máy tiếp theo mở app và vào thẳng tài khoản đó.
      setTin('Không đăng xuất được. Thử lại.');
      return;
    }
    setDangNhap(null);
    setSoDienThoai(null);
  }, [client]);

  if (dangKhoiPhuc) {
    return (
      <SafeAreaView style={[kieuChung.man, { justifyContent: 'center' }]}>
        <ActivityIndicator color={MauQuan.chestnut} />
      </SafeAreaView>
    );
  }

  // Chưa có địa chỉ máy chủ thì KHÔNG có gì để hiện: mọi màn hình khác đều bắt đầu bằng một lời
  // gọi mạng. Bắt nhập trước là trung thực hơn một màn hình trống kèm lỗi.
  if (cauHinh === null || client === null || manNgoai === 'caiDat') {
    return (
      <SafeAreaView style={kieuChung.man}>
        <StatusBar style="dark" />
        <ServerSettingsScreen
          batBuoc={cauHinh === null}
          hienTai={cauHinh ?? { apiBaseUrl: '', imageBaseUrl: '' }}
          onLuu={luuCauHinh}
        />
      </SafeAreaView>
    );
  }

  if (manNgoai === 'dangNhap') {
    return (
      <SafeAreaView style={kieuChung.man}>
        <StatusBar style="dark" />
        <LoginScreen
          onDangNhapXong={(ses) => {
            setDangNhap(ses);
            setManNgoai(null);
            // Đăng nhập GIỮA chừng phiên bàn là đường đi thường gặp nhất, vì app không cho đăng
            // nhập trước khi vào bàn.
            void dongBo(ses, phienBan);
          }}
          layTokenGoogle={LAY_TOKEN_GOOGLE}
          // Không có thư viện OTP thì KHÔNG hiện đường tạo tài khoản bằng số. Cùng luật với nút
          // Google: một nút bấm vào chỉ để nhận lỗi còn tệ hơn không có nút.
          onTaoTaiKhoan={GUI_MA_OTP === undefined ? undefined : () => setManNgoai('dangKy')}
          repository={client.auth}
        />
      </SafeAreaView>
    );
  }

  if (manNgoai === 'dangKy' && GUI_MA_OTP !== undefined) {
    return (
      <SafeAreaView style={kieuChung.man}>
        <StatusBar style="dark" />
        <DangKySoDienThoai
          guiMaOtp={GUI_MA_OTP}
          onDangKyXong={(ses) => {
            // Vào thẳng app, y như đăng nhập: `dangKy` đã gọi tiếp `/login` và trả về phiên thật.
            setDangNhap(ses);
            setManNgoai(null);
            void dongBo(ses, phienBan);
          }}
          onQuayLai={() => setManNgoai('dangNhap')}
          repository={client.auth}
        />
      </SafeAreaView>
    );
  }

  // Hồ sơ mở được NGOÀI phiên bàn. Tab Tài khoản nằm trong KhungChinh, thứ chỉ tồn tại khi đã
  // mở bàn — nếu hồ sơ chỉ sống ở đó thì khách tạo tài khoản ở nhà không liên kết được số cho
  // tới khi quét QR ngồi vào bàn, trong khi liên kết chẳng dính gì tới bàn nào.
  if (manNgoai === 'hoSo' && dangNhap !== null) {
    return (
      <SafeAreaView style={kieuChung.man}>
        <StatusBar style="dark" />
        <ManCoNutVe onVe={() => setManNgoai(null)}>
          <HoSoTaiKhoan
            api={client.loyaltyApi}
            dangNhap={dangNhap}
            guiMaOtp={GUI_MA_OTP}
            onBaoTin={setTin}
            onNoiSoXong={setSoDienThoai}
            onXong={() => setManNgoai(null)}
            soDienThoai={soDienThoai}
          />
        </ManCoNutVe>
      </SafeAreaView>
    );
  }

  // KHÔNG bắt đăng nhập trước khi vào bàn. Khách vãng lai phải dùng được app đúng như web; đăng
  // nhập chỉ đổi lấy việc đơn được gắn tài khoản (§9.4).
  if (phienBan === null) {
    return (
      <SafeAreaView style={kieuChung.man}>
        <StatusBar style="dark" />
        <OpenTableScreen
          dangNhapVoi={dangNhap}
          onDangNhap={() => setManNgoai('dangNhap')}
          onMoHoSo={() => setManNgoai('hoSo')}
          soDienThoai={soDienThoai}
          onMoPhienXong={(ban) => {
            setPhienBan(ban);
            // Phiên vừa mở đã kèm token nếu khách đã đăng nhập, nên chỉ cần đọc số điện thoại —
            // nhưng vẫn đi qua cùng một hàm để không có nhánh nào lệch luật với nhánh khác.
            void dongBo(dangNhap, null);
          }}
          repository={client.ban}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={kieuChung.man}>
      <StatusBar style="dark" />
      <KhungChinh
        cartApi={client.cartApi}
        guiMaOtp={GUI_MA_OTP}
        cauHinh={cauHinh}
        createOrderApi={client.createOrderApi}
        dangNhap={dangNhap}
        favouriteApi={client.favouriteApi}
        historyApi={client.historyApi}
        invoiceApi={client.invoiceApi}
        loyaltyApi={client.loyaltyApi}
        menuApi={client.menuApi}
        onBaoTin={setTin}
        onDangNhap={() => setManNgoai('dangNhap')}
        onDangXuat={() => void dangXuat()}
        onMoCaiDat={() => setManNgoai('caiDat')}
        onRoiBan={() => void roiBan()}
        orderApi={client.orderApi}
        phienBan={phienBan}
        promotionApi={client.promotionApi}
        onNoiSoXong={setSoDienThoai}
        soDienThoai={soDienThoai}
        tokenStore={orderTokenStore}
      />
      {/*
        Dải báo tin đơn giản thay cho ScaffoldMessenger của Flutter. React Native không có thứ
        tương đương sẵn có, và mọi màn hình đã đẩy lời báo ra ngoài qua onBaoTin — nên chỗ hiển
        thị nằm đúng ở đây, một lần cho cả app.
      */}
      {tin !== null ? (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 72,
            backgroundColor: MauQuan.ink,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text
            accessibilityLabel="Thông báo"
            onPress={() => setTin(null)}
            style={{ color: MauQuan.trang }}
          >
            {tin}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
