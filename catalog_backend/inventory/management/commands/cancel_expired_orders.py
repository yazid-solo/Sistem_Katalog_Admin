import os
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from inventory.models import Order


class Command(BaseCommand):
    help = 'Membatalkan pesanan berstatus PENDING yang melewati batas waktu kedaluwarsa dan mengembalikan stok pakaian.'

    def add_arguments(self, parser):
        default_hours = int(os.getenv('AUTO_CANCEL_HOURS', '24'))
        parser.add_argument(
            '--hours',
            type=int,
            default=default_hours,
            help=f'Batas waktu kedaluwarsa dalam jam (default: {default_hours} jam)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulasikan pembatalan tanpa mengubah data di database'
        )

    def handle(self, *args, **options):
        hours = options['hours']
        dry_run = options['dry_run']

        now = timezone.now()
        cutoff = now - timedelta(hours=hours)

        self.stdout.write(self.style.NOTICE(
            f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] Memeriksa pesanan kedaluwarsa (> {hours} jam)..."
        ))

        expired_orders = list(
            Order.objects.prefetch_related('items')
            .filter(status='PENDING', created_at__lte=cutoff)
        )

        if not expired_orders:
            self.stdout.write(self.style.SUCCESS("✓ Tidak ada pesanan PENDING yang kedaluwarsa."))
            return

        self.stdout.write(self.style.WARNING(
            f"Ditemukan {len(expired_orders)} pesanan PENDING yang telah melebihi batas {hours} jam."
        ))

        if dry_run:
            self.stdout.write(self.style.NOTICE("[DRY-RUN] Tidak ada data yang diubah di database."))
            for o in expired_orders:
                items_summary = ", ".join(f"{i.product_title} ({i.quantity} pcs)" for i in o.items.all())
                self.stdout.write(f"  - Akan dibatalkan: {o.order_number} ({o.customer_name}) | Baju: {items_summary}")
            return

        cancelled_count = 0
        total_items_restored = 0

        with transaction.atomic():
            for o in expired_orders:
                items_count = sum(i.quantity for i in o.items.all())
                o.status = 'CANCELLED'
                # Order.save() handles atomic restoration of Variant stock_quantity in database
                o.save()
                cancelled_count += 1
                total_items_restored += items_count

                self.stdout.write(
                    f"  ✓ {o.order_number} ({o.customer_name}) dibatalkan. {items_count} pcs stok dikembalikan."
                )

        self.stdout.write(self.style.SUCCESS(
            f"✨ Selesai: {cancelled_count} pesanan berhasil dibatalkan. Total {total_items_restored} pcs pakaian dikembalikan ke katalog."
        ))
