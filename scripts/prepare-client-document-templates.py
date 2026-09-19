from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream


ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
SOURCE = BRAND / "client-receipt-template.pdf"


def point_in_box(x: float, y: float, box: tuple[float, float, float, float]) -> bool:
    left, bottom, right, top = box
    return left <= x <= right and bottom <= y <= top


def clean_template(destination: Path, remove_title: bool) -> None:
    reader = PdfReader(SOURCE)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    page = writer.pages[0]
    content = ContentStream(page.get_contents(), writer)

    # Exact text-object locations from the client's Word-exported Letter page.
    # Removing these text objects exposes the untouched artwork beneath them.
    boxes = [
        (20, 719, 42, 723),   # MR. customer placeholder
        (20, 424, 112, 429),  # payment milestone placeholder
        (190, 424, 373, 429), # payment method and reference placeholders
        (95, 411, 151, 415),  # CASH RECIVED placeholder
    ]
    if remove_title:
        boxes.append((334, 671, 546, 676))  # PAYMENT RECEIPT title

    operations = content.operations
    cleaned = []
    index = 0
    while index < len(operations):
        operands, operator = operations[index]
        if operator != b"BT":
            cleaned.append((operands, operator))
            index += 1
            continue

        block = [(operands, operator)]
        index += 1
        positions: list[tuple[float, float]] = []
        while index < len(operations):
            block_operands, block_operator = operations[index]
            block.append((block_operands, block_operator))
            if block_operator == b"Tm":
                positions.append((float(block_operands[4]), float(block_operands[5])))
            index += 1
            if block_operator == b"ET":
                break

        if not any(point_in_box(x, y, box) for x, y in positions for box in boxes):
            cleaned.extend(block)

    content.operations = cleaned
    page.replace_contents(content)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as stream:
        writer.write(stream)


clean_template(BRAND / "client-receipt-background.pdf", remove_title=False)
clean_template(BRAND / "client-invoice-background.pdf", remove_title=True)
