from pathlib import Path
import sys

try:
    from docling.document_converter import DocumentConverter
except ImportError:
    print("docling is not installed. Install it with: pip install docling")
    sys.exit(1)


BASE_DIR = Path(__file__).resolve().parents[1]

# Raw law PDFs (input)
LAWS_DIR = BASE_DIR / "data" / "laws"

# Parsed output for ingest-laws.ts
OUT_DIR = BASE_DIR / "data" / "laws-parsed"


def main() -> None:
    if not LAWS_DIR.exists():
        print(f"Law PDF folder not found: {LAWS_DIR}")
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    converter = DocumentConverter()

    # Recursively find all PDFs under data/laws/**
    pdf_files = list(LAWS_DIR.rglob("*.pdf")) + list(LAWS_DIR.rglob("*.PDF"))
    if not pdf_files:
        print(f"No PDF files found under {LAWS_DIR}")
        sys.exit(0)

    for pdf_path in pdf_files:
        # Mirror the relative structure under laws-parsed
        rel = pdf_path.relative_to(LAWS_DIR)
        out_md = OUT_DIR / rel.with_suffix(".md")
        out_md.parent.mkdir(parents=True, exist_ok=True)

        print(f"Parsing {pdf_path} …")
        try:
            doc = converter.convert(str(pdf_path)).document
            markdown = doc.export_to_markdown()
        except Exception as e:  # noqa: BLE001
            print(f"  FAILED: {e}")
            continue

        out_md.write_text(markdown, encoding="utf-8")
        print(f"  -> wrote {out_md}")

    print("Done.")


if __name__ == "__main__":
    main()

