from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlmodel import Session

from app.db import get_session
from app.schemas import IngestResponse
from app.services.ingestion import IngestionError, IngestionService, extract_text

router = APIRouter(tags=["ingestion"])
MAX_UPLOAD_SIZE = 20 * 1024 * 1024


@router.post("/ingest", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest(
    request: Request,
    kb_id: int = Form(default=1, ge=1),
    note: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    session: Session = Depends(get_session),
) -> IngestResponse:
    if bool(note and note.strip()) == bool(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envoyez exactement une note ou un fichier.",
        )

    try:
        if file:
            content = await file.read()
            if len(content) > MAX_UPLOAD_SIZE:
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Fichier trop volumineux.")
            filename = file.filename or "document"
            raw_text = extract_text(filename, content)
        else:
            filename = "Note libre"
            raw_text = note.strip() if note else ""

        ingestion_service: IngestionService = request.app.state.ingestion_service
        return await ingestion_service.ingest(session, kb_id, filename, raw_text)
    except IngestionError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error