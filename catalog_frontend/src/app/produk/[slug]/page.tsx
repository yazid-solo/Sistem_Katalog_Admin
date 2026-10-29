import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductDetail } from '@/lib/api';
import Navbar from '@/components/Navbar';
import ProductDetailClient from '@/components/ProductDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: { slug: string };
}

// ─────────────────────────────────────────
// Dynamic SEO metadata
// ─────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const product = await getProductDetail(params.slug);
    return {
      title: product.title,
      description: product.description || `Detail produk ${product.title}. Harga ${product.formatted_price}.`,
      openGraph: {
        title: product.title,
        description: product.description,
        images: product.primary_image ? [{ url: product.primary_image }] : [],
      },
    };
  } catch {
    return { title: 'Produk Tidak Ditemukan' };
  }
}

// ─────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────
export default async function ProductDetailPage({ params }: PageProps) {
  let product;
  try {
    product = await getProductDetail(params.slug);
    if (!product || !product.id || !product.slug) {
      notFound();
    }
  } catch {
    notFound();
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20 pb-32 md:pb-16 bg-[#FAF9F6]/40">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10">
          {/* ── Main Interactive Marketplace View ── */}
          <ProductDetailClient product={product} />
        </div>
      </main>
    </>
  );
}
