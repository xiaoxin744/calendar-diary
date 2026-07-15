"""Generate the 日历日记 application icon assets from one deterministic design."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SIZE = 1024
SUPERSAMPLE = 4

BLUE_TOP = (49, 91, 120)
BLUE_BOTTOM = (38, 73, 99)
INK = (37, 39, 42)
CREAM = (247, 246, 242)
CORAL = (214, 74, 74)
GREEN = (57, 116, 90)


def scaled_box(box: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
    return tuple(round(value * SUPERSAMPLE) for value in box)  # type: ignore[return-value]


def transform(value: float, scale: float) -> float:
    return 512 + (value - 512) * scale


def draw_calendar_mark(image: Image.Image, scale: float = 1.0, shadow: bool = True) -> None:
    page_box = tuple(transform(value, scale) for value in (170, 170, 854, 880))
    page_radius = 116 * scale

    if shadow:
        shadow_layer = Image.new('RGBA', image.size, (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow_layer)
        x1, y1, x2, y2 = page_box
        shadow_draw.rounded_rectangle(
            scaled_box((x1 + 12 * scale, y1 + 24 * scale, x2 + 12 * scale, y2 + 24 * scale)),
            radius=round(page_radius * SUPERSAMPLE),
            fill=(17, 31, 43, 96),
        )
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(round(24 * scale * SUPERSAMPLE)))
        image.alpha_composite(shadow_layer)

    page_mask = Image.new('L', image.size, 0)
    mask_draw = ImageDraw.Draw(page_mask)
    mask_draw.rounded_rectangle(
        scaled_box(page_box),
        radius=round(page_radius * SUPERSAMPLE),
        fill=255,
    )

    page_layer = Image.new('RGBA', image.size, CREAM + (255,))
    page_draw = ImageDraw.Draw(page_layer)
    x1, y1, x2, _ = page_box
    band_bottom = transform(330, scale)
    page_draw.rectangle(scaled_box((x1, y1, x2, band_bottom)), fill=CORAL + (255,))
    page_draw.rectangle(
        scaled_box((x1, band_bottom - 3 * scale, x2, band_bottom + 3 * scale)),
        fill=(188, 61, 61, 255),
    )
    image.paste(page_layer, (0, 0), page_mask)

    draw = ImageDraw.Draw(image)

    # Two simple binder tabs make the calendar silhouette recognizable at small sizes.
    for center_x in (334, 690):
        cx = transform(center_x, scale)
        ring_box = (
            cx - 36 * scale,
            transform(105, scale),
            cx + 36 * scale,
            transform(235, scale),
        )
        draw.rounded_rectangle(
            scaled_box(ring_box),
            radius=round(34 * scale * SUPERSAMPLE),
            fill=INK + (255,),
        )
        inset = 10 * scale
        draw.rounded_rectangle(
            scaled_box((ring_box[0] + inset, ring_box[1] + inset, ring_box[2] - inset, ring_box[3] - inset)),
            radius=round(24 * scale * SUPERSAMPLE),
            fill=(234, 231, 222, 255),
        )

    # A heart represents personal memories; journal lines make the diary purpose clear.
    heart_points: list[tuple[int, int]] = []
    heart_center_x = transform(512, scale)
    heart_center_y = transform(505, scale)
    for step in range(181):
        angle = math.pi * 2 * step / 180
        x = 16 * math.sin(angle) ** 3
        y = 13 * math.cos(angle) - 5 * math.cos(2 * angle) - 2 * math.cos(3 * angle) - math.cos(4 * angle)
        heart_points.append((
            round((heart_center_x + x * 6.4 * scale) * SUPERSAMPLE),
            round((heart_center_y - y * 6.4 * scale) * SUPERSAMPLE),
        ))
    draw.polygon(heart_points, fill=CORAL + (255,))

    line_specs = (
        (660, 330, 694),
        (730, 330, 694),
        (800, 330, 610),
    )
    for y, x1_line, x2_line in line_specs:
        y_t = transform(y, scale)
        draw.rounded_rectangle(
            scaled_box((transform(x1_line, scale), y_t - 10 * scale, transform(x2_line, scale), y_t + 10 * scale)),
            radius=round(10 * scale * SUPERSAMPLE),
            fill=GREEN + (255,),
        )


def create_full_icon() -> Image.Image:
    canvas_size = SIZE * SUPERSAMPLE
    image = Image.new('RGBA', (canvas_size, canvas_size), BLUE_BOTTOM + (255,))
    draw = ImageDraw.Draw(image)
    for y in range(canvas_size):
        ratio = y / max(1, canvas_size - 1)
        color = tuple(round(BLUE_TOP[i] * (1 - ratio) + BLUE_BOTTOM[i] * ratio) for i in range(3))
        draw.line((0, y, canvas_size, y), fill=color + (255,))
    draw_calendar_mark(image)
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert('RGB')


def create_adaptive_icon() -> Image.Image:
    image = Image.new('RGBA', (SIZE * SUPERSAMPLE, SIZE * SUPERSAMPLE), (0, 0, 0, 0))
    draw_calendar_mark(image, scale=0.78, shadow=True)
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def create_splash_icon(full_icon: Image.Image) -> Image.Image:
    output = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    tile = full_icon.resize((352, 352), Image.Resampling.LANCZOS).convert('RGBA')
    mask = Image.new('L', tile.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 351, 351), radius=82, fill=255)
    output.paste(tile, (80, 80), mask)
    return output


def save_assets() -> None:
    full_icon = create_full_icon()
    adaptive_icon = create_adaptive_icon()
    splash_icon = create_splash_icon(full_icon)

    targets = (
        ROOT / 'logo.png',
        ROOT / 'build' / 'icon.png',
        ROOT / 'mobile' / 'assets' / 'icon.png',
        ROOT / 'docs' / 'images' / 'app-icon.png',
    )
    for target in targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        full_icon.save(target, format='PNG', optimize=True)

    adaptive_icon.save(ROOT / 'mobile' / 'assets' / 'adaptive-icon.png', format='PNG', optimize=True)
    splash_icon.save(ROOT / 'mobile' / 'assets' / 'splash-icon.png', format='PNG', optimize=True)
    full_icon.resize((256, 256), Image.Resampling.LANCZOS).save(
        ROOT / 'mobile' / 'assets' / 'favicon.png',
        format='PNG',
        optimize=True,
    )


if __name__ == '__main__':
    save_assets()
