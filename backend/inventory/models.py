from django.db import models
from django.contrib.auth.models import User


class Product(models.Model):
    # Opcje dla kategorii i lokalizacji
    CATEGORY_CHOICES = [
        ('food', 'Jedzenie'),
        ('chem', 'Chemia'),
        ('meds', 'Leki'),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Właściciel")
    name = models.CharField(max_length=200, verbose_name="Nazwa produktu")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Ilość")
    unit = models.CharField(max_length=20, default="szt", verbose_name="Jednostka")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, verbose_name="Kategoria")
    expiry_date = models.DateField(verbose_name="Data ważności")
    location = models.CharField(max_length=100, verbose_name="Lokalizacja")
    image = models.ImageField(upload_to='products/', null=True, blank=True, verbose_name="Zdjęcie")

    class Meta:
        verbose_name = "Produkt"
        verbose_name_plural = "Produkty"

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"

