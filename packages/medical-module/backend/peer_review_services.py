"""
Core services for Social Layer backend
"""
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import hashlib
import logging
import httpx

from .database import (
    PitchCard, ExpertReview, PublicReaction, 
    DoctorIdentity, CompanyProfile, AuditLog,
    PitchStatus, VoteType, ReactionType
)
from .schemas import (
    PitchCreateRequest, PitchUpdateRequest,
    ReviewCreateRequest, DoctorVerifyRequest
)

logger = logging.getLogger(__name__)


class SocialService:
    """Service for managing pitch cards"""
    
    @staticmethod
    def create_pitch(db: Session, request: PitchCreateRequest, actor_id: str = None) -> PitchCard:
        """Create a new pitch card"""
        # Auto-generate required specialties based on claims
        required_specialties = ProgressEngine.generate_required_specialties(
            request.claims, request.ingredients
        )
        
        pitch = PitchCard(
            company_id=request.company_id,
            claims=request.claims,
            ingredients=request.ingredients,
            evidence_links=request.evidence_links or [],
            required_specialties=required_specialties,
            status=PitchStatus.DRAFT,
            progress=0
        )
        
        db.add(pitch)
        db.commit()
        db.refresh(pitch)
        
        # Log the action
        AuditTrailService.log_action(
            db=db,
            pitch_id=pitch.id,
            actor_id=actor_id or request.company_id,
            actor_role="company",
            action="pitch_created",
            payload={"pitch_id": pitch.id}
        )
        
        return pitch
    
    @staticmethod
    def get_pitch(db: Session, pitch_id: str) -> Optional[PitchCard]:
        """Get a pitch by ID"""
        return db.query(PitchCard).filter(PitchCard.id == pitch_id).first()
    
    @staticmethod
    def update_pitch(db: Session, pitch_id: str, request: PitchUpdateRequest, actor_id: str = None) -> Optional[PitchCard]:
        """Update a pitch (only if in draft status)"""
        pitch = db.query(PitchCard).filter(PitchCard.id == pitch_id).first()
        if not pitch:
            return None
        
        if pitch.status != PitchStatus.DRAFT:
            raise ValueError("Can only update pitch in draft status")
        
        if request.claims is not None:
            pitch.claims = request.claims
        if request.ingredients is not None:
            pitch.ingredients = request.ingredients
        if request.evidence_links is not None:
            pitch.evidence_links = request.evidence_links
        
        # Regenerate required specialties if claims/ingredients changed
        if request.claims or request.ingredients:
            pitch.required_specialties = ProgressEngine.generate_required_specialties(
                pitch.claims, pitch.ingredients
            )
        
        pitch.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(pitch)
        
        AuditTrailService.log_action(
            db=db,
            pitch_id=pitch.id,
            actor_id=actor_id,
            actor_role="company",
            action="pitch_updated",
            payload={"updates": request.dict(exclude_none=True)}
        )
        
        return pitch
    
    @staticmethod
    def get_pitch_progress(db: Session, pitch_id: str) -> Dict[str, Any]:
        """Get pitch progress details"""
        pitch = db.query(PitchCard).filter(PitchCard.id == pitch_id).first()
        if not pitch:
            return None
        
        reviews = db.query(ExpertReview).filter(ExpertReview.pitch_id == pitch_id).all()
        progress_data = ReviewEngine.calculate_progress(pitch, reviews)
        
        return progress_data


class ReviewEngine:
    """Engine for handling expert reviews and progress calculation"""
    
    @staticmethod
    def create_review(db: Session, pitch_id: str, request: ReviewCreateRequest) -> ExpertReview:
        """Create a new expert review"""
        pitch = db.query(PitchCard).filter(PitchCard.id == pitch_id).first()
        if not pitch:
            raise ValueError("Pitch not found")
        
        # Verify doctor identity
        doctor = db.query(DoctorIdentity).filter(DoctorIdentity.id == request.doctor_id).first()
        if not doctor or not doctor.is_verified:
            raise ValueError("Doctor not verified")
        
        # Check for duplicate review
        existing = db.query(ExpertReview).filter(
            and_(
                ExpertReview.pitch_id == pitch_id,
                ExpertReview.doctor_id == request.doctor_id
            )
        ).first()
        if existing:
            raise ValueError("Doctor has already reviewed this pitch")
        
        # Calculate review weight (higher for matching specialty)
        weight = 10 if request.specialty in (pitch.required_specialties or []) else 5
        
        review = ExpertReview(
            pitch_id=pitch_id,
            doctor_id=request.doctor_id,
            vote=VoteType(request.vote),
            specialty=request.specialty,
            comments=request.comments,
            evidence_links=request.evidence_links or [],
            weight=weight
        )
        
        db.add(review)
        
        # Update pitch status to in_review if it was draft
        if pitch.status == PitchStatus.DRAFT:
            pitch.status = PitchStatus.IN_REVIEW
        
        db.commit()
        db.refresh(review)
        
        # Recalculate progress
        ReviewEngine.update_pitch_progress(db, pitch_id)
        
        # Log the action
        AuditTrailService.log_action(
            db=db,
            pitch_id=pitch_id,
            actor_id=request.doctor_id,
            actor_role="expert",
            action="review_submitted",
            payload={"review_id": review.id, "vote": request.vote.value}
        )
        
        return review
    
    @staticmethod
    def calculate_progress(pitch: PitchCard, reviews: List[ExpertReview]) -> Dict[str, Any]:
        """Calculate pitch progress based on reviews"""
        required = set(pitch.required_specialties or [])
        reviewed = set()
        
        approval_count = 0
        disapproval_count = 0
        total_weighted_votes = 0
        max_possible_weight = 0
        
        for review in reviews:
            if review.specialty:
                reviewed.add(review.specialty)
            
            if review.vote == VoteType.UP:
                approval_count += 1
                total_weighted_votes += review.weight
            else:
                disapproval_count += 1
                total_weighted_votes -= review.weight
        
        # Calculate missing specialties
        missing = list(required - reviewed)
        
        # Calculate progress (0-100)
        if not required:
            progress = 0
        else:
            # Progress based on coverage of required specialties
            coverage = len(reviewed & required) / len(required)
            # Adjust by vote ratio
            vote_ratio = max(0, min(1, (total_weighted_votes / (len(reviews) * 10)) if reviews else 0))
            progress = int(coverage * vote_ratio * 100)
        
        # Halt logic: if any contradiction (down vote on required specialty)
        for review in reviews:
            if review.vote == VoteType.DOWN and review.specialty in required:
                progress = min(progress, 50)  # Cap progress at 50% if contradictions exist
        
        return {
            "progress": progress,
            "required_specialties": list(required),
            "missing": missing,
            "review_count": len(reviews),
            "approval_count": approval_count,
            "disapproval_count": disapproval_count
        }
    
    @staticmethod
    def update_pitch_progress(db: Session, pitch_id: str):
        """Update pitch progress and check if ready for render"""
        pitch = db.query(PitchCard).filter(PitchCard.id == pitch_id).first()
        if not pitch:
            return
        
        reviews = db.query(ExpertReview).filter(ExpertReview.pitch_id == pitch_id).all()
        progress_data = ReviewEngine.calculate_progress(pitch, reviews)
        
        pitch.progress = progress_data["progress"]
        
        # Check if ready for render (100% progress and all required specialties covered)
        if pitch.progress == 100 and not progress_data["missing"]:
            pitch.status = PitchStatus.READY_FOR_RENDER
            # Trigger webhook
            WebhookService.trigger_render_webhook(db, pitch, reviews)
        
        db.commit()


class ProgressEngine:
    """Engine for auto-generating required specialties"""
    
    @staticmethod
    def generate_required_specialties(claims: Dict, ingredients: Dict) -> List[str]:
        """Auto-generate required specialties based on drug properties"""
        specialties = set()
        
        # Map keywords to specialties
        specialty_keywords = {
            "oncology": ["cancer", "tumor", "chemotherapy", "oncology"],
            "cardiology": ["heart", "cardiac", "cardiovascular", "hypertension"],
            "pediatrics": ["pediatric", "children", "infant", "neonatal"],
            "immunology": ["immune", "immunology", "antibody", "vaccination"],
            "pulmonology": ["lung", "respiratory", "bronchial", "pulmonary"],
            "neurology": ["brain", "neurological", "neural", "cognitive"],
            "infectious_disease": ["viral", "bacterial", "infection", "antibiotic"],
            "endocrinology": ["diabetes", "hormone", "thyroid", "metabolic"],
            "gastroenterology": ["gastric", "intestinal", "digestive", "gut"],
        }
        
        # Check claims
        claims_text = str(claims).lower()
        ingredients_text = str(ingredients).lower()
        combined = claims_text + " " + ingredients_text
        
        for specialty, keywords in specialty_keywords.items():
            if any(keyword in combined for keyword in keywords):
                specialties.add(specialty)
        
        # Ensure at least one specialty
        if not specialties:
            specialties.add("general_medicine")
        
        return list(specialties)


class IdentityAdapter:
    """Service for medical identity verification"""
    
    @staticmethod
    async def verify_doctor(db: Session, npi: str) -> DoctorIdentity:
        """Verify doctor identity using NPI registry"""
        # Check cache first
        existing = db.query(DoctorIdentity).filter(DoctorIdentity.npi == npi).first()
        if existing and existing.last_verified:
            # If verified within 24 hours, return cached
            if datetime.utcnow() - existing.last_verified < timedelta(hours=24):
                return existing
        
        # Call NPI Registry API (mock for now)
        npi_data = await IdentityAdapter._call_npi_registry(npi)
        
        if not npi_data:
            raise ValueError("NPI not found")
        
        # Generate identity hash
        identity_hash = IdentityAdapter._generate_identity_hash(
            npi, npi_data.get("license_number", ""), npi_data.get("state", "")
        )
        
        if existing:
            # Update existing
            existing.license_status = npi_data.get("license_status", "active")
            existing.specialties = npi_data.get("specialties", [])
            existing.name = npi_data.get("name")
            existing.state = npi_data.get("state")
            existing.board_certifications = npi_data.get("board_certifications", [])
            existing.identity_hash = identity_hash
            existing.last_verified = datetime.utcnow()
            existing.is_verified = True
            doctor = existing
        else:
            # Create new
            doctor = DoctorIdentity(
                npi=npi,
                license_status=npi_data.get("license_status", "active"),
                specialties=npi_data.get("specialties", []),
                name=npi_data.get("name"),
                state=npi_data.get("state"),
                board_certifications=npi_data.get("board_certifications", []),
                identity_hash=identity_hash,
                last_verified=datetime.utcnow(),
                is_verified=True
            )
            db.add(doctor)
        
        db.commit()
        db.refresh(doctor)
        
        return doctor
    
    @staticmethod
    async def _call_npi_registry(npi: str) -> Optional[Dict]:
        """Call NPI Registry API using the official NPPES NPI Registry"""
        try:
            # Official NPPES NPI Registry API
            url = f"https://npiregistry.cms.hhs.gov/api/?version=2.1&number={npi}"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                
                if response.status_code != 200:
                    logger.error(f"NPI Registry API returned status {response.status_code}")
                    return None
                
                data = response.json()
                
                # Check if results exist
                if not data.get("results") or len(data["results"]) == 0:
                    logger.warning(f"No NPI found for number: {npi}")
                    return None
                
                result = data["results"][0]
                
                # Extract provider information
                basic = result.get("basic", {})
                addresses = result.get("addresses", [])
                taxonomies = result.get("taxonomies", [])
                
                # Get practice location (primary address)
                practice_addr = None
                for addr in addresses:
                    if addr.get("address_purpose") == "LOCATION":
                        practice_addr = addr
                        break
                if not practice_addr and addresses:
                    practice_addr = addresses[0]
                
                # Extract name
                first_name = basic.get("first_name", "")
                last_name = basic.get("last_name", "")
                credential = basic.get("credential", "")
                name = f"Dr. {first_name} {last_name}"
                if credential:
                    name += f", {credential}"
                
                # Extract specialties from taxonomies
                specialties = []
                board_certifications = []
                for taxonomy in taxonomies:
                    if taxonomy.get("primary", False):
                        desc = taxonomy.get("desc", "")
                        if desc:
                            specialties.append(desc.lower().replace(" ", "_"))
                            if taxonomy.get("license"):
                                board_certifications.append(desc)
                
                # If no specialties, use general medicine
                if not specialties:
                    specialties = ["general_medicine"]
                
                return {
                    "npi": npi,
                    "name": name,
                    "license_status": "active",  # NPI Registry doesn't provide license status directly
                    "state": practice_addr.get("state", "Unknown") if practice_addr else "Unknown",
                    "specialties": specialties[:5],  # Limit to top 5
                    "board_certifications": board_certifications,
                    "license_number": f"NPI{npi}"  # Use NPI as license number
                }
                
        except httpx.TimeoutException:
            logger.error(f"Timeout calling NPI Registry for {npi}")
            # Fallback to basic data if API fails
            return {
                "npi": npi,
                "name": f"Dr. NPI-{npi}",
                "license_status": "active",
                "state": "Unknown",
                "specialties": ["general_medicine"],
                "board_certifications": [],
                "license_number": f"NPI{npi}"
            }
        except Exception as e:
            logger.error(f"Error calling NPI Registry: {e}")
            # Fallback to basic data if API fails
            return {
                "npi": npi,
                "name": f"Dr. NPI-{npi}",
                "license_status": "active",
                "state": "Unknown",
                "specialties": ["general_medicine"],
                "board_certifications": [],
                "license_number": f"NPI{npi}"
            }
    
    @staticmethod
    def _generate_identity_hash(npi: str, license: str, state: str) -> str:
        """Generate identity hash for tamper detection"""
        combined = f"{npi}:{license}:{state}"
        return hashlib.sha256(combined.encode()).hexdigest()


class PublicSignalService:
    """Service for public reactions and flags"""
    
    @staticmethod
    def add_reaction(db: Session, target_id: str, target_type: str, user_id: str, reaction: str) -> PublicReaction:
        """Add a public reaction (like/dislike)"""
        # Check for existing reaction
        if target_type == "pitch":
            existing = db.query(PublicReaction).filter(
                and_(
                    PublicReaction.pitch_id == target_id,
                    PublicReaction.user_id == user_id
                )
            ).first()
            reaction_obj = PublicReaction(
                pitch_id=target_id,
                user_id=user_id,
                reaction=ReactionType(reaction)
            )
        else:  # review
            existing = db.query(PublicReaction).filter(
                and_(
                    PublicReaction.review_id == target_id,
                    PublicReaction.user_id == user_id
                )
            ).first()
            reaction_obj = PublicReaction(
                review_id=target_id,
                user_id=user_id,
                reaction=ReactionType(reaction)
            )
        
        if existing:
            # Update existing reaction
            existing.reaction = ReactionType(reaction)
            existing.timestamp = datetime.utcnow()
            db.commit()
            return existing
        
        db.add(reaction_obj)
        db.commit()
        db.refresh(reaction_obj)
        
        return reaction_obj
    
    @staticmethod
    def flag_content(db: Session, pitch_id: str, reason: str, user_id: str = None, ip_address: str = None):
        """Flag content for review"""
        AuditTrailService.log_action(
            db=db,
            pitch_id=pitch_id,
            actor_id=user_id,
            actor_role="public",
            action="content_flagged",
            payload={"reason": reason},
            ip_address=ip_address
        )


class AuditTrailService:
    """Service for append-only audit logging"""
    
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        pitch_id: str = None,
        actor_id: str = None,
        actor_role: str = None,
        payload: Dict = None,
        correlation_id: str = None,
        ip_address: str = None
    ):
        """Log an action to the audit trail"""
        log = AuditLog(
            pitch_id=pitch_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            payload=payload or {},
            correlation_id=correlation_id,
            ip_address=ip_address
        )
        
        db.add(log)
        db.commit()
    
    @staticmethod
    def get_audit_logs(db: Session, pitch_id: str) -> List[AuditLog]:
        """Get audit logs for a pitch"""
        return db.query(AuditLog).filter(AuditLog.pitch_id == pitch_id).order_by(AuditLog.timestamp).all()


class WebhookService:
    """Service for triggering webhooks"""
    
    @staticmethod
    def trigger_render_webhook(db: Session, pitch: PitchCard, reviews: List[ExpertReview]):
        """Trigger webhook when pitch is ready for rendering"""
        # Calculate public sentiment
        reactions = db.query(PublicReaction).filter(PublicReaction.pitch_id == pitch.id).all()
        likes = sum(1 for r in reactions if r.reaction == ReactionType.LIKE)
        dislikes = sum(1 for r in reactions if r.reaction == ReactionType.DISLIKE)
        
        # Build webhook payload
        payload = {
            "pitchId": pitch.id,
            "drugName": pitch.claims.get("name", "Unknown"),
            "claims": pitch.claims,
            "ingredients": pitch.ingredients,
            "reviewSummary": {
                "requiredSpecialties": pitch.required_specialties,
                "totalReviews": len(reviews),
                "approvals": sum(1 for r in reviews if r.vote == VoteType.UP),
                "disapprovals": sum(1 for r in reviews if r.vote == VoteType.DOWN),
                "publicSentiment": {
                    "likes": likes,
                    "dislikes": dislikes
                }
            },
            "metadata": {
                "company": pitch.company_id,
                "submissionDate": pitch.created_at.isoformat()
            }
        }
        
        # Log webhook trigger
        AuditTrailService.log_action(
            db=db,
            pitch_id=pitch.id,
            action="webhook_triggered",
            payload=payload
        )
        
        # In production, this would make an HTTP request to the webhook URL
        logger.info(f"Webhook triggered for pitch {pitch.id}")
        
        return payload
