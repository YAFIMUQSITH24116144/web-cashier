import { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ImageOff,
  Package,
  ImagePlus,
} from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah, generateId } from '@/utils/format';
import { categories } from '@/data/mockData';
import type { Product, ToastMessage } from '@/types';

import {
  saveProductToDatabase,
  updateProductInDatabase,
  deleteProductFromDatabase,
} from '@/services/productService';

interface ProductsProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  showToast: (message: string, type?: ToastMessage['type']) => void;
}

const emptyForm = {
  name: '',
  category: 'makanan-berat',
  price: '',
  image: '',
  available: true,
};

export function Products({
  products,
  setProducts,
  showToast,
}: ProductsProps) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imgError, setImgError] = useState(false);

  const filtered = products.filter((p) => {
    const matchSearch = p.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchCat =
      selectedCat === 'all' || p.category === selectedCat;

    return matchSearch && matchCat;
  });

  const openAdd = () => {
    setForm(emptyForm);
    setEditingProduct(null);
    setImgError(false);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      category: p.category,
      price: p.price.toString(),
      image: p.image,
      available: p.available,
    });

    setEditingProduct(p);
    setImgError(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    const price = parseInt(form.price.replace(/\D/g, ''));

    if (!form.name.trim()) {
      showToast('Nama produk wajib diisi', 'error');
      return;
    }

    if (isNaN(price) || price <= 0) {
      showToast('Harga tidak valid', 'error');
      return;
    }

    if (editingProduct) {
      const updatedProduct: Product = {
        ...editingProduct,
        name: form.name,
        category: form.category,
        price,
        image: form.image,
        available: form.available,
      };

      try {
        await updateProductInDatabase(updatedProduct);

        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? updatedProduct
              : p
          )
        );

        showToast('Produk berhasil diperbarui');
      } catch (error) {
        console.error(
          'Gagal memperbarui produk:',
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : String(error);

        showToast(
          `Database error: ${message}`,
          'error'
        );

        return;
      }
    } else {
      const newProduct: Product = {
        id: generateId(),
        name: form.name,
        category: form.category,
        price,
        image: form.image,
        available: form.available,
      };

      try {
        await saveProductToDatabase(newProduct);

        setProducts((prev) => [
          newProduct,
          ...prev,
        ]);

        showToast('Produk berhasil ditambahkan');
      } catch (error) {
        console.error(
          'Gagal menyimpan produk:',
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : String(error);

        showToast(
          `Database error: ${message}`,
          'error'
        );

        return;
      }
    }

    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProductFromDatabase(id);

      setProducts((prev) =>
        prev.filter((p) => p.id !== id)
      );

      setConfirmDelete(null);

      showToast(
        'Produk berhasil dihapus',
        'warning'
      );
    } catch (error) {
      console.error(
        'Gagal menghapus produk:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      showToast(
        `Database error: ${message}`,
        'error'
      );
    }
  };

  const toggleAvail = async (id: string) => {
    const product = products.find(
      (p) => p.id === id
    );

    if (!product) return;

    const updatedProduct: Product = {
      ...product,
      available: !product.available,
    };

    try {
      await updateProductInDatabase(
        updatedProduct
      );

      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? updatedProduct
            : p
        )
      );
    } catch (error) {
      console.error(
        'Gagal mengubah status produk:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      showToast(
        `Database error: ${message}`,
        'error'
      );
    }
  };

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="space-y-5 p-6">

      {/* Toolbar */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">

        <div className="flex flex-wrap gap-2">

          {/* Search */}
          <div className="relative">
            <Search
              size={14}
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="
                w-56
                rounded-md
                border
                border-border
                bg-card
                py-2
                pl-8
                pr-4
                text-sm
                text-foreground
                placeholder:text-muted-foreground

                outline-none
                transition-all
                duration-200

                focus:border-primary
                focus:ring-2
                focus:ring-primary/20

                hover:border-muted-foreground
              "
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5">

            {/* Semua */}
            <button
              onClick={() => setSelectedCat('all')}
              className={`
                rounded-md
                px-3
                py-1.5
                text-xs
                font-medium
                transition-all
                duration-200

                ${
                  selectedCat === 'all'
                    ? `
                      bg-primary
                      text-primary-foreground
                      shadow-sm
                    `
                    : `
                      border
                      border-border
                      bg-card
                      text-muted-foreground
                      hover:border-primary/40
                      hover:bg-secondary
                      hover:text-foreground
                    `
                }
              `}
            >
              Semua
            </button>

            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id)}
                className={`
                  rounded-md
                  px-3
                  py-1.5
                  text-xs
                  font-medium
                  transition-all
                  duration-200

                  ${
                    selectedCat === c.id
                      ? `
                        bg-primary
                        text-primary-foreground
                        shadow-sm
                      `
                      : `
                        border
                        border-border
                        bg-card
                        text-muted-foreground
                        hover:border-primary/40
                        hover:bg-secondary
                        hover:text-foreground
                      `
                  }
                `}
              >
                {c.name}
              </button>
            ))}

          </div>
        </div>

        {/* Add Product */}
        <button
          onClick={openAdd}
          className="
            flex
            shrink-0
            items-center
            gap-2
            rounded-md
            bg-primary
            px-4
            py-2
            text-sm
            font-medium
            text-primary-foreground

            transition-all
            duration-200

            hover:bg-primary/90
            hover:shadow-md
            hover:shadow-primary/20
            active:scale-[0.98]
          "
        >
          <Plus size={16} />
          Tambah Produk
        </button>

      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground">
        Menampilkan{' '}
        <strong className="font-semibold text-foreground">
          {filtered.length}
        </strong>{' '}
        produk
        {selectedCat !== 'all' && ` · ${catName(selectedCat)}`}
      </p>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">

          <Package
            size={40}
            className="mb-3 opacity-30"
          />

          <p className="text-sm font-medium text-foreground">
            Tidak ada produk ditemukan
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Coba ubah filter atau tambah produk baru
          </p>

        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">

          {filtered.map((product) => (
            <div
              key={product.id}
              className={`
                group
                overflow-hidden
                rounded-lg
                border
                bg-card

                transition-all
                duration-200

                ${
                  product.available
                    ? `
                      border-border
                      hover:-translate-y-1
                      hover:border-primary/40
                      hover:shadow-lg
                      hover:shadow-black/20
                    `
                    : `
                      border-border
                      opacity-60
                    `
                }
              `}
            >

              {/* Image */}
              <div className="relative h-40 overflow-hidden bg-secondary">

                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="
                      h-full
                      w-full
                      object-cover

                      transition-transform
                      duration-300

                      group-hover:scale-105
                    "
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display =
                        'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff
                      size={28}
                      className="text-muted-foreground/40"
                    />
                  </div>
                )}

                {/* Unavailable Overlay */}
                {!product.available && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                    <Badge variant="warning">
                      Tidak Tersedia
                    </Badge>
                  </div>
                )}

              </div>

              {/* Product Info */}
              <div className="p-3.5">

                <p className="mb-1 text-xs font-medium text-primary">
                  {catName(product.category)}
                </p>

                <p className="mb-1 line-clamp-2 text-sm font-semibold leading-tight text-foreground">
                  {product.name}
                </p>

                <p className="font-mono text-base font-bold text-foreground">
                  {formatRupiah(product.price)}
                </p>

                {/* Actions */}
                <div
                  className="
                    mt-3
                    flex
                    items-center
                    gap-1.5
                    border-t
                    border-border
                    pt-3
                  "
                >

                  {/* Availability */}
                  <button
                    onClick={() => toggleAvail(product.id)}
                    className="
                      flex
                      flex-1
                      items-center
                      gap-1.5
                      text-xs
                      text-muted-foreground

                      transition-colors
                      duration-200

                      hover:text-primary
                    "
                    title={
                      product.available
                        ? 'Nonaktifkan'
                        : 'Aktifkan'
                    }
                  >
                    {product.available ? (
                      <ToggleRight
                        size={16}
                        className="text-primary"
                      />
                    ) : (
                      <ToggleLeft
                        size={16}
                        className="text-muted-foreground"
                      />
                    )}

                    {product.available
                      ? 'Aktif'
                      : 'Nonaktif'}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(product)}
                    className="
                      rounded-md
                      p-1.5
                      text-muted-foreground

                      transition-all
                      duration-200

                      hover:bg-primary/10
                      hover:text-primary
                    "
                    title="Edit produk"
                  >
                    <Pencil size={13} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() =>
                      setConfirmDelete(product.id)
                    }
                    className="
                      rounded-md
                      p-1.5
                      text-muted-foreground

                      transition-all
                      duration-200

                      hover:bg-red-500/10
                      hover:text-red-400
                    "
                    title="Hapus produk"
                  >
                    <Trash2 size={13} />
                  </button>

                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={
          editingProduct
            ? 'Edit Produk'
            : 'Tambah Produk Baru'
        }
        size="md"
      >
        <div className="space-y-4 p-6">

          {/* Product Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Nama Produk *
            </label>

            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              placeholder="contoh: Nasi Goreng Spesial"
              className="
                w-full
                rounded-md
                border
                border-border
                bg-secondary
                px-3
                py-2.5
                text-sm
                text-foreground
                placeholder:text-muted-foreground

                outline-none
                transition-all
                duration-200

                focus:border-primary
                focus:ring-2
                focus:ring-primary/20
              "
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Kategori
            </label>

            <select
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value,
                })
              }
              className="
                w-full
                rounded-md
                border
                border-border
                bg-secondary
                px-3
                py-2.5
                text-sm
                text-foreground

                outline-none
                transition-all
                duration-200

                focus:border-primary
                focus:ring-2
                focus:ring-primary/20
              "
            >
              {categories.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Harga (Rp) *
            </label>

            <input
              type="text"
              value={form.price}
              onChange={(e) =>
                setForm({
                  ...form,
                  price: e.target.value,
                })
              }
              placeholder="contoh: 28000"
              className="
                w-full
                rounded-md
                border
                border-border
                bg-secondary
                px-3
                py-2.5
                text-sm
                text-foreground
                placeholder:text-muted-foreground

                font-mono

                outline-none
                transition-all
                duration-200

                focus:border-primary
                focus:ring-2
                focus:ring-primary/20
              "
            />
          </div>

          {/* Upload Gambar */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Gambar Produk
            </label>

            <div
              className="
                relative
                overflow-hidden
                rounded-lg
                border
                border-dashed
                border-border
                bg-secondary
                transition-all
                duration-200
                hover:border-primary/50
                hover:bg-secondary/80
              "
            >
              {form.image && !imgError ? (
                <div className="relative h-40 w-full">
                  <img
                    src={form.image}
                    alt="Preview produk"
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                  />

                  {/* Overlay */}
                  <div
                    className="
                      absolute
                      inset-0
                      flex
                      items-center
                      justify-center
                      bg-background/70
                      opacity-0
                      transition-opacity
                      duration-200
                      hover:opacity-100
                    "
                  >
                    <label
                      htmlFor="product-image"
                      className="
                        flex
                        cursor-pointer
                        items-center
                        gap-2
                        rounded-md
                        bg-primary
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-primary-foreground
                        transition-all
                        duration-200
                        hover:bg-primary/90
                      "
                    >
                      <ImagePlus size={14} />
                      Ganti Gambar
                    </label>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="product-image"
                  className="
                    flex
                    h-40
                    cursor-pointer
                    flex-col
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-full
                      bg-primary/10
                      text-primary
                      transition-all
                      duration-200
                    "
                  >
                    <ImagePlus size={18} />
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Upload gambar produk
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG, JPEG · Maks. 5 MB
                    </p>
                  </div>
                </label>
              )}

              <input
                id="product-image"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (!file) return;

                  // Maksimal 5 MB
                  if (file.size > 5 * 1024 * 1024) {
                    showToast(
                      'Ukuran gambar maksimal 5 MB',
                      'error'
                    );

                    e.target.value = '';
                    return;
                  }

                  // Buat preview gambar
                  const imageUrl = URL.createObjectURL(file);

                  setForm({
                    ...form,
                    image: imageUrl,
                  });

                  setImgError(false);
                }}
              />
            </div>
          </div>

          {/* Availability */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.available}
              onClick={() =>
                setForm({
                  ...form,
                  available: !form.available,
                })
              }
              className={`
                relative
                h-5
                w-10
                shrink-0
                rounded-full
                border
                transition-all
                duration-200
                focus:outline-none
                focus:ring-2
                focus:ring-primary/30

                ${
                  form.available
                    ? 'border-primary bg-primary'
                    : 'border-border bg-secondary'
                }
              `}
            >
              <span
                className={`
                  absolute
                  left-0.5
                  top-0.5
                  h-4
                  w-4
                  rounded-full
                  bg-white
                  shadow-sm
                  transition-transform
                  duration-200

                  ${
                    form.available
                      ? 'translate-x-5'
                      : 'translate-x-0'
                  }
                `}
              />
            </button>

            <label
              className="
                cursor-pointer
                select-none
                text-sm
                text-foreground
              "
              onClick={() =>
                setForm({
                  ...form,
                  available: !form.available,
                })
              }
            >
              Produk tersedia
            </label>
          </div>

          {/* Modal Actions */}
          <div
            className="
              flex
              gap-3
              border-t
              border-border
              pt-4
            "
          >
            <button
              onClick={() => setShowModal(false)}
              className="
                flex-1
                rounded-md
                border
                border-border
                bg-secondary
                px-4
                py-2.5
                text-sm
                font-medium
                text-secondary-foreground

                transition-all
                duration-200

                hover:bg-secondary/80
                hover:border-muted-foreground
              "
            >
              Batal
            </button>

            <button
              onClick={handleSave}
              className="
                flex-1
                rounded-md
                bg-primary
                px-4
                py-2.5
                text-sm
                font-medium
                text-primary-foreground

                transition-all
                duration-200

                hover:bg-primary/90
                hover:shadow-md
                hover:shadow-primary/20
                active:scale-[0.98]
              "
            >
              {editingProduct
                ? 'Simpan Perubahan'
                : 'Tambah Produk'}
            </button>
          </div>

        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus Produk?"
        message="Produk yang dihapus tidak dapat dikembalikan. Apakah Anda yakin ingin menghapus produk ini?"
        confirmLabel="Ya, Hapus"
        onConfirm={() =>
          confirmDelete &&
          handleDelete(confirmDelete)
        }
        onCancel={() => setConfirmDelete(null)}
        variant="danger"
      />

    </div>
  );
}