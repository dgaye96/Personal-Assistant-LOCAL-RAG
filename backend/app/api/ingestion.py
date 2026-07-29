from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlmodel import Session

from app.db import get_session
from app.schemas import IngestBatchResponse
from app.services.ingestion import IngestionError, IngestionService, extract_text

router = APIRouter(tags=["ingestion"])
MAX_UPLOAD_SIZE = 20 * 1024 * 1024


@router.post("/ingest", response_model=IngestBatchResponse, status_code=status.HTTP_201_CREATED)
async def ingest(
    request: Request,
    kb_id: int = Form(default=1, ge=1),
    note: str | None = Form(default=None),
    files: list[UploadFile] = File(default=[]),
    session: Session = Depends(get_session),
) -> IngestBatchResponse:
    if bool(note and note.strip()) == bool(files):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envoyez exactement une note ou au moins un fichier.",
        )

    try:
        ingestion_service: IngestionService = request.app.state.ingestion_service
        if note and note.strip():
            filename = "Note libre"
            document = await ingestion_service.ingest(session, kb_id, filename, note.strip())
            return IngestBatchResponse(kb_id=kb_id, documents=[document], chunks_indexed=document.chunks_indexed)

        documents = []
        for file in files:
            content = await file.read()
            if len(content) > MAX_UPLOAD_SIZE:
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"Fichier trop volumineux : {file.filename or 'document'}.")
            filename = file.filename or "document"
            raw_text = extract_text(filename, content)
            documents.append(await ingestion_service.ingest(session, kb_id, filename, raw_text))

        return IngestBatchResponse(
            kb_id=kb_id,
            documents=documents,
            chunks_indexed=sum(document.chunks_indexed for document in documents),
        )
    except IngestionError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error