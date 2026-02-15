from pathlib import Path

PROMPTS_DIR = Path(__file__).parent

DEFAULTS = {
    "generate_actions": "v1",
    "generate_milestones": "v1",
    "curate_resources": "v1",
}


def get_prompt_template(name: str, version: str | None = None) -> str:
    """Load a prompt template by name and version."""
    version = version or DEFAULTS[name]
    path = PROMPTS_DIR / version / f"{name}.txt"
    return path.read_text()
