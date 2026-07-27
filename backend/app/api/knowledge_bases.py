from fastapi import APIRouter, Depends, HTTPException, Request, status
from qdrant_client import models
from sqlalchemy import func
from sqlmodel import Session, select

from app.db import get_session
from app.models import Document, KnowledgeBase
from app.schemas import KnowledgeBaseCreate, KnowledgeBaseResponse, KnowledgeBaseUpdate
from app.services.rag import RagService

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])


@router.get("", response_model=list[KnowledgeBaseResponse])
async def list_knowledge_bases(session: Session = Depends(get_session)) -> list[KnowledgeBaseResponse]:
    bases = list(session.exec(select(KnowledgeBase).order_by(KnowledgeBase.created_at)))
    return [_serialize_knowledge_base(session, knowledge_base) for knowledge_base in bases]


@router.post("", response_model=KnowledgeBaseResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base(
    payload: KnowledgeBaseCreate,
    session: Session = Depends(get_session),
) -> KnowledgeBaseResponse:
    knowledge_base = KnowledgeBase(name=payload.name.strip(), description=payload.description.strip())
    session.add(knowledge_base)
    session.commit()
    session.refresh(knowledge_base)
    return _serialize_knowledge_base(session, knowledge_base)


@router.put("/{kb_id}", response_model=KnowledgeBaseResponse)
async def update_knowledge_base(
    kb_id: int,
    payload: KnowledgeBaseUpdate,
    session: Session = Depends(get_session),
) -> KnowledgeBaseResponse:
    knowledge_base = _get_knowledge_base(session, kb_id)
    knowledge_base.name = payload.name.strip()
    knowledge_base.description = payload.description.strip()
    session.add(knowledge_base)
    session.commit()
    session.refresh(knowledge_base)
    return _serialize_knowledge_base(session, knowledge_base)


@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_base(
    kb_id: int,
    request: Request,
    session: Session = Depends(get_session),
) -> None:
    knowledge_base = _get_knowledge_base(session, kb_id)
    rag_service: RagService = request.app.state.rag_service
    if await rag_service.qdrant.collection_exists(rag_service.settings.qdrant_collection):
        vector_filter = models.Filter(
            must=[models.FieldCondition(key="kb_id", match=models.MatchValue(value=kb_id))]
        )
        await rag_service.qdrant.delete(
            collection_name=rag_service.settings.qdrant_collection,
            points_selector=models.FilterSelector(filter=vector_filter),
            wait=True,
        )
    documents = list(session.exec(select(Document).where(Document.kb_id == kb_id)))
    for document in documents:
        session.delete(document)
    session.delete(knowledge_base)
    session.commit()


def _get_knowledge_base(session: Session, kb_id: int) -> KnowledgeBase:
    knowledge_base = session.get(KnowledgeBase, kb_id)
    if not knowledge_base:
        raise HTTPException(status_code=404, detail="Base de connaissances introuvable.")
    return knowledge_base


def _serialize_knowledge_base(session: Session, knowledge_base: KnowledgeBase) -> KnowledgeBaseResponse:
    document_count = session.exec(
        select(func.count(Document.id)).where(Document.kb_id == knowledge_base.id)
    ).one()
    return KnowledgeBaseResponse(
        id=knowledge_base.id,
        name=knowledge_base.name,
        description=knowledge_base.description,
        created_at=knowledge_base.created_at,
        document_count=document_count,
    )