from app.scrapers.html_scraper import parse_html

HTML_SAMPLE = """
<html><body>
  <div class="headline"><a href="/news/1">First headline</a></div>
  <div class="headline"><a href="/news/2">Second headline</a></div>
  <div class="not-a-headline"><a href="/other">Ignored</a></div>
</body></html>
"""


def test_parse_html_extracts_matching_items():
    items = parse_html(HTML_SAMPLE, base_url="https://example.com", selector=".headline a")
    assert len(items) == 2
    assert items[0].title == "First headline"
    assert items[0].link == "https://example.com/news/1"
    assert items[1].link == "https://example.com/news/2"


def test_parse_html_skips_elements_without_links():
    html = '<div class="headline">No link here</div>'
    items = parse_html(html, base_url="https://example.com", selector=".headline")
    assert items == []
