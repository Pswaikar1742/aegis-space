from typing import Optional, Dict
from pydantic import BaseModel

class AnalyticsGlobalOut(BaseModel):
    total_revenue: float
    global_occupancy_rate: float
    branch_performance: Dict[str, dict]
