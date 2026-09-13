from app.scrapers.rss_scraper import parse_feed

RSS_SAMPLE = b"""<?xml version="1.0"?>
<rss version="2.0">
<channel>
  <title>Sample Feed</title>
  <item>
    <title>First story</title>
    <link>https://example.com/1</link>
    <description>Summary one</description>
    <pubDate>Sun, 13 Sep 2026 08:00:00 GMT</pubDate>
  </item>
</channel>
</rss>
"""

ATOM_SAMPLE = b"""<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Sample Atom Feed</title>
  <entry>
    <title>Atom story</title>
    <link href="https://example.com/atom-1"/>
    <summary>Atom summary</summary>
    <updated>2026-09-13T08:00:00Z</updated>
  </entry>
</feed>
"""


def test_parse_rss():
    items = parse_feed(RSS_SAMPLE)
    assert len(items) == 1
    assert items[0].title == "First story"
    assert items[0].link == "https://example.com/1"
    assert items[0].summary == "Summary one"


def test_parse_atom():
    items = parse_feed(ATOM_SAMPLE)
    assert len(items) == 1
    assert items[0].title == "Atom story"
    assert items[0].link == "https://example.com/atom-1"
