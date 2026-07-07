"""add default_probability and risk_tier to score

Revision ID: e0e51a11a463
Revises: 
Create Date: 2026-07-07 23:10:11.752764

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0e51a11a463'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('score', sa.Column('default_probability', sa.Float(), nullable=True))
    op.add_column('score', sa.Column('risk_tier', sa.String(), nullable=True))
    op.execute("UPDATE score SET default_probability = 0.5 WHERE default_probability IS NULL")
    op.execute("UPDATE score SET risk_tier = 'medium' WHERE risk_tier IS NULL")
    op.alter_column('score', 'default_probability', nullable=False)
    op.alter_column('score', 'risk_tier', nullable=False)


def downgrade() -> None:
    op.drop_column('score', 'risk_tier')
    op.drop_column('score', 'default_probability')
