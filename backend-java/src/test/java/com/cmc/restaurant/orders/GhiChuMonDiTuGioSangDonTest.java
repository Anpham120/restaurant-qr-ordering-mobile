package com.cmc.restaurant.orders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cmc.restaurant.cart.CartService;
import com.cmc.restaurant.menu.MenuItemEntity;
import com.cmc.restaurant.menu.MenuItemRepository;
import com.cmc.restaurant.menu.MenuItemServingPeriodRepository;
import com.cmc.restaurant.menu.ServingPeriodRepository;
import com.cmc.restaurant.orders.adapter.out.persistence.OrderEntity;
import com.cmc.restaurant.orders.adapter.out.persistence.OrderItemEntity;
import com.cmc.restaurant.orders.adapter.out.persistence.OrderItemRepository;
import com.cmc.restaurant.orders.adapter.out.persistence.OrderPersistenceAdapter;
import com.cmc.restaurant.orders.adapter.out.persistence.OrderRepository;
import com.cmc.restaurant.orders.adapter.out.persistence.OrderStatusHistoryRepository;
import com.cmc.restaurant.orders.application.OrderDtos;
import com.cmc.restaurant.orders.application.OrderItemEstimationService;
import com.cmc.restaurant.orders.application.OrderLookup;
import com.cmc.restaurant.orders.application.OrderService;
import com.cmc.restaurant.payments.PaymentRepository;
import com.cmc.restaurant.payments.VietQrProvider;
import com.cmc.restaurant.promotions.PromotionService;
import com.cmc.restaurant.realtime.OrderRealtimeNotifier;
import com.cmc.restaurant.shared.ActorContext;
import com.cmc.restaurant.shared.ApiException;
import com.cmc.restaurant.tables.RestaurantTableEntity;
import com.cmc.restaurant.tables.RestaurantTableRepository;
import com.cmc.restaurant.tables.TableInvoiceDtos;
import com.cmc.restaurant.tables.TableInvoiceRepository;
import com.cmc.restaurant.tables.TableInvoiceService;
import com.cmc.restaurant.tables.TableSessionCapability;
import com.cmc.restaurant.tables.TableSessionEntity;
import com.cmc.restaurant.tables.TableSessionRepository;
import com.cmc.restaurant.tables.TableSessionStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

class GhiChuMonDiTuGioSangDonTest {

	private OrderRepository orderRepository;
	private OrderItemRepository orderItemRepository;
	private OrderStatusHistoryRepository orderStatusHistoryRepository;
	private PaymentRepository paymentRepository;
	private MenuItemRepository menuItemRepository;
	private RestaurantTableRepository tableRepository;
	private ServingPeriodRepository caRepository;
	private MenuItemServingPeriodRepository ganCaRepository;
	private TableSessionRepository tableSessionRepository;
	private OrderItemEstimationService estimationService;
	private OrderRealtimeNotifier realtimeNotifier;
	private OrderPersistenceAdapter persistence;
	private CartService cartService;
	private PromotionService promotionService;
	private ApplicationEventPublisher suKien;

	private OrderService orderService;

	@BeforeEach
	void setUp() {
		orderRepository = mock(OrderRepository.class);
		orderItemRepository = mock(OrderItemRepository.class);
		orderStatusHistoryRepository = mock(OrderStatusHistoryRepository.class);
		paymentRepository = mock(PaymentRepository.class);
		menuItemRepository = mock(MenuItemRepository.class);
		tableRepository = mock(RestaurantTableRepository.class);
		caRepository = mock(ServingPeriodRepository.class);
		ganCaRepository = mock(MenuItemServingPeriodRepository.class);
		tableSessionRepository = mock(TableSessionRepository.class);
		estimationService = mock(OrderItemEstimationService.class);
		realtimeNotifier = mock(OrderRealtimeNotifier.class);
		persistence = mock(OrderPersistenceAdapter.class);
		cartService = mock(CartService.class);
		promotionService = mock(PromotionService.class);
		suKien = mock(ApplicationEventPublisher.class);

		orderService = new OrderService(
				orderRepository, orderItemRepository, orderStatusHistoryRepository, paymentRepository,
				menuItemRepository, tableRepository, caRepository, ganCaRepository,
				tableSessionRepository, estimationService, realtimeNotifier, persistence,
				cartService, promotionService, suKien);

		when(caRepository.findAll()).thenReturn(List.of());
		when(ganCaRepository.findAll()).thenReturn(List.of());
		when(orderRepository.nextOrderCodeNumber()).thenReturn(1001L);
		when(promotionService.tryApply(any(), any(), any())).thenReturn(Optional.empty());
	}

	private void setupBanVaPhien(String tableCode, String sessionId) {
		RestaurantTableEntity table = mock(RestaurantTableEntity.class);
		when(table.getId()).thenReturn("tbl_1");
		when(table.getTableCode()).thenReturn(tableCode);
		when(table.isActive()).thenReturn(true);
		when(tableRepository.findByTableCodeAndActiveTrue(tableCode)).thenReturn(Optional.of(table));

		TableSessionEntity session = mock(TableSessionEntity.class);
		when(session.getId()).thenReturn(sessionId);
		when(session.getRestaurantTableId()).thenReturn("tbl_1");
		when(session.getStatus()).thenReturn(TableSessionStatus.Open);
		when(session.getExpiresAt()).thenReturn(OffsetDateTime.now().plusHours(2));
		when(tableSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
	}

	private void setupMonAn(String menuItemId, String ten, BigDecimal gia) {
		MenuItemEntity item = mock(MenuItemEntity.class);
		when(item.getId()).thenReturn(menuItemId);
		when(item.getName()).thenReturn(ten);
		when(item.getPrice()).thenReturn(gia);
		when(item.isAvailable()).thenReturn(true);
		when(item.getCostPrice()).thenReturn(BigDecimal.valueOf(10000));
		when(menuItemRepository.findById(menuItemId)).thenReturn(Optional.of(item));
		when(menuItemRepository.truTonKho(anyString(), anyInt())).thenReturn(1);
	}

	@Test
	@DisplayName("Ghi chú từ giỏ hàng được giữ nguyên khi chuyển sang OrderItemEntity")
	void ghiChuTuGioChuyenVaoOrderItemEntityKhiTaoDon() {
		setupBanVaPhien("T01", "ts_123");
		setupMonAn("mi_pho", "Phở Bò Tái", BigDecimal.valueOf(50000));

		when(cartService.notesOf("ts_123")).thenReturn(Map.of("mi_pho", "Không hành, nước béo"));

		OrderDtos.CreateOrderRequest request = new OrderDtos.CreateOrderRequest(
				"DineIn", "T01", "qr_tok_valid", "ts_123",
				List.of(new OrderDtos.CreateOrderItemRequest("mi_pho", 2, null)),
				null, null);

		orderService.createOrder(request, "idem_1", "fp_1", ActorContext.CUSTOMER);

		ArgumentCaptor<OrderEntity> captor = ArgumentCaptor.forClass(OrderEntity.class);
		verify(orderRepository).save(captor.capture());

		OrderEntity savedOrder = captor.getValue();
		assertThat(savedOrder.getItems()).hasSize(1);
		OrderItemEntity orderItem = savedOrder.getItems().get(0);
		assertThat(orderItem.getMenuItemId()).isEqualTo("mi_pho");
		assertThat(orderItem.getNote()).isEqualTo("Không hành, nước béo");

		verify(cartService).clearAfterOrderPlaced("ts_123");
	}

	@Test
	@DisplayName("Ghi chú truyền trực tiếp trong CreateOrderItemRequest ghi đè ghi chú giỏ hàng")
	void ghiChuTrucTiepGhiDeGhiChuGio() {
		setupBanVaPhien("T01", "ts_123");
		setupMonAn("mi_pho", "Phở Bò Tái", BigDecimal.valueOf(50000));

		when(cartService.notesOf("ts_123")).thenReturn(Map.of("mi_pho", "Không hành"));

		OrderDtos.CreateOrderRequest request = new OrderDtos.CreateOrderRequest(
				"DineIn", "T01", "qr_tok_valid", "ts_123",
				List.of(new OrderDtos.CreateOrderItemRequest("mi_pho", 1, "Nhiều hành, ít bánh")),
				null, null);

		orderService.createOrder(request, "idem_2", "fp_2", ActorContext.CUSTOMER);

		ArgumentCaptor<OrderEntity> captor = ArgumentCaptor.forClass(OrderEntity.class);
		verify(orderRepository).save(captor.capture());

		OrderItemEntity orderItem = captor.getValue().getItems().get(0);
		assertThat(orderItem.getNote()).isEqualTo("Nhiều hành, ít bánh");
	}

	@Test
	@DisplayName("Ghi chú dài quá 500 ký tự bị từ chối với lỗi ORDER_NOTE_TOO_LONG")
	void ghiChuQua500KyTuBiChan() {
		setupBanVaPhien("T01", "ts_123");
		setupMonAn("mi_pho", "Phở Bò Tái", BigDecimal.valueOf(50000));

		String longNote = "x".repeat(501);
		OrderDtos.CreateOrderRequest request = new OrderDtos.CreateOrderRequest(
				"DineIn", "T01", "qr_tok_valid", "ts_123",
				List.of(new OrderDtos.CreateOrderItemRequest("mi_pho", 1, longNote)),
				null, null);

		assertThatThrownBy(() -> orderService.createOrder(request, "idem_3", "fp_3", ActorContext.CUSTOMER))
				.isInstanceOf(ApiException.class)
				.satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo("ORDER_NOTE_TOO_LONG"));
	}

	@Test
	@DisplayName("Hoá đơn bàn gom nhóm món theo cùng mã và cùng ghi chú")
	void hoaDonGomNhomTheoGhiChu() {
		TableSessionRepository sessionRepo = mock(TableSessionRepository.class);
		RestaurantTableRepository tblRepo = mock(RestaurantTableRepository.class);
		TableInvoiceRepository invRepo = mock(TableInvoiceRepository.class);
		TableSessionCapability cap = mock(TableSessionCapability.class);
		com.cmc.restaurant.auth.JwtProperties jwtProps = mock(com.cmc.restaurant.auth.JwtProperties.class);
		OrderLookup orderLookup = mock(OrderLookup.class);
		VietQrProvider vietQr = mock(VietQrProvider.class);

		TableInvoiceService invoiceService = new TableInvoiceService(
				sessionRepo, tblRepo, invRepo, cap, jwtProps, orderLookup, vietQr);

		when(orderLookup.findRoundsForTableSession("ts_123")).thenReturn(List.of());
		when(orderLookup.findBillableItemsForTableSession("ts_123")).thenReturn(List.of(
				new OrderLookup.BillableItem("m1", "Trà Đào", BigDecimal.valueOf(30000), 2, "ít ngọt"),
				new OrderLookup.BillableItem("m1", "Trà Đào", BigDecimal.valueOf(30000), 1, "ít ngọt"),
				new OrderLookup.BillableItem("m1", "Trà Đào", BigDecimal.valueOf(30000), 1, "không đá"),
				new OrderLookup.BillableItem("m2", "Bánh Mì", BigDecimal.valueOf(25000), 1, null)));

		TableInvoiceDtos.InvoiceResponse invoice = invoiceService.buildInvoice("ts_123", null);

		assertThat(invoice.items()).hasSize(3);

		// Trà Đào (ít ngọt): tổng số lượng 3
		TableInvoiceDtos.LineResponse traDaoItNgot = invoice.items().stream()
				.filter(i -> "ít ngọt".equals(i.note())).findFirst().orElseThrow();
		assertThat(traDaoItNgot.quantity()).isEqualTo(3);
		assertThat(traDaoItNgot.lineTotal()).isEqualByComparingTo(BigDecimal.valueOf(90000));

		// Trà Đào (không đá): tổng số lượng 1
		TableInvoiceDtos.LineResponse traDaoKhongDa = invoice.items().stream()
				.filter(i -> "không đá".equals(i.note())).findFirst().orElseThrow();
		assertThat(traDaoKhongDa.quantity()).isEqualTo(1);
		assertThat(traDaoKhongDa.lineTotal()).isEqualByComparingTo(BigDecimal.valueOf(30000));

		// Bánh Mì (không có ghi chú): số lượng 1
		TableInvoiceDtos.LineResponse banhMi = invoice.items().stream()
				.filter(i -> i.menuItemId().equals("m2")).findFirst().orElseThrow();
		assertThat(banhMi.note()).isNull();
		assertThat(banhMi.quantity()).isEqualTo(1);
	}
}
