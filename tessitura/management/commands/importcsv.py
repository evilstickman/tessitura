from cgitb import text
from django.core.management.base import BaseCommand, CommandParser

from scripts.practice_grid_csv_to_db import import_csv_to_db

class Command(BaseCommand):
    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument('-filename', type=str, help='path to file')
        parser.add_argument('-truncate', type=bool, default=False, help='Truncate pre-existing data')

    def handle(self, *args, **kwargs):
        filename = kwargs['filename']
        truncate = kwargs['truncate']
        print(import_csv_to_db(filename, truncate))
        return