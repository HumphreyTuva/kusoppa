from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_importbatch_membership_import_batch_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="import_key",
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
    ]
