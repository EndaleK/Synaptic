#!/usr/bin/env python3
"""
PyMuPDF PDF Image Extraction Script

Extracts images from PDFs using PyMuPDF (fitz).
Called as subprocess from Node.js during document processing.

Usage:
    python3 extract-pdf-images.py <pdf_file_path> <output_directory>

Output (JSON to stdout):
    {
        "success": true,
        "images": [
            {
                "pageNumber": 1,
                "imageIndex": 0,
                "filename": "page_1_img_0.png",
                "width": 800,
                "height": 600,
                "colorspace": "RGB",
                "bitsPerComponent": 8,
                "xref": 12,
                "bbox": [100.5, 200.3, 500.5, 600.3]
            }
        ],
        "totalImages": 5,
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
import os
import fitz  # PyMuPDF
import base64
from io import BytesIO

def extract_images_from_pdf(pdf_path, output_dir=None, max_images=50, min_size=100):
    """
    Extract images from PDF using PyMuPDF.

    Args:
        pdf_path: Path to the PDF file
        output_dir: Directory to save images (if None, returns base64)
        max_images: Maximum number of images to extract (prevents memory issues)
        min_size: Minimum width/height to include (filters out tiny icons)

    Returns:
        dict: Result with images array or error
    """
    try:
        # Open the PDF
        doc = fitz.open(pdf_path)

        images_data = []
        total_extracted = 0
        page_count = len(doc)

        for page_num in range(page_count):
            if total_extracted >= max_images:
                break

            page = doc[page_num]

            # Get list of images on this page
            image_list = page.get_images(full=True)

            for img_index, img_info in enumerate(image_list):
                if total_extracted >= max_images:
                    break

                xref = img_info[0]  # Image reference number

                try:
                    # Extract image
                    base_image = doc.extract_image(xref)

                    if not base_image:
                        continue

                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]
                    width = base_image.get("width", 0)
                    height = base_image.get("height", 0)
                    colorspace = base_image.get("colorspace", 0)
                    bpc = base_image.get("bpc", 8)  # bits per component

                    # Skip tiny images (likely icons, bullets, etc.)
                    if width < min_size or height < min_size:
                        continue

                    # Get image position on page (bbox)
                    bbox = None
                    for img_rect in page.get_image_rects(xref):
                        bbox = [img_rect.x0, img_rect.y0, img_rect.x1, img_rect.y1]
                        break  # Use first occurrence

                    # Create filename
                    filename = f"page_{page_num + 1}_img_{img_index}.{image_ext}"

                    image_info = {
                        "pageNumber": page_num + 1,
                        "imageIndex": img_index,
                        "filename": filename,
                        "width": width,
                        "height": height,
                        "colorspace": colorspace,
                        "bitsPerComponent": bpc,
                        "xref": xref,
                        "extension": image_ext,
                        "sizeBytes": len(image_bytes)
                    }

                    if bbox:
                        image_info["bbox"] = bbox

                    # Either save to file or encode as base64
                    if output_dir:
                        # Save to file
                        filepath = os.path.join(output_dir, filename)
                        with open(filepath, "wb") as f:
                            f.write(image_bytes)
                        image_info["filepath"] = filepath
                    else:
                        # Return base64 encoded
                        image_info["base64"] = base64.b64encode(image_bytes).decode('utf-8')
                        image_info["mimeType"] = f"image/{image_ext}"

                    images_data.append(image_info)
                    total_extracted += 1

                except Exception as img_error:
                    # Skip problematic images but continue processing
                    continue

        # Clean up
        doc.close()

        return {
            "success": True,
            "images": images_data,
            "totalImages": total_extracted,
            "pageCount": page_count,
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
            "error": f"Unable to extract images: {str(e)}",
            "method": "pymupdf"
        }

def main():
    """Main entry point for the script."""
    if len(sys.argv) < 2:
        result = {
            "success": False,
            "error": "Usage: python3 extract-pdf-images.py <pdf_file_path> [output_directory]",
            "method": "pymupdf"
        }
        print(json.dumps(result))
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    # Create output directory if specified and doesn't exist
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    # Extract images
    result = extract_images_from_pdf(pdf_path, output_dir)

    # Output JSON to stdout
    print(json.dumps(result))

    # Exit with appropriate code
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()
