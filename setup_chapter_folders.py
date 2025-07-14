import os
import glob

# Directory where chapter txt files are located
base_dir = os.path.dirname(os.path.abspath(__file__))
chapter_txt_files = glob.glob(os.path.join(base_dir, 'lebs1*.txt'))

# Output folder for chapters
chapters_root = os.path.join(base_dir, 'chapters')
os.makedirs(chapters_root, exist_ok=True)

for txt_file in chapter_txt_files:
    # Extract chapter number from filename, e.g., lebs101.txt -> 101
    basename = os.path.basename(txt_file)
    chapter_num = basename.replace('lebs', '').replace('.txt', '')
    chapter_folder = os.path.join(chapters_root, f'chapter{chapter_num}')
    os.makedirs(chapter_folder, exist_ok=True)

    # Create empty JSON files
    for fname in ['mindmap.json', 'flashcards.json', 'questions.json', 'exercises.json']:
        fpath = os.path.join(chapter_folder, fname)
        if not os.path.exists(fpath):
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write('{}')

print('Chapter folders and JSON files created successfully.')
