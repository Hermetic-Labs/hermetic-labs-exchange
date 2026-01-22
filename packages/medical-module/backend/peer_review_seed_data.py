"""
Seed script to populate the Peer Review database with test data
Run this to initialize the database with sample pitches, doctors, and reviews
"""

import sys
import os
import asyncio
import datetime
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.peer_review.database import SessionLocal, init_db, CompanyProfile, DoctorIdentity
from app.peer_review.services import SocialService, ReviewEngine, IdentityAdapter, PublicSignalService
from app.peer_review.schemas import PitchCreateRequest, ReviewCreateRequest, CreateReactionRequest, CreateCompanyRequest


async def seed_database():
    """Seed the database with test data"""
    print("Initializing database...")
    init_db()
    db = SessionLocal()
    
    try:
        # Create test companies
        print("\nCreating test companies...")
        companies = []
        company_data = [
            {"name": "Helix Therapeutics", "contact": {"email": "contact@helix.com", "phone": "555-0100"}},
            {"name": "BioNova Labs", "contact": {"email": "info@bionova.com", "phone": "555-0200"}},
            {"name": "MediCore Pharmaceuticals", "contact": {"email": "support@medicore.com", "phone": "555-0300"}},
        ]
        
        for comp_data in company_data:
            company = CompanyProfile(
                name=comp_data["name"],
                contact=comp_data["contact"],
                verification_status="verified"
            )
            db.add(company)
            companies.append(company)
        
        db.commit()
        for company in companies:
            db.refresh(company)
        print(f"Created {len(companies)} companies")
        
        # Create test doctors
        print("\nCreating test doctors...")
        doctors = []
        npi_list = [
            "1234567890",  # General Medicine
            "2345678901",  # Oncology
            "3456789012",  # Cardiology
            "4567890123",  # Pediatrics
            "5678901234",  # Immunology
        ]
        
        for npi in npi_list:
            try:
                doctor = await IdentityAdapter.verify_doctor(db, npi)
                doctors.append(doctor)
                print(f"  - Verified doctor: {doctor.name} (NPI: {npi})")
            except Exception as e:
                print(f"  - Failed to verify doctor {npi}: {e}")
        
        # Create test pitch cards
        print("\nCreating test pitch cards...")
        pitches = []
        pitch_data = [
            {
                "company_id": companies[0].id,
                "claims": {
                    "name": "NovoCillin XR",
                    "primary": "Reduces inflammation in 2 hours",
                    "secondary": "Supports bronchial dilation",
                    "indication": "Chronic bronchitis and asthma"
                },
                "ingredients": {
                    "compound": "alpha-methyl-oxytrinate",
                    "dosage": "10mg/5mL",
                    "form": "Extended release capsule"
                },
                "evidence_links": [
                    "https://clinicaltrials.gov/study/NCT12345",
                    "https://pubmed.ncbi.nlm.nih.gov/98765432"
                ]
            },
            {
                "company_id": companies[1].id,
                "claims": {
                    "name": "CardioShield Pro",
                    "primary": "Reduces cardiovascular risk by 40%",
                    "secondary": "Improves heart function markers",
                    "indication": "Hypertension and heart disease"
                },
                "ingredients": {
                    "compound": "beta-cardio-protectant",
                    "dosage": "5mg daily",
                    "form": "Tablet"
                },
                "evidence_links": [
                    "https://clinicaltrials.gov/study/NCT54321"
                ]
            },
            {
                "company_id": companies[2].id,
                "claims": {
                    "name": "ImmunoBoost Plus",
                    "primary": "Enhances immune response in cancer patients",
                    "secondary": "Reduces treatment side effects",
                    "indication": "Cancer immunotherapy support"
                },
                "ingredients": {
                    "compound": "gamma-immuno-enhancer",
                    "dosage": "20mg/10mL",
                    "form": "Injectable solution"
                },
                "evidence_links": [
                    "https://clinicaltrials.gov/study/NCT67890",
                    "https://pubmed.ncbi.nlm.nih.gov/12345678"
                ]
            }
        ]
        
        for data in pitch_data:
            request = PitchCreateRequest(**data)
            pitch = SocialService.create_pitch(db, request, actor_id=data["company_id"])
            pitches.append(pitch)
            print(f"  - Created pitch: {data['claims']['name']} (ID: {pitch.id})")
        
        # Create expert reviews for the first pitch
        print("\nCreating expert reviews...")
        if len(pitches) > 0 and len(doctors) >= 3:
            pitch = pitches[0]
            
            # Add reviews from different specialists
            reviews_to_create = [
                {
                    "doctor_id": doctors[0].id,
                    "vote": "up",
                    "specialty": "general_medicine",
                    "comments": "Evidence is solid. Clinical trial data supports the claims."
                },
                {
                    "doctor_id": doctors[1].id,
                    "vote": "up",
                    "specialty": "pulmonology",
                    "comments": "The bronchial dilation mechanism is well-documented."
                },
                {
                    "doctor_id": doctors[2].id,
                    "vote": "down",
                    "specialty": "internal_medicine",
                    "comments": "Need more long-term safety data before approval."
                }
            ]
            
            for review_data in reviews_to_create:
                try:
                    request = ReviewCreateRequest(**review_data)
                    review = ReviewEngine.create_review(db, pitch.id, request)
                    print(f"  - Review by {doctors[0].name}: {review_data['vote']}")
                except Exception as e:
                    print(f"  - Failed to create review: {e}")
        
        # Add public reactions
        print("\nAdding public reactions...")
        if len(pitches) > 0:
            for i, pitch in enumerate(pitches):
                # Add varied reactions
                for j in range(5 + i * 3):
                    try:
                        PublicSignalService.add_reaction(
                            db,
                            pitch.id,
                            "pitch",
                            f"user_{j}",
                            "like"
                        )
                    except:
                        pass
                
                for j in range(2 + i):
                    try:
                        PublicSignalService.add_reaction(
                            db,
                            pitch.id,
                            "pitch",
                            f"user_dislike_{j}",
                            "dislike"
                        )
                    except:
                        pass
            
            print(f"  - Added reactions to {len(pitches)} pitches")
        
        print("\n[Success] Database seeded successfully!")
        print(f"\nSummary:")
        print(f"  - Companies: {len(companies)}")
        print(f"  - Doctors: {len(doctors)}")
        print(f"  - Pitches: {len(pitches)}")
        
    except Exception as e:
        print(f"\n[Error] Error seeding database: {e}")
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
