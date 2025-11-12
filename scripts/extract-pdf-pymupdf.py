#!/usr/bin/env python3
"""
PyMuPDF PDF Text Extraction Script

Fast and robust PDF text extraction using PyMuPDF (fitz).
Called as subprocess from Node.js when pdf-parse fails.

Usage:
    python3 extract-pdf-pymupdf.py <pdf_file_path>

Output (JSON to stdout):
    {
        "success": true,
        "text": "extracted text...",
        "pageCount": 123,
        "pages": [
            {
                "pageNumber": 1,
                "text": "page 1 text...",
                "startOffset": 0,
                "endOffset": 1234
            }
        ],
        "method": "pymupdf"
    }

Error output:
    {
        "success": false,
        "error": "error message",
        "method": "pymupdf"
    }
"""

import sys
import json
import fitz  # PyMuPDF

def extract_text_from_pdf(pdf_path):
    """
    Extract text from PDF using PyMuPDF.

    Args:
        pdf_path: Path to the PDF file

    Returns:
        dict: Result with text, pageCount, or error
    """
    try:
        # Open the PDF
        doc = fitz.open(pdf_path)

        # Extract text from all pages with per-page metadata
        text_parts = []
        pages_data = []
        current_offset = 0
        page_count = len(doc)

        for page_num in range(page_count):
            page = doc[page_num]
            text = page.get_text()

            if text.strip():
                # Calculate character offsets for this page
                start_offset = current_offset
                end_offset = current_offset + len(text)

                # Store page metadata
                pages_data.append({
                    "pageNumber": page_num + 1,  # 1-indexed for user display
                    "text": text,
                    "startOffset": start_offset,
                    "endOffset": end_offset
                })

                text_parts.append(text)

                # Update offset for next page (account for \n\n separator)
                current_offset = end_offset + 2

        # Combine all text
        full_text = "\n\n".join(text_parts)

        # Clean up
        doc.close()

        # Check if we got any text
        if not full_text or len(full_text.strip()) < 100:
            return {
                "success": False,
                "error": "No text could be extracted from this PDF. It might be a scanned document or contain only images. Consider using OCR software.",
                "pageCount": page_count,
                "method": "pymupdf"
            }

        return {
            "success": True,
            "text": full_text,
            "pageCount": page_count,
            "pages": pages_data,  # NEW: per-page data with offsets
            "method": "pymupdf"
        }

    except fitz.FileDataError as e:
        return {
            "success": False,
            "error": f"Invalid or corrupted PDF file: {str(e)}",
            "method": "pymupdf"
        }
    except fitz.EmptyFileError as e:
        return {
            "success": False,
            "error": f"PDF file is empty: {str(e)}",
            "method": "pymupdf"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unable to parse PDF: {str(e)}",
            "method": "pymupdf"
        }

def main():
    """Main entry point for the script."""
    if len(sys.argv) < 2:
        result = {
            "success": False,
            "error": "Usage: python3 extract-pdf-pymupdf.py <pdf_file_path>",
            "method": "pymupdf"
        }
        print(json.dumps(result))
        sys.exit(1)

    pdf_path = sys.argv[1]

    # Extract text
    result = extract_text_from_pdf(pdf_path)

    # Output JSON to stdout
    print(json.dumps(result))

    # Exit with appropriate code
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()
