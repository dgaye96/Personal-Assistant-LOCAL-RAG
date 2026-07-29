import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session, desc, select

from app.db import get_session
from app.models import Conversation, Message
from app.schemas import ChatRequest, ConversationDetail, ConversationSummary, ConversationUpdateRequest, MessageUpdateRequest, StoredMessage
from app.services.rag import RagService

router = APIRouter(tags=["chat"])


@router.get("/models")
async def list_models(request: Request) -> list[dict]:
    """Returns all Ollama models available locally."""
    rag_service: RagService = request.app.state.rag_service
    try:
        models = await rag_service.ollama.list_models()
        return [{"id": m["name"], "name": m["name"]} for m in models]
    except Exception:
        return []


@router.post("/chat")
async def chat(
    payload: ChatRequest,
    request: Request,
    session: Session = Depends(get_session),
) -> StreamingResponse:
    rag_service: RagService = request.app.state.rag_service
    conversation = _get_or_create_conversation(session, payload)
    session.add(Message(conversation_id=conversation.id, role="user", content=payload.question))
    session.commit()

    return StreamingResponse(
        _save_streamed_answer(rag_service, payload, conversation.id, session),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(session: Session = Depends(get_session)) -> list[Conversation]:
    return list(session.exec(select(Conversation).order_by(desc(Conversation.created_at))))


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: int,
    session: Session = Depends(get_session),
) -> ConversationDetail:
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")
    stored_messages = list(
        session.exec(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at))
    )
    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        messages=[
            StoredMessage(
                id=message.id,
                role=message.role,
                content=message.content,
                sources=json.loads(message.sources_json),
                created_at=message.created_at,
            )
            for message in stored_messages
        ],
    )


@router.put("/conversations/{conversation_id}", response_model=ConversationSummary)
async def rename_conversation(
    conversation_id: int,
    payload: ConversationUpdateRequest,
    session: Session = Depends(get_session),
) -> Conversation:
    conversation = _get_conversation(session, conversation_id)
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Le titre de la discussion est requis.")
    conversation.title = title
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: int,
    session: Session = Depends(get_session),
) -> None:
    conversation = _get_conversation(session, conversation_id)
    messages = list(session.exec(select(Message).where(Message.conversation_id == conversation_id)))
    for message in messages:
        session.delete(message)
    session.delete(conversation)
    session.commit()


@router.put("/conversations/{conversation_id}/messages/{message_id}")
async def update_question(
    conversation_id: int,
    message_id: int,
    payload: MessageUpdateRequest,
    request: Request,
    session: Session = Depends(get_session),
) -> StreamingResponse:
    message = _get_user_message(session, conversation_id, message_id)
    message.content = payload.question.strip()
    _delete_following_assistant_message(session, message)
    session.add(message)
    session.commit()

    rag_service: RagService = request.app.state.rag_service
    return StreamingResponse(
        _save_streamed_answer(rag_service, ChatRequest(question=message.content, kb_ids=payload.kb_ids), conversation_id, session),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.delete("/conversations/{conversation_id}/messages/{message_id}", status_code=204)
async def delete_question(
    conversation_id: int,
    message_id: int,
    session: Session = Depends(get_session),
) -> None:
    message = _get_user_message(session, conversation_id, message_id)
    _delete_following_assistant_message(session, message)
    session.delete(message)
    session.commit()

    remaining_message = session.exec(
        select(Message).where(Message.conversation_id == conversation_id).limit(1)
    ).first()
    if not remaining_message:
        conversation = session.get(Conversation, conversation_id)
        if conversation:
            session.delete(conversation)
            session.commit()


def _get_or_create_conversation(session: Session, payload: ChatRequest) -> Conversation:
    if payload.conversation_id:
        conversation = session.get(Conversation, payload.conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation introuvable.")
        return conversation

    title = payload.question.strip().replace("\n", " ")[:80]
    conversation = Conversation(title=title or "Nouvelle conversation")
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


def _get_conversation(session: Session, conversation_id: int) -> Conversation:
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")
    return conversation


def _get_user_message(session: Session, conversation_id: int, message_id: int) -> Message:
    message = session.get(Message, message_id)
    if not message or message.conversation_id != conversation_id or message.role != "user":
        raise HTTPException(status_code=404, detail="Question introuvable.")
    return message


def _delete_following_assistant_message(session: Session, message: Message) -> None:
    following_message = session.exec(
        select(Message)
        .where(
            Message.conversation_id == message.conversation_id,
            Message.role == "assistant",
            Message.created_at >= message.created_at,
        )
        .order_by(Message.created_at)
        .limit(1)
    ).first()
    if following_message:
        session.delete(following_message)


async def _save_streamed_answer(
    rag_service: RagService,
    payload: ChatRequest,
    conversation_id: int,
    session: Session,
) -> AsyncIterator[str]:
    assistant_content = ""
    sources: list[dict] = []
    completed = False

    yield rag_service.event("conversation", {"id": conversation_id})
    async for event in rag_service.answer(payload.question, payload.kb_ids, payload.model_id):
        event_name, data = _parse_event(event)
        if event_name == "token":
            assistant_content += data.get("text", "")
        elif event_name == "sources":
            sources = data.get("items", [])
        elif event_name == "done":
            completed = True
        yield event

    if completed:
        session.add(
            Message(
                conversation_id=conversation_id,
                role="assistant",
                content=assistant_content,
                sources_json=json.dumps(sources, ensure_ascii=False),
            )
        )
        session.commit()


def _parse_event(event: str) -> tuple[str, dict]:
    lines = event.strip().splitlines()
    event_name = lines[0].removeprefix("event: ")
    data = json.loads(lines[1].removeprefix("data: "))
    return event_name, data
