import sqlite3
from datetime import datetime
from pathlib import Path

from sqlmodel import SQLModel, Session, create_engine, select

from app.config import get_settings
from app.models import Conversation, KnowledgeBase, Message

settings = get_settings()
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
legacy_database_path = Path(__file__).resolve().parents[2] / "assistant.db"


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        existing_base = session.exec(select(KnowledgeBase).limit(1)).first()
        if not existing_base:
            session.add(KnowledgeBase(name="Base personnelle", description="Informations personnelles"))
            session.commit()
        _migrate_legacy_conversations(session)


def _migrate_legacy_conversations(session: Session) -> None:
    if not legacy_database_path.exists():
        return

    with sqlite3.connect(legacy_database_path) as legacy_connection:
        legacy_connection.row_factory = sqlite3.Row
        legacy_conversations = legacy_connection.execute(
            "SELECT id, title, created_at FROM conversation ORDER BY id"
        ).fetchall()
        existing_keys = {
            (conversation.title, conversation.created_at.isoformat(sep=" "))
            for conversation in session.exec(select(Conversation))
        }
        for legacy_conversation in legacy_conversations:
            conversation_key = (legacy_conversation["title"], legacy_conversation["created_at"])
            if conversation_key in existing_keys:
                continue
            conversation = Conversation(
                title=legacy_conversation["title"],
                created_at=datetime.fromisoformat(legacy_conversation["created_at"]),
            )
            session.add(conversation)
            session.flush()
            legacy_messages = legacy_connection.execute(
                """
                SELECT role, content, sources_json, created_at
                FROM message
                WHERE conversation_id = ?
                ORDER BY created_at
                """,
                (legacy_conversation["id"],),
            ).fetchall()
            for legacy_message in legacy_messages:
                session.add(
                    Message(
                        conversation_id=conversation.id,
                        role=legacy_message["role"],
                        content=legacy_message["content"],
                        sources_json=legacy_message["sources_json"],
                        created_at=datetime.fromisoformat(legacy_message["created_at"]),
                    )
                )
        session.commit()


def get_session():
    with Session(engine) as session:
        yield session
