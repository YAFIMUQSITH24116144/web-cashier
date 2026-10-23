export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface ReceiptData {
  businessName: string;
  tagline?: string;
  invoiceNumber: string;
  date: string;
  tableNumber?: string | null;
  cashierName?: string;
  items: ReceiptItem[];
  subtotal: number;
  total: number;
  amountPaid: number;
  change: number;
  paymentMethod: 'tunai' | 'qris';
  footer?: string;
}

const ESC = 0x1b;
const GS = 0x1d;

function text(value: string): number[] {
  return Array.from(new TextEncoder().encode(value));
}

function command(...bytes: number[]): number[] {
  return bytes;
}

function rupiah(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

function center(value: string): number[] {
  return [
    ...command(ESC, 0x61, 0x01),
    ...text(value),
    0x0a,
  ];
}

function left(): number[] {
  return command(ESC, 0x61, 0x00);
}

function boldOn(): number[] {
  return command(ESC, 0x45, 0x01);
}

function boldOff(): number[] {
  return command(ESC, 0x45, 0x00);
}

function line(): number[] {
  return text('--------------------------------\n');
}

function row(
  label: string,
  value: string
): number[] {
  const width = 32;
  const spaces = Math.max(
    1,
    width - label.length - value.length
  );

  return text(
    `${label}${' '.repeat(spaces)}${value}\n`
  );
}

export function buildReceiptBytes(
  receipt: ReceiptData
): number[] {
  const bytes: number[] = [];

  // Initialize printer
  bytes.push(...command(ESC, 0x40));

  // Header
  bytes.push(...boldOn());
  bytes.push(...center(receipt.businessName));
  bytes.push(...boldOff());

  if (receipt.tagline) {
    bytes.push(...center(receipt.tagline));
  }

  bytes.push(0x0a);
  bytes.push(...left());

  // Information
  bytes.push(...text(`No   : ${receipt.invoiceNumber}\n`));
  bytes.push(...text(`Tanggal: ${receipt.date}\n`));

  if (receipt.tableNumber) {
    bytes.push(
      ...text(`Meja : ${receipt.tableNumber}\n`)
    );
  }

  if (receipt.cashierName) {
    bytes.push(
      ...text(`Kasir: ${receipt.cashierName}\n`)
    );
  }

  bytes.push(...line());

  // Items
  for (const item of receipt.items) {
    bytes.push(...text(`${item.name}\n`));

    bytes.push(
      ...text(
        `${item.quantity} x ${rupiah(item.price)}`
      )
    );

    bytes.push(
      ...row('', rupiah(item.subtotal))
    );
  }

  bytes.push(...line());

  bytes.push(
    ...row('Subtotal', rupiah(receipt.subtotal))
  );

  bytes.push(...boldOn());

  bytes.push(
    ...row('TOTAL', rupiah(receipt.total))
  );

  bytes.push(...boldOff());

  bytes.push(
    ...row(
      receipt.paymentMethod === 'qris'
        ? 'Pembayaran'
        : 'Tunai',
      receipt.paymentMethod === 'qris'
        ? 'QRIS'
        : rupiah(receipt.amountPaid)
    )
  );

  if (receipt.paymentMethod === 'tunai') {
    bytes.push(
      ...row('Kembali', rupiah(receipt.change))
    );
  }

  bytes.push(...line());

  // Footer
  if (receipt.footer) {
    for (const lineText of receipt.footer.split('\n')) {
      bytes.push(...center(lineText));
    }
  }

  bytes.push(0x0a);
  bytes.push(0x0a);
  bytes.push(0x0a);

  // Cut paper
  bytes.push(
    ...command(
      GS,
      0x56,
      0x00
    )
  );

  return bytes;
}