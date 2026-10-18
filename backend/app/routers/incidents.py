from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_principal, require_roles
from app.database import get_db
from app.models import Incident, IncidentStatus, Severity, UserRole
from app.schemas import IncidentCreate, IncidentRead, IncidentUpdate

router = APIRouter(prefix="/api/v1/incidents", tags=["incidents"])


def get_incident_or_404(session: Session, incident_id: int) -> Incident:
    incident = session.get(Incident, incident_id)
    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found",
        )
    return incident


@router.post(
    "",
    response_model=IncidentRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(require_roles(UserRole.ADMIN, UserRole.SUPPORT_ENGINEER))
    ],
)
def create_incident(
    incident_data: IncidentCreate, session: Session = Depends(get_db)
) -> Incident:
    incident = Incident(**incident_data.model_dump())
    session.add(incident)
    session.commit()
    session.refresh(incident)
    return incident


@router.get(
    "", response_model=list[IncidentRead], dependencies=[Depends(get_current_principal)]
)
def list_incidents(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    severity: Severity | None = None,
    incident_status: IncidentStatus | None = Query(default=None, alias="status"),
    session: Session = Depends(get_db),
) -> list[Incident]:
    statement = select(Incident)
    if severity is not None:
        statement = statement.where(Incident.severity == severity)
    if incident_status is not None:
        statement = statement.where(Incident.status == incident_status)
    statement = statement.order_by(Incident.created_at.desc(), Incident.id.desc())
    statement = statement.offset(offset).limit(limit)
    return list(session.scalars(statement).all())


@router.get(
    "/{incident_id}",
    response_model=IncidentRead,
    dependencies=[Depends(get_current_principal)],
)
def read_incident(
    incident_id: int, session: Session = Depends(get_db)
) -> Incident:
    return get_incident_or_404(session, incident_id)


@router.patch(
    "/{incident_id}",
    response_model=IncidentRead,
    dependencies=[
        Depends(require_roles(UserRole.ADMIN, UserRole.SUPPORT_ENGINEER))
    ],
)
def update_incident(
    incident_id: int,
    incident_data: IncidentUpdate,
    session: Session = Depends(get_db),
) -> Incident:
    incident = get_incident_or_404(session, incident_id)
    for field_name, value in incident_data.model_dump(exclude_unset=True).items():
        setattr(incident, field_name, value)
    session.commit()
    session.refresh(incident)
    return incident


@router.post(
    "/{incident_id}/resolve",
    response_model=IncidentRead,
    dependencies=[
        Depends(require_roles(UserRole.ADMIN, UserRole.SUPPORT_ENGINEER))
    ],
)
def resolve_incident(
    incident_id: int, session: Session = Depends(get_db)
) -> Incident:
    incident = get_incident_or_404(session, incident_id)
    if incident.status == IncidentStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Closed incident {incident_id} cannot be resolved",
        )
    incident.status = IncidentStatus.RESOLVED
    session.commit()
    session.refresh(incident)
    return incident