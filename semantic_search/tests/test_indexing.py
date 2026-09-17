from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.routes.indexing import index_document


@pytest.mark.asyncio
async def test_index_document_rejects_missing_file_name():
    request = MagicMock()
    request.app.state.embedding_service = MagicMock()
    request.app.state.vector_service = MagicMock()

    file = MagicMock()
    file.filename = None
    file.file = MagicMock()

    with pytest.raises(HTTPException):
        await index_document(request, file=file, document_id="DOC1", case_id="CASE1")
