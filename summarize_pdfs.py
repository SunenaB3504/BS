import os
from PyPDF2 import PdfReader
import sys

def extract_full_text(pdf_path, output_txt_path=None):
    try:
        reader = PdfReader(pdf_path)
        num_pages = len(reader.pages)
        all_text = []
        for i in range(num_pages):
            page = reader.pages[i]
            text = page.extract_text()
            if text:
                all_text.append(f"\n--- Page {i+1} ---\n{text.strip()}\n")
        full_text = f"{os.path.basename(pdf_path)} (Pages: {num_pages}):\n" + "".join(all_text)
        if output_txt_path:
            with open(output_txt_path, 'w', encoding='utf-8') as f:
                f.write(full_text)
        return full_text
    except Exception as e:
        return f"{os.path.basename(pdf_path)}: Error reading file: {e}"

def main():
    # Force UTF-8 encoding for stdout (Python 3.7+)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding='utf-8')
    pdf_files = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]
    for pdf in pdf_files:
        txt_name = os.path.splitext(pdf)[0] + '.txt'
        print(f"Extracting {pdf} to {txt_name} ...")
        result = extract_full_text(pdf, txt_name)
        print(f"Done: {txt_name}\n")

if __name__ == "__main__":
    main()
