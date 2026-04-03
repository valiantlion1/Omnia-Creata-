"""
Backward-compatibility shim.

All models now live under studio_platform.models/ package.
This file re-exports everything so that existing imports
(e.g. `from .models import OmniaIdentity`) keep working.
"""

from .models import *  # noqa: F401, F403
