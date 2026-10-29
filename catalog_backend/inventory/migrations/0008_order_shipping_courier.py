from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0007_order_tracking_receipt_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='shipping_courier',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Contoh: JNE, J&T Express, SiCepat, SPX, Pos Indonesia, AnterAja',
                max_length=50,
                verbose_name='Nama Ekspedisi Kurir',
            ),
        ),
    ]
