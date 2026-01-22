"""Database configuration and models for Social Layer.

This module uses the shared SQLAlchemy Base from app.db.base to ensure
all models are registered in the same metadata registry.
"""

from datetime import datetime
import enum
import uuid

from sqlalchemy import (
	Boolean,
	Column,
	DateTime,
	Enum as SQLEnum,
	ForeignKey,
	JSON,
	String,
	Text,
	Integer,
	create_engine,
)
from sqlalchemy.orm import relationship, sessionmaker

# Use shared Base from db module for unified model registry
from app.db.base import Base


# Social layer specific database connection (for backward compatibility)
# In production, consider using the shared async session from app.db.session
SQLALCHEMY_DATABASE_URL = "sqlite:///./social_layer.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class PitchStatus(str, enum.Enum):
	DRAFT = "draft"
	IN_REVIEW = "in_review"
	READY_FOR_RENDER = "ready_for_render"
	REJECTED = "rejected"


class VoteType(str, enum.Enum):
	UP = "up"
	DOWN = "down"


class ReactionType(str, enum.Enum):
	LIKE = "like"
	DISLIKE = "dislike"


class PitchCard(Base):
	__tablename__ = "pitch_cards"

	id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
	company_id = Column(String, ForeignKey("company_profiles.id"), nullable=False)
	claims = Column(JSON, nullable=False)
	ingredients = Column(JSON, nullable=False)
	evidence_links = Column(JSON, nullable=True)
	required_specialties = Column(JSON, nullable=True)
	progress = Column(Integer, default=0)
	status = Column(SQLEnum(PitchStatus), default=PitchStatus.DRAFT)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	company = relationship("CompanyProfile", back_populates="pitches")
	reviews = relationship("ExpertReview", back_populates="pitch", cascade="all, delete-orphan")
	reactions = relationship("PublicReaction", back_populates="pitch", cascade="all, delete-orphan")
	audit_logs = relationship("AuditLog", back_populates="pitch", cascade="all, delete-orphan")


class ExpertReview(Base):
	__tablename__ = "expert_reviews"

	id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
	pitch_id = Column(String, ForeignKey("pitch_cards.id"), nullable=False)
	doctor_id = Column(String, ForeignKey("doctor_identities.id"), nullable=False)
	vote = Column(SQLEnum(VoteType), nullable=False)
	specialty = Column(String, nullable=True)
	comments = Column(Text, nullable=True)
	evidence_links = Column(JSON, nullable=True)
	timestamp = Column(DateTime, default=datetime.utcnow)
	weight = Column(Integer, default=1)

	pitch = relationship("PitchCard", back_populates="reviews")
	doctor = relationship("DoctorIdentity", back_populates="reviews")
	reactions = relationship("PublicReaction", back_populates="review", cascade="all, delete-orphan")


class PublicReaction(Base):
	__tablename__ = "public_reactions"

	id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
	pitch_id = Column(String, ForeignKey("pitch_cards.id"), nullable=True)
	review_id = Column(String, ForeignKey("expert_reviews.id"), nullable=True)
	user_id = Column(String, nullable=False)
	reaction = Column(SQLEnum(ReactionType), nullable=False)
	timestamp = Column(DateTime, default=datetime.utcnow)

	pitch = relationship("PitchCard", back_populates="reactions")
	review = relationship("ExpertReview", back_populates="reactions")


class DoctorIdentity(Base):
	__tablename__ = "doctor_identities"

	id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
	npi = Column(String, unique=True, nullable=False, index=True)
	license_status = Column(String, nullable=True)
	specialties = Column(JSON, nullable=True)
	identity_hash = Column(String, nullable=True)
	last_verified = Column(DateTime, nullable=True)
	name = Column(String, nullable=True)
	state = Column(String, nullable=True)
	board_certifications = Column(JSON, nullable=True)
	is_verified = Column(Boolean, default=False)

	reviews = relationship("ExpertReview", back_populates="doctor", cascade="all, delete-orphan")


class CompanyProfile(Base):
	__tablename__ = "company_profiles"

	id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
	name = Column(String, nullable=False)
	verification_status = Column(String, nullable=True)
	contact = Column(JSON, nullable=True)
	submissions = Column(JSON, nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)

	pitches = relationship("PitchCard", back_populates="company", cascade="all, delete-orphan")


class AuditLog(Base):
	__tablename__ = "audit_logs"

	id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
	pitch_id = Column(String, ForeignKey("pitch_cards.id"), nullable=True)
	actor_id = Column(String, nullable=True)
	actor_role = Column(String, nullable=True)
	action = Column(String, nullable=False)
	payload = Column(JSON, nullable=True)
	timestamp = Column(DateTime, default=datetime.utcnow)
	correlation_id = Column(String, nullable=True)
	ip_address = Column(String, nullable=True)

	pitch = relationship("PitchCard", back_populates="audit_logs")


def init_db() -> None:
	"""Initialize the database tables."""
	# Use checkfirst=True to avoid 'index already exists' errors
	Base.metadata.create_all(bind=engine, checkfirst=True)


def get_db():
	"""Yield a database session for dependency injection."""

	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()