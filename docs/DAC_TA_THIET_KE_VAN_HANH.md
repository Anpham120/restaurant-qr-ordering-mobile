# Đặc tả thiết kế lại giao diện vận hành

Ba mặt: **bếp**, **quầy thu ngân**, **quản trị**. Không đụng mặt khách hàng.

---

## 0. Vì sao đợt này bắt đầu bây giờ

`KE_HOACH_GIAO_DIEN.md` §4 đã cố ý hoãn đúng việc này:

> Không đổi hệ màu, không đổi font, không đổi `tokens.css`. […] Đổi bảng màu là đợt việc riêng, và
> nó phải bắt đầu từ một lý do — hiện chưa có lý do nào ngoài "muốn mới".

Điều kiện đó nay đã đủ. Lý do không phải "muốn mới" mà là **những con số dưới đây**, đo trên mã
đang chạy chứ không ước lượng.

---

## 1. Hiện trạng — đo, không ước lượng

| # | Đo được | Con số | Vì sao là vấn đề |
|---|---|---|---|
| 1 | Chế độ tối | **0** lần `prefers-color-scheme` hoặc `data-theme` trong cả `operations.css` lẫn `tokens.css` | Dòng đầu `operations.css` tự nhận là *"dark-mode aware"*. Không có. Bếp là chỗ sáng chói, quầy chạy 12 tiếng. **Đã xây rồi gỡ bỏ sau khi đo — §3.3** |
| 2 | Cỡ chữ | **23 giá trị khác nhau**, trộn `px` và `rem` | Không có thang. Ba cỡ dùng nhiều nhất: 12px (14 lần), 13px (11 lần), 11px (8 lần) |
| 3 | Vùng chạm | `.ops-btn` ≈ **34px** cao, `.ops-btn--sm` ≈ **26px**, dùng **65 lần** (28 trong `pages/`, 37 trong `components/`) | Chuẩn cảm ứng là 44×44. `min-height: 44px` chỉ tồn tại cho nút thẻ bếp và **chỉ dưới `max-width: 768px`** |
| 4 | Điểm ngắt | **4** giá trị rời rạc — 760, 768, 900, 1100 — qua 5 khối `@media` | Không phải thang. Máy POS/tablet ở 1024px rơi vào vùng "desktop" và nhận cỡ chữ, cỡ nút của desktop |
| 5 | Chữ số tiền | `tabular-nums` xuất hiện 8 lần nhưng chỉ ở **3** vùng (`pos-items`, `ops-cash-change`, `ops-cash-short`) | Cột tiền trong `ops-table` và thẻ thống kê **không** canh cột — mắt phải đọc từng số thay vì quét |
| 6 | Style rời | **38** lần `style={{` trên 7 màn vận hành: bếp 12 · khuyến mãi 6 · báo cáo 6 · hoá đơn 6 · tích điểm 5 · ca quầy 2 · thanh toán 1 | Mỗi cái là một chỗ hệ thiết kế không phủ tới |
| 7 | Nền tảng | `tokens.css` là hệ **thương hiệu khách hàng**: 5 gradient, glass `blur(12px)`, xanh CMC | Đang dùng lại nguyên si cho mặt vận hành |
| 8 | ~~Mã chết~~ **SAI** | `CounterMobileShell.tsx` — tôi ghi là không ai import. Nó ĐANG chạy, dùng ở `apps/admin-web/src/main.tsx` làm thanh điều hướng dưới cho vai quầy | Lỗi đo của tôi: quét `frontend/src` mà quên `frontend/apps`. Cùng nguyên nhân với hai sai số ở dòng 3 và 6 |

### 1.1 Cái ĐANG đúng, phải giữ

Không viết lại từ số không. Những thứ sau đang chạy tốt và là nền để xây tiếp:

- **Màu nhấn theo vai** đã chốt và đúng: admin `#7c3aed`, quầy `#0284c7`, bếp `#ea580c`
- **12 component `Ops*`**: `OpsHubShell`, `OpsHubTabs`, `OpsConfirmProvider`, `OpsToastProvider`,
  `OpsRealtimeProvider`, `OpsErrorBoundary`, `OpsConnectionBadge`…
- **Thang khoảng cách 8px** trong `tokens.css` — đã có, chỉ chưa được dùng nhất quán
- **Quyết định dựng cả sáu tab của quầy rồi ẩn** (`CounterHubPage`) — đúng, vì đổi tab không được
  xoá chữ người dùng đang gõ. Giữ nguyên.

### 1.2 Ràng buộc thiết bị — đã xác nhận, không phải giả định

Hai điều này quyết định gần như mọi con số ở §3. Đã hỏi và được xác nhận:

| Mặt | Thiết bị | Hệ quả |
|---|---|---|
| **Bếp** | tablet / màn dựng đứng, khoảng **1024px** | Bậc `pos` là bậc **chính**, không phải bậc phụ. Bố cục 4 cột hiện tại rơi đúng vào đây và mỗi thẻ chỉ còn ~250px |
| **Quầy** | **có màn cảm ứng** | Vùng chạm 44/56px là bắt buộc chứ không phải cho đẹp. Bàn phím số trên màn đáng làm |

Nếu về sau bếp đổi sang TV treo tường, hoặc quầy bỏ cảm ứng dùng chuột, thì §3.2 và §4 phải viết
lại — nên ghi ra đây để lần sau còn biết chỗ nào lung lay.

---

## 2. Nguyên tắc: mặt vận hành **không phải** mặt khách hàng

Đây là gốc của phần lớn vấn đề ở §1. Cùng một hệ token phục vụ hai loại màn hình có đòi hỏi ngược nhau:

| | Mặt khách hàng | Mặt vận hành |
|---|---|---|
| Người dùng | lần đầu, tự nguyện, rảnh tay | thuộc lòng, bắt buộc, **một tay bận** |
| Đo bằng | ấn tượng, tỉ lệ chuyển đổi | **giây**, số thao tác, số lần bấm nhầm |
| Khoảng cách mắt | 30cm, điện thoại cầm tay | 60–80cm, màn hình dựng trên quầy |
| Ánh sáng | tuỳ ý | bếp chói, quầy có thể tối |
| Màu | dẫn dắt, gợi cảm xúc | **mã hoá trạng thái** — sai màu là sai việc |
| Gradient, glass | hợp | **nhiễu** — làm nền chuyển động dưới chữ cần đọc nhanh |

**Bốn luật rút ra:**

1. **Màu trên mặt vận hành phải mang thông tin.** Mỗi màu ứng một trạng thái, không dùng để trang trí.
2. **Không gradient, không glass, không blur** trong vùng đọc dữ liệu. Nền phẳng, tương phản cao.
3. **Chữ và nút to hơn mặt khách hàng, không nhỏ hơn.** Ngược với trực giác "màn quản trị thì gọn".
4. **Trạng thái phải đọc được không cần màu** — hình dạng, nhãn, vị trí. Bếp có người mù màu, và
   màn hình bị chói làm mất phân biệt màu.

---

## 3. Đặc tả hệ thống

Ba thay đổi nền, áp cho cả ba mặt. Đặt trong một tệp riêng `ops-tokens.css`, **không** sửa
`tokens.css` — mặt khách hàng giữ nguyên hệ hiện tại.

### 3.1 Thang chữ — 6 bậc, thay cho 23 giá trị

| Bậc | Cỡ | Dùng cho |
|---|---|---|
| `--ops-text-xs` | 13px | nhãn phụ, chú thích. **Sàn tuyệt đối**, không có gì nhỏ hơn |
| `--ops-text-sm` | 15px | chữ thường trong bảng, phụ đề |
| `--ops-text-base` | 17px | chữ chính, nhãn nút |
| `--ops-text-lg` | 20px | tên món, mã bàn, tiêu đề thẻ |
| `--ops-text-xl` | 28px | số tiền, số đếm |
| `--ops-text-2xl` | 40px | con số duy nhất của màn hình (tổng tiền phải thu) |

Sàn 13px thay cho 11px hiện tại. Toàn bộ dùng `rem` để tôn trọng cỡ chữ hệ thống của người dùng.

### 3.2 Vùng chạm — một cỡ, không có "sm"

| Token | Cao | Dùng cho |
|---|---|---|
| `--ops-touch` | **44px** | mọi nút, mọi ô nhập, mọi hàng bấm được |
| `--ops-touch-lg` | **56px** | hành động chính của màn (Thu tiền, Xong món) |

**`ops-btn--sm` bị xoá.** 65 chỗ đang dùng nó chuyển sang cỡ chuẩn. Nếu một khu vực chật tới mức
cần nút 26px thì khu vực đó bố cục sai, không phải nút sai.

Khoảng cách tối thiểu giữa hai vùng chạm: **8px**.

### 3.3 Chế độ tối — ĐÃ XÂY, ĐÃ ĐO, ĐÃ GỠ BỎ

> **Mục này giữ lại làm hồ sơ quyết định. Đừng làm theo nó.** Bản đầu của đặc tả ghi chế độ tối là
> *"bắt buộc, không phải tuỳ chọn"*, với lý do hợp lý: bếp màn dựng đứng phòng chói, quầy chạy 12
> tiếng. Nó đã được xây đủ ba trạng thái, chạy được, rồi bị gỡ bỏ sau khi đo.

Lý do gỡ **không phải** "làm chưa xong". Đây là ba phép đo trên chính bảng màu đã dựng:

| Đo | Con số | Vì sao nó gây mỏi mắt |
|---|---|---|
| Năm mặt nền tối cách nhau | **1.02 – 1.12:1** | Dưới ngưỡng phân biệt của mắt. Thẻ, nền, vùng chìm nhoè thành một mảng — ranh giới biến mất, và đó là cảm giác "rối" |
| Chữ chính trên thẻ | **14.1:1** | Đạt WCAG rất dư, nhưng ở nền tối thì chữ gần trắng gây *halation* — tự phát sáng nhoè viền. Vùng dễ chịu là 10–12:1 |
| Sắc trạng thái | **10 sắc, bão hoà TB 72%**; 6 cặp cách nhau <30° | Bão hoà cao trên nền tối gây quang sai. `info` 213° và `cancelled` 215° cách **2°** — hai ý nghĩa khác nhau mà mắt đọc thành một |

Điều đáng nhớ nhất: **mọi cặp màu đều đạt 4.5:1, mà người dùng vẫn báo mỏi hơn khi không có chế độ
tối.** Tỷ lệ tương phản đo *đọc được*; nó không đo *nhìn cả ca có chịu nổi không*. Đặc tả cũ đặt
tiêu chí nghiệm thu là "đọc được, không chỗ nào chữ trùng nền" — tiêu chí đó đã đạt, và vẫn hỏng.

Hiện tại: **một bảng màu sáng duy nhất cho toàn hệ thống, kể cả bảng bếp.** Một phép kiểm quét mọi
tệp `css`/`ts`/`tsx` của frontend chặn `prefers-color-scheme` và `data-theme` quay lại. Cổng quét
cả kho chứ không riêng tệp token — bản trước chỉ canh `ops-tokens.css` nên đã bỏ lọt khi khối tối
mọc sang `operations.css`, `floor-map.css` và `counter-hub.css`.

Muốn dựng lại chế độ tối thì xoá phép kiểm đó một cách công khai, kèm bảng màu đã đo — với bậc nền
tách nhau ≥1.25:1, chữ chính 10–12:1, và không quá 5 sắc trạng thái.

### 3.4 Điểm ngắt — 3 bậc theo thiết bị thật

| | Bề ngang | Thiết bị thật |
|---|---|---|
| `compact` | < 768px | điện thoại phục vụ bàn |
| `pos` | 768–1279px | **máy POS, tablet bếp** — bậc hiện đang thiếu |
| `wide` | ≥ 1280px | màn quản trị |

Bậc `pos` là chỗ hổng lớn nhất hôm nay: 1024px rơi vào "desktop" và nhận cỡ desktop. Ở bậc này,
cỡ chữ và vùng chạm phải **bằng hoặc lớn hơn** bậc `compact`, không nhỏ đi.

### 3.5 Số liệu

Mọi số tiền, số lượng, thời lượng: `font-variant-numeric: tabular-nums`, canh phải trong bảng.
Đây là điều kiện để **quét** một cột thay vì **đọc** từng dòng.

---

## 4. Đặc tả từng mặt

### 4.1 Bếp — `KitchenRealtimePage`

**Câu hỏi màn hình phải trả lời trong 2 giây, từ 1 mét:** *món nào làm trước?*

| Hạng mục | Đặc tả |
|---|---|
| Chủ đề | **Tối mặc định** |
| Bố cục | Giữ bảng cột theo trạng thái. Bậc `pos` **2 cột**, không phải 4 — 4 cột ở 1024px khiến mỗi thẻ hẹp 250px |
| Đơn vị chính | **Giữ thẻ đơn.** Xem ghi chú bên dưới — bản đầu của đặc tả này nói ngược lại và nó sai |
| Chip món | Sàn chạm **44px**, ở MỌI bậc. Hiện là 36px và chỉ dưới 768px — ở bậc `pos` không có sàn nào |
| Thứ tự | Cũ nhất lên đầu, **luôn luôn**. Không cho sắp xếp khác — mọi cách sắp xếp khác đều là cách làm sai thứ tự |
| Số phút chờ | `--ops-text-xl`, tabular-nums, **luôn hiện**. Đây là con số quyết định |
| Ngưỡng cảnh báo | ≤10 phút bình thường · 10–20 chú ý · >20 khẩn. Mã hoá bằng **màu + viền + nhãn chữ**, không chỉ màu |
| Hành động | Một nút chính mỗi thẻ, `--ops-touch-lg` (56px), rộng hết thẻ |
| Cấm | Không gradient, không glass, không animation trong vùng thẻ. Chỉ chuyển động khi trạng thái đổi |

**12 chỗ `style={{}}` trong tệp này chuyển hết vào CSS.** Nhiều nhất trong ba mặt.

#### Vì sao KHÔNG tách món thành thẻ riêng

Bản đầu của đặc tả này viết *"đơn vị chính là thẻ món, không phải thẻ đơn — bếp làm món, không làm
đơn"*. Câu đó viết ra trước khi đọc `KitchenBoard.tsx` (621 dòng), và đọc rồi thì nó sai ở hai đầu.

**Năng lực nó muốn thêm đã có sẵn.** Mỗi món trong thẻ đơn là một `<button>` bấm được để chuyển
trạng thái riêng (`onItemTap`), có `aria-label` mô tả đầy đủ, và tách rõ `Ready` với `Served` — kèm
ghi chú trong mã giải thích vì sao không gộp hai cái. Tách món ra thẻ riêng không thêm gì.

**Và nó phá ba thứ đang đúng.** Một đơn 6 món thành 6 thẻ rời, người trực bếp mất luôn câu trả lời
"bàn này còn thiếu gì". Mất kéo-thả giữa cột và vuốt-phải để chuyển trạng thái. Mất
`getKitchenPrimaryAction(order)` — logic chọn hành động kế tiếp theo cả đơn.

Đơn của một bàn phải ra **cùng lúc**. Bỏ nhóm theo đơn là bỏ đúng thông tin bếp cần.

Vấn đề THẬT ở tầng món là vùng chạm: chip món đặt `min-height: 36px` và chỉ dưới `max-width: 768px`,
nên ở bậc `pos` — bậc bếp thật sự chạy — nó không có sàn nào.

### 4.2 Quầy thu ngân — `CounterHubPage` + 5 panel

**Câu hỏi:** *bàn nào cần tôi ngay bây giờ?*

| Hạng mục | Đặc tả |
|---|---|
| Chủ đề | Theo hệ điều hành |
| Cấu trúc | **Giữ 6 tab dựng sẵn ẩn/hiện** — quyết định hiện tại đúng và có lý do ghi rõ trong mã |
| Dải điều phối | Giữ. Nó nằm ngoài tab và không tự tắt — đúng |
| Số cần đòi hỏi | Mỗi tab hiện **số việc đang chờ** ngay trên nhãn tab, không phải chỉ ở trong tab |
| Màn thu tiền | Tổng tiền `--ops-text-2xl`. Tiền khách đưa và tiền thối cùng cỡ, cùng canh cột |
| Bàn phím số | Ở bậc `pos`, ô nhập tiền có bàn phím số **56px/phím** trên màn — không bắt dùng bàn phím vật lý |
| Hoàn tiền | Giữ nguyên: nút đỏ, hỏi lại, **bắt gõ lại mã hoá đơn**. Đây là thao tác không lùi được |
| `CounterMobileShell` | **GIỮ** — nó là thanh điều hướng dưới đang chạy, không phải mã chết. Nâng vùng chạm lên 44px và bỏ `backdrop-filter` |

### 4.3 Quản trị — 7 trang phẳng

**Câu hỏi:** *hôm nay có gì bất thường?*

Đây là mặt yếu nhất về **kiến trúc thông tin**, không phải về thẩm mỹ. Bảy trang ngang hàng
(`menu`, `promotions`, `loyalty`, `reports`, `users`, `tables`, `orders`) không nói lên cái gì
quan trọng hơn cái gì.

| Hạng mục | Đặc tả |
|---|---|
| Trang chủ | `RoleLandingPage` hiện chỉ điều hướng. Đổi thành **bảng số liệu**: doanh thu hôm nay, số bàn đang mở, số bàn quá giờ, số hoá đơn chờ — mỗi ô bấm được, dẫn thẳng tới chỗ xử lý |
| Nhóm điều hướng | Gộp 7 mục thành 3 nhóm: **Vận hành** (bàn, đơn, hoá đơn) · **Kinh doanh** (thực đơn, khuyến mãi, tích điểm) · **Hệ thống** (người dùng, báo cáo) |
| Bảng | Cột tiền canh phải + tabular-nums. Cột trạng thái dùng chip có nhãn chữ |
| Báo cáo | Số trước, biểu đồ sau. Mỗi biểu đồ có một câu trả lời một câu ngay trên nó |
| Mật độ | Bậc `wide` được phép dày hơn hai mặt kia — admin ngồi bàn, không đứng quầy |

---

## 5. Thứ tự làm

Mỗi đợt là một PR, có phép kiểm riêng, không đợt nào phá đợt trước.

| Đợt | Việc | Xong khi |
|---|---|---|
| **1** | `ops-tokens.css`: thang chữ, vùng chạm, điểm ngắt, chế độ tối (SAU ĐÓ GỠ BỎ — §3.3). Chưa đụng màn nào | Phép kiểm: không token màu nào chỉ tồn tại trong khối `@media`/`[data-theme]` |
| **2** | Xoá `ops-btn--sm` (28 chỗ), áp vùng chạm 44/56px | Phép kiểm: không quy tắc CSS nào cho nút có chiều cao tính ra < 44px |
| **3** | Bếp: chủ đề tối (SAU ĐÓ GỠ BỎ — §3.3), thẻ món, ngưỡng phút, 2 cột ở bậc `pos`, dọn 12 `style={{}}` | Phép kiểm: `KitchenRealtimePage` không còn `style={{`; ngưỡng phút có test đơn vị |
| **4** | Quầy: số việc chờ trên nhãn tab, bàn phím số bậc `pos`, thứ bậc số tiền, sàn chạm cho thanh điều hướng dưới | Phép kiểm: không vùng bấm nào ở quầy dưới 44px; tiền thối và tiền thiếu cùng cỡ |
| **5** | Admin: bảng số liệu ở trang chủ, gộp điều hướng 3 nhóm, tabular-nums toàn bảng | Phép kiểm: mọi cột tiền trong `ops-table` có `tabular-nums` |
| **6** | Dọn `style={{}}` còn lại (26 chỗ ngoài bếp) | `style={{` trên 7 màn vận hành bằng 0 |

---

## 6. Cái **không** làm

- **Không đổi `tokens.css`.** Mặt khách hàng giữ nguyên. Hệ mới nằm ở `ops-tokens.css` và chỉ mặt
  vận hành nạp.
- **Không đổi màu nhấn theo vai.** Admin tím, quầy xanh, bếp cam đã chốt và đang đúng.
- **Không viết lại component.** Mười hai `Ops*` đang chạy, có test, có người dùng thật.
- **Không đụng `mobile-rn`.**
- **Không đổi luồng nghiệp vụ.** Đây là đặc tả giao diện. Bấm ở đâu ra cái gì thì giữ nguyên; đổi
  cách nó trông và cách nó phản hồi.

---

## 7. Cách biết cả đợt đã xong

Không đo bằng "trông đẹp hơn". Đo bằng:

1. `grep -c "font-size" ops-tokens.css` ra **6 bậc**, và không quy tắc nào trong `operations.css`
   khai `font-size` bằng giá trị rời
2. Không nút nào tính ra dưới 44px ở bất kỳ điểm ngắt nào
3. ~~Chuyển hệ điều hành sang chế độ tối: cả ba mặt đọc được, không chỗ nào chữ trùng nền~~
   → **Thay bằng:** chuyển hệ điều hành sang chế độ tối thì cả ba mặt **vẫn hiện bảng màu sáng**,
   không đổi gì. Tiêu chí cũ đã ĐẠT mà giao diện vẫn hỏng — xem §3.3
4. Ở bề ngang 1024px, cỡ chữ và vùng chạm **không nhỏ hơn** ở 375px
5. `style={{` trên 7 màn vận hành bằng **0** (25 chỗ ở mặt khách hàng KHÔNG thuộc đợt này)
6. Toàn bộ suite hiện tại vẫn xanh — đặc tả này không đổi hành vi nào
