import fitz # PyMuPDF
import os

pdf_dirs = [
    os.path.join("public", "Certificates"),
    os.path.join("public", "Catelouges")
]

output_dir = os.path.join("public", "pdf_thumbnails")
os.makedirs(output_dir, exist_ok=True)

processed = set()

for pdf_dir in pdf_dirs:
    if not os.path.exists(pdf_dir):
        continue
    for root, dirs, files in os.walk(pdf_dir):
        for file in files:
            if file.lower().endswith(".pdf"):
                full_path = os.path.join(root, file)
                rel_filename = os.path.basename(file)
                if rel_filename in processed:
                    continue
                processed.add(rel_filename)
                
                # Create a clean web-friendly output filename
                safe_name = rel_filename.replace(" ", "_").replace("(", "").replace(")", "").replace("%20", "_")
                output_jpg_name = os.path.splitext(safe_name)[0] + "_page1.jpg"
                output_jpg_path = os.path.join(output_dir, output_jpg_name)
                
                try:
                    doc = fitz.open(full_path)
                    if len(doc) > 0:
                        page = doc.load_page(0) # page 1
                        pix = page.get_pixmap(dpi=120)
                        pix.save(output_jpg_path)
                        print(f"Generated page 1 thumbnail: {rel_filename} -> {output_jpg_name}")
                    doc.close()
                except Exception as e:
                    print(f"Error converting {rel_filename}: {e}")

print("All PDF page 1 thumbnails generated successfully!")
