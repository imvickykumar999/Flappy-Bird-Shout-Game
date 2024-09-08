from django.db import models

class HighScore(models.Model):
    player_name = models.CharField(max_length=100, blank=True, null=True)  # Optional field for player name
    score = models.IntegerField(default=0)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.player_name or "Anonymous"} - {self.score}'
