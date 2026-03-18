#!/usr/bin/env python3
"""
Generate VSCode color themes combining default VSCode UI colors
with Alabaster-style minimal syntax highlighting.

Run: python3 generate.py
Requires: Python 3.8+, no external packages.
"""

import json
import os
import re
import urllib.request

# --- Constants ---

VSCODE_THEMES_BASE = (
    "https://raw.githubusercontent.com/microsoft/vscode/main"
    "/extensions/theme-defaults/themes"
)

ALABASTER_CANDIDATES = [
    "https://raw.githubusercontent.com/tonsky/vscode-theme-alabaster/refs/heads/master/theme/alabaster-color-theme.json"
]

THEME_FILES = [
    "dark_vs.json",
    "light_vs.json",
    "hc_black.json",
    "hc_light.json",
    "dark_plus.json",
    "light_plus.json",
    "dark_modern.json",
    "light_modern.json",
    "2026-dark.json",
    "2026-light.json",
]

# Filename → (display_name, uiTheme)
# uiTheme must be one of: "vs", "vs-dark", "hc-black", "hc-light"
THEME_METADATA = {
    "dark_vs.json": ("Lorem Gypsum Dark (Visual Studio)", "vs-dark"),
    "dark_plus.json": ("Lorem Gypsum Dark+", "vs-dark"),
    "dark_modern.json": ("Lorem Gypsum Dark Modern", "vs-dark"),
    "light_vs.json": ("Lorem Gypsum Light (Visual Studio)", "vs"),
    "light_plus.json": ("Lorem Gypsum Light+", "vs"),
    "light_modern.json": ("Lorem Gypsum Light Modern", "vs"),
    "hc_black.json": ("Lorem Gypsum High Contrast", "hc-black"),
    "hc_light.json": ("Lorem Gypsum High Contrast Light", "hc-light"),
    "2026-dark.json": ("Lorem Gypsum 2026 Dark", "vs-dark"),
    "2026-light.json": ("Lorem Gypsum 2026 Light", "vs"),
}

UI_THEME_TO_TYPE = {
    "vs-dark": "dark",
    "vs": "light",
    "hc-black": "hc",
    "hc-light": "hc",
}

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
THEMES_DIR = os.path.join(REPO_ROOT, "themes")


# --- Network ---


def _strip_jsonc_comments(text: str) -> str:
    """Strip // line comments, /* */ block comments, and trailing commas from JSONC."""
    # Pass 1: remove comments (skip over string literals to avoid false matches)
    comment_re = re.compile(
        r'"(?:[^"\\]|\\.)*"'  # quoted string — preserved unchanged
        r'|(/\*.*?\*/)'       # block comment — removed
        r'|(//[^\n]*)',       # line comment — removed
        re.DOTALL,
    )
    def strip_comments(m):
        if m.group(1) or m.group(2):
            return ""
        return m.group(0)
    text = comment_re.sub(strip_comments, text)

    # Pass 2: remove trailing commas before ] or }
    text = re.sub(r',(\s*[}\]])', r'\1', text)

    return text


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "vscode-default-alabaster/generate"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        text = resp.read().decode()
    return json.loads(_strip_jsonc_comments(text))


def fetch_first(candidates: list) -> dict:
    last_error = None
    for url in candidates:
        try:
            data = fetch_json(url)
            print(f"  Fetched: {url}")
            return data
        except Exception as e:
            last_error = e
    raise RuntimeError(f"All candidates failed. Last error: {last_error}")


# --- Theme inheritance resolution ---


def _include_filename(include_path: str) -> str:
    """Extract just the basename from an include path.

    Handles both ./dark_vs.json and ../../theme-defaults/themes/dark_vs.json
    since all referenced files live in the same flat directory.
    """
    return os.path.basename(include_path)


def resolve_theme(filename: str, raw: dict, memo: dict) -> dict:
    """Recursively resolve theme inheritance, merging colors and tokenColors.

    Merge strategy:
    - colors: parent base, child overrides (needed to build the full UI palette)
    - tokenColors: child first, parent appended — so extract_color_by_scope finds
      the most specific (child) override before falling back to parent rules.
      These are NOT written to the output theme.
    """
    if filename in memo:
        return memo[filename]

    data = raw.get(filename)
    if data is None:
        raise RuntimeError(f"Theme file not found in raw cache: {filename}")

    include_path = data.get("include")
    if include_path:
        parent_filename = _include_filename(include_path)
        parent = resolve_theme(parent_filename, raw, memo)
        colors = {**parent.get("colors", {}), **data.get("colors", {})}
        token_colors = data.get("tokenColors", []) + parent.get("tokenColors", [])
        resolved = {**data, "colors": colors, "tokenColors": token_colors}
        resolved.pop("include", None)
    else:
        resolved = dict(data)

    memo[filename] = resolved
    return resolved


# --- Scope-based color mapping ---

# Maps each Alabaster scope prefix → which scope in the default theme to borrow the
# color from. Rules are checked in order; first match wins.
#
# Intentional swaps vs. typical themes:
#   comments  → default strings color  (gives comments a vivid, warm hue)
#   strings   → default comments color (de-emphasises noisy string literals)
#   numbers/chars/booleans/keywords → default keywords color
SCOPE_COLOR_SOURCE = [
    # Alabaster scope prefix        Default-theme scope to steal from
    ("comment",                     "string"),
    ("string",                      "comment"),
    ("keyword",                     "keyword"),
    ("constant.numeric",            "keyword"),
    ("constant.character",          "keyword"),
    ("constant.language",           "keyword"),
    ("constant",                    "keyword"),
    ("storage",                     "keyword"),
    ("entity.name.function",        "entity.name.function"),
    ("entity.name",                 "entity.name"),
    ("variable.language",           "variable.language"),
    ("variable",                    "variable"),
    ("support",                     "support.function"),
]


def extract_color_by_scope(token_colors: list, target_scope: str) -> str | None:
    """Return the first foreground color whose scope starts with target_scope."""
    for rule in token_colors:
        scopes = rule.get("scope", [])
        if isinstance(scopes, str):
            scopes = [s.strip() for s in scopes.split(",")]
        for scope in scopes:
            if scope.strip().startswith(target_scope):
                fg = rule.get("settings", {}).get("foreground")
                if fg:
                    return fg
    return None


def build_color_map(alabaster_tokens: list, default_token_colors: list) -> dict:
    """Map each distinct Alabaster foreground color to a color from the default theme.

    For each Alabaster token rule the scope is matched against SCOPE_COLOR_SOURCE to
    determine which default-theme scope to borrow from. Unmatched colors are left
    unmapped (remap_alabaster_tokens will keep the original Alabaster color).
    """
    mapping = {}
    for rule in alabaster_tokens:
        fg = rule.get("settings", {}).get("foreground")
        if not fg or fg.upper() in mapping:
            continue

        scopes = rule.get("scope", [])
        if isinstance(scopes, str):
            scopes = [s.strip() for s in scopes.split(",")]

        default_scope = None
        for alb_scope in scopes:
            alb_scope = alb_scope.strip()
            for prefix, src_scope in SCOPE_COLOR_SOURCE:
                if alb_scope.startswith(prefix):
                    default_scope = src_scope
                    break
            if default_scope:
                break

        if default_scope is None:
            continue

        color = extract_color_by_scope(default_token_colors, default_scope)
        if color:
            mapping[fg.upper()] = color

    return mapping


def remap_alabaster_tokens(tokens: list, color_map: dict) -> list:
    """Return a deep copy of Alabaster token rules with foreground colors remapped.

    Only settings.foreground is remapped; settings.background is left untouched
    (preserves the red background on the 'invalid' rule).
    """
    result = []
    for rule in tokens:
        rule_copy = json.loads(json.dumps(rule))  # deep copy
        settings = rule_copy.get("settings", {})
        fg = settings.get("foreground")
        if fg:
            mapped = color_map.get(fg.upper())
            if mapped:
                settings["foreground"] = mapped
        result.append(rule_copy)
    return result


# --- Output generation ---


def generate_output_theme(
    display_name: str,
    ui_theme: str,
    colors: dict,
    token_colors: list,
) -> dict:
    return {
        "$schema": "vscode://schemas/color-theme",
        "name": display_name,
        "type": UI_THEME_TO_TYPE.get(ui_theme, "dark"),
        "colors": colors,
        "tokenColors": token_colors,
        "semanticHighlighting": False,
    }


def write_theme_file(theme: dict, display_name: str) -> str:
    filename = f"{display_name}-color-theme.json"
    path = os.path.join(THEMES_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(theme, f, indent=2, ensure_ascii=False)
        f.write("\n")
    return filename


def update_package_json(themes_manifest: list) -> None:
    pkg_path = os.path.join(REPO_ROOT, "package.json")
    with open(pkg_path, encoding="utf-8") as f:
        pkg = json.load(f)
    pkg["name"] = "vscode-lorem-gypsum"
    pkg["displayName"] = "Lorem Gypsum"
    pkg["contributes"]["themes"] = themes_manifest
    with open(pkg_path, "w", encoding="utf-8") as f:
        json.dump(pkg, f, indent=2, ensure_ascii=False)
        f.write("\n")


# --- Main ---


def main():
    os.makedirs(THEMES_DIR, exist_ok=True)

    print("Fetching VSCode default themes...")
    raw = {}
    for filename in THEME_FILES:
        url = f"{VSCODE_THEMES_BASE}/{filename}"
        print(f"  {filename}")
        raw[filename] = fetch_json(url)

    print("Fetching Alabaster theme...")
    alabaster = fetch_first(ALABASTER_CANDIDATES)
    alabaster_tokens = alabaster.get("tokenColors", [])

    # Clear stale generated theme files
    for fname in os.listdir(THEMES_DIR):
        if fname.endswith("-color-theme.json"):
            os.remove(os.path.join(THEMES_DIR, fname))
            print(f"  Removed stale: {fname}")

    # Resolve all theme inheritance chains
    memo = {}
    for filename in THEME_FILES:
        resolve_theme(filename, raw, memo)

    themes_manifest = []

    print("\nGenerating themes...")
    for filename in THEME_FILES:
        if filename not in THEME_METADATA:
            print(f"  WARNING: {filename} not in THEME_METADATA, skipping")
            continue

        display_name, ui_theme = THEME_METADATA[filename]
        resolved = memo[filename]

        # Map Alabaster colors → colors borrowed from this theme's scopes
        color_map = build_color_map(alabaster_tokens, resolved.get("tokenColors", []))

        # Remap Alabaster token rules with this theme's colors
        remapped_tokens = remap_alabaster_tokens(alabaster_tokens, color_map)

        # Build output: default theme UI colors + Alabaster token rules only
        theme = generate_output_theme(
            display_name, ui_theme, resolved.get("colors", {}), remapped_tokens
        )
        out_filename = write_theme_file(theme, display_name)

        themes_manifest.append(
            {
                "label": display_name,
                "uiTheme": ui_theme,
                "path": f"./themes/{out_filename}",
            }
        )

        print(f"  {display_name}")
        for alb, mapped in color_map.items():
            print(f"    {alb} → {mapped}")

    update_package_json(themes_manifest)

    print(f"\nDone! Generated {len(themes_manifest)} themes.")
    print("Next steps:")
    print("  1. Press F5 in VSCode to test")
    print("  2. Bump version in package.json")
    print("  3. vsce publish")


if __name__ == "__main__":
    main()
