from django.contrib import admin
from .models import HighScore

@admin.register(HighScore)
class HighScoreAdmin(admin.ModelAdmin):
    list_display = ('player_name', 'score', 'date')
    list_filter = ('date',)
    search_fields = ('player_name',)
