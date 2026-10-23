import { useState, useMemo } from 'react';
import {
  Search,
  CreditCard,
  Eye,
  CheckCircle2,
  QrCode,
  Banknote,
  Printer,
  Clock,
  Filter,
} from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { formatRupiah, formatDateTime } from '@/utils/format';
import { savePaymentToDatabase } from '@/services/orderService';
import { Printer } from '@capgo/capacitor-printer';

import type {
  Order,
  OrderStatus,
  PaymentMethod,
  ToastMessage,
} from '@/types';

interface CashierProps {
  orders: Order[];
  updateOrder: (id: string, updates: Partial<Order>) => void;
  showToast: (
    message: string,
    type?: ToastMessage['type']
  ) => void;
}

export function Cashier({
  orders,
  updateOrder,
  showToast,
}: CashierProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<OrderStatus | 'semua'>('semua');

  const [viewingOrder, setViewingOrder] =
    useState<Order | null>(null);

  const [payingOrder, setPayingOrder] =
    useState<Order | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('tunai');

  const [amountPaid, setAmountPaid] = useState('');

  const [paymentSuccess, setPaymentSuccess] =
    useState<Order | null>(null);

  /*
   * ============================================================
   * FILTER DATA
   * ============================================================
   */

  const filtered = useMemo(() => {
    return [...orders]
      .filter((order) => {
        const keyword = search.toLowerCase().trim();

        const matchSearch =
          order.receiptNumber
            .toLowerCase()
            .includes(keyword);

        const matchStatus =
          statusFilter === 'semua' ||
          order.status === statusFilter;

        return matchSearch && matchStatus;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [orders, search, statusFilter]);

  /*
   * ============================================================
   * STATISTIK
   * ============================================================
   */

  const pendingCount = orders.filter(
    (order) => order.status === 'menunggu'
  ).length;

  /*
   * ============================================================
   * PAYMENT
   * ============================================================
   */

  const openPayment = (order: Order) => {
    setPayingOrder(order);
    setPaymentMethod('tunai');
    setAmountPaid('');
  };

  const amountNum = parseInt(
    amountPaid.replace(/\D/g, '') || '0',
    10
  );

  const change =
    amountNum - (payingOrder?.total ?? 0);

  const formatAmountInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setAmountPaid(digits);
  };

  const handleConfirmPayment =async () => {
    if (!payingOrder) return;

    /*
     * Validasi pembayaran tunai
     */
    if (
      paymentMethod === 'tunai' &&
      amountNum < payingOrder.total
    ) {
      showToast(
        'Jumlah uang yang dibayar kurang',
        'error'
      );

      return;
    }

    const updatedOrder: Partial<Order> = {
      status: 'lunas',
      paymentMethod,
      amountPaid:
        paymentMethod === 'tunai'
          ? amountNum
          : payingOrder.total,
      change:
        paymentMethod === 'tunai'
          ? change
          : 0,
      paidAt: new Date(),
    };

    const updatedOrderData: Order = {
      ...payingOrder,
      ...updatedOrder,
    };


    try {
      await savePaymentToDatabase(updatedOrderData);
    } catch (error) {
        console.error(
          'GAGAL SIMPAN PEMBAYARAN:',
          error
        );

        const errorMessage =
          error instanceof Error
            ? error.message
            : String(error);

        showToast(
          `Database error: ${errorMessage}`,
          'error'
        );

        return;
      }

    /*
     * Update data order
     */
    updateOrder(
      payingOrder.id,
      updatedOrder
    );

    /*
     * Data untuk modal berhasil
     */
    setPaymentSuccess({
      ...payingOrder,
      ...updatedOrder,
    } as Order);

    setPayingOrder(null);

    showToast(
      `Pembayaran ${payingOrder.receiptNumber} berhasil dikonfirmasi`,
      'success'
    );
  };

  /*
   * ============================================================
   * PRINT RECEIPT
   * ============================================================
   */

  const handlePrintReceipt = async (order: Order) => {
    const itemsHtml = order.items
      .map(
        (item) => `
          <tr>
            <td class="item-name">
              ${item.product.name}
              <div class="item-detail">
                ${item.quantity} × ${formatRupiah(item.product.price)}
              </div>
            </td>

            <td class="item-price">
              ${formatRupiah(
                item.product.price * item.quantity
              )}
            </td>
          </tr>
        `
      )
      .join('');

    const paymentHtml =
      order.paymentMethod === 'tunai'
        ? `
          <tr>
            <td>Dibayar</td>
            <td class="right">
              ${formatRupiah(order.amountPaid ?? 0)}
            </td>
          </tr>

          <tr>
            <td>Kembalian</td>
            <td class="right">
              ${formatRupiah(order.change ?? 0)}
            </td>
          </tr>
        `
        : `
          <tr>
            <td>Metode Pembayaran</td>
            <td class="right">
              QRIS
            </td>
          </tr>
        `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              width: 280px;
              margin: 0 auto;
              padding: 16px;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 12px;
              color: #000;
              background: #fff;
            }

            .center {
              text-align: center;
            }

            .restaurant-name {
              font-size: 19px;
              font-weight: 700;
              margin-bottom: 4px;
            }

            .subtitle {
              font-size: 11px;
              color: #555;
            }

            .line {
              border-top: 1px dashed #000;
              margin: 12px 0;
            }

            .info {
              line-height: 1.7;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            td {
              vertical-align: top;
              padding: 4px 0;
            }

            .item-name {
              width: 65%;
            }

            .item-price {
              width: 35%;
              text-align: right;
              white-space: nowrap;
            }

            .item-detail {
              color: #555;
              font-size: 10px;
              margin-top: 2px;
            }

            .right {
              text-align: right;
              white-space: nowrap;
            }

            .total-row td {
              font-size: 15px;
              font-weight: 700;
              padding-top: 7px;
            }

            .footer {
              text-align: center;
              margin-top: 18px;
              font-size: 10px;
              line-height: 1.6;
            }

            @media print {
              body {
                width: 100%;
                margin: 0;
              }
            }
          </style>
        </head>

        <body>

          <div class="center">
            <div class="restaurant-name">
              PoS Resto
            </div>

            <div class="subtitle">
              Struk Pembayaran
            </div>
          </div>

          <div class="line"></div>

          <div class="info">
            <strong>Nota:</strong>
            ${order.receiptNumber}
            <br />

            <strong>Waktu:</strong>
            ${formatDateTime(
              new Date(order.createdAt)
            )}
            <br />

            <strong>Meja:</strong>
            ${order.tableNumber ?? '-'}
            <br />

            <strong>Kasir:</strong>
            ${order.cashierName}
          </div>

          <div class="line"></div>

          <table>
            ${itemsHtml}
          </table>

          <div class="line"></div>

          <table>
            <tr>
              <td>Subtotal</td>

              <td class="right">
                ${formatRupiah(order.total)}
              </td>
            </tr>

            <tr class="total-row">
              <td>TOTAL</td>

              <td class="right">
                ${formatRupiah(order.total)}
              </td>
            </tr>

            ${paymentHtml}
          </table>

          <div class="line"></div>

          <div class="footer">
            Terima kasih telah berkunjung
            <br />
            Simpan struk ini sebagai
            <br />
            bukti pembayaran
          </div>

        </body>
      </html>
    `;

    try {
      await Printer.printHtml({
        name: `Nota ${order.receiptNumber}`,
        html,
      });
    } catch (error) {
      console.error(
        'Gagal mencetak nota:',
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      showToast(
        `Gagal mencetak nota: ${errorMessage}`,
        'error'
      );
    }
  };
  /*
   * ============================================================
   * QUICK PAYMENT
   * ============================================================
   */

  const quickAmounts = useMemo(() => {
    if (!payingOrder) return [];

    return Array.from(
      new Set([
        payingOrder.total,
        50000,
        100000,
      ])
    );
  }, [payingOrder]);

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="space-y-5 p-6">

      {/* ======================================================
          PENDING ALERT
      ======================================================= */}

      {pendingCount > 0 && (
        <div
          className="
            flex
            items-center
            gap-3
            rounded-xl
            border
            border-orange-500/30
            bg-orange-500/10
            p-4
          "
        >
          <Clock
            size={18}
            className="
              shrink-0
              text-orange-400
            "
          />

          <p
            className="
              text-sm
              text-orange-300
            "
          >
            <strong>
              {pendingCount} nota
            </strong>{' '}
            menunggu pembayaran.
            Proses segera agar pelanggan
            tidak menunggu lama.
          </p>
        </div>
      )}

      {/* ======================================================
          TOOLBAR
      ======================================================= */}

      <div
        className="
          flex
          flex-col
          gap-3
          sm:flex-row
        "
      >

        {/* Search */}
        <div
          className="
            relative
            w-full
            max-w-sm
          "
        >
          <Search
            size={15}
            className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-muted-foreground
            "
          />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Cari nomor nota..."
            className="
              w-full
              rounded-md
              border
              border-border
              bg-secondary
              py-2
              pl-9
              pr-4
              text-sm
              text-foreground
              outline-none
              transition-all
              duration-200

              placeholder:text-muted-foreground

              focus:border-primary
              focus:ring-2
              focus:ring-primary/20
            "
          />
        </div>

        {/* Filter */}
        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <Filter
            size={15}
            className="
              shrink-0
              text-muted-foreground
            "
          />

          <div
            className="
              flex
              gap-1.5
              overflow-x-auto
            "
          >
            {(
              [
                'semua',
                'menunggu',
                'lunas',
                'batal',
              ] as const
            ).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() =>
                  setStatusFilter(status)
                }
                className={`
                  whitespace-nowrap
                  rounded-md
                  border
                  px-3
                  py-1.5
                  text-xs
                  font-medium
                  transition-all
                  duration-200

                  ${
                    statusFilter === status
                      ? `
                        border-primary
                        bg-primary
                        text-primary-foreground
                        shadow-sm
                      `
                      : `
                        border-border
                        bg-secondary
                        text-muted-foreground

                        hover:border-primary/40
                        hover:bg-primary/10
                        hover:text-primary
                      `
                  }
                `}
              >
                {status === 'semua'
                  ? 'Semua'
                  : status === 'menunggu'
                    ? 'Menunggu'
                    : status === 'lunas'
                      ? 'Lunas'
                      : 'Batal'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================
          TABLE
      ======================================================= */}

      <div
        className="
          overflow-hidden
          rounded-xl
          border
          border-border
          bg-card
          shadow-sm
        "
      >

        {/* Table header */}
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-border
            px-5
            py-3.5
          "
        >
          <h3
            className="
              text-sm
              font-semibold
              text-foreground
            "
          >
            Daftar Nota
          </h3>

          <span
            className="
              text-xs
              text-muted-foreground
            "
          >
            {filtered.length} nota
          </span>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div
            className="
              flex
              flex-col
              items-center
              justify-center
              py-16
              text-muted-foreground
            "
          >
            <CreditCard
              size={36}
              className="
                mb-3
                opacity-30
              "
            />

            <p className="text-sm">
              Tidak ada nota ditemukan
            </p>
          </div>
        ) : (

          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full">

              <thead>
                <tr
                  className="
                    border-b
                    border-border
                    bg-secondary/40
                  "
                >
                  <th
                    className="
                      px-5
                      py-3
                      text-left
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-muted-foreground
                    "
                  >
                    Nomor Nota
                  </th>

                  <th
                    className="
                      px-5
                      py-3
                      text-left
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-muted-foreground
                    "
                  >
                    Waktu
                  </th>

                  <th
                    className="
                      px-5
                      py-3
                      text-left
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-muted-foreground
                    "
                  >
                    Meja
                  </th>

                  <th
                    className="
                      px-5
                      py-3
                      text-center
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-muted-foreground
                    "
                  >
                    Item
                  </th>

                  <th
                    className="
                      px-5
                      py-3
                      text-right
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-muted-foreground
                    "
                  >
                    Total
                  </th>

                  <th
                    className="
                      px-5
                      py-3
                      text-left
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-muted-foreground
                    "
                  >
                    Status
                  </th>

                  <th
                    className="
                      px-5
                      py-3
                      text-center
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-muted-foreground
                    "
                  >
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody
                className="
                  divide-y
                  divide-border
                "
              >
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    className="
                      transition-colors
                      duration-200
                      hover:bg-secondary/50
                    "
                  >

                    {/* Receipt */}
                    <td className="px-5 py-3.5">
                      <span
                        className="
                          font-mono-nums
                          text-xs
                          font-bold
                          text-primary
                        "
                      >
                        {order.receiptNumber}
                      </span>
                    </td>

                    {/* Time */}
                    <td
                      className="
                        px-5
                        py-3.5
                        text-xs
                        text-muted-foreground
                      "
                    >
                      {formatDateTime(
                        new Date(
                          order.createdAt
                        )
                      )}
                    </td>

                    {/* Table */}
                    <td
                      className="
                        px-5
                        py-3.5
                        text-xs
                        text-foreground
                      "
                    >
                      {order.tableNumber ?? '—'}
                    </td>

                    {/* Items */}
                    <td
                      className="
                        px-5
                        py-3.5
                        text-center
                        text-xs
                        text-muted-foreground
                      "
                    >
                      {order.items.reduce(
                        (sum, item) =>
                          sum + item.quantity,
                        0
                      )}
                    </td>

                    {/* Total */}
                    <td
                      className="
                        px-5
                        py-3.5
                        text-right
                        font-mono-nums
                        text-xs
                        font-bold
                        text-foreground
                      "
                    >
                      {formatRupiah(
                        order.total
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        status={order.status}
                      />
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5">
                      <div
                        className="
                          flex
                          items-center
                          justify-center
                          gap-1.5
                        "
                      >

                        {/* Detail */}
                        <button
                          type="button"
                          onClick={() =>
                            setViewingOrder(
                              order
                            )
                          }
                          className="
                            flex
                            items-center
                            gap-1
                            rounded-md
                            border
                            border-border
                            bg-secondary
                            px-2.5
                            py-1.5
                            text-xs
                            font-medium
                            text-muted-foreground
                            transition-colors

                            hover:border-primary/40
                            hover:bg-primary/10
                            hover:text-primary
                          "
                        >
                          <Eye size={12} />
                          Detail
                        </button>

                        {/* Bayar */}
                        {order.status ===
                          'menunggu' && (
                          <button
                            type="button"
                            onClick={() =>
                              openPayment(
                                order
                              )
                            }
                            className="
                              flex
                              items-center
                              gap-1
                              rounded-md
                              bg-primary
                              px-2.5
                              py-1.5
                              text-xs
                              font-medium
                              text-primary-foreground
                              transition-colors

                              hover:bg-primary/90
                            "
                          >
                            <CreditCard
                              size={12}
                            />
                            Bayar
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================
          DETAIL MODAL
      ======================================================= */}

      <Modal
        open={!!viewingOrder}
        onClose={() =>
          setViewingOrder(null)
        }
        title="Detail Nota"
        size="md"
      >
        {viewingOrder && (
          <div
            className="
              space-y-4
              bg-card
              p-6
              text-foreground
            "
          >

            {/* Information */}
            <div
              className="
                grid
                grid-cols-2
                gap-4
                text-sm
              "
            >

              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Nomor Nota
                </p>

                <p
                  className="
                    font-mono-nums
                    font-bold
                    text-primary
                  "
                >
                  {viewingOrder.receiptNumber}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Status
                </p>

                <StatusBadge
                  status={
                    viewingOrder.status
                  }
                />
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Meja
                </p>

                <p className="font-medium text-foreground">
                  {viewingOrder.tableNumber ??
                    '—'}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Kasir
                </p>

                <p className="font-medium text-foreground">
                  {viewingOrder.cashierName}
                </p>
              </div>

              <div className="col-span-2">
                <p className="mb-1 text-xs text-muted-foreground">
                  Waktu
                </p>

                <p className="font-medium text-foreground">
                  {formatDateTime(
                    new Date(
                      viewingOrder.createdAt
                    )
                  )}
                </p>
              </div>
            </div>

            {/* Items */}
            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-border
              "
            >
              <div
                className="
                  border-b
                  border-border
                  bg-secondary
                  px-4
                  py-2.5
                "
              >
                <span
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wide
                    text-muted-foreground
                  "
                >
                  Item Pesanan
                </span>
              </div>

              <div
                className="
                  divide-y
                  divide-border
                "
              >
                {viewingOrder.items.map(
                  (item) => (
                    <div
                      key={
                        item.product.id
                      }
                      className="
                        flex
                        items-center
                        justify-between
                        px-4
                        py-3
                      "
                    >
                      <div>
                        <p
                          className="
                            text-sm
                            font-medium
                            text-foreground
                          "
                        >
                          {item.product.name}
                        </p>

                        <p
                          className="
                            mt-0.5
                            font-mono-nums
                            text-xs
                            text-muted-foreground
                          "
                        >
                          {formatRupiah(
                            item.product.price
                          )}{' '}
                          × {item.quantity}
                        </p>
                      </div>

                      <span
                        className="
                          font-mono-nums
                          text-sm
                          font-bold
                          text-foreground
                        "
                      >
                        {formatRupiah(
                          item.product.price *
                            item.quantity
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>

              <div
                className="
                  flex
                  justify-between
                  border-t
                  border-border
                  bg-secondary
                  px-4
                  py-3
                "
              >
                <span
                  className="
                    text-sm
                    font-bold
                    text-foreground
                  "
                >
                  Total
                </span>

                <span
                  className="
                    font-mono-nums
                    text-sm
                    font-bold
                    text-primary
                  "
                >
                  {formatRupiah(
                    viewingOrder.total
                  )}
                </span>
              </div>
            </div>

            {/* Payment Information */}
            {viewingOrder.status ===
              'lunas' && (
              <div
                className="
                  space-y-2
                  rounded-xl
                  border
                  border-green-500/20
                  bg-green-500/10
                  p-4
                "
              >
                <p
                  className="
                    mb-3
                    font-semibold
                    text-green-400
                  "
                >
                  Informasi Pembayaran
                </p>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Metode
                  </span>

                  <span
                    className="
                      font-medium
                      uppercase
                      text-green-300
                    "
                  >
                    {viewingOrder.paymentMethod}
                  </span>
                </div>

                {viewingOrder.paymentMethod ===
                  'tunai' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Dibayar
                      </span>

                      <span
                        className="
                          font-mono-nums
                          font-medium
                          text-foreground
                        "
                      >
                        {formatRupiah(
                          viewingOrder.amountPaid ??
                            0
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Kembalian
                      </span>

                      <span
                        className="
                          font-mono-nums
                          font-medium
                          text-green-400
                        "
                      >
                        {formatRupiah(
                          viewingOrder.change ??
                            0
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Buttons */}
            <div
              className="
                flex
                gap-3
                pt-2
              "
            >
              <button
                type="button"
                onClick={() =>
                  setViewingOrder(null)
                }
                className="
                  flex-1
                  rounded-xl
                  border
                  border-border
                  bg-secondary
                  py-2.5
                  text-sm
                  font-medium
                  text-foreground
                  transition-colors

                  hover:bg-secondary/70
                "
              >
                Tutup
              </button>

              {viewingOrder.status ===
                'lunas' && (
                <button
                  type="button"
                  onClick={() =>
                    handlePrintReceipt(
                      viewingOrder
                    )
                  }
                  className="
                    flex
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-primary
                    py-2.5
                    text-sm
                    font-medium
                    text-primary-foreground
                    transition-colors

                    hover:bg-primary/90
                  "
                >
                  <Printer size={14} />
                  Cetak Ulang
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================
          PAYMENT MODAL
      ======================================================= */}

      <Modal
        open={!!payingOrder}
        onClose={() =>
          setPayingOrder(null)
        }
        title="Proses Pembayaran"
        size="md"
      >
        {payingOrder && (
          <div
            className="
              space-y-5
              bg-card
              p-6
              text-foreground
            "
          >

            {/* Order summary */}
            <div
              className="
                rounded-xl
                border
                border-border
                bg-secondary
                p-4
              "
            >
              <div
                className="
                  mb-3
                  flex
                  items-start
                  justify-between
                "
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    Nomor Nota
                  </p>

                  <p
                    className="
                      font-mono-nums
                      text-sm
                      font-bold
                      text-primary
                    "
                  >
                    {payingOrder.receiptNumber}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Total Tagihan
                  </p>

                  <p
                    className="
                      font-mono-nums
                      text-xl
                      font-bold
                      text-foreground
                    "
                  >
                    {formatRupiah(
                      payingOrder.total
                    )}
                  </p>
                </div>
              </div>

              <p
                className="
                  text-xs
                  text-muted-foreground
                "
              >
                {payingOrder.items.reduce(
                  (sum, item) =>
                    sum + item.quantity,
                  0
                )}{' '}
                item ·{' '}
                {payingOrder.items
                  .map(
                    (item) =>
                      item.product.name
                  )
                  .join(', ')}
              </p>
            </div>

            {/* Payment method */}
            <div>
              <p
                className="
                  mb-2
                  text-xs
                  font-semibold
                  text-foreground
                "
              >
                Metode Pembayaran
              </p>

              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                "
              >

                {/* Tunai */}
                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      'tunai'
                    )
                  }
                  className={`
                    flex
                    items-center
                    gap-2.5
                    rounded-xl
                    border-2
                    p-3.5
                    transition-all

                    ${
                      paymentMethod ===
                      'tunai'
                        ? `
                          border-primary
                          bg-primary/10
                        `
                        : `
                          border-border
                          bg-secondary

                          hover:border-primary/40
                          hover:bg-primary/5
                        `
                    }
                  `}
                >
                  <Banknote
                    size={20}
                    className={
                      paymentMethod ===
                      'tunai'
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }
                  />

                  <span
                    className={`
                      text-sm
                      font-semibold
                      ${
                        paymentMethod ===
                        'tunai'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }
                    `}
                  >
                    Tunai
                  </span>
                </button>

                {/* QRIS */}
                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      'qris'
                    )
                  }
                  className={`
                    flex
                    items-center
                    gap-2.5
                    rounded-xl
                    border-2
                    p-3.5
                    transition-all

                    ${
                      paymentMethod ===
                      'qris'
                        ? `
                          border-primary
                          bg-primary/10
                        `
                        : `
                          border-border
                          bg-secondary

                          hover:border-primary/40
                          hover:bg-primary/5
                        `
                    }
                  `}
                >
                  <QrCode
                    size={20}
                    className={
                      paymentMethod ===
                      'qris'
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }
                  />

                  <span
                    className={`
                      text-sm
                      font-semibold
                      ${
                        paymentMethod ===
                        'qris'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }
                    `}
                  >
                    QRIS
                  </span>
                </button>

              </div>
            </div>

            {/* =================================================
                CASH
            ================================================== */}

            {paymentMethod ===
              'tunai' && (
              <div className="space-y-3">

                <div>
                  <label
                    className="
                      mb-1.5
                      block
                      text-xs
                      font-semibold
                      text-foreground
                    "
                  >
                    Jumlah Uang Diterima
                  </label>

                  <div className="relative">
                    <span
                      className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-sm
                        font-medium
                        text-muted-foreground
                      "
                    >
                      Rp
                    </span>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={amountPaid}
                      onChange={(e) =>
                        formatAmountInput(
                          e.target.value
                        )
                      }
                      placeholder="0"
                      className="
                        w-full
                        rounded-xl
                        border-2
                        border-border
                        bg-secondary
                        py-3
                        pl-10
                        pr-4
                        font-mono-nums
                        text-lg
                        font-bold
                        text-foreground
                        outline-none
                        transition-all

                        placeholder:text-muted-foreground

                        focus:border-primary
                        focus:ring-2
                        focus:ring-primary/20
                      "
                    />
                  </div>
                </div>

                {/* Quick amount */}
                <div
                  className="
                    grid
                    grid-cols-3
                    gap-2
                  "
                >
                  {quickAmounts.map(
                    (amount) => (
                      <button
                        key={`quick-${amount}`}
                        type="button"
                        onClick={() =>
                          setAmountPaid(
                            amount.toString()
                          )
                        }
                        className="
                          rounded-lg
                          border
                          border-border
                          bg-secondary
                          py-2
                          text-xs
                          font-medium
                          text-muted-foreground
                          transition-colors

                          hover:border-primary/40
                          hover:bg-primary/10
                          hover:text-primary
                        "
                      >
                        {formatRupiah(
                          amount
                        )}
                      </button>
                    )
                  )}
                </div>

                {/* Change */}
                {amountNum > 0 && (
                  <div
                    className={`
                      rounded-xl
                      border
                      p-3.5

                      ${
                        change >= 0
                          ? `
                            border-green-500/20
                            bg-green-500/10
                          `
                          : `
                            border-red-500/20
                            bg-red-500/10
                          `
                      }
                    `}
                  >
                    <div
                      className="
                        flex
                        justify-between
                        text-sm
                      "
                    >
                      <span
                        className={
                          change >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {change >= 0
                          ? 'Kembalian'
                          : 'Kekurangan'}
                      </span>

                      <span
                        className={`
                          font-mono-nums
                          font-bold

                          ${
                            change >= 0
                              ? 'text-green-300'
                              : 'text-red-300'
                          }
                        `}
                      >
                        {change >= 0
                          ? formatRupiah(
                              change
                            )
                          : `Kurang ${formatRupiah(
                              Math.abs(
                                change
                              )
                            )}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =================================================
                QRIS
            ================================================== */}

            {paymentMethod ===
              'qris' && (
              <div
                className="
                  rounded-xl
                  border
                  border-primary/20
                  bg-primary/10
                  p-5
                  text-center
                "
              >
                <QrCode
                  size={42}
                  className="
                    mx-auto
                    mb-3
                    text-primary
                  "
                />

                <p
                  className="
                    mb-1
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  Bayar via QRIS
                </p>

                <p
                  className="
                    text-xs
                    leading-relaxed
                    text-muted-foreground
                  "
                >
                  Pastikan pembayaran
                  sudah berhasil sebelum
                  melakukan konfirmasi.
                  Verifikasi manual diperlukan
                  untuk QRIS offline.
                </p>

                <p
                  className="
                    mt-3
                    font-mono-nums
                    text-lg
                    font-bold
                    text-primary
                  "
                >
                  {formatRupiah(
                    payingOrder.total
                  )}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div
              className="
                flex
                gap-3
                pt-1
              "
            >
              <button
                type="button"
                onClick={() =>
                  setPayingOrder(null)
                }
                className="
                  flex-1
                  rounded-xl
                  border
                  border-border
                  bg-secondary
                  py-2.5
                  text-sm
                  font-medium
                  text-foreground
                  transition-colors

                  hover:bg-secondary/70
                "
              >
                Batal
              </button>

              <button
                type="button"
                onClick={
                  handleConfirmPayment
                }
                disabled={
                  paymentMethod ===
                    'tunai' &&
                  (
                    amountNum <= 0 ||
                    change < 0
                  )
                }
                className="
                  flex
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-green-600
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  transition-colors

                  hover:bg-green-700

                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <CheckCircle2
                  size={16}
                />

                Konfirmasi Bayar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================
          PAYMENT SUCCESS MODAL
      ======================================================= */}

      <Modal
        open={!!paymentSuccess}
        onClose={() =>
          setPaymentSuccess(null)
        }
        title="Pembayaran Berhasil"
        size="sm"
      >
        {paymentSuccess && (
          <div
            className="
              bg-card
              p-6
              text-center
              text-foreground
            "
          >

            {/* Success icon */}
            <div
              className="
                mx-auto
                mb-4
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-full
                bg-green-500/10
              "
            >
              <CheckCircle2
                size={32}
                className="
                  text-green-400
                "
              />
            </div>

            <h3
              className="
                mb-1
                text-lg
                font-bold
                text-foreground
              "
            >
              Transaksi Lunas!
            </h3>

            <p
              className="
                mb-5
                text-sm
                text-muted-foreground
              "
            >
              Pembayaran telah berhasil
              dikonfirmasi.
            </p>

            {/* Payment summary */}
            <div
              className="
                mb-5
                space-y-2
                rounded-xl
                border
                border-green-500/20
                bg-green-500/10
                p-4
                text-left
              "
            >

              <div
                className="
                  flex
                  justify-between
                  text-sm
                "
              >
                <span className="text-muted-foreground">
                  Nota
                </span>

                <span
                  className="
                    font-mono-nums
                    font-bold
                    text-primary
                  "
                >
                  {paymentSuccess.receiptNumber}
                </span>
              </div>

              <div
                className="
                  flex
                  justify-between
                  text-sm
                "
              >
                <span className="text-muted-foreground">
                  Total
                </span>

                <span
                  className="
                    font-mono-nums
                    font-bold
                    text-foreground
                  "
                >
                  {formatRupiah(
                    paymentSuccess.total
                  )}
                </span>
              </div>

              {paymentSuccess.paymentMethod ===
                'tunai' && (
                <>
                  <div
                    className="
                      flex
                      justify-between
                      text-sm
                    "
                  >
                    <span className="text-muted-foreground">
                      Dibayar
                    </span>

                    <span
                      className="
                        font-mono-nums
                        text-foreground
                      "
                    >
                      {formatRupiah(
                        paymentSuccess.amountPaid ??
                          0
                      )}
                    </span>
                  </div>

                  <div
                    className="
                      flex
                      justify-between
                      text-sm
                      font-bold
                    "
                  >
                    <span className="text-green-400">
                      Kembalian
                    </span>

                    <span
                      className="
                        font-mono-nums
                        text-green-400
                      "
                    >
                      {formatRupiah(
                        paymentSuccess.change ??
                          0
                      )}
                    </span>
                  </div>
                </>
              )}

              {paymentSuccess.paymentMethod ===
                'qris' && (
                <div
                  className="
                    flex
                    justify-between
                    text-sm
                  "
                >
                  <span className="text-muted-foreground">
                    Metode
                  </span>

                  <span
                    className="
                      font-medium
                      uppercase
                      text-primary
                    "
                  >
                    QRIS
                  </span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">

              <button
                type="button"
                onClick={() =>
                  setPaymentSuccess(null)
                }
                className="
                  flex-1
                  rounded-xl
                  border
                  border-border
                  bg-secondary
                  py-2.5
                  text-sm
                  font-medium
                  text-foreground
                  transition-colors

                  hover:bg-secondary/70
                "
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={() =>
                  handlePrintReceipt(
                    paymentSuccess
                  )
                }
                className="
                  flex
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-primary
                  py-2.5
                  text-sm
                  font-medium
                  text-primary-foreground
                  transition-colors

                  hover:bg-primary/90
                "
              >
                <Printer size={14} />

                Cetak Struk
              </button>

            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}