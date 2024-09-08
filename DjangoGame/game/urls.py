from django.urls import path
from . import views

urlpatterns = [
    path('', views.game_view, name='game'),
    path('update_score/', views.update_score, name='update_score'),
]
