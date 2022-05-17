import csv
import datetime
from perform.models import PracticeGrid
from perform.models import PracticeRow
from perform.models import PracticeCell
from perform.models import PracticeCellCompletion
from perform.models import Song

def get_song_for_title(song_name):
  return Song.objects.filter(title=song_name).first()

def truncate_existing_grids_for_name(name_to_remove):
    PracticeGrid.objects.filter(name=name_to_remove).delete()

def parse_percentages(row):
    cells = []
    for percentage in ['20%','25%','30%','35%','40%','45%','50%','55%','60%','65%','70%','75%','80%','85%','90%','95%','Target']:
        if percentage in row.keys():
            completion = row.get(percentage)
            cells.append({
                'completion': completion,
                'percentage': 1.0 if percentage == 'Target' else float(percentage.strip('%'))/100.0
            })
    return cells

def save_grid(grid_data):
    model = PracticeGrid.objects.create(**grid_data)
    model.save()
    return model

def save_row(row_data):
    model = PracticeRow.objects.create(**row_data)
    model.save()
    return model

def save_cell(cell_data):
    model = PracticeCell.objects.create(**cell_data)
    model.save()
    return model

def save_completion(completion_data):
    model = PracticeCellCompletion.objects.create(**completion_data)
    model.save()
    return model

def import_csv_to_db(filename, truncate_existing=False):
    # sheet name is filename
    with open(filename) as csvfile:
        reader = csv.DictReader(csvfile)
        practice_grid_data = {}
        song_objects = {}
        for row in reader:
            print(row)
            # read row into memory
            piece_name = row['Piece']
            piece_data = practice_grid_data.get(piece_name)
            if piece_data is None:
                practice_grid_data[piece_name] = {}
                piece_data = practice_grid_data[piece_name]
                song = get_song_for_title(piece_name)
                if song is None:
                  song = Song.objects.create(**{
                    'title': piece_name
                  })
                song_objects[piece_name] = song
            cells = parse_percentages(row)
            
            row_data = {
                'start_measure': row['Start Measure'],
                'end_measure': row['End Measure'],
                'target_marking': row['Target Marking'],
                'cells': cells
            }
            current_rows = practice_grid_data[piece_name].get('rows')
            if current_rows is None:
                practice_grid_data[piece_name]['rows'] = []
                current_rows = practice_grid_data[piece_name]['rows']
            current_rows.append(row_data)

    # truncate for existing if flag is switched
    if truncate_existing:
        truncate_existing_grids_for_name(filename)
    
    grid_data = {
        'name': filename,
        'notes': 'Imported from CSV'
    }

    practice_grid  = save_grid(grid_data)
    if practice_grid is None:
        print("There was an error saving the grid, quitting")
        return
    
    for piece_name, piece_csv_data in practice_grid_data.items():
        for row in piece_csv_data['rows']:
            row_model_detail = {
                'practice_grid':practice_grid,
                'target_tempo': row['target_marking'],
                'start_measure': row['start_measure'],
                'end_measure': row['end_measure'],
                'steps': len(row['cells']),
                'song': song_objects[piece_name]
            }
            practice_row = save_row(row_model_detail)
            if practice_row is None:
                print("Row save failed")
                return
            for cell in row['cells']:
                cell_completed = len(cell['completion']) > 0
                cell_data = {
                    'practice_row': practice_row,
                    'target_tempo_percentage': cell['percentage']
                }
                practice_cell = save_cell(cell_data)
                if practice_cell is None:
                    print("Cell save failed")
                    return
                if cell_completed:
                    cell_completion_data = {
                        'practice_cell': practice_cell,
                        'completion_date': datetime.datetime.strptime(cell['completion'],'%m/%d')
                    }
                else:
                    cell_completion_data = {
                        'practice_cell': practice_cell,
                        'completion_date': None
                    }
                completion = save_completion(cell_completion_data)
                if completion is None:
                    print("Completion save failed, continuing")

    return

if __name__ == "__main__":
    import_csv_to_db('static\\resources\\2022_Practice_record_-_NABBA_2022.csv')
    import_csv_to_db('static\\resources\\2022_Practice_record_-_NABBA_2022_final_run.csv')