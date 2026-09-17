from __future__ import annotations

from typing import List

from app.utils.logging import get_logger

logger = get_logger(__name__)


class OCRService:
    def __init__(self) -> None:
        self._ocr = None

    def _get_ocr_client(self):
        try:
            from paddleocr import PaddleOCR
        except ImportError as exc:
            raise RuntimeError("PaddleOCR is required for scanned document processing.") from exc

        if self._ocr is None:
            self._ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        return self._ocr

    def extract_text_from_image(self, file_bytes: bytes) -> str:
        try:
            ocr = self._get_ocr_client()
            results = ocr.ocr(file_bytes, cls=True)
            lines: List[str] = []
            for page_result in results or []:
                if not page_result:
                    continue
                for line in page_result:
                    if not line or len(line) < 2:
                        continue
                    text = line[1][0] if isinstance(line[1], (list, tuple)) and len(line[1]) > 0 else ""
                    if text:
                        lines.append(str(text))
            return " ".join(lines)
        except Exception as exc:
            logger.warning("OCR extraction failed for image: %s", exc)
            raise ValueError("Unable to extract text from the scanned document via OCR.") from exc
