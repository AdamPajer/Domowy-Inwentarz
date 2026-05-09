from django.contrib import admin
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'quantity', 'unit', 'category', 'expiry_date', 'location')
    list_filter = ('category', 'location')
    search_fields = ('name',)