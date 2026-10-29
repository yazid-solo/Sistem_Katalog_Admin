from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0006_alter_category_name_alter_product_title_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='tracking_receipt_image',
            field=models.ImageField(
                blank=True,
                help_text='Foto bukti struk resi pengiriman dari ekspedisi',
                null=True,
                upload_to='receipts/%Y/%m/',
                verbose_name='Foto Struk Resi',
            ),
        ),
    ]
