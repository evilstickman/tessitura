# Generated by Django 3.1 on 2022-05-11 16:53

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Ensemble',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('address', models.CharField(max_length=1024)),
            ],
        ),
        migrations.CreateModel(
            name='Library',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=30)),
                ('description', models.TextField()),
                ('ensemble', models.ForeignKey(on_delete=django.db.models.deletion.DO_NOTHING, to='coordinate.ensemble')),
            ],
        ),
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(max_length=30)),
                ('last_name', models.CharField(max_length=30)),
                ('email', models.CharField(max_length=1024)),
            ],
        ),
        migrations.CreateModel(
            name='Music',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('composer', models.CharField(max_length=256)),
                ('library', models.ForeignKey(on_delete=django.db.models.deletion.DO_NOTHING, to='coordinate.library')),
                ('uploaded_by', models.ForeignKey(on_delete=django.db.models.deletion.DO_NOTHING, to='coordinate.user')),
            ],
        ),
        migrations.AddField(
            model_name='ensemble',
            name='administrator',
            field=models.ForeignKey(on_delete=django.db.models.deletion.DO_NOTHING, related_name='administrator', to='coordinate.user'),
        ),
        migrations.AddField(
            model_name='ensemble',
            name='conductor',
            field=models.ForeignKey(on_delete=django.db.models.deletion.DO_NOTHING, related_name='conductor', to='coordinate.user'),
        ),
        migrations.AddField(
            model_name='ensemble',
            name='users',
            field=models.ManyToManyField(to='coordinate.User'),
        ),
    ]
