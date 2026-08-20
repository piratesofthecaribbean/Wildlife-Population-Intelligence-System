from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class SurveyBase(BaseModel):
    title: str
    description: Optional[str] = None
    location_name: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class SurveyCreate(SurveyBase):
    pass

class SurveyResponse(SurveyBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
