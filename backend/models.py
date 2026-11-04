from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(30), default="donor", nullable=False)  # 'donor' or 'center_operator'
    address = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    pickups = relationship("Pickup", back_populates="user")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "address": self.address,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Component(Base):
    __tablename__ = "components"

    component_id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String(50), unique=True, index=True, nullable=False)  # 'phone', 'laptop', 'keyboard', 'mouse', 'pd', 'earbud'
    category = Column(String(100), nullable=False)
    hazard_level = Column(String(20), nullable=False)  # 'High', 'Medium', 'Low'
    material_composition = Column(String(255), nullable=False)
    valuable_metals = Column(String(255), nullable=False)
    toxic_materials = Column(String(255), nullable=False)
    target_bin = Column(String(100), nullable=False)
    handling_instructions = Column(Text, nullable=False)
    est_weight_kg = Column(Float, default=0.2)
    co2_offset_kg = Column(Float, default=1.5)

    logs = relationship("DetectionLog", back_populates="component")

    def to_dict(self):
        return {
            "component_id": self.component_id,
            "class_name": self.class_name,
            "category": self.category,
            "hazard_level": self.hazard_level,
            "material_composition": self.material_composition,
            "valuable_metals": self.valuable_metals,
            "toxic_materials": self.toxic_materials,
            "target_bin": self.target_bin,
            "handling_instructions": self.handling_instructions,
            "est_weight_kg": self.est_weight_kg,
            "co2_offset_kg": self.co2_offset_kg
        }


class DetectionLog(Base):
    __tablename__ = "detection_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("components.component_id"), nullable=True)
    confidence_score = Column(Float, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow)
    image_frame_path = Column(String(255), nullable=True)
    source = Column(String(50), default="donor_scan")  # 'donor_scan' or 'drive_intake'

    component = relationship("Component", back_populates="logs")

    def to_dict(self):
        return {
            "log_id": self.log_id,
            "component_id": self.component_id,
            "component_name": self.component.class_name if self.component else "unknown",
            "hazard_level": self.component.hazard_level if self.component else "Low",
            "target_bin": self.component.target_bin if self.component else "General_Vault",
            "confidence_score": round(self.confidence_score, 2),
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
            "image_frame_path": self.image_frame_path,
            "source": self.source
        }


class Pickup(Base):
    __tablename__ = "pickups"

    pickup_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    donor_name = Column(String(100), nullable=False)
    donor_phone = Column(String(20), nullable=False)
    status = Column(String(30), default="pending")  # 'pending', 'scheduled', 'completed', 'cancelled'
    address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    scheduled_date = Column(String(50), nullable=False)
    items_json = Column(Text, nullable=False)  # JSON-encoded array of items
    tracking_code = Column(String(50), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="pickups")

    def to_dict(self):
        return {
            "pickup_id": self.pickup_id,
            "user_id": self.user_id,
            "donor_name": self.donor_name,
            "donor_phone": self.donor_phone,
            "status": self.status,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "scheduled_date": self.scheduled_date,
            "items_json": self.items_json,
            "tracking_code": self.tracking_code,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class CollectionCenter(Base):
    __tablename__ = "collection_centers"

    center_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    type = Column(String(50), nullable=False)  # 'permanent_hub', 'temporary_drive', 'industrial_recycler'
    address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_phone = Column(String(20), nullable=False)
    accepts_household = Column(Boolean, default=True)
    drive_date = Column(String(100), nullable=True)

    def to_dict(self):
        return {
            "center_id": self.center_id,
            "name": self.name,
            "type": self.type,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "contact_phone": self.contact_phone,
            "accepts_household": self.accepts_household,
            "drive_date": self.drive_date
        }
