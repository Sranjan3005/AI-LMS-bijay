from django.contrib import admin
from .models import Scenario, DataVariant


class DataVariantInline(admin.TabularInline):
    model  = DataVariant
    extra  = 1
    fields = ['name', 'label', 'description', 'order']


@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display   = ['title', 'model_type', 'order', 'is_active']
    list_filter    = ['model_type', 'is_active']
    search_fields  = ['title']
    ordering       = ['model_type', 'order']
    inlines        = [DataVariantInline]


@admin.register(DataVariant)
class DataVariantAdmin(admin.ModelAdmin):
    list_display  = ['scenario', 'name', 'label', 'order']
    list_filter   = ['scenario__model_type']
    search_fields = ['label', 'scenario__title']
